/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import { BaseDeclarativeTool, type ToolResult, type ToolInvocation } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
interface VocalModeParams {
    action: 'activate' | 'deactivate' | 'update';
    personaName?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    style?: string;
}
export declare class VocalModeTool extends BaseDeclarativeTool<VocalModeParams, ToolResult> {
    private readonly config;
    static readonly Name = "vocal_mode_manager";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: VocalModeParams, messageBus: MessageBus, toolName?: string, toolDisplayName?: string): ToolInvocation<VocalModeParams, ToolResult>;
}
export {};
