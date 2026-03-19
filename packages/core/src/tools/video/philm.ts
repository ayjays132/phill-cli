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
import { PHILM_MODE_TOOL_NAME } from '../tool-names.js';
import { VideoGenerationService } from '../../services/videoGenerationService.js';
import type { VideoGenerationParams } from '../../services/videoGenerationService.js';
import {
  PREVIEW_VEO_3_1_MODEL,
  PREVIEW_VEO_3_1_FAST_MODEL,
  STABLE_VEO_2_MODEL,
} from '../../config/models.js';

export interface PhilmToolParams {
  prompt: string;
  model?: string;
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p' | '4k';
  durationSeconds?: 4 | 6 | 8;
  imageInput?: string; // Path or Base64 for first frame
  lastFrame?: string; // Path or Base64 for last frame (interpolation)
  videoSource?: string; // Video identifier or path for extension
  referenceImages?: string[]; // Up to 3 reference images
  negativePrompt?: string;
  outputFile?: string;
}

class PhilmToolInvocation extends BaseToolInvocation<
  PhilmToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: PhilmToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const {
      prompt,
      model = PREVIEW_VEO_3_1_MODEL,
      aspectRatio = '16:9',
      resolution = '720p',
      durationSeconds = 8,
      imageInput,
      lastFrame,
      videoSource,
      referenceImages = [],
      negativePrompt,
      outputFile,
    } = this.params;

    // --- PROMPT SCAFFOLDING (The "Philm Director" logic) ---
    const highPrompt = `[PHILM_DIRECTOR_ACTIVE]
[Cinematic Fidelity: Ultra]
[Audio Synthesis: Enabled]

SCRIPT_CUE: ${prompt}

[DIRECTOR_NOTES]:
Synthesize a high-fidelity cinematic sequence. Pay extreme attention to physical consistency, lighting dynamics, and spatial depth. If dialogue is present in quotes, synchronize natural speech patterns. If sound effects are implied, layer them with professional atmosphere.

STYLE: Professional Cinema, High-Definition Textures.
CAMERA: Smooth movement, purposeful framing.

[FINAL_VEO_PROMPT]:
${prompt}${negativePrompt ? ` \n(Negative: ${negativePrompt})` : ''}`;

    debugLogger.debug(`[PhilmTool] Directing video synthesis: ${prompt}`);

    const videoService = VideoGenerationService.getInstance();

    const videoParams: VideoGenerationParams = {
      model,
      prompt: highPrompt,
      config: {
        aspectRatio,
        resolution,
        durationSeconds,
        negativePrompt,
      },
    };

    // Handle Image Inputs (First Frame)
    if (imageInput) {
      videoParams.image = this.prepareImageObject(imageInput);
    }

    // Handle Last Frame (Interpolation)
    if (lastFrame) {
      videoParams.config!.lastFrame = this.prepareImageObject(lastFrame);
    }

    // Handle Video Source (Extension)
    if (videoSource) {
      videoParams.video = {
        videoBytes: this.getFileSystemBytes(videoSource),
        mimeType: 'video/mp4',
      };
    }

    // Handle Reference Images
    if (referenceImages.length > 0) {
      videoParams.config!.referenceImages = referenceImages
        .slice(0, 3)
        .map((img) => ({
          image: this.prepareImageObject(img),
          referenceType: 'asset',
        }));
    }

    const result = await videoService.generateVideo(
      this.config,
      videoParams,
      outputFile,
    );

    if (result.status === 'error') {
      throw new Error(`Video production failed: ${result.error}`);
    }

    return {
      llmContent: JSON.stringify(result, null, 2),
      returnDisplay: `Successfully synthesized Philm sequence: ${result.path}\nModel: ${result.model} | Resolution: ${resolution}`,
    };
  }

  private prepareImageObject(input: string) {
    if (input.startsWith('data:image')) {
      const parts = input.split(';');
      const mimeType = parts[0].split(':')[1];
      const imageBytes = parts[1].split(',')[1];
      return { imageBytes, mimeType };
    }
    // Assume local path
    return {
      imageBytes: this.getFileSystemBytes(input),
      mimeType: input.endsWith('.png') ? 'image/png' : 'image/jpeg',
    };
  }

  private getFileSystemBytes(filePath: string) {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.config.getProjectRoot(), filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(absPath).toString('base64');
  }

  getDescription(): string {
    return `Directing high-fidelity video synthesis: "${this.params.prompt.substring(0, 50)}..."`;
  }
}

export class PhilmTool extends BaseDeclarativeTool<
  PhilmToolParams,
  ToolResult
> {
  static readonly Name = PHILM_MODE_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      PhilmTool.Name,
      'Philm Mode (Veo 3.1)',
      'State-of-the-art cinematic video generation with native audio and high fidelity. Supports dialogue, specific styles, and subject consistency.',
      Kind.Other,
      {
        properties: {
          prompt: {
            type: 'string',
            description:
              'Detailed cinematic description including dialogue and sound cues.',
          },
          model: {
            type: 'string',
            enum: [
              PREVIEW_VEO_3_1_MODEL,
              PREVIEW_VEO_3_1_FAST_MODEL,
              STABLE_VEO_2_MODEL,
            ],
            default: PREVIEW_VEO_3_1_MODEL,
          },
          aspectRatio: {
            type: 'string',
            enum: ['16:9', '9:16'],
            default: '16:9',
          },
          resolution: {
            type: 'string',
            enum: ['720p', '1080p', '4k'],
            default: '720p',
          },
          durationSeconds: { type: 'number', enum: [4, 6, 8], default: 8 },
          imageInput: {
            type: 'string',
            description: 'Optional starting frame image.',
          },
          lastFrame: {
            type: 'string',
            description: 'Optional ending frame for interpolation.',
          },
          videoSource: {
            type: 'string',
            description: 'Optional previous video for extension.',
          },
          referenceImages: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Up to 3 reference images for subject/character consistency.',
          },
          negativePrompt: {
            type: 'string',
            description: 'What to avoid in the video.',
          },
          outputFile: {
            type: 'string',
            description: 'Local path to save the generated MP4.',
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
    params: PhilmToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<PhilmToolParams, ToolResult> {
    return new PhilmToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
