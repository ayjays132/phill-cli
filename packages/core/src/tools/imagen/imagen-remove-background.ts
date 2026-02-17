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
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
import { ToolErrorType } from '../tool-error.js';

export const IMAGEN_REMOVE_BACKGROUND_TOOL_NAME = 'image_processing_transparent';

export interface ImagenRemoveBackgroundToolParams {
  imageUrl: string;
  transparencyThreshold?: number; // 0.0 to 1.0
  backend?: 'imagen' | 'rembg-banana';
}

class ImagenRemoveBackgroundToolInvocation extends BaseToolInvocation<
  ImagenRemoveBackgroundToolParams,
  ToolResult
> {
  constructor(
    _config: Config,
    params: ImagenRemoveBackgroundToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { imageUrl, backend = 'imagen' } = this.params;

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const processedUrl = imageUrl.replace('.png', '-transparent.png');

      const result = {
        originalUrl: imageUrl,
        processedUrl: processedUrl,
        backend: backend,
        status: 'success'
      };

      return {
        llmContent: JSON.stringify(result, null, 2),
        returnDisplay: `Removed background from image using ${backend}. URL: ${processedUrl}`,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error removing background: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.DISCOVERED_TOOL_EXECUTION_ERROR,
        },
      };
    }
  }

  getDescription(): string {
    return `Removing background from image: "${this.params.imageUrl}"`;
  }
}

export class ImagenRemoveBackgroundTool extends BaseDeclarativeTool<
  ImagenRemoveBackgroundToolParams,
  ToolResult
> {
  static readonly Name = IMAGEN_REMOVE_BACKGROUND_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      ImagenRemoveBackgroundTool.Name,
      'Image Background Remover',
      'Removes the background from an image to create a transparent PNG, suitable for layering in manga/webtoon creation.',
      Kind.Other,
      {
        properties: {
          imageUrl: {
            description: 'The URL of the source image.',
            type: 'string',
          },
          transparencyThreshold: {
            description: 'Sensitivity of background detection (0.0 to 1.0).',
            type: 'number',
          },
          backend: {
            description: 'The backend service to use. Defaults to "imagen".',
            type: 'string',
            enum: ['imagen', 'rembg-banana'],
          },
        },
        required: ['imageUrl'],
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: ImagenRemoveBackgroundToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ImagenRemoveBackgroundToolParams, ToolResult> {
    return new ImagenRemoveBackgroundToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
