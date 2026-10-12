
import RNFS from 'react-native-fs';
import { toByteArray } from 'base64-js';

import { PaddleOcrService } from 'ppu-paddle-ocr/mobile';

import { OcrEngine } from './OcrEngine';
import { OcrResult } from './OcrResult';

// ============================================
// CHANGE THE MODEL HERE: 'tiny' | 'small' | 'medium'
// ============================================
const OCR_MODEL: 'tiny' | 'small' | 'medium' = 'medium';

// Automatically generate filenames from the selected model.
const MODEL_FILES = {
  detection: `PP-OCRv6_${OCR_MODEL}_det.ort`,
  recognition: `PP-OCRv6_${OCR_MODEL}_rec.ort`,
  dictionary: `ppocrv6_${OCR_MODEL}_dict.txt`,
};

// Location of bundled models inside Android assets.
const ASSET_DIRECTORY = 'ocr-models';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = toByteArray(base64);

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export class PaddleOcrEngine implements OcrEngine {
  private ocr: PaddleOcrService | null = null;

  private async copyAssetIfMissing(
    assetPath: string,
    destinationPath: string,
  ): Promise<void> {
    const exists = await RNFS.exists(destinationPath);

    if (!exists) {
      console.log(`Copying OCR asset: ${assetPath}`);
      await RNFS.copyFileAssets(assetPath, destinationPath);
    }
  }

  private async readAsArrayBuffer(
    path: string,
  ): Promise<ArrayBuffer> {
    const exists = await RNFS.exists(path);

    if (!exists) {
      throw new Error(`OCR model file not found: ${path}`);
    }

    const base64 = await RNFS.readFile(path, 'base64');

    return base64ToArrayBuffer(base64);
  }

  async initialize() {

    const start = Date.now();

    const modelDirectory =
      `${RNFS.DocumentDirectoryPath}/ocr-models`;

    await RNFS.mkdir(modelDirectory);

    const detectionFilename =
      `PP-OCRv6_${OCR_MODEL}_det.ort`;

    const recognitionFilename =
      `PP-OCRv6_${OCR_MODEL}_rec.ort`;

    const dictionaryFilename =
      `ppocrv6_${OCR_MODEL}_dict.txt`;

    const detectionAsset = `ocr-models/${detectionFilename}`;
    const recognitionAsset = `ocr-models/${recognitionFilename}`;
    const dictionaryAsset = `ocr-models/${dictionaryFilename}`;

    const detectionPath =
      `${modelDirectory}/${detectionFilename}`;

    const recognitionPath =
      `${modelDirectory}/${recognitionFilename}`;

    const dictionaryPath =
      `${modelDirectory}/${dictionaryFilename}`;

    // Copy bundled assets to the app's local filesystem.
    await this.copyAssetIfMissing(detectionAsset, detectionPath);
    await this.copyAssetIfMissing(recognitionAsset, recognitionPath);
    await this.copyAssetIfMissing(dictionaryAsset, dictionaryPath);

    // Read ONLY the text dictionary into JavaScript memory.
    const dictionaryBuffer =
      await this.readAsArrayBuffer(dictionaryPath);

    this.ocr = new PaddleOcrService({
      model: {
        detection: detectionPath,
        recognition: recognitionPath,
        charactersDictionary: dictionaryBuffer,
      },
      session: {
        graphOptimizationLevel: "disabled",
      },
      debugging: {
        verbose: true,
      },
    });

    await this.ocr.initialize();

    console.log(`time taken to initialize: ${Date.now() - start} ms`);

  }

  async recognize(imageUri: string): Promise<OcrResult> {
    if (!this.ocr) {
      throw new Error(
        'PaddleOCR is not initialized. Call initialize() first.',
      );
    }

    const start = Date.now();

    try {
      console.log(`PaddleOCR ${OCR_MODEL.toUpperCase()} recognition started`);
      console.log('Image:', imageUri);

      const response = await fetch(imageUri);

      if (!response.ok) {
        throw new Error(
          `Failed to load image: HTTP ${response.status}`,
        );
      }

      const imageBuffer = await response.arrayBuffer();

      const result = await this.ocr.recognize(imageBuffer, {
        flatten: true,
      });

      const executionTimeMs = Date.now() - start;

      console.log('PaddleOCR result:', result);

      return {
        text: result.text,
        confidence: result.confidence,
        executionTimeMs,
        engine: 'PaddleOCR',
      };
    } catch (error) {
      console.error('PaddleOCR recognition failed:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.ocr) {
      await this.ocr.destroy();
      this.ocr = null;
    }
  }
}