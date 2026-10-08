export interface OcrResult {
  text: string;
  confidence: number;
  executionTimeMs: number;
  engine: string;
}