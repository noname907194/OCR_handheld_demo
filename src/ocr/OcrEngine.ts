import {OcrResult} from './OcrResult';

export interface OcrEngine {
  recognize(imageUri: string): Promise<OcrResult>;
}