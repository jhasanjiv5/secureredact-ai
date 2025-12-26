
import { LocalRiskResult, OllamaConfig, RedactionMap, SanitizationResult, JurisdictionConfig, ScreeningResult } from '../types';

export type { OllamaConfig, LocalRiskResult };

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  url: 'http://localhost:11434',
  model: 'gemma2'
};

const CHUNK_SIZE_LIMIT = 12000; 

const generateSanitizePrompt = (context: string, jurisdiction: JurisdictionConfig, isChunk: boolean) => `
You are a high-performance data privacy engine complying with ${jurisdiction.name} regulations (${jurisdiction.law}).
Your ONLY goal is to sanitize the text while PRESERVING ITS EXACT STRUCTURE AND FORMATTING.

DOCUMENT CONTEXT: ${context || "General Text"}
JURISDICTION: ${jurisdiction.name} (${jurisdiction.law})

INSTRUCTIONS:
1. Identify Personally Identifiable Information (PII).
2. Replace PII with UNIQUE tags (e.g., [REDACTED_NAME_1]).
3. STRUCTURAL INTEGRITY: If the input is JSON, CSV, or code, DO NOT change keys, headers, delimiters, or logic. Only replace the sensitive values.
4. Return strictly valid JSON with the structure shown below.
5. ${isChunk ? "IMPORTANT: This is a segment of a larger file. Do not add any preamble or text outside the JSON block." : ""}

JSON Schema:
{
  "redactedText": "The sanitized text content...",
  "map": {
    "[REDACTED_TAG]": "Original Value"
  }
}

Text to sanitize:
`;

const splitIntoChunks = (text: string, limit: number): string[] => {
  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let endPos = currentPos + limit;
    if (endPos < text.length) {
      const lastNewline = text.lastIndexOf('\n', endPos);
      if (lastNewline > currentPos) {
        endPos = lastNewline + 1; 
      }
    } else {
      endPos = text.length;
    }
    chunks.push(text.substring(currentPos, endPos));
    currentPos = endPos;
  }
  return chunks;
};

export const checkOllamaConnection = async (config: OllamaConfig): Promise<boolean> => {
  try {
    const cleanUrl = config.url.replace(/\/$/, '');
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000); // Quick timeout
    const response = await fetch(`${cleanUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(id);
    return response.ok;
  } catch {
    return false;
  }
};

export const screenPrivacyRisks = async (text: string, config: OllamaConfig): Promise<ScreeningResult> => {
  const baseUrl = config.url.replace(/\/$/, '');
  const sample = text.substring(0, 5000); 
  
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: `Analyze the following text to identify its context and potential PII risks. 
        Determine which privacy jurisdiction (US, EU, Global, etc.) is most relevant.
        Return a JSON object: 
        { 
          "detectedContext": "short description of file type", 
          "suggestedJurisdictionId": "global"|"us"|"eu"|"uk"|"in"|"ca"|"au"|"br",
          "findings": ["list of potential PII types found"],
          "explanation": "friendly conversational explanation of why you chose these" 
        }
        Text: ${sample}`,
        stream: false,
        format: "json",
      }),
    });

    if (!response.ok) throw new Error("Ollama API responded with an error.");
    const data = await response.json();
    return JSON.parse(data.response);
  } catch (err: any) {
    // Check if it's a network error (Failed to fetch)
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      throw new Error("CONNECTION_FAILED");
    }
    throw err;
  }
};

export const sanitizeWithOllama = async (
  text: string, 
  config: OllamaConfig, 
  context: string, 
  jurisdiction: JurisdictionConfig,
  onProgress?: (current: number, total: number) => void
): Promise<SanitizationResult> => {
  const baseUrl = config.url.replace(/\/$/, '');
  const chunks = splitIntoChunks(text, CHUNK_SIZE_LIMIT);
  const totalChunks = chunks.length;
  
  let fullSanitizedText = "";
  const masterMap: RedactionMap = {};

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, totalChunks);
    
    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt: generateSanitizePrompt(context, jurisdiction, totalChunks > 1) + chunks[i],
          stream: false,
          format: "json",
          options: { 
            temperature: 0.1,
            num_ctx: 32768 
          }
        }),
      });

      if (!response.ok) throw new Error(`Ollama API error on chunk ${i + 1}`);

      const data = await response.json();
      
      let jsonContent = data.response.trim();
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }

      const result = JSON.parse(jsonContent);
      
      fullSanitizedText += (result.redactedText || "");
      if (result.map) {
        Object.assign(masterMap, result.map);
      }
    } catch (err) {
      console.error(`Chunk ${i + 1} processing failed:`, err);
      fullSanitizedText += chunks[i];
    }
  }

  return {
    sanitizedText: fullSanitizedText,
    map: masterMap
  };
};

export const assessRiskWithOllama = async (text: string, config: OllamaConfig, jurisdiction: JurisdictionConfig): Promise<LocalRiskResult> => {
  const baseUrl = config.url.replace(/\/$/, '');
  const sample = text.substring(0, 10000);
  
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: `Evaluate privacy risks for this text under ${jurisdiction.name} (${jurisdiction.law}). Return valid JSON { "riskLevel": "High"|"Medium"|"Low", "riskReason": "...", "regulatoryWarning": "..." }. Text: ${sample}`,
        stream: false,
        format: "json",
      }),
    });

    if (!response.ok) throw new Error("Risk assessment failed");
    const data = await response.json();
    return JSON.parse(data.response);
  } catch {
    return { riskLevel: 'Low', riskReason: 'Local assessment failed.' };
  }
};
