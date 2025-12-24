
import { LocalRiskResult, OllamaConfig, RedactionMap, SanitizationResult, JurisdictionConfig } from '../types';

export type { OllamaConfig, LocalRiskResult };

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  url: 'http://localhost:11434',
  model: 'gemma2'
};

const CHUNK_SIZE_LIMIT = 15000; // Optimal character count per chunk for local LLM stability

const generateSanitizePrompt = (context: string, jurisdiction: JurisdictionConfig, isChunk: boolean) => `
You are a high-performance data privacy engine complying with ${jurisdiction.name} regulations (${jurisdiction.law}).
Your ONLY goal is to sanitize the text while PRESERVING ITS EXACT STRUCTURE AND FORMATTING.

${isChunk ? "IMPORTANT: You are processing a SEGMENT of a larger document. Do not add any preamble or conversational text. Return ONLY the JSON object requested." : ""}
DOCUMENT CONTEXT: ${context || "General Text"}
JURISDICTION: ${jurisdiction.name} (${jurisdiction.law})

INSTRUCTIONS:
1. Identify Personally Identifiable Information (PII).
2. Replace PII with UNIQUE tags (e.g., [REDACTED_NAME_1]).
3. STRUCTURAL INTEGRITY: If the input is JSON, CSV, or a Table, DO NOT change keys, headers, or delimiters. Only replace the sensitive values.
4. Keep the original indentation and white-space exactly as provided.
5. Return strictly valid JSON.

JSON Structure of your response:
{
  "redactedText": "The text with unique tags applied...",
  "map": {
    "[REDACTED_TAG]": "Original Value"
  }
}

Text to sanitize:
`;

/**
 * Splits text into chunks by character limit while attempting to snap to the nearest newline 
 * to preserve logical boundaries in structured data (CSV, JSON, Markdown).
 */
const splitIntoChunks = (text: string, limit: number): string[] => {
  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let endPos = currentPos + limit;
    if (endPos < text.length) {
      // Look for a newline character to break at a logical line boundary
      const lastNewline = text.lastIndexOf('\n', endPos);
      if (lastNewline > currentPos) {
        endPos = lastNewline + 1; // Include the newline in the current chunk
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
    const response = await fetch(`${cleanUrl}/api/tags`);
    return response.ok;
  } catch {
    return false;
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
            num_ctx: 32768 // Large context window for chunk stability
          }
        }),
      });

      if (!response.ok) throw new Error(`Ollama error on chunk ${i + 1}`);

      const data = await response.json();
      const result = JSON.parse(data.response);
      
      // Accumulate text and mapping
      fullSanitizedText += (result.redactedText || "");
      Object.assign(masterMap, result.map || {});
    } catch (err) {
      console.error(`Chunk ${i + 1} failed:`, err);
      // Fallback: If a chunk fails, we append original text to avoid data loss
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
  // For risk assessment, we sample the start of the file (usually contains most sensitive context)
  const sample = text.substring(0, 10000);
  
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: `Analyze the following for privacy risks under ${jurisdiction.name} law (${jurisdiction.law}). Return valid JSON { "riskLevel": "High"|"Medium"|"Low", "riskReason": "...", "regulatoryWarning": "..." }. Text: ${sample}`,
        stream: false,
        format: "json",
      }),
    });

    if (!response.ok) throw new Error("Risk assessment failed");
    const data = await response.json();
    return JSON.parse(data.response);
  } catch {
    return { riskLevel: 'Low', riskReason: 'Local assessment failed or skipped.' };
  }
};
