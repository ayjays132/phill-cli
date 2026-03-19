/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../index.js';
import {
  SuccessTraceService,
  LatentContextService,
  debugLogger,
  estimateTokenCountSync,
} from '../index.js';
import type { Content } from '@google/genai';

/**
 * Orchestrates Test-Time Compute (TTC) and Latent Distillation.
 * Guiding models through successful "latent footprints".
 */
export class TTCEngine {
  private static instance: TTCEngine;
  private readonly successTraceService: SuccessTraceService;
  private readonly latentContextService: LatentContextService;
  private lastDistillTimestamp: number = 0;
  private readonly DISTILL_COOLDOWN = 30000; // 30 seconds cooldown
  private readonly WISDOM_TOKEN_BUDGET = 1000;

  private constructor() {
    this.successTraceService = SuccessTraceService.getInstance();
    this.latentContextService = LatentContextService.getInstance();
  }

  static getInstance(): TTCEngine {
    if (!TTCEngine.instance) {
      TTCEngine.instance = new TTCEngine();
    }
    return TTCEngine.instance;
  }

  /**
   * Guides the model by injecting "Success gems" into the reasoning context.
   */
  async getGuidingContext(goal: string, config: Config): Promise<string> {
    const wisdom = await this.successTraceService.retrieveLatentWisdom(goal, config);
    if (wisdom.length === 0) return '';

    // Token-aware pruning of wisdom gems
    const selectedWisdom: string[] = [];
    let currentTokens = 0;

    for (const gem of wisdom) {
      const gemTokens = estimateTokenCountSync([{ text: gem }]);
      if (currentTokens + gemTokens > this.WISDOM_TOKEN_BUDGET) {
        debugLogger.debug(`[TTC] Pruning wisdom gem due to token budget (${currentTokens + gemTokens} > ${this.WISDOM_TOKEN_BUDGET})`);
        break;
      }
      selectedWisdom.push(gem);
      currentTokens += gemTokens;
    }

    if (selectedWisdom.length === 0) return '';

    return `\n### Latent Wisdom (Successful traces for similar goals):\n${selectedWisdom.map((w) => `- T: ${w}`).join('\n')}\n`;
  }

  /**
   * Distills a successful execution into the Success Bank.
   */
  async distillSuccess(
    id: string,
    goal: string,
    history: Content[],
    config: Config,
  ): Promise<void> {
    const now = Date.now();
    if (now - this.lastDistillTimestamp < this.DISTILL_COOLDOWN) {
      debugLogger.debug('[TTC] Skipping distillation - cooldown active.');
      return;
    }

    this.lastDistillTimestamp = now;

    // Generate a Tool Success Trace (T) using LatentContextService
    // We use highPriority=false to allow heuristic fallback if embeddings/AI are busy
    const dlr = await this.latentContextService.encode(
      history,
      config,
      `distill-${id}`,
      undefined,
      false, // highPriority = false
    );

    await this.successTraceService.indexTrace({
      id,
      goal,
      dlr,
      timestamp: new Date().toISOString(),
    }, config);
  }
}
