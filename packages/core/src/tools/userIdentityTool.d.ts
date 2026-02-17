/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
export declare class UserIdentityTool extends BaseDeclarativeTool<UserIdentityParams, ToolResult> {
    static readonly Name = "user_identity";
    constructor(messageBus: MessageBus);
    protected createInvocation(params: UserIdentityParams, messageBus: MessageBus, toolName?: string, toolDisplayName?: string): UserIdentityToolInvocation;
}
export interface UserIdentityParams {
    fact: string;
    category?: string;
}
declare class UserIdentityToolInvocation extends BaseToolInvocation<UserIdentityParams, ToolResult> {
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export {};
