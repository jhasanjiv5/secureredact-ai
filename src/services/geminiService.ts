
import { GoogleGenAI, Type } from "@google/genai";

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

/**
 * Generates a summary of the sanitized text.
 */
export const generateSummary = async (sanitizedText: string): Promise<string> => {
  try {
    // Using gemini-2.5-flash-lite-latest for high context (1M tokens) and efficiency
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
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
 * Estimates PII count based on redacted tags.
 * Simple regex helper for the client side statistics.
 */
export const countRedactions = (text: string): number => {
  // Matches: [REDACTED_XYZ] or [REDACTED_XYZ_123]
  const regex = /\[REDACTED_[A-Z]+(?:_[0-9]+)?]/g;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};
