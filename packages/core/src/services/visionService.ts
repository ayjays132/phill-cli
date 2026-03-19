/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../index.js';
import { MoondreamVisionProcessor, debugLogger, AuthType } from '../index.js';
import type { Buffer } from 'node:buffer';

export class VisionService {
  private static instance: VisionService;
  private moondreamService: MoondreamVisionProcessor | null = null;

  private constructor(private readonly config: Config) {}

  static getInstance(config: Config): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService(config);
    }
    return VisionService.instance;
  }

  private getMoondreamService(): MoondreamVisionProcessor {
    if (!this.moondreamService) {
      this.moondreamService = MoondreamVisionProcessor.getInstance(this.config);
    }
    return this.moondreamService;
  }

  async describeImage(
    imageBuffer: Buffer,
    prompt: string = 'Describe this image in detail.',
  ): Promise<string> {
    const authType = this.config.getAuthType();
    const currentModel = this.config.getModel();

    // 1. Check for Gemini Vision (Primary)
    // If we are using a Gemini-compatible provider and a Gemini model, use native vision.
    const isGeminiAuth =
      authType === AuthType.USE_GEMINI ||
      authType === AuthType.USE_VERTEX_AI ||
      authType === AuthType.LOGIN_WITH_GOOGLE ||
      authType === AuthType.COMPUTE_ADC;

    const isGeminiModel =
      currentModel.startsWith('gemini-') ||
      currentModel.includes('flash') ||
      currentModel.includes('pro');

    if (isGeminiAuth && isGeminiModel) {
      // We let the LLM handle the image directly via multimodal parts.
      // Returning 'GEMINI_NATIVE' tells the caller (like PhysicalPerceptionService)
      // that it doesn't need to generate a text description fallback.
      return 'GEMINI_NATIVE';
    }

    // 2. Check for Native Multi-modal (Secondary)
    // Placeholder for other multi-modal models (OpenAI, Anthropic, etc.)

    // 3. Fallback to Local Vision Model (Tertiary)
    debugLogger.log('Using Local Vision Model for fallback...');
    return this.getMoondreamService().describeImage(imageBuffer, prompt);
  }
}
