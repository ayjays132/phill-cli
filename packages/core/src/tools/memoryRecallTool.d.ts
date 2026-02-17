/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, type ToolInvocation, type ToolResult } from './tools.js';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
export interface RecallMemoryParams {
    query: string;
    limit?: number;
}
export declare class MemoryRecallTool extends BaseDeclarativeTool<RecallMemoryParams, ToolResult> {
    private config;
    static readonly Name = "recall_memory";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: RecallMemoryParams, messageBus: MessageBus, toolName?: string, toolDisplayName?: string): ToolInvocation<RecallMemoryParams, ToolResult>;
}
export interface IngestMemoryParams {
    content: string;
}
export declare class MemoryIngestTool extends BaseDeclarativeTool<IngestMemoryParams, ToolResult> {
    private config;
    static readonly Name = "ingest_memory";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: IngestMemoryParams, messageBus: MessageBus, toolName?: string, toolDisplayName?: string): ToolInvocation<IngestMemoryParams, ToolResult>;
}
