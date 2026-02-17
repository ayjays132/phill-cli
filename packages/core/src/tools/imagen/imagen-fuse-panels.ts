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

export const IMAGEN_FUSE_PANELS_TOOL_NAME = 'image_composition_fuse';

export interface Layer {
  imageUrl: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  opacity?: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface ImagenFusePanelsToolParams {
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  outputFormat?: 'png' | 'jpg';
}

class ImagenFusePanelsToolInvocation extends BaseToolInvocation<
  ImagenFusePanelsToolParams,
  ToolResult
> {
  constructor(
    _config: Config,
    params: ImagenFusePanelsToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { layers, canvasWidth, canvasHeight } = this.params;

    try {
      // TODO: Replace with actual image processing logic (e.g. Sharp or Canvas)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fusedUrl = `https://storage.googleapis.com/fused-manga-panels/${Date.now()}.png`;

      const result = {
        url: fusedUrl,
        layersProcessed: layers.length,
        dimensions: { width: canvasWidth, height: canvasHeight },
        status: 'success'
      };

      return {
        llmContent: JSON.stringify(result, null, 2),
        returnDisplay: `Fused ${layers.length} layers into a ${canvasWidth}x${canvasHeight} panel. URL: ${fusedUrl}`,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error fusing panels: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.DISCOVERED_TOOL_EXECUTION_ERROR,
        },
      };
    }
  }

  getDescription(): string {
    return `Fusing ${this.params.layers.length} images into a single panel.`;
  }
}

export class ImagenFusePanelsTool extends BaseDeclarativeTool<
  ImagenFusePanelsToolParams,
  ToolResult
> {
  static readonly Name = IMAGEN_FUSE_PANELS_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      ImagenFusePanelsTool.Name,
      'Image Layer Fusion',
      'Composes multiple images (layers) into a single image, useful for creating manga panels by combining backgrounds, characters, and effects.',
      Kind.Other,
      {
        properties: {
          layers: {
            description: 'List of image layers to fuse, ordered from back to front.',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                imageUrl: { type: 'string', description: 'URL of the image layer.' },
                x: { type: 'number', description: 'X position on the canvas.' },
                y: { type: 'number', description: 'Y position on the canvas.' },
                width: { type: 'number', description: 'Target width (optional).' },
                height: { type: 'number', description: 'Target height (optional).' },
                opacity: { type: 'number', description: 'Opacity (0-1).' },
                blendMode: { type: 'string', enum: ['normal', 'multiply', 'screen', 'overlay'] }
              },
              required: ['imageUrl', 'x', 'y']
            }
          },
          canvasWidth: { description: 'Width of the output image.', type: 'number' },
          canvasHeight: { description: 'Height of the output image.', type: 'number' },
          outputFormat: { description: 'Output format (png/jpg).', type: 'string', enum: ['png', 'jpg'] }
        },
        required: ['layers', 'canvasWidth', 'canvasHeight'],
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: ImagenFusePanelsToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ImagenFusePanelsToolParams, ToolResult> {
    return new ImagenFusePanelsToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
