import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ToolInvocation,
  ToolResult,
} from '../tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
} from '../tools.js';
import type { Config } from '../../config/config.js';
import { MessageBus } from '../../confirmation-bus/message-bus.js';
import { debugLogger } from '../../utils/debugLogger.js';
import { getCodeAssistServer } from '../../code_assist/codeAssist.js';

export const IMAGEN_GENERATE_TOOL_NAME = 'image_generation_imagen';

export interface ImagenGenerateToolParams {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high';
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow';
  backend?: 'vertex-ai' | 'banana-dev' | 'gemini-api';
  style?: string;
  outputFile?: string;
  ingredients?: {
    style?: string;
    lighting?: string;
    camera?: string;
    composition?: string;
    mood?: string;
  };
  seed?: number;
}

class ImagenGenerateToolInvocation extends BaseToolInvocation<
  ImagenGenerateToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ImagenGenerateToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { 
      prompt, 
      negativePrompt, 
      ingredients = {}, 
      style, 
      outputFile,
      backend: requestedBackend = 'vertex-ai' 
    } = this.params;
    
    // --- STYLE LOOKUP (Nano Banana Pro) ---
    if (style) {
      try {
        const presetsPath = path.join(this.config.getProjectRoot(), '.phill/visual_memory/styles.json');
        if (fs.existsSync(presetsPath)) {
          const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
          if (presets[style]) {
            debugLogger.debug(`[ImagenGenerateTool] Applying style preset: ${style}`);
            const presetIngredients = presets[style];
            ingredients.style = ingredients.style || presetIngredients.style;
            ingredients.lighting = ingredients.lighting || presetIngredients.lighting;
            ingredients.camera = ingredients.camera || presetIngredients.camera;
            ingredients.composition = ingredients.composition || presetIngredients.composition;
            ingredients.mood = ingredients.mood || presetIngredients.mood;
          }
        }
      } catch (err) {
        debugLogger.warn(`[ImagenGenerateTool] Style lookup failed: ${err}`);
      }
    }

    let fullPrompt = prompt;
    if (negativePrompt) fullPrompt += `\nNegative Prompt: ${negativePrompt}`;
    if (ingredients) {
      const parts = [];
      if (ingredients.style) parts.push(`Style: ${ingredients.style}`);
      if (ingredients.lighting) parts.push(`Lighting: ${ingredients.lighting}`);
      if (ingredients.camera) parts.push(`Camera: ${ingredients.camera}`);
      if (ingredients.composition) parts.push(`Composition: ${ingredients.composition}`);
      if (ingredients.mood) parts.push(`Mood: ${ingredients.mood}`);
      if (parts.length > 0) fullPrompt += `\n\nImage Ingredients:\n${parts.join(', ')}`;
    }

    const server = getCodeAssistServer(this.config);
    const contentGenConfig = await this.config.getContentGeneratorConfig();
    const apiKey = contentGenConfig?.apiKey;

    let base64Data = '';
    let usedBackend = '';

    // --- STRATEGY 1: VERTEX AI (Default or Requested) ---
    if (requestedBackend === 'vertex-ai' && server && server.projectId) {
        try {
            debugLogger.debug(`[ImagenGenerateTool] Attempting Vertex AI...`);
            const location = process.env['GOOGLE_CLOUD_LOCATION'] || 'us-central1';
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${server.projectId}/locations/${location}/publishers/google/models/imagegeneration@006:predict`;
            
            const response = await server.client.request({
                url,
                method: 'POST',
                data: {
                    instances: [{ prompt: fullPrompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: this.params.aspectRatio || '1:1',
                        safetySetting: this.params.safetyFilterLevel || 'block_medium_and_above',
                        personGeneration: this.params.personGeneration || 'allow_adult',
                    }
                }
            });

            const data = response.data as any;
            if (data.predictions?.[0]?.bytesBase64Encoded) {
                base64Data = data.predictions[0].bytesBase64Encoded;
                usedBackend = 'vertex-ai';
            }
        } catch (err: any) {
            debugLogger.warn(`[ImagenGenerateTool] Vertex AI failed: ${err.message}. Falling back...`);
        }
    }

    // --- STRATEGY 2: BANANA.DEV (Custom Relay or API) ---
    if (!base64Data && requestedBackend === 'banana-dev') {
        const bananaKey = process.env['BANANA_API_KEY'];
        if (bananaKey) {
            try {
                debugLogger.debug(`[ImagenGenerateTool] Attempting Banana.dev...`);
                // This is a placeholder for the actual Banana.dev implementation
                // For now, we fall back to Gemini API but mark it as banana-dev
            } catch (err: any) {
                debugLogger.warn(`[ImagenGenerateTool] Banana.dev failed: ${err.message}`);
            }
        }
    }

    // --- STRATEGY 3: GEMINI API (Imagen 3 / Nano Banana Pro) ---
    if (!base64Data && apiKey) {
        try {
            debugLogger.debug(`[ImagenGenerateTool] Attempting Gemini API Fallback...`);
            // Use gemini-3-pro-image-preview as documented for Nano Banana Pro
            const modelId = 'gemini-3-pro-image-preview';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE"]
                    }
                })
            });

            if (response.ok) {
                const data = await response.json() as any;
                if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                    base64Data = data.candidates[0].content.parts[0].inlineData.data;
                    usedBackend = 'gemini-api';
                }
            } else {
                // Try legacy predict endpoint as fallback
                const legacyUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
                const legacyResponse = await fetch(legacyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instances: [{ prompt: fullPrompt }],
                        parameters: {
                            aspectRatio: this.params.aspectRatio || '1:1',
                            personGeneration: this.params.personGeneration || 'allow_adult',
                        }
                    })
                });

                if (legacyResponse.ok) {
                    const legacyData = await legacyResponse.json() as any;
                    if (legacyData.predictions?.[0]?.bytesBase64Encoded) {
                        base64Data = legacyData.predictions[0].bytesBase64Encoded;
                        usedBackend = 'gemini-api';
                    }
                }
            }
        } catch (err: any) {
            debugLogger.warn(`[ImagenGenerateTool] Gemini API fallback failed: ${err.message}`);
        }
    }

    if (!base64Data) {
        throw new Error('All image synthesis backends failed.');
    }

    // --- FINALIZE: SAVE LOCALLY ---
    const filename = outputFile || `synthesis_${Date.now()}.png`;
    const absolutePath = path.isAbsolute(filename) 
        ? filename 
        : path.join(this.config.getProjectRoot(), filename);
    
    fs.writeFileSync(absolutePath, Buffer.from(base64Data, 'base64'));

    const result = {
        path: absolutePath,
        filename: path.basename(absolutePath),
        prompt: fullPrompt,
        backend: usedBackend,
        status: 'success'
    };

    return {
        llmContent: JSON.stringify(result, null, 2),
        returnDisplay: `Generated image successfully: ${absolutePath} (via ${usedBackend})`,
    };
  }

  getDescription(): string {
    return `Synthesizing visual reality: "${this.params.prompt.substring(0, 50)}..."`;
  }
}

export class ImagenGenerateTool extends BaseDeclarativeTool<
  ImagenGenerateToolParams,
  ToolResult
> {
  static readonly Name = IMAGEN_GENERATE_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      ImagenGenerateTool.Name,
      'Image Generation (Nano Banana Pro)',
      'High-fidelity visual synthesis with local persistence and style memory.',
      Kind.Other,
      {
        properties: {
          prompt: { type: 'string', description: 'The main text description.' },
          negativePrompt: { type: 'string', description: 'What to exclude.' },
          aspectRatio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4'] },
          style: { type: 'string', description: 'Preset style name (e.g., phillbook_core, manga_action).' },
          outputFile: { type: 'string', description: 'Local path or filename to save the image.' },
          ingredients: {
            type: 'object',
            properties: {
              style: { type: 'string' },
              lighting: { type: 'string' },
              camera: { type: 'string' },
              composition: { type: 'string' },
              mood: { type: 'string' },
            },
          },
          backend: { type: 'string', enum: ['vertex-ai', 'banana-dev', 'gemini-api'] },
        },
        required: ['prompt'],
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: ImagenGenerateToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ImagenGenerateToolParams, ToolResult> {
    return new ImagenGenerateToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}