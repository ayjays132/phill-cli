/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Types are loaded dynamically in this module; the static type-only imports were unused.
import * as nodePath from 'node:path';
import * as nodeFs from 'node:fs';
import type { Buffer } from 'node:buffer';

/** Minimal interface for the Config object we need at construction time. */
interface VisionConfig {
  storage: { getProjectTempDir(): string };
}

type TransformersModule = typeof import('@huggingface/transformers');

export class MoondreamVisionProcessor {
  private static instance: MoondreamVisionProcessor;
  private model: unknown = null;
  private processor: unknown = null;
  private tokenizer: unknown = null;
  private classifier: unknown = null;
  private classifierProcessor: unknown = null;
  private modelsPath: string;
  private modelId = 'onnx-community/blip-image-captioning-base';
  private classifierId = 'onnx-community/mobilenetv2_050.lamb_in1k';

  private initializationFailed = false;
  private transformersPromise: Promise<TransformersModule> | null = null;

  private constructor(config: VisionConfig) {
    this.modelsPath = nodePath.join(
      config.storage.getProjectTempDir(),
      'models',
    );
  }

  private async getTransformers(): Promise<TransformersModule> {
    if (!this.transformersPromise) {
      this.transformersPromise = import('@huggingface/transformers');
    }
    const transformers = await this.transformersPromise;
    transformers.env.allowRemoteModels = true;
    transformers.env.allowLocalModels = true;
    transformers.env.cacheDir = this.modelsPath;
    return transformers;
  }

  static getInstance(config: VisionConfig): MoondreamVisionProcessor {
    if (!MoondreamVisionProcessor.instance) {
      MoondreamVisionProcessor.instance = new MoondreamVisionProcessor(config);
    }
    return MoondreamVisionProcessor.instance;
  }

  async initialize(): Promise<void> {
    if (this.model || this.initializationFailed) return;

    // Ensure model directory exists
    if (!nodeFs.existsSync(this.modelsPath)) {
      nodeFs.mkdirSync(this.modelsPath, { recursive: true });
    }

    let loaded = false;

    // Use safe defaults — HardwareTTC optimisation is applied at a higher layer
    const device = 'auto';
    const dtype = 'fp32';

    // Transformer options — HuggingFace types vary, cast through unknown
    const { AutoProcessor, AutoTokenizer, AutoModelForVision2Seq } =
      await this.getTransformers();
    type PretrainedOpts = Parameters<
      typeof AutoModelForVision2Seq.from_pretrained
    >[1];

    try {
      this.tokenizer = await AutoTokenizer.from_pretrained(
        this.modelId,
        {} as Parameters<typeof AutoTokenizer.from_pretrained>[1],
      );
      this.processor = await AutoProcessor.from_pretrained(
        this.modelId,
        {} as Parameters<typeof AutoProcessor.from_pretrained>[1],
      );
      this.model = await AutoModelForVision2Seq.from_pretrained(this.modelId, {
        dtype,
        device,
        use_external_data_format: true,
      } as PretrainedOpts);
      loaded = true;
    } catch (_e) {
      // fallback to simpler quantization levels
      const quantizationLevels = ['q4', 'q8', 'fp32'];
      for (const quant of quantizationLevels) {
        try {
          this.model = await AutoModelForVision2Seq.from_pretrained(
            this.modelId,
            {
              dtype: quant,
              device: 'auto',
              use_external_data_format: true,
            } as Parameters<typeof AutoModelForVision2Seq.from_pretrained>[1],
          );
          loaded = true;
          break;
        } catch (_inner) {
          // try next quantization level
        }
      }
    }

    if (!loaded) {
      this.initializationFailed = true;
      // eslint-disable-next-line no-console
      console.error(
        '[Vision] Failed to load Local Vision Model with any quantization level. Disabling local fallback.',
      );
      return;
    }

    // Load MobileNetV2 classifier for tag-team context (optional)
    try {
      const { AutoModelForImageClassification } = await this.getTransformers();
      this.classifierProcessor = await AutoProcessor.from_pretrained(
        this.classifierId,
        {} as Parameters<typeof AutoProcessor.from_pretrained>[1],
      );
      this.classifier = await AutoModelForImageClassification.from_pretrained(
        this.classifierId,
        { dtype: 'fp32', device: 'auto' } as Parameters<
          typeof AutoModelForImageClassification.from_pretrained
        >[1],
      );
    } catch (_e) {
      // classifier is optional — proceed with captioning only
    }
  }

  async describeImage(
    imageBuffer: Buffer,
    _prompt: string = 'Describe this image.',
  ): Promise<string> {
    if (!this.model) await this.initialize();

    try {
      // Dynamically import RawImage at runtime to read the image buffer
      const tfModule = await this.getTransformers();
      const RawImageCtor = (tfModule as Record<string, unknown>)[
        'RawImage'
      ] as {
        read(buf: Buffer): Promise<unknown>;
      };
      const image = await RawImageCtor.read(imageBuffer);

      // Tag-Team Step: Get classification labels for hints
      let hints = '';
      if (this.classifier && this.classifierProcessor) {
        try {
          const callableProcessor = this.classifierProcessor as (
            img: unknown,
          ) => Promise<unknown>;
          const callableClassifier = this.classifier as (
            inputs: unknown,
          ) => Promise<{ logits: { data: Float32Array } }>;
          const classInputs = await callableProcessor(image);
          const { logits } = await callableClassifier(classInputs);
          const classifierWithConfig = this.classifier as {
            config: { id2label: Record<number, string> };
          };
          const labels = classifierWithConfig.config.id2label;
          const scores = logits.data;
          const topIndices = Array.from({ length: scores.length }, (_, i) => i)
            .sort((a, b) => scores[b] - scores[a])
            .slice(0, 3);
          const topLabels = topIndices.map((i) => labels[i] ?? '');
          hints = ` Objects detected: ${topLabels.join(', ')}.`;
        } catch (_e) {
          // hints stay empty
        }
      }

      // Captioning Step
      const callableProcessor = this.processor as (
        img: unknown,
      ) => Promise<Record<string, unknown>>;
      const inputs = await callableProcessor(image);
      let decoderInputIds: unknown = undefined;
      if (hints) {
        const callableTokenizer = this.tokenizer as (
          text: string,
          opts: Record<string, unknown>,
        ) => Promise<{ input_ids: unknown }>;
        const { input_ids } = await callableTokenizer(hints, {
          add_special_tokens: false,
        });
        decoderInputIds = input_ids;
      }

      const modelWithGenerate = this.model as {
        generate(opts: Record<string, unknown>): Promise<unknown>;
      };
      const outputs = await modelWithGenerate.generate({
        ...inputs,
        decoder_input_ids: decoderInputIds,
        max_new_tokens: 100,
      });

      const decodingTokenizer = this.tokenizer as {
        batch_decode(outputs: unknown, opts: Record<string, unknown>): string[];
      };
      const result = decodingTokenizer.batch_decode(outputs, {
        skip_special_tokens: true,
      });
      return result[0]?.trim() ?? '';
    } catch (error) {
      void error;
      return 'Error analyzing image.';
    }
  }
}
