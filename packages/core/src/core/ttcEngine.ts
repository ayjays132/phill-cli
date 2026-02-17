/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuccessTraceService } from '../services/successTraceService.js';
import { LatentContextService } from '../services/latentContextService.js';
import type { Config } from '../config/config.js';

/**
 * Orchestrates Test-Time Compute (TTC) and Latent Distillation.
 * Guiding models through successful "latent footprints".
 */
export class TTCEngine {
  private static instance: TTCEngine;
  private readonly successTraceService: SuccessTraceService;
  private readonly latentContextService: LatentContextService;

  private constructor() {
    this.successTraceService = SuccessTraceService.getInstance();
    this.latentContextService = LatentContextService.getInstance();
  }

  public static getInstance(): TTCEngine {
    if (!TTCEngine.instance) {
      TTCEngine.instance = new TTCEngine();
    }
    return TTCEngine.instance;
  }

  /**
   * Guides the model by injecting "Success gems" into the reasoning context.
   */
  async getGuidingContext(goal: string): Promise<string> {
    const wisdom = await this.successTraceService.retrieveLatentWisdom(goal);
    if (wisdom.length === 0) return '';

    return `\n### Latent Wisdom (Successful traces for similar goals):\n${wisdom.map(w => `- T: ${w}`).join('\n')}\n`;
  }

  /**
   * Distills a successful execution into the Success Bank.
   */
  async distillSuccess(id: string, goal: string, history: any[], config: Config): Promise<void> {
    // Generate a Tool Success Trace (T) using LatentContextService
    const dlr = await this.latentContextService.encode(history, config, `distill-${id}`);
    
    await this.successTraceService.indexTrace({
      id,
      goal,
      dlr,
      timestamp: new Date().toISOString()
    });
  }
}
