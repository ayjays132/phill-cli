/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config } from '../config/config.js';
import { debugLogger } from '../utils/debugLogger.js';
import { getCodeAssistServer } from '../code_assist/codeAssist.js';
import { AuthType } from '../core/contentGenerator.js';

export interface VideoGenerationParams {
  prompt: string;
  model: string;
  config?: {
    aspectRatio?: '16:9' | '9:16';
    resolution?: '720p' | '1080p' | '4k';
    durationSeconds?: number;
    negativePrompt?: string;
    lastFrame?: { imageBytes: string; mimeType: string };
    referenceImages?: Array<{
      image: { imageBytes: string; mimeType: string };
      referenceType: string;
    }>;
    numberOfVideos?: number;
  };
  image?: { imageBytes: string; mimeType: string };
  video?: { videoBytes: string; mimeType: string };
}

export interface VideoGenerationResult {
  path: string;
  filename: string;
  prompt: string;
  model: string;
  status: 'success' | 'error';
  error?: string;
}

export class VideoGenerationService {
  private static instance: VideoGenerationService;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  private constructor() {}

  static getInstance(): VideoGenerationService {
    if (!VideoGenerationService.instance) {
      VideoGenerationService.instance = new VideoGenerationService();
    }
    return VideoGenerationService.instance;
  }

  private isOpenAiAuth(config: Config): boolean {
    const authType = config.getContentGeneratorConfig()?.authType;
    return (
      authType === AuthType.OPENAI || authType === AuthType.OPENAI_BROWSER
    );
  }

  private getOpenAiVideoModel(): string {
    return process.env['OPENAI_VIDEO_MODEL'] || 'sora-2';
  }

