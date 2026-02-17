/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool } from './tools.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import type { Config } from '../config/config.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
export interface BrowserStartToolParams {
}
export declare class BrowserStartTool extends BaseDeclarativeTool<BrowserStartToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_start";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserStartToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserStartToolParams, ToolResult>;
}
export interface BrowserNavigateToolParams {
    url: string;
}
export declare class BrowserNavigateTool extends BaseDeclarativeTool<BrowserNavigateToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_navigate";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserNavigateToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserNavigateToolParams, ToolResult>;
}
export interface BrowserClickToolParams {
    selector: string;
}
export declare class BrowserClickTool extends BaseDeclarativeTool<BrowserClickToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_click";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserClickToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserClickToolParams, ToolResult>;
}
export interface BrowserTypeToolParams {
    selector: string;
    text: string;
}
export declare class BrowserTypeTool extends BaseDeclarativeTool<BrowserTypeToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_type";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserTypeToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserTypeToolParams, ToolResult>;
}
export interface BrowserScreenshotToolParams {
}
export declare class BrowserScreenshotTool extends BaseDeclarativeTool<BrowserScreenshotToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_screenshot";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserScreenshotToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserScreenshotToolParams, ToolResult>;
}
export interface BrowserScrollToolParams {
    direction: 'up' | 'down' | 'top' | 'bottom';
    amount?: number;
    selector?: string;
}
export declare class BrowserScrollTool extends BaseDeclarativeTool<BrowserScrollToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_scroll";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserScrollToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserScrollToolParams, ToolResult>;
}
export interface BrowserGetContentToolParams {
    format: 'text' | 'markdown' | 'html';
}
export declare class BrowserGetContentTool extends BaseDeclarativeTool<BrowserGetContentToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_get_content";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserGetContentToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserGetContentToolParams, ToolResult>;
}
export interface BrowserGetAccessibilityTreeToolParams {
}
export declare class BrowserGetAccessibilityTreeTool extends BaseDeclarativeTool<BrowserGetAccessibilityTreeToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_get_accessibility_tree";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserGetAccessibilityTreeToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserGetAccessibilityTreeToolParams, ToolResult>;
}
export interface BrowserEvaluateToolParams {
    script: string;
}
export declare class BrowserEvaluateTool extends BaseDeclarativeTool<BrowserEvaluateToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_evaluate";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserEvaluateToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserEvaluateToolParams, ToolResult>;
}
export interface BrowserCursorMoveToolParams {
    x: number;
    y: number;
}
export declare class BrowserCursorMoveTool extends BaseDeclarativeTool<BrowserCursorMoveToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_cursor_move";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserCursorMoveToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserCursorMoveToolParams, ToolResult>;
}
export interface BrowserCursorClickToolParams {
}
export declare class BrowserCursorClickTool extends BaseDeclarativeTool<BrowserCursorClickToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_cursor_click";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserCursorClickToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserCursorClickToolParams, ToolResult>;
}
export interface BrowserCursorDragToolParams {
    endX: number;
    endY: number;
}
export declare class BrowserCursorDragTool extends BaseDeclarativeTool<BrowserCursorDragToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_cursor_drag";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserCursorDragToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserCursorDragToolParams, ToolResult>;
}
export interface BrowserStopToolParams {
}
export declare class BrowserStopTool extends BaseDeclarativeTool<BrowserStopToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_stop";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserStopToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserStopToolParams, ToolResult>;
}
export interface BrowserResetToolParams {
}
export declare class BrowserResetTool extends BaseDeclarativeTool<BrowserResetToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "browser_reset";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: BrowserResetToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<BrowserResetToolParams, ToolResult>;
}
