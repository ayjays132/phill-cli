import { Config } from '../config/config.js';
import { MoondreamService } from '../vision/moondream.js';
import { AuthType } from '../core/contentGenerator.js';
import { Buffer } from 'node:buffer';

export class VisionService {
  private static instance: VisionService;
  private config: Config;
  private moondreamService: MoondreamService | null = null;

  private constructor(config: Config) {
    this.config = config;
  }

  public static getInstance(config: Config): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService(config);
    }
    return VisionService.instance;
  }

  private getMoondreamService(): MoondreamService {
      if (!this.moondreamService) {
          this.moondreamService = MoondreamService.getInstance(this.config);
      }
      return this.moondreamService;
  }

  async describeImage(imageBuffer: Buffer, prompt: string = 'Describe this image in detail.'): Promise<string> {
    const authType = this.config.getAuthType();

    // 1. Check for Gemini Vision (Primary)
    // Assuming all Gemini models support vision or gracefully handle it
    // Ideally we'd check model capability flags
    if (authType === AuthType.USE_GEMINI || authType === AuthType.USE_VERTEX_AI) {
        // We let the LLM handle the image directly via parts if it's Gemini
        // But if this service is called explicitly for a description string (e.g. for accessibility tree enrichment),
        // we might want to use the LLM to generate it.
        // However, the prompt implies "fallback" logic for when the MAIN LLM CANNOT see.
        // If the main LLM is Gemini, it CAN see.
        // So this service might return "GEMINI_NATIVE" or similar to indicate "Don't describe, just attach".
        // But for "Browser Agent", we might want a text description for lighter context.
        return "GEMINI_NATIVE"; 
    }

    // 2. Check for Native Vision Model (Secondary)
    // Todo: Implement check for Ollama/HF vision capabilities of current model

    // 3. Fallback to Local Vision Model (Tertiary)
    console.log('Using Local Vision Model for fallback...');
    return await this.getMoondreamService().describeImage(imageBuffer, prompt);
  }
}
