
export enum ProcessingStatus {
  IDLE = 'IDLE',
  READING_FILE = 'READING_FILE',
  AWAITING_CONTEXT = 'AWAITING_CONTEXT', // New step for user input
  PROCESSING_LOCAL = 'PROCESSING_LOCAL', // Ollama Step
  AWAITING_CLOUD_CONSENT = 'AWAITING_CLOUD_CONSENT', // User review step
  PROCESSING_CLOUD = 'PROCESSING_CLOUD', // Gemini Step
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface RedactionStats {
  originalLength: number;
  redactedLength: number;
  piiCount: number;
}

export interface UploadedFile {
  name: string;
  content: string;
  type: string;
}

export interface AnalysisResult {
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskReason: string;
  regulatoryWarning?: string;
}

export interface RedactionMap {
  [key: string]: string;
}

export interface SanitizationResult {
  sanitizedText: string;
  map: RedactionMap;
}

export interface OllamaConfig {
  url: string;
  model: string;
}

export interface LocalRiskResult {
  riskLevel: 'Low' | 'Medium' | 'High';
  riskReason: string;
  regulatoryWarning?: string;
}

export interface JurisdictionConfig {
  id: string;
  name: string;
  law: string;
  piiExamples: string[];
}
