import type { ToolInvocation, ToolResult } from '../tools.js';
import { BaseDeclarativeTool } from '../tools.js';
import type { Config } from '../../config/config.js';
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
export declare const IMAGEN_FUSE_PANELS_TOOL_NAME = "image_composition_fuse";
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
export declare class ImagenFusePanelsTool extends BaseDeclarativeTool<ImagenFusePanelsToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "image_composition_fuse";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: ImagenFusePanelsToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<ImagenFusePanelsToolParams, ToolResult>;
}
