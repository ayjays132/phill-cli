/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, type ToolInvocation, type ToolResult } from './tools.js';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
export interface SignalLinkParams {
    name: string;
}
export declare class SignalLinkTool extends BaseDeclarativeTool<SignalLinkParams, ToolResult> {
    private config;
    static readonly Name = "signal_link";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: SignalLinkParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<SignalLinkParams, ToolResult>;
}
export interface SignalSendParams {
    recipient: string;
    message: string;
    attachment?: string;
    account?: string;
}
export declare class SignalSendTool extends BaseDeclarativeTool<SignalSendParams, ToolResult> {
    private config;
    static readonly Name = "signal_send";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: SignalSendParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<SignalSendParams, ToolResult>;
}
export interface SignalReceiveParams {
    account?: string;
    json?: boolean;
}
export declare class SignalReceiveTool extends BaseDeclarativeTool<SignalReceiveParams, ToolResult> {
    private config;
    static readonly Name = "signal_receive";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: SignalReceiveParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<SignalReceiveParams, ToolResult>;
}
