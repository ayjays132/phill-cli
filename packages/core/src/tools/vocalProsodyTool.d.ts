/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import { BaseDeclarativeTool, type ToolResult, type ToolInvocation } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
interface VocalProsodyParams {
    rate?: number;
    pitch?: number;
    volume?: number;
    style?: string;
}
export declare class VocalProsodyTool extends BaseDeclarativeTool<VocalProsodyParams, ToolResult> {
    private readonly config;
    static readonly Name = "vocal_prosody_controller";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: VocalProsodyParams, messageBus: MessageBus, toolName?: string, toolDisplayName?: string): ToolInvocation<VocalProsodyParams, ToolResult>;
}
export {};
