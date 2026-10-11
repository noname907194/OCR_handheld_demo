import type {OcrResult} from './OcrResult';

export interface OcrEngine {
  initialize(): Promise<void>;

  recognize(imageUri: string): Promise<OcrResult>;

  destroy(): Promise<void>;
}