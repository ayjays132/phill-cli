/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogosService } from './logosService.js';
import { Storage } from '../config/storage.js';
import { debugLogger } from '../utils/debugLogger.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * ManifoldMemoryService
 * Tracks the "Hyper-State" (global latent) of the reasoning manifold.
 * Handles persistence of learned alignment across sessions.
 */
export class ManifoldMemoryService {
  private static instance: ManifoldMemoryService;
  private readonly logos: LogosService;
  private hyperState: number[] = new Array(8).fill(0.5);

  private constructor() {
    this.logos = LogosService.getInstance();
  }

  static getInstance(): ManifoldMemoryService {
    if (!ManifoldMemoryService.instance) {
      ManifoldMemoryService.instance = new ManifoldMemoryService();
    }
    return ManifoldMemoryService.instance;
  }

  /**
   * Initializes the memory from Storage.
   */
  async initialize(): Promise<void> {
    const memoryPath = this.getMemoryPath();
    const weightsDir = this.getWeightsDir();

    try {
      if (fs.existsSync(memoryPath)) {
        const data = fs.readFileSync(memoryPath, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed.hyperState)) {
          this.hyperState = parsed.hyperState;
          debugLogger.debug('[LOGOS_MEMORY] Hyper-State restored.');
        }
      }

      // Restore manifold weights if they exist in Storage
      if (fs.existsSync(path.join(weightsDir, 'encoder_stable.json'))) {
        this.logos.loadWeights(weightsDir);
        debugLogger.debug('[LOGOS_MEMORY] Learned manifold weights restored.');
      }
      this.logos.updateAlignment(this.hyperState);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      debugLogger.warn(`[LOGOS_MEMORY] Restoration failed: ${message}`);
    }
  }

  /**
   * Assimilates a new signal into the global Hyper-State.
   * Uses weighted average to shift the manifold anchor.
   */
  assimilate(signal: number[]): void {
    const alpha = 0.05; // Learning rate
    this.hyperState = this.hyperState.map(
      (val, i) => val * (1 - alpha) + signal[i] * alpha,
    );
    this.logos.updateAlignment(this.hyperState);
  }

  /**
   * Persists the current state to disk.
   */
  async persist(): Promise<void> {
    const memoryPath = this.getMemoryPath();
    const weightsDir = this.getWeightsDir();

    try {
      if (!fs.existsSync(path.dirname(memoryPath))) {
        fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
      }

      fs.writeFileSync(
        memoryPath,
        JSON.stringify(
          {
            hyperState: this.hyperState,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      );

      // Persist weights
      this.logos.saveWeights(weightsDir);
      debugLogger.debug('[LOGOS_MEMORY] State persisted to Storage.');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      debugLogger.error(`[LOGOS_MEMORY] Persistence failed: ${message}`);
    }
  }

  getHyperState(): number[] {
    return [...this.hyperState];
  }

  private getMemoryPath(): string {
    return path.join(Storage.getGlobalPhillDir(), 'logos', 'memory.json');
  }

  private getWeightsDir(): string {
    return path.join(Storage.getGlobalPhillDir(), 'logos', 'weights');
  }
}
