/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ToolInvocation, ToolResult } from '../tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from '../tools.js';
import type { Config } from '../../config/config.js';
import { MessageBus } from '../../confirmation-bus/message-bus.js';
import { debugLogger } from '../../utils/debugLogger.js';
import { PHILLAMENT_TOOL_NAME } from '../tool-names.js';
import { getCodeAssistServer } from '../../code_assist/codeAssist.js';
import { AuthType } from '../../core/contentGenerator.js';

export interface PhillamentToolParams {
  prompt: string;
  model?:
    | 'imagen-4.0-generate-001'
    | 'imagen-4.0-ultra-generate-001'
    | 'imagen-4.0-fast-generate-001'
    | 'gemini-3-pro-image-preview';
  backend?: 'gemini-api' | 'imagen-api';
  numberOfImages?: number; // 1 to 4
  imageSize?: '160p' | '320p' | '640p' | '1K' | '2K';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow';
  outputFile?: string;
}

class PhillamentToolInvocation extends BaseToolInvocation<
  PhillamentToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: PhillamentToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  private isOpenAiAuth(): boolean {
    const authType = this.config.getContentGeneratorConfig()?.authType;
    return (
      authType === AuthType.OPENAI || authType === AuthType.OPENAI_BROWSER
    );
  }

  private async resolveGoogleAuth(): Promise<{
    apiKey?: string;
    bearerToken?: string;
  }> {
    const contentGenConfig = await this.config.getContentGeneratorConfig();
    const apiKey = contentGenConfig?.apiKey;
    if (apiKey) {
      return { apiKey };
    }

    const server = getCodeAssistServer(this.config);
    if (server) {
      try {
        const { token } = await server.client.getAccessToken();
        if (token) {
          return { bearerToken: token };
        }
      } catch (error: unknown) {
        debugLogger.warn(
          `[PhillamentTool] Failed to fetch OAuth access token: ${String(error)}`,
        );
      }
    }
    return {};
  }

  private isAccessTokenScopeInsufficient(errorText: string): boolean {
    const normalized = errorText.toLowerCase();
    return (
      normalized.includes('access_token_scope_insufficient') ||
      normalized.includes('insufficient authentication scopes')
    );
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const {
      prompt,
      model = 'gemini-3-pro-image-preview',
      backend = model === 'gemini-3-pro-image-preview'
        ? 'gemini-api'
        : 'imagen-api',
      numberOfImages = 1,
      imageSize = '1K',
      aspectRatio = '1:1',
      personGeneration = 'allow_adult',
      outputFile,
    } = this.params;

    const auth = await this.resolveGoogleAuth();

    // --- PROMPT SCAFFOLDING (The "High Prompt" logic) ---
    const highPrompt = `[PHOTO_MODE_HIGH_FIDELITY_GEN]
[Scene Consistency: Enabled]
[Spatial Tokenization: Active]

USER_INPUT: ${prompt}

[DETAILED_EXPANSION]:
Create a highly stable, consistent scene based on the user input. Ensure spatial relationships are logically sound and visually cohesive. Use professional lighting, high-frequency texture detail, and consistent artistic direction. If multiple objects are involved, maintain clear spatial placement and scale.

STYLE: Cinematic, High-Fidelity, Photorealistic if not specified otherwise.
COMPOSITION: Balanced, following the rule of thirds if applicable.
LIGHTING: Natural depth with consistent shadows.

[FINAL_IMAGEN_PROMPT]:
${prompt}, extreme detail, consistent composition, high resolution, professional quality.`;

    debugLogger.debug(
      `[PhillamentTool] Executing image generation with prompt: ${prompt} via ${backend}`,
    );

    const images: string[] = [];

    if (backend === 'gemini-api') {
      if (!auth.apiKey && !auth.bearerToken) {
        if (this.isOpenAiAuth()) {
          debugLogger.warn(
            '[PhillamentTool] Gemini API key unavailable under OpenAI/Codex auth. Falling back to Imagen API backend.',
          );
          return this.executeWithImagenFallback(highPrompt, numberOfImages, aspectRatio, personGeneration, imageSize, outputFile, model);
        }
        throw new Error(
          'Photo Mode (Gemini API) requires either a Gemini API Key or an active Google Login session (OAuth).',
        );
      }

      try {
        debugLogger.debug(
          `[PhillamentTool] Attempting Nano Banana Pro (Gemini 3 Pro Image)...`,
        );
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        if (auth.apiKey) {
          url += `?key=${auth.apiKey}`;
        } else if (auth.bearerToken) {
          headers['Authorization'] = `Bearer ${auth.bearerToken}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: highPrompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['IMAGE'],
            },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            const base64Data =
              data.candidates[0].content.parts[0].inlineData.data;
            const customFilename = outputFile || `photo_${Date.now()}.png`;
            const absolutePath = path.isAbsolute(customFilename)
              ? customFilename
              : path.join(this.config.getProjectRoot(), customFilename);

            fs.writeFileSync(absolutePath, Buffer.from(base64Data, 'base64'));
            images.push(absolutePath);
          }
        } else {
          const errText = await response.text();
          throw new Error(`Gemini API Error: ${response.status} ${errText}`);
        }
      } catch (err: any) {
        debugLogger.error(
          `[PhillamentTool] Gemini generation failed: ${err.message}`,
        );
        if (this.isOpenAiAuth()) {
          debugLogger.warn(
            '[PhillamentTool] Gemini backend failed under OpenAI/Codex auth. Falling back to Imagen API backend.',
          );
          return this.executeWithImagenFallback(highPrompt, numberOfImages, aspectRatio, personGeneration, imageSize, outputFile, model);
        }
        throw err;
      }
    } else {
      return this.executeWithImagenFallback(
        highPrompt,
        numberOfImages,
        aspectRatio,
        personGeneration,
        imageSize,
        outputFile,
        model,
      );
    }

    if (images.length === 0) {
      throw new Error('Photo Mode failed to generate any images.');
    }

    const result = {
      paths: images,
      count: images.length,
      prompt: highPrompt,
      model,
      backend,
      status: 'success',
    };

    return {
      llmContent: JSON.stringify(result, null, 2),
      returnDisplay: `Generated ${images.length} high-fidelity photo(s) via Photo Mode (${model} / ${backend}).\nFiles: ${images.join(', ')}`,
    };
  }

  private async executeWithImagenFallback(
    highPrompt: string,
    numberOfImages: number,
    aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
    personGeneration: 'allow_adult' | 'allow_all' | 'dont_allow',
    imageSize: '160p' | '320p' | '640p' | '1K' | '2K',
    outputFile: string | undefined,
    requestedModel: PhillamentToolParams['model'],
  ): Promise<ToolResult> {
    const auth = await this.resolveGoogleAuth();
    const model = requestedModel === 'gemini-3-pro-image-preview'
      ? 'imagen-4.0-generate-001'
      : (requestedModel || 'imagen-4.0-generate-001');

    const images: string[] = [];

      // --- AUTHENTICATION RESOLUTION for Imagen API ---
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (auth.apiKey) {
        url += `?key=${auth.apiKey}`;
      } else {
        if (auth.bearerToken) {
          headers['Authorization'] = `Bearer ${auth.bearerToken}`;
          debugLogger.debug(`[PhillamentTool] Using OAuth Bearer Token.`);
        }
      }

      if (!auth.apiKey && !headers['Authorization']) {
        if (this.isOpenAiAuth()) {
          throw new Error(
            'Photo Mode fallback attempted under OpenAI/Codex auth, but no Gemini-compatible image backend credentials are available.',
          );
        }
        throw new Error(
          'Photo Mode (Imagen API) requires either a Gemini API Key or an active Google Login session (OAuth).',
        );
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            instances: [{ prompt: highPrompt }],
            parameters: {
              sampleCount: Math.max(1, Math.min(4, numberOfImages)),
              aspectRatio,
              personGeneration,
              ...(model.includes('ultra') || model === 'imagen-4.0-generate-001'
                ? { imageSize }
                : {}),
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          const oauthScopeIssue =
            !auth.apiKey &&
            Boolean(headers['Authorization']) &&
            this.isAccessTokenScopeInsufficient(errText);
          if (oauthScopeIssue) {
            debugLogger.warn(
              '[PhillamentTool] Imagen predict rejected OAuth token scope. Retrying with Gemini generateContent endpoint.',
            );
            const fallbackModel = 'gemini-3-pro-image-preview';
            const geminiHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            let geminiUrl =
              `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent`;
            if (auth.apiKey) {
              geminiUrl += `?key=${auth.apiKey}`;
            } else if (auth.bearerToken) {
              geminiHeaders['Authorization'] = `Bearer ${auth.bearerToken}`;
            }

            const geminiResp = await fetch(geminiUrl, {
              method: 'POST',
              headers: geminiHeaders,
              body: JSON.stringify({
                contents: [{ parts: [{ text: highPrompt }] }],
                generationConfig: { responseModalities: ['IMAGE'] },
              }),
            });
            if (!geminiResp.ok) {
              const gemErr = await geminiResp.text();
              throw new Error(
                `Imagen API Error: ${response.status} ${errText}; Gemini retry failed: ${geminiResp.status} ${gemErr}`,
              );
            }
            const gemData = (await geminiResp.json()) as any;
            const b64 = gemData?.candidates?.[0]?.content?.parts?.[0]
              ?.inlineData?.data;
            if (typeof b64 === 'string' && b64.length > 0) {
              const customFilename = outputFile || `photo_${Date.now()}.png`;
              const absolutePath = path.isAbsolute(customFilename)
                ? customFilename
                : path.join(this.config.getProjectRoot(), customFilename);
              fs.writeFileSync(absolutePath, Buffer.from(b64, 'base64'));
              images.push(absolutePath);
            } else {
              throw new Error(
                'Gemini retry returned no image payload after scope fallback.',
              );
            }
          } else {
            throw new Error(`Imagen API Error: ${response.status} ${errText}`);
          }
        }

        const data = response.ok ? ((await response.json()) as any) : undefined;
        if (data?.predictions && Array.isArray(data.predictions)) {
          for (let i = 0; i < data.predictions.length; i++) {
            const prediction = data.predictions[i];
            if (prediction.bytesBase64Encoded) {
              const base64Data = prediction.bytesBase64Encoded;
              const suffix = i === 0 ? '' : `_${i}`;
              const customFilename = outputFile
                ? outputFile.endsWith('.png')
                  ? outputFile.replace('.png', `${suffix}.png`)
                  : `${outputFile}${suffix}.png`
                : `photo_${Date.now()}${suffix}.png`;

              const absolutePath = path.isAbsolute(customFilename)
                ? customFilename
                : path.join(this.config.getProjectRoot(), customFilename);

              fs.writeFileSync(absolutePath, Buffer.from(base64Data, 'base64'));
              images.push(absolutePath);
            }
          }
        }
      } catch (err: any) {
        debugLogger.error(
          `[PhillamentTool] Imagen generation failed: ${err.message}`,
        );
        throw err;
      }

    if (images.length === 0) {
      throw new Error('Photo Mode failed to generate any images.');
    }

    const result = {
      paths: images,
      count: images.length,
      prompt: highPrompt,
      model,
      backend: 'imagen-api',
      status: 'success',
    };

    return {
      llmContent: JSON.stringify(result, null, 2),
      returnDisplay: `Generated ${images.length} high-fidelity photo(s) via Photo Mode (${model} / imagen-api).\nFiles: ${images.join(', ')}`,
    };
  }

  getDescription(): string {
    return `Synthesizing high-fidelity visual reality in Photo Mode: "${this.params.prompt.substring(0, 50)}..."`;
  }
}

export class PhillamentTool extends BaseDeclarativeTool<
  PhillamentToolParams,
  ToolResult
> {
  static readonly Name = PHILLAMENT_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      PhillamentTool.Name,
      'Photo Mode (Nano Banana Pro / Imagen 4.0)',
      'Ultra-high fidelity visual synthesis. Supports Nano Banana Pro (Gemini 3 Pro Image) and Imagen 4.0 with scene consistency.',
      Kind.Other,
      {
        properties: {
          prompt: {
            type: 'string',
            description: 'The user prompt to expand and generate.',
          },
          model: {
            type: 'string',
            enum: [
              'gemini-3-pro-image-preview',
              'imagen-4.0-generate-001',
              'imagen-4.0-ultra-generate-001',
              'imagen-4.0-fast-generate-001',
            ],
            default: 'gemini-3-pro-image-preview',
          },
          backend: {
            type: 'string',
            enum: ['gemini-api', 'imagen-api'],
            description:
              'The backend to use. gemini-api for Nano Banana Pro, imagen-api for Imagen 4.0.',
          },
          numberOfImages: {
            type: 'number',
            minimum: 1,
            maximum: 4,
            default: 1,
          },
          imageSize: {
            type: 'string',
            enum: ['160p', '320p', '640p', '1K', '2K'],
            default: '1K',
          },
          aspectRatio: {
            type: 'string',
            enum: ['1:1', '3:4', '4:3', '9:16', '16:9'],
            default: '1:1',
          },
          personGeneration: {
            type: 'string',
            enum: ['allow_adult', 'allow_all', 'dont_allow'],
            default: 'allow_adult',
          },
          outputFile: {
            type: 'string',
            description: 'Base filename to save the images.',
          },
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
    params: PhillamentToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<PhillamentToolParams, ToolResult> {
    return new PhillamentToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName ?? this.name,
      _toolDisplayName ?? this.displayName,
    );
  }
}
