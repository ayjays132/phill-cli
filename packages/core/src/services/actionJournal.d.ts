/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
export interface ActionEntry {
    timestamp: string;
    tool: string;
    params: any;
    result?: string;
    riskLevel: 'Low' | 'Medium' | 'High';
}
/**
 * Real-time journal for auditing all Operator interactions.
 * Core component of Molt-Guard 2.0 transparency.
 */
export declare class RealTimeActionJournal {
    private static instance;
    private logPath;
    private constructor();
    static getInstance(config: Config): RealTimeActionJournal;
    /**
     * Records an action to the journal.
     */
    record(entry: Omit<ActionEntry, 'timestamp'>): Promise<void>;
    getLogPath(): string;
}
