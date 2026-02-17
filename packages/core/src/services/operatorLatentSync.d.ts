/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
/**
 * Orchestrates the "VAE Foundation" for the Operator Protocol.
 * Syncs real-world visual state into dense symbolic latents.
 */
export declare class OperatorLatentSync {
    private static instance;
    private config;
    private syncInterval;
    private isSyncing;
    private constructor();
    static getInstance(config: Config): OperatorLatentSync;
    /**
     * Starts periodic visual latent synchronization.
     * Default: every 10 seconds for desktop "awareness".
     */
    startSync(intervalMs?: number): void;
    stopSync(): void;
    /**
     * Forces a single synchronization of the visual state.
     */
    syncNow(): Promise<string>;
}
