/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { LocalAgentDefinition } from './types.js';
declare const GeneralistAgentSchema: any;
/**
 * A general-purpose AI agent with access to all tools.
 * It uses the same core system prompt as the main agent but in a non-interactive mode.
 */
export declare const GeneralistAgent: (config: Config) => LocalAgentDefinition<typeof GeneralistAgentSchema>;
export {};
