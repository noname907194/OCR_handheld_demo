import RNFS from 'react-native-fs';
import { initLlama } from 'llama.rn';

import type { OcrEngine } from './OcrEngine';
import type { OcrResult } from './OcrResult';

const MODEL_FILES = {
  model: 'Qwen_Qwen3.5-0.8B-Q4_0.gguf',
  mmproj: 'mmproj-Qwen_Qwen3.5-0.8B-bf16.gguf',
};

const ASSET_DIRECTORY = 'qwen-models';

export class QwenOcrEngine implements OcrEngine {
  private context: Awaited<ReturnType<typeof initLlama>> | null = null;

  private async copyAssetIfMissing(
    assetPath: string,
    destinationPath: string,
  ): Promise<void> {
    const exists = await RNFS.exists(destinationPath);

    if (exists) {
      const stat = await RNFS.stat(destinationPath);

      if (Number(stat.size) > 0) {
        console.log(`Qwen model already copied: ${destinationPath}`);
        return;
      }

      await RNFS.unlink(destinationPath);
    }

    console.log(`Copying Qwen asset: ${assetPath}`);

    await RNFS.copyFileAssets(assetPath, destinationPath);

    const copied = await RNFS.exists(destinationPath);

    if (!copied) {
      throw new Error(`Failed to copy Qwen model: ${assetPath}`);
    }

    const stat = await RNFS.stat(destinationPath);

    if (Number(stat.size) === 0) {
      throw new Error(`Copied model file is empty: ${destinationPath}`);
    }

    console.log(
      `Copied ${assetPath}: ${stat.size} bytes`,
    );
  }

  async initialize(): Promise<void> {
    if (this.context) {
      console.log('Qwen OCR is already initialized.');
      return;
    }

    const start = Date.now();

    const modelDirectory =
      `${RNFS.DocumentDirectoryPath}/${ASSET_DIRECTORY}`;

    await RNFS.mkdir(modelDirectory);

    const modelAsset =
      `${ASSET_DIRECTORY}/${MODEL_FILES.model}`;

    const mmprojAsset =
      `${ASSET_DIRECTORY}/${MODEL_FILES.mmproj}`;

    const modelPath =
      `${modelDirectory}/${MODEL_FILES.model}`;

    const mmprojPath =
      `${modelDirectory}/${MODEL_FILES.mmproj}`;

    // Copy the bundled Android assets into app-private storage.
    await this.copyAssetIfMissing(modelAsset, modelPath);

    await this.copyAssetIfMissing(mmprojAsset, mmprojPath);

    console.log('Qwen main model path:', modelPath);
    console.log('Qwen projector path:', mmprojPath);

    try {
      console.log('Loading Qwen3.5-0.8B...');

      this.context = await initLlama({
        // llama.rn expects a file URI for the model path.
        model: `file://${modelPath}`,

        n_ctx: 4096,
        n_batch: 512,
        n_gpu_layers: 0,

        // Required for multimodal inference.
        ctx_shift: false,
      });

      console.log('Qwen main model loaded.');

      console.log('Initializing Qwen vision support...');

      const initialized = await this.context.initMultimodal({
        // Use the filesystem path for the projector.
        path: mmprojPath,
        use_gpu: false,
      });

      if (!initialized) {
        throw new Error(
          'Qwen multimodal initialization failed. ' +
          'Check model compatibility and native logs.',
        );
      }

      const support =
        await this.context.getMultimodalSupport();

      console.log('Qwen multimodal support:', support);

      if (!support.vision) {
        throw new Error(
          'The native runtime did not report vision support.',
        );
      }

      console.log(
        `Qwen initialized in ${Date.now() - start} ms`,
      );
    } catch (error) {
      // Clean up if model or projector initialization fails.
      const failedContext = this.context;
      this.context = null;

      if (failedContext) {
        try {
          await failedContext.releaseMultimodal();
        } catch {
          // Multimodal initialization may not have completed.
        }

        try {
          await failedContext.release();
        } catch (releaseError) {
          console.warn(
            'Failed to release Qwen context:',
            releaseError,
          );
        }
      }

      throw error;
    }
  }

  async recognize(imageUri: string): Promise<OcrResult> {
    if (!this.context) {
      throw new Error(
        'Qwen OCR is not initialized. Call initialize() first.',
      );
    }

    const start = Date.now();

    try {
      console.log('Qwen OCR started.');
      console.log('Image URI:', imageUri);

      let normalizedImageUri = imageUri;

      if (imageUri.startsWith('/')) {
        normalizedImageUri = `file://${imageUri}`;
      }

      if (normalizedImageUri.startsWith('content://')) {
        throw new Error(
          'Qwen requires an accessible local image path. ' +
          'Copy this content URI to a local file before inference.',
        );
      }

      const result = await this.context.completion({
        messages: [
            {
            role: 'user',
            content: [
                    {
                    type: 'text',
                    text:
                        '/no_think\nextract the weight displayed on the screen with decimal point and return that with its unit.',
                    },
                    {
                    type: 'image_url',
                    image_url: {
                        url: normalizedImageUri,
                    },
                    },
                ],
            }
        ],

        // Ask Qwen3.5's chat template to disable thinking.
        chat_template_kwargs: {
            enable_thinking: false,
        },

        n_predict: 32,
        temperature: 0,
      });
         
      const executionTimeMs = Date.now() - start;

      console.log('Qwen OCR result:', result.text);
      console.log(`Qwen OCR took ${executionTimeMs} ms`);

      return {
        text: result.text.trim(),
        confidence: null,
        executionTimeMs,
        engine: 'Qwen3.5-0.8B',
      };
    } catch (error) {
      console.error('Qwen OCR failed:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (!this.context) {
      return;
    }

    const context = this.context;
    this.context = null;

    try {
      await context.releaseMultimodal();
    } finally {
      await context.release();
    }

    console.log('Qwen OCR resources released.');
  }
}