/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentDefinition } from './types.js';
import type { Config } from '../config/config.js';
declare const CliHelpReportSchema: any;
/**
 * An agent specialized in answering questions about Phill CLI itself,
 * using its own documentation and runtime state.
 */
export declare const CliHelpAgent: (config: Config) => AgentDefinition<typeof CliHelpReportSchema>;
export {};
