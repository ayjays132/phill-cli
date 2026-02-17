/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { LocalAgentDefinition } from './types.js';
import type { Config } from '../config/config.js';
declare const CodebaseInvestigationReportSchema: any;
/**
 * A Proof-of-Concept subagent specialized in analyzing codebase structure,
 * dependencies, and technologies.
 */
export declare const CodebaseInvestigatorAgent: (config: Config) => LocalAgentDefinition<typeof CodebaseInvestigationReportSchema>;
export {};
