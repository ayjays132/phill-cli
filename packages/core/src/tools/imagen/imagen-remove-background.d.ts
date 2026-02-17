import type { ToolInvocation, ToolResult } from '../tools.js';
import { BaseDeclarativeTool } from '../tools.js';
import type { Config } from '../../config/config.js';
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
export declare const IMAGEN_REMOVE_BACKGROUND_TOOL_NAME = "image_processing_transparent";
export interface ImagenRemoveBackgroundToolParams {
    imageUrl: string;
    transparencyThreshold?: number;
    backend?: 'imagen' | 'rembg-banana';
}
export declare class ImagenRemoveBackgroundTool extends BaseDeclarativeTool<ImagenRemoveBackgroundToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "image_processing_transparent";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: ImagenRemoveBackgroundToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<ImagenRemoveBackgroundToolParams, ToolResult>;
}
