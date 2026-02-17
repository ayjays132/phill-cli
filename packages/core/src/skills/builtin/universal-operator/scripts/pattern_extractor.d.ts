/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../../../../config/config.js';
/**
 * The PatternExtractor parses the ActionJournal to identify repeated
 * successful VLA sequences (e.g., "Look -> Ground -> Click -> Success").
 *
 * This is a foundational component for the "Get Better Over Time" mandate.
 */
export declare class PatternExtractor {
    private readonly config;
    private journalPath;
    constructor(config: Config);
    /**
     * Scans the journal for successful multi-step sequences.
     * Promotes these to "Trusted Patterns" to reduce grounding latency in future turns.
     */
    extractLearnedPatterns(): Promise<any>;
}
