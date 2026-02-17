/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import { BaseDeclarativeTool, type ToolResult, type ToolInvocation } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
interface BiologicalDriveParams {
    action: 'get' | 'update' | 'reset';
    dopamine_level?: number;
    boredom_level?: number;
    insights_pending?: string[];
    prime_directive?: string;
}
export declare class BiologicalDriveTool extends BaseDeclarativeTool<BiologicalDriveParams, ToolResult> {
    private readonly config;
    static readonly Name = "drives_manager";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BiologicalDriveParams, messageBus: MessageBus, toolName?: string, toolDisplayName?: string): ToolInvocation<BiologicalDriveParams, ToolResult>;
}
export {};
