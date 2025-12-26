
export enum ProcessingStatus {
  IDLE = 'IDLE',
  READING_FILE = 'READING_FILE',
  SCREENING = 'SCREENING', // New status for interactive screening
  AWAITING_CONTEXT = 'AWAITING_CONTEXT', 
  PROCESSING_LOCAL = 'PROCESSING_LOCAL', 
  AWAITING_CLOUD_CONSENT = 'AWAITING_CLOUD_CONSENT', 
  PROCESSING_CLOUD = 'PROCESSING_CLOUD', 
  VALIDATING = 'VALIDATING',
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
  validation?: ValidationResult;
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

export interface ScreeningResult {
  detectedContext: string;
  suggestedJurisdictionId: string;
  findings: string[];
  explanation: string;
}

export interface JurisdictionConfig {
  id: string;
  name: string;
  law: string;
  piiExamples: string[];
}

export interface PrivacyLeak {
  item: string;
  type: string;
  context: string;
  severity: 'Critical' | 'Warning';
}

export interface ValidationResult {
  score: number; // 0-100
  leaks: PrivacyLeak[];
  summary: string;
  accuracyMetrics: {
    precision: number;
    recall: number;
  };
}
