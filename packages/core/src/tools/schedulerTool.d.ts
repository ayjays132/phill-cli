/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, type ToolInvocation, type ToolResult } from './tools.js';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
export interface ScheduleTaskParams {
    cron: string;
    task: string;
}
export declare class ScheduleTaskTool extends BaseDeclarativeTool<ScheduleTaskParams, ToolResult> {
    private config;
    static readonly Name = "schedule_task";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: ScheduleTaskParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<ScheduleTaskParams, ToolResult>;
}
export interface ListTasksParams {
}
export declare class ListTasksTool extends BaseDeclarativeTool<ListTasksParams, ToolResult> {
    private config;
    static readonly Name = "list_tasks";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: ListTasksParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<ListTasksParams, ToolResult>;
}
export interface RemoveTaskParams {
    id: string;
}
export declare class RemoveTaskTool extends BaseDeclarativeTool<RemoveTaskParams, ToolResult> {
    private config;
    static readonly Name = "remove_task";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: RemoveTaskParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<RemoveTaskParams, ToolResult>;
}
