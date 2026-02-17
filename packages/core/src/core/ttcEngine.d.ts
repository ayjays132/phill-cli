/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
/**
 * Orchestrates Test-Time Compute (TTC) and Latent Distillation.
 * Guiding models through successful "latent footprints".
 */
export declare class TTCEngine {
    private static instance;
    private readonly successTraceService;
    private readonly latentContextService;
    private constructor();
    static getInstance(): TTCEngine;
    /**
     * Guides the model by injecting "Success gems" into the reasoning context.
     */
    getGuidingContext(goal: string): Promise<string>;
    /**
     * Distills a successful execution into the Success Bank.
     */
    distillSuccess(id: string, goal: string, history: any[], config: Config): Promise<void>;
}