  private async generateVideoViaOpenAi(
    config: Config,
    params: VideoGenerationParams,
    outputFile?: string,
  ): Promise<VideoGenerationResult> {
    const contentConfig = config.getContentGeneratorConfig();
    const endpoint =
      contentConfig?.openAi?.endpoint ||
      config.openAI?.endpoint ||
      process.env['OPENAI_ENDPOINT'] ||
      'https://api.openai.com/v1';
    const apiKey =
      contentConfig?.openAi?.apiKey ||
      config.openAI?.apiKey ||
      process.env['OPENAI_API_KEY'];

    if (!apiKey) {
      return {
        path: '',
        filename: '',
        prompt: params.prompt,
        model: this.getOpenAiVideoModel(),
        status: 'error',
        error:
          'OpenAI video fallback requires OPENAI_API_KEY (or OpenAI browser sign-in token).',
      };
    }

    const model = this.getOpenAiVideoModel();
    const normalizedEndpoint = endpoint.replace(/\/+$/, '');
    const requestBody = {
      model,
      prompt: params.prompt,
      n: Math.max(1, params.config?.numberOfVideos ?? 1),
      size:
        params.config?.resolution === '4k'
          ? '2160p'
          : params.config?.resolution || '1080p',
      duration: params.config?.durationSeconds,
    };

    const response = await fetch(`${normalizedEndpoint}/videos/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `OpenAI video fallback API error: ${response.status} ${errText}`,
      );
    }

    const payload = (await response.json()) as any;
    const first = payload?.data?.[0];
    const b64 =
      first?.b64_json || first?.video?.b64_json || first?.output_video;
    const uri = first?.url || first?.video?.url || first?.uri;

    let videoBuffer: Buffer;
    if (typeof b64 === 'string' && b64.length > 0) {
      videoBuffer = Buffer.from(b64, 'base64');
    } else if (typeof uri === 'string' && uri.length > 0) {
      const dl = await fetch(uri, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!dl.ok) {
        throw new Error(
          `OpenAI video fallback download failed: ${dl.status} ${dl.statusText}`,
        );
      }
      videoBuffer = Buffer.from(await dl.arrayBuffer());
    } else {
      throw new Error(
        'OpenAI video fallback returned no video data (expected base64 or URL).',
      );
    }

    const finalFilename = outputFile || `video_${Date.now()}.mp4`;
    const absolutePath = path.isAbsolute(finalFilename)
      ? finalFilename
      : path.join(config.getProjectRoot(), finalFilename);

    fs.writeFileSync(absolutePath, videoBuffer);

    return {
      path: absolutePath,
      filename: path.basename(absolutePath),
      prompt: params.prompt,
      model,
      status: 'success',
    };
  }

  async generateVideo(
    config: Config,
    params: VideoGenerationParams,
    outputFile?: string,
  ): Promise<VideoGenerationResult> {
    const contentGenConfig = config.getContentGeneratorConfig();
    const isOpenAi = this.isOpenAiAuth(config);
    const apiKey = contentGenConfig?.apiKey;

    let url = `${this.baseUrl}/models/${params.model}:generateVideos`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      url += `?key=${apiKey}`;
    } else {
      const server = getCodeAssistServer(config);
      if (server) {
        const { token } = await server.client.getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }

    if (!apiKey && !headers['Authorization']) {
      if (isOpenAi) {
        debugLogger.warn(
          '[VideoGenerationService] Gemini credentials unavailable under OpenAI/Codex auth. Falling back to OpenAI video endpoint.',
        );
        try {
          return await this.generateVideoViaOpenAi(config, params, outputFile);
        } catch (fallbackError: any) {
          return {
            path: '',
            filename: '',
            prompt: params.prompt,
            model: params.model,
            status: 'error',
            error: fallbackError?.message || String(fallbackError),
          };
        }
      }

      throw new Error(
        'Video generation requires either a Gemini API Key or an active Oauth session.',
      );
    }

    try {
      debugLogger.log(
        `[VideoGenerationService] Starting generation with model: ${params.model}`,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (isOpenAi) {
          debugLogger.warn(
            `[VideoGenerationService] Gemini video API failed (${response.status}). Falling back to OpenAI video endpoint.`,
          );
          try {
            return await this.generateVideoViaOpenAi(config, params, outputFile);
          } catch (fallbackError: any) {
            throw new Error(
              `API Error: ${response.status} ${errText}; OpenAI fallback failed: ${
                fallbackError?.message || String(fallbackError)
              }`,
            );
          }
        }
        throw new Error(`API Error: ${response.status} ${errText}`);
      }

      const operation = await response.json();
      const operationName = (operation as { name: string }).name;

      debugLogger.log(
        `[VideoGenerationService] Operation started: ${operationName}. Polling...`,
      );
      const pollResult = await this.pollOperation(
        operationName,
        apiKey,
        headers,
      );

      if (pollResult.error) {
        throw new Error(
          `Generation failed: ${JSON.stringify(pollResult.error)}`,
        );
      }

      // Handle REST response structure: response.generateVideoResponse.generatedSamples
      const genVideoResp = (pollResult.response as any).generateVideoResponse;
      if (!genVideoResp || !genVideoResp.generatedSamples) {
        throw new Error(
          'Invalid API response structure: missing generateVideoResponse or generatedSamples',
        );
      }
      const sample = genVideoResp.generatedSamples[0];
      const videoInfo = sample.video;

      let videoBuffer: Buffer;

      if (videoInfo.videoBytes) {
        if (typeof videoInfo.videoBytes !== 'string') {
          throw new Error(
            `Invalid videoBytes type: ${typeof videoInfo.videoBytes}`,
          );
        }
        videoBuffer = Buffer.from(videoInfo.videoBytes, 'base64');
      } else if (videoInfo.uri) {
        debugLogger.log(
          `[VideoGenerationService] Downloading video from URI: ${videoInfo.uri}`,
        );
        const downloadUrl = apiKey
          ? `${videoInfo.uri}?key=${apiKey}`
          : videoInfo.uri;
        const downloadResp = await fetch(downloadUrl, { headers });
        if (!downloadResp.ok) {
          throw new Error(
            `Failed to download video from URI: ${downloadResp.status}`,
          );
        }
        videoBuffer = Buffer.from(await downloadResp.arrayBuffer());
      } else {
        throw new Error('No video data or URI found in response.');
      }

      const mimeType = videoInfo.mimeType || 'video/mp4';
      const extension = mimeType.split('/')[1] || 'mp4';

      const finalFilename = outputFile || `video_${Date.now()}.${extension}`;
      const absolutePath = path.isAbsolute(finalFilename)
        ? finalFilename
        : path.join(config.getProjectRoot(), finalFilename);

      fs.writeFileSync(absolutePath, videoBuffer);

      debugLogger.log(
        `[VideoGenerationService] Video saved to: ${absolutePath}`,
      );

      return {
        path: absolutePath,
        filename: path.basename(absolutePath),
        prompt: params.prompt,
        model: params.model,
        status: 'success',
      };
    } catch (error: any) {
      debugLogger.error(`[VideoGenerationService] Error: ${error.message}`);
      return {
        path: '',
        filename: '',
        prompt: params.prompt,
        model: params.model,
        status: 'error',
        error: error.message,
      };
    }
  }

  private async pollOperation(
    operationName: string,
    apiKey: string | undefined,
    headers: Record<string, string>,
  ): Promise<any> {
    const pollUrlBase = `${this.baseUrl}/operations/${operationName}`;
    const maxAttempts = 120; // 20 minutes (10s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;

      const pollUrl = apiKey ? `${pollUrlBase}?key=${apiKey}` : pollUrlBase;
      const response = await fetch(pollUrl, { headers });

      if (!response.ok) {
        debugLogger.warn(
          `[VideoGenerationService] Polling error: ${response.status}. Retrying...`,
        );
        continue;
      }

      const operation = (await response.json()) as any;
      if (operation.done) {
        return operation;
      }

      debugLogger.debug(
        `[VideoGenerationService] Polling... (${attempts * 10}s)`,
      );
    }

    throw new Error('Video generation timed out after 20 minutes.');
  }
}
