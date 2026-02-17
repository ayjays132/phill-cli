/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
import type { Config } from '../config/config.js';
/**
 * Parameters for the GrepTool
 */
export interface GrepToolParams {
    /**
     * The regular expression pattern to search for in file contents
     */
    pattern: string;
    /**
     * The directory to search in (optional, defaults to current directory relative to root)
     */
    dir_path?: string;
    /**
     * File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
     */
    include?: string;
    /**
     * Show this many lines of context before each match (optional)
     */
    before?: number;
    /**
     * Show this many lines of context after each match (optional)
     */
    after?: number;
    /**
     * Show this many lines of context around each match (optional)
     */
    context?: number;
    /**
     * If true, search is case-sensitive (optional, defaults to false)
     */
    case_sensitive?: boolean;
    /**
     * If true, treats the pattern as a literal string instead of a regex (optional)
     */
    fixed_strings?: boolean;
    /**
     * If true, only returns filenames that contain at least one match (optional)
     */
    files_with_matches?: boolean;
}
/**
 * Implementation of the Grep tool logic (moved from CLI)
 */
export declare class GrepTool extends BaseDeclarativeTool<GrepToolParams, ToolResult> {
    private readonly config;
    static readonly Name = "search_file_content";
    constructor(config: Config, messageBus: MessageBus);
    /**
     * Validates the parameters for the tool
     * @param params Parameters to validate
     * @returns An error message string if invalid, null otherwise
     */
    protected validateToolParamValues(params: GrepToolParams): string | null;
    protected createInvocation(params: GrepToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<GrepToolParams, ToolResult>;
}
/**
 * A legacy alias for the Grep tool, allowing usage of the 'grep' command name.
 */
export declare class LegacyGrepTool extends GrepTool {
    constructor(config: Config, messageBus: MessageBus);
}
