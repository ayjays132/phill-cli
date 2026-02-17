
import {
  AutoProcessor,
  AutoTokenizer,
  AutoModelForVision2Seq,
  RawImage,
  env
} from '@xenova/transformers';
import * as path from 'path';
import * as fs from 'fs';
import { Buffer } from 'node:buffer';
import { Config } from '../config/config.js';
import { HardwareTTCService } from '../services/hardwareTtcService.js';

// Configure local cache directory for models
env.localModelPath = path.join(process.cwd(), 'models');
env.allowRemoteModels = true;
env.allowLocalModels = true;


export class MoondreamService {
  private static instance: MoondreamService;
  private model: any | null = null;
  private processor: any | null = null;
  private tokenizer: any | null = null;
  private classifier: any | null = null;
  private classifierProcessor: any | null = null;
  private modelsPath: string;
  private modelId = 'Xenova/vit-gpt2-image-captioning';
  private classifierId = 'Xenova/mobilenet_v2_1.0_224';

  private constructor(config: Config) {
      // Set model path relative to project root or user data
      this.modelsPath = path.join(config.storage.getProjectTempDir(), 'models');
      env.cacheDir = this.modelsPath;
  }

  public static getInstance(config: Config): MoondreamService {
    if (!MoondreamService.instance) {
      MoondreamService.instance = new MoondreamService(config);
    }
    return MoondreamService.instance;
  }

  async initialize() {
    if (this.model) return;

    console.log(`Loading Local Vision model (${this.modelId})...`);
    // Note: Using vit-gpt2 as a robust fallback for Moondream2 which is currently 
    // waiting on transformers.js v3 support or manual architecture implementation.
    // vit-gpt2 provides reliable image captioning for the Browser Agent.
    
    // Ensure model directory exists
    if (!fs.existsSync(this.modelsPath)) {
        fs.mkdirSync(this.modelsPath, { recursive: true });
    }

    try {
      let loaded = false;
      const hardwareTtc = HardwareTTCService.getInstance();
      const { device, dtype } = await hardwareTtc.getBestHardwareTier({
          allowBF16: true,
          allowFP16: true,
          quantization: 'q8'
      });

      console.log(`TTC System selected hardware: ${device} with ${dtype}`);

      try {
        this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
        this.processor = await AutoProcessor.from_pretrained(this.modelId);
        this.model = await AutoModelForVision2Seq.from_pretrained(this.modelId, {
            dtype: dtype as any, 
            device: device as any,
            use_external_data_format: true,
        } as any);
        console.log(`Successfully loaded Local Vision Model via TTC Tier.`);
        loaded = true;
      } catch (e) {
        console.warn(`Failed to load via optimized TTC tier, falling back to safe defaults...`, e);
        // Traditional fallback loop
        const quantizationLevels = ['q4', 'q8', 'fp32'];
        for (const quant of quantizationLevels) {
            try {
              this.model = await AutoModelForVision2Seq.from_pretrained(this.modelId, {
                  dtype: quant as any, 
                  device: 'auto',
                  use_external_data_format: true,
              } as any);
              loaded = true;
              break;
            } catch (inner) {
                console.warn(`Fallback to ${quant} failed.`);
            }
        }
      }

      if (!loaded) {
          throw new Error('Failed to load Local Vision Model with any quantization level.');
      }

      // Load MobileNetV2 classifier for additional context (Tag-Team)
      try {
          console.log(`Loading Classifier model (${this.classifierId})...`);
          const { AutoModelForImageClassification } = await import('@xenova/transformers');
          this.classifierProcessor = await AutoProcessor.from_pretrained(this.classifierId);
          this.classifier = await AutoModelForImageClassification.from_pretrained(this.classifierId, {
              dtype: 'fp32', // Classifiers are small, fp32 is fine
              device: 'auto',
          } as any);
          console.log('Classifier model loaded.');
      } catch (e) {
          console.warn('Failed to load classifier model, proceeding with captioning only:', e);
      }
      
      console.log('Local Vision Service initialization complete.');
    } catch (error) {
      console.error('Failed to load Local Vision Model:', error);
      throw error;
    }
  }

  async describeImage(imageBuffer: Buffer, prompt: string = 'Describe this image.'): Promise<string> {
    if (!this.model) await this.initialize();

    try {
      // 0. Use RawImage.read for robust buffer handling (cast for TS)
      const image = await (RawImage as any).read(imageBuffer);

      // 1. Tag-Team Step: Get classification labels
      let hints = '';
      if (this.classifier) {
        const classInputs = await this.classifierProcessor(image);
        const { logits } = await this.classifier(classInputs);
        const labels = this.classifier.config.id2label;
        
        // Get top 3 labels
        const scores = logits.data as Float32Array;
        const topIndices = Array.from({ length: scores.length }, (_, i) => i)
          .sort((a: number, b: number) => scores[b] - scores[a])
          .slice(0, 3);
        
        const topLabels = topIndices.map(i => (labels as any)[i]);
        hints = ` Objects detected: ${topLabels.join(', ')}.`;
        console.log('MobileNet Hints:', hints);
      }

      // 2. Captioning Step: Use hints as prefix (decoder_input_ids)
      const inputs = await this.processor(image);
      let decoderInputIds = undefined;
      
      if (hints) {
        const { input_ids } = await this.tokenizer(hints, { add_special_tokens: false });
        decoderInputIds = input_ids;
      }
      
      // Generate
      const outputs = await this.model.generate({
        ...inputs,
        decoder_input_ids: decoderInputIds,
        max_new_tokens: 100,
      });

      // Decode
      const result = this.tokenizer.batch_decode(outputs, { skip_special_tokens: true });
      return result[0].trim();
    } catch (error) {
      console.error('Error describing image with Local Vision:', error);
      return 'Error analyzing image.';
    }
  }
}
