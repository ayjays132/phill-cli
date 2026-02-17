/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult, type ToolCallConfirmationDetails } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { type Question } from '../confirmation-bus/types.js';
export interface AskUserParams {
    questions: Question[];
}
export declare class AskUserTool extends BaseDeclarativeTool<AskUserParams, ToolResult> {
    constructor(messageBus: MessageBus);
    protected validateToolParamValues(params: AskUserParams): string | null;
    protected createInvocation(params: AskUserParams, messageBus: MessageBus, toolName: string, toolDisplayName: string): AskUserInvocation;
}
export declare class AskUserInvocation extends BaseToolInvocation<AskUserParams, ToolResult> {
    shouldConfirmExecute(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
    getDescription(): string;
    execute(signal: AbortSignal): Promise<ToolResult>;
}
