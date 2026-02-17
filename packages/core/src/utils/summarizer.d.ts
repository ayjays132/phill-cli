/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ToolResult } from '../tools/tools.js';
import type { PhillClient } from '../core/client.js';
import type { ModelConfigKey } from '../services/modelConfigService.js';
import type { Config } from '../config/config.js';
/**
 * A function that summarizes the result of a tool execution.
 *
 * @param result The result of the tool execution.
 * @returns The summary of the result.
 */
export type Summarizer = (config: Config, result: ToolResult, phillClient: PhillClient, abortSignal: AbortSignal) => Promise<string>;
/**
 * The default summarizer for tool results.
 *
 * @param result The result of the tool execution.
 * @param phillClient The Phill client to use for summarization.
 * @param abortSignal The abort signal to use for summarization.
 * @returns The summary of the result.
 */
export declare const defaultSummarizer: Summarizer;
export declare const llmSummarizer: Summarizer;
export declare function summarizeToolOutput(config: Config, modelConfigKey: ModelConfigKey, textToSummarize: string, phillClient: PhillClient, abortSignal: AbortSignal): Promise<string>;
