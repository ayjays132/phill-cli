/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
import type { ToolResult } from './tools.js';
import { Config } from '../config/config.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
export interface OSScreenshotToolParams {
}
export declare class OSScreenshotTool extends BaseDeclarativeTool<OSScreenshotToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "os_screenshot";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OSScreenshotToolParams, messageBus: MessageBus, toolName?: string, displayName?: string): OSScreenshotToolInvocation;
}
declare class OSScreenshotToolInvocation extends BaseToolInvocation<OSScreenshotToolParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OSScreenshotToolParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export interface OSAccessibilityTreeToolParams {
}
export declare class OSAccessibilityTreeTool extends BaseDeclarativeTool<OSAccessibilityTreeToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "os_get_accessibility_tree";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OSAccessibilityTreeToolParams, messageBus: MessageBus, toolName?: string, displayName?: string): OSAccessibilityTreeToolInvocation;
}
declare class OSAccessibilityTreeToolInvocation extends BaseToolInvocation<OSAccessibilityTreeToolParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OSAccessibilityTreeToolParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export interface OSGetMonitorLayoutParams {
}
export declare class OSGetMonitorLayoutTool extends BaseDeclarativeTool<OSGetMonitorLayoutParams, ToolResult> {
    private readonly config;
    static readonly Name = "os_get_monitor_layout";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OSGetMonitorLayoutParams, messageBus: MessageBus, toolName?: string, displayName?: string): OSGetMonitorLayoutInvocation;
}
declare class OSGetMonitorLayoutInvocation extends BaseToolInvocation<OSGetMonitorLayoutParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OSGetMonitorLayoutParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export interface OSFindWindowParams {
    titlePattern: string;
}
export declare class OSFindWindowTool extends BaseDeclarativeTool<OSFindWindowParams, ToolResult> {
    private readonly config;
    static readonly Name = "os_find_window";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OSFindWindowParams, messageBus: MessageBus, toolName?: string, displayName?: string): OSFindWindowInvocation;
}
declare class OSFindWindowInvocation extends BaseToolInvocation<OSFindWindowParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OSFindWindowParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export interface OSGroundToolParams {
}
export declare class OSGroundTool extends BaseDeclarativeTool<OSGroundToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "os_ground";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OSGroundToolParams, messageBus: MessageBus, toolName?: string, displayName?: string): OSGroundToolInvocation;
}
declare class OSGroundToolInvocation extends BaseToolInvocation<OSGroundToolParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OSGroundToolParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export interface OperatorCursorMoveParams {
    x: number;
    y: number;
}
export declare class OperatorCursorMoveTool extends BaseDeclarativeTool<OperatorCursorMoveParams, ToolResult> {
    private readonly config;
    static readonly Name = "operator_cursor_move";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OperatorCursorMoveParams, messageBus: MessageBus, toolName?: string, displayName?: string): OperatorCursorMoveInvocation;
}
declare class OperatorCursorMoveInvocation extends BaseToolInvocation<OperatorCursorMoveParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OperatorCursorMoveParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export interface OperatorCursorClickParams {
    x?: number;
    y?: number;
}
export declare class OperatorCursorClickTool extends BaseDeclarativeTool<OperatorCursorClickParams, ToolResult> {
    private readonly config;
    static readonly Name = "operator_cursor_click";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OperatorCursorClickParams, messageBus: MessageBus, toolName?: string, displayName?: string): OperatorCursorClickInvocation;
}
declare class OperatorCursorClickInvocation extends BaseToolInvocation<OperatorCursorClickParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OperatorCursorClickParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export interface OperatorTypeParams {
    text: string;
}
export declare class OperatorTypeTool extends BaseDeclarativeTool<OperatorTypeParams, ToolResult> {
    private readonly config;
    static readonly Name = "operator_type";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OperatorTypeParams, messageBus: MessageBus, toolName?: string, displayName?: string): OperatorTypeInvocation;
}
declare class OperatorTypeInvocation extends BaseToolInvocation<OperatorTypeParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OperatorTypeParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export interface OperatorCursorDragParams {
    endX: number;
    endY: number;
}
export declare class OperatorCursorDragTool extends BaseDeclarativeTool<OperatorCursorDragParams, ToolResult> {
    private readonly config;
    static readonly Name = "operator_cursor_drag";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OperatorCursorDragParams, messageBus: MessageBus, toolName?: string, displayName?: string): OperatorCursorDragInvocation;
}
declare class OperatorCursorDragInvocation extends BaseToolInvocation<OperatorCursorDragParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OperatorCursorDragParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export interface OperatorWindowControlParams {
    titlePattern: string;
    action: 'minimize' | 'maximize' | 'restore' | 'close' | 'focus';
}
export declare class OperatorWindowControlTool extends BaseDeclarativeTool<OperatorWindowControlParams, ToolResult> {
    private readonly config;
    static readonly Name = "operator_window_control";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OperatorWindowControlParams, messageBus: MessageBus, toolName?: string, displayName?: string): OperatorWindowControlInvocation;
}
declare class OperatorWindowControlInvocation extends BaseToolInvocation<OperatorWindowControlParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OperatorWindowControlParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export interface OperatorLaunchAppParams {
    appNameOrPath: string;
}
export declare class OperatorLaunchAppTool extends BaseDeclarativeTool<OperatorLaunchAppParams, ToolResult> {
    private readonly config;
    static readonly Name = "operator_launch_app";
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: OperatorLaunchAppParams, messageBus: MessageBus, toolName?: string, displayName?: string): OperatorLaunchAppInvocation;
}
declare class OperatorLaunchAppInvocation extends BaseToolInvocation<OperatorLaunchAppParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: OperatorLaunchAppParams, messageBus: MessageBus, toolName: string, displayName: string);
    getDescription(): string;
    execute(): Promise<ToolResult>;
}
export {};
