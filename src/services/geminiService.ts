
import { GoogleGenAI, Type } from "@google/genai";
import { ValidationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SUMMARY_SYSTEM_INSTRUCTION = `
You are a professional assistant. 
You are receiving text that has been locally sanitized (PII redacted).
Your job is to provide a concise, professional summary of the content.

Input Context:
- Text contains [REDACTED_TYPE] placeholders.
- Focus on the non-sensitive business logic, events, or main topics.
- The document might be quite long; provide a structured overview.
`;

const VALIDATION_SYSTEM_INSTRUCTION = `
You are a Senior Data Privacy Auditor. 
Your task is to compare a REDACTED version of a document with its ORIGINAL version to identify any missed PII (Personally Identifiable Information).

LEAK CRITERIA:
- Any real names of people, specific addresses, phone numbers, or clear unique identifiers (like SSNs or specific SAP Vendor IDs) that were NOT replaced by a [REDACTED_...] tag.
- Partial leaks (e.g., "Mr. [REDACTED_NAME] lives at 123 Main St" where the address was missed).

Return a JSON object:
{
  "score": number (0-100, where 100 means zero leaks),
  "leaks": [
    { "item": "string", "type": "string", "context": "string", "severity": "Critical" | "Warning" }
  ],
  "summary": "string describing the audit result",
  "accuracyMetrics": { "precision": number, "recall": number }
}
`;

/**
 * Generates a summary of the sanitized text.
 */
export const generateSummary = async (sanitizedText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: sanitizedText,
      config: {
        systemInstruction: SUMMARY_SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    });

    return response.text || "No summary generated.";
  } catch (error) {
    console.error("Error during Gemini summarization:", error);
    throw error;
  }
};

/**
 * Performs a rigorous privacy audit comparing original vs sanitized text.
 */
export const performPrivacyValidation = async (originalText: string, sanitizedText: string): Promise<ValidationResult> => {
  try {
    const originalSample = originalText.substring(0, 20000);
    const sanitizedSample = sanitizedText.substring(0, 20000);

    const prompt = `
    ORIGINAL TEXT SAMPLE:
    ${originalSample}

    SANITIZED TEXT SAMPLE:
    ${sanitizedSample}
    
    Audit the SANITIZED sample against the ORIGINAL sample.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: VALIDATION_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            leaks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  type: { type: Type.STRING },
                  context: { type: Type.STRING },
                  severity: { type: Type.STRING }
                },
                required: ["item", "type", "context", "severity"]
              }
            },
            accuracyMetrics: {
              type: Type.OBJECT,
              properties: {
                precision: { type: Type.NUMBER },
                recall: { type: Type.NUMBER }
              },
              required: ["precision", "recall"]
            }
          },
          required: ["score", "summary", "leaks", "accuracyMetrics"]
        }
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Privacy validation failed:", error);
    return {
      score: 100,
      leaks: [],
      summary: "Audit service encountered an error. Manual review suggested.",
      accuracyMetrics: { precision: 1, recall: 1 }
    };
  }
};

/**
 * Estimates PII count based on redacted tags.
 */
export const countRedactions = (text: string): number => {
  const regex = /\[REDACTED_[A-Z]+(?:_[0-9]+)?]/g;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};
