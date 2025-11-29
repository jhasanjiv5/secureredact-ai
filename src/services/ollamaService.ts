
import { LocalRiskResult, OllamaConfig, RedactionMap, SanitizationResult } from '../types';

export type { OllamaConfig, LocalRiskResult };

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  url: 'http://localhost:11434',
  model: 'gemma2'
};

const SANITIZE_PROMPT = `
You are a strict data privacy engine. Your ONLY goal is to sanitize the following text.
Identify Personally Identifiable Information (PII) and replace it with UNIQUE tags (e.g., [REDACTED_NAME_1], [REDACTED_EMAIL_2]).

Target PII:
- Real Names
- Emails
- Phone Numbers
- Addresses
- Financial info
- IDs/SSNs

INSTRUCTIONS:
1. Replace every PII instance with a unique tag.
2. Create a mapping dictionary of Tag -> Original Value.
3. Return strictly valid JSON.

JSON Structure:
{
  "redactedText": "The text with unique tags applied...",
  "map": {
    "[REDACTED_NAME_1]": "John Doe",
    "[REDACTED_EMAIL_1]": "john@example.com"
  }
}

Text to sanitize:
`;

const RISK_PROMPT = `
You are a global Data Protection Officer (DPO). Analyze the following text for sensitivity, security risks, and compliance with data protection laws like GDPR (EU), CCPA (California), and HIPAA (USA).

Classify the Privacy Risk Level:
- High: Sensitive PII (Health, Finance, Government IDs, Passwords). High risk of severe GDPR/HIPAA violations.
- Medium: Internal business info, emails, names. Potential GDPR/CCPA compliance issues.
- Low: Public info, generic knowledge, code without secrets.

Return your answer in strictly valid JSON format:
{
  "riskLevel": "High" | "Medium" | "Low",
  "riskReason": "Brief explanation of the risk.",
  "regulatoryWarning": "Specific details on which regulations (e.g. 'GDPR Art. 9 Special Categories', 'CCPA Personal Info') are implicated by the specific data types found."
}

Text to analyze:
`;

/**
 * Probes a URL to see if Ollama is reachable.
 */
async function probe(baseUrl: string): Promise<boolean> {
  try {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/tags`, {
      method: 'GET',
      mode: 'cors', // Explicitly request CORS
      credentials: 'omit',
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

export const checkOllamaConnection = async (config: OllamaConfig): Promise<boolean> => {
    // 1. Try configured URL
    if (await probe(config.url)) {
        return true;
    }

    // 2. Fallback: If localhost, try 127.0.0.1
    if (config.url.includes('localhost')) {
        const altUrl = config.url.replace('localhost', '127.0.0.1');
        if (await probe(altUrl)) {
            console.log(`Switching Ollama URL to ${altUrl}`);
            config.url = altUrl; // Update config object reference
            return true;
        }
    }

    // 3. Fallback: If 127.0.0.1, try localhost
    if (config.url.includes('127.0.0.1')) {
        const altUrl = config.url.replace('127.0.0.1', 'localhost');
        if (await probe(altUrl)) {
            console.log(`Switching Ollama URL to ${altUrl}`);
            config.url = altUrl; // Update config object reference
            return true;
        }
    }

    return false;
};

export const sanitizeWithOllama = async (text: string, config: OllamaConfig): Promise<SanitizationResult> => {
  const baseUrl = config.url.replace(/\/$/, '');
  
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({
        model: config.model,
        prompt: SANITIZE_PROMPT + text,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1, 
          num_ctx: 4096
        }
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama API Error (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    const jsonStr = data.response;
    
    // Parse the JSON output
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}') + 1;
    const cleanJson = jsonStr.slice(jsonStart, jsonEnd);
    
    const result = JSON.parse(cleanJson);
    
    return {
        sanitizedText: result.redactedText || "Error: No text returned",
        map: result.map || {}
    };

  } catch (error: any) {
    console.error("Ollama sanitization failed:", error);
    if (error.message.includes('Failed to fetch')) {
        throw new Error(`Connection failed to ${baseUrl}. Check if Ollama is running.`);
    }
    throw error;
  }
};

export const assessRiskWithOllama = async (text: string, config: OllamaConfig): Promise<LocalRiskResult> => {
  const baseUrl = config.url.replace(/\/$/, '');
  
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({
        model: config.model,
        prompt: RISK_PROMPT + text,
        stream: false,
        format: "json", // Force JSON mode if model supports it (Ollama feature)
        options: {
          temperature: 0.1,
          num_ctx: 2048
        }
      }),
    });

    if (!response.ok) throw new Error("Ollama Error");
    const data = await response.json();
    const jsonStr = data.response;

    try {
      // Basic cleanup for models that might be chatty even with format:json
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}') + 1;
      const cleanJson = jsonStr.slice(jsonStart, jsonEnd);
      
      const result = JSON.parse(cleanJson);
      return {
        riskLevel: result.riskLevel || 'Low',
        riskReason: result.riskReason || 'No reason provided.',
        regulatoryWarning: result.regulatoryWarning || 'No specific regulation cited.'
      };
    } catch (parseError) {
      console.warn("Failed to parse Ollama JSON:", jsonStr);
      return { riskLevel: 'Low', riskReason: 'Could not determine risk (JSON parse error).' };
    }

  } catch (error) {
    console.error("Risk assessment failed:", error);
    return { riskLevel: 'Low', riskReason: 'Local assessment failed.' };
  }
};
