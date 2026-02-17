/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
import type { ToolResult } from './tools.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { Config } from '../config/config.js';
export interface PhysicalVisionToolParams {
    action: 'describe_scene' | 'capture_image' | 'get_status';
}
export declare class PhysicalVisionTool extends BaseDeclarativeTool<PhysicalVisionToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "vision_physical_presence";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: PhysicalVisionToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): PhysicalVisionToolInvocation;
}
declare class PhysicalVisionToolInvocation extends BaseToolInvocation<PhysicalVisionToolParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: PhysicalVisionToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string);
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export {};
