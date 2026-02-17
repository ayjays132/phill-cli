import type { ToolInvocation, ToolResult } from '../tools.js';
import { BaseDeclarativeTool } from '../tools.js';
import type { Config } from '../../config/config.js';
import { MessageBus } from '../../confirmation-bus/message-bus.js';
export declare const IMAGEN_GENERATE_TOOL_NAME = "image_generation_imagen";
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
export declare class ImagenGenerateTool extends BaseDeclarativeTool<ImagenGenerateToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "image_generation_imagen";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: ImagenGenerateToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<ImagenGenerateToolParams, ToolResult>;
}
