/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
import { Config } from '../config/config.js';
interface GroundingChunkWeb {
    uri?: string;
    title?: string;
}
interface GroundingChunkItem {
    web?: GroundingChunkWeb;
}
/**
 * Parameters for the WebSearchTool.
 */
export interface WebSearchToolParams {
    /**
     * The search query.
     */
    query: string;
    /**
     * Optional: If true, performs an autonomous multi-step deep research by fetching and
     * synthesizing the top search results.
     */
    deepResearch?: boolean;
}
/**
 * Extends ToolResult to include sources for web search.
 */
export interface WebSearchToolResult extends ToolResult {
    sources?: GroundingChunkItem[];
}
/**
 * A tool to perform advanced web searches using Google Search via the Gemini API,
 * with optional autonomous deep research.
 */
export declare class WebSearchTool extends BaseDeclarativeTool<WebSearchToolParams, WebSearchToolResult> {
    private readonly config;
    static readonly Name = "google_web_search";
    constructor(config: Config, messageBus: MessageBus);
    protected validateToolParamValues(params: WebSearchToolParams): string | null;
    protected createInvocation(params: WebSearchToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<WebSearchToolParams, WebSearchToolResult>;
}
export {};
