import {PaddleOcrService} from 'ppu-paddle-ocr/mobile';

import {OcrEngine} from './OcrEngine';
import {OcrResult} from './OcrResult';

export class PaddleOcrEngine implements OcrEngine {
  private ocr: PaddleOcrService;

  constructor() {
    this.ocr = new PaddleOcrService();
  }

  async initialize(): Promise<void> {
    await this.ocr.initialize();
  }

  async recognize(imageUri: string): Promise<OcrResult> {
    const start = Date.now();

    try {
      console.log('PaddleOCR started');
      console.log('Image:', imageUri);

      const response = await fetch(imageUri);
      const imageBuffer = await response.arrayBuffer();

      const result = await this.ocr.recognize(imageBuffer, {
        flatten: true,
      });

      const executionTimeMs = Date.now() - start;

      console.log('PaddleOCR result:', result);

      return {
        text: result.text,
        confidence: 0,
        executionTimeMs,
        engine: 'PaddleOCR',
      };
    } catch (error) {
      console.error('PaddleOCR failed:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    await this.ocr.destroy();
  }
}