export interface OcrResult {
  text: string;
  confidence: number|null;
  executionTimeMs: number;
  engine: string;
}