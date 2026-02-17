/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
export interface PlanningLatchParams {
    plan: string;
    goal: string;
    constraints?: string;
}
export declare class ContextualPlanningLatchTool extends BaseDeclarativeTool<PlanningLatchParams, ToolResult> {
    static readonly Name = "contextual_plan_latch";
    constructor(messageBus: MessageBus);
    protected createInvocation(params: PlanningLatchParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): PlanningLatchToolInvocation;
}
declare class PlanningLatchToolInvocation extends BaseToolInvocation<PlanningLatchParams, ToolResult> {
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export {};
