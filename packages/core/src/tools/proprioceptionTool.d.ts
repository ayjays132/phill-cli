/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
import type { ToolResult } from './tools.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
export interface ProprioceptionToolParams {
    includeHistory?: boolean;
}
export declare class ProprioceptionTool extends BaseDeclarativeTool<ProprioceptionToolParams, ToolResult> {
    static readonly Name = "get_proprioception";
    constructor(messageBus: MessageBus);
    protected createInvocation(params: ProprioceptionToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ProprioceptionToolInvocation;
}
declare class ProprioceptionToolInvocation extends BaseToolInvocation<ProprioceptionToolParams, ToolResult> {
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export {};
