/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type * as tf from '@tensorflow/tfjs';
import { debugLogger } from '../utils/debugLogger.js';

// Load vendored LOGOS engine
// @ts-expect-error
import vae from '../logos/vendor/model.cjs';
// @ts-expect-error
import tokenizer from '../logos/vendor/tokenizer.cjs';
// @ts-expect-error
import soul from '../logos/vendor/soul.cjs';

export interface LogosDimensions {
  spatialGrounding: number; // Dims 0-2 (average)
  temporalCoherence: number; // Dim 3
  solutionDiversity: number; // Dim 4
  axiomConfidence: number; // Dim 5
  intentAlignment: number; // Dim 6
  ethicsAlignment: number; // Dim 7
}

export interface LogosSignal {
  dominantDimension: string;
  score: number;
  dimensions: LogosDimensions;
  manifold: number[];
}

/**
 * LogosService
 * Orchestrates the 8D Singularity reasoning layer.
 * Maps latent manifold dimensions to theological/reasoning roles.
 */
export class LogosService {
  private static instance: LogosService;
  private readonly analysisCache = new Map<string, LogosSignal>();
  private readonly MAX_CACHE_SIZE = 100;

  private constructor() {
    debugLogger.debug(
      '[LOGOS] System initialized and ready for reasoning enrichment.',
    );
  }

  static getInstance(): LogosService {
    if (!LogosService.instance) {
      LogosService.instance = new LogosService();
    }
    return LogosService.instance;
  }

  /**
   * Analyzes an input string or grid and returns a LogosSignal.
   * Cached and async to prevent blocking.
   */
  async analyze(input: string | number[][]): Promise<LogosSignal> {
    const cacheKey = typeof input === 'string' ? input : JSON.stringify(input);
    const cached = this.analysisCache.get(cacheKey);
    if (cached) return cached;

    try {
      const indices = tokenizer.encode(input);
      const latent = vae.encode(indices);
      
      // Use async data retrieval to avoid blocking the event loop
      const data = await latent.data();
      const manifold = Array.from(data as Float32Array);

      // Cleanup tensors
      indices.dispose();
      latent.dispose();

      const signal = this.calculateSignal(manifold);
      
      // Manage cache
      if (this.analysisCache.size >= this.MAX_CACHE_SIZE) {
        const oldest = this.analysisCache.keys().next().value;
        if (oldest) this.analysisCache.delete(oldest);
      }
      this.analysisCache.set(cacheKey, signal);

      return signal;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      debugLogger.error(`[LOGOS] Analysis failed: ${message}`);
      throw e;
    }
  }

  private getDominantDimension(dims: LogosDimensions): string {
    let max = -Infinity;
    let dominant = 'spatialGrounding';

    for (const [key, value] of Object.entries(dims)) {
      if (value > max) {
        max = value;
        dominant = key;
      }
    }

    return dominant;
  }

  /**
   * Performs an axiomatic audit on a latent state.
   */
  audit(manifold: number[]): {
    isDissonant: boolean;
    score: number;
    lawsViolated: string[];
  } {
    return soul.auditLatent(manifold);
  }

  /**
   * TEST-TIME COMPUTE (TTC): Performs iterative latent refinement.
   * Guides the manifold towards higher coherency and axiomatic stability.
   */
  async refineManifestation(
    input: string,
    iterations = 15,
  ): Promise<LogosSignal> {
    const indices = tokenizer.encode(input);
    const latent = vae.encode(indices);

    // Hard iteration cap: Max 50 for safety
    const safeIterations = Math.max(0, Math.min(iterations, 50));

    // Perform Test-Time Compute with a timeout safeguard
    const refineWithTimeout = async (): Promise<tf.Tensor> =>
      new Promise<tf.Tensor>((resolve) => {
        // Refine is synchronous in VAE engine, so we wrap it
        const result = vae.refine(latent, safeIterations);
        resolve(result);
      });

    const TIMEOUT_MS = 5000; // 5 seconds max for TTC
    let refinedLatent: tf.Tensor;

    try {
      refinedLatent = (await Promise.race([
        refineWithTimeout(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TTC Timeout')), TIMEOUT_MS),
        ),
      ])) as tf.Tensor;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      debugLogger.warn(`[LOGOS] TTC Refinement preempted: ${message}`);
      refinedLatent = latent.clone(); // Fallback to original latent
    }

    const data = await refinedLatent.data();
    const manifold = Array.from(data as Float32Array);

    // Cleanup
    indices.dispose();
    latent.dispose();
    refinedLatent.dispose();

    return this.calculateSignal(manifold);
  }

  /**
   * Saves the current manifold weights to the vendor model store.
   */
  saveWeights(customDir?: string): void {
    vae.saveWeights(customDir);
    debugLogger.debug(`[LOGOS] Weights persisted successfully.`);
  }

  /**
   * Loads manifold weights from the vendor model store.
   */
  loadWeights(customDir?: string): void {
    vae.loadWeights(customDir);
    debugLogger.debug(`[LOGOS] Weights restored successfully.`);
  }

  /**
   * Guides the CLI based on the Coherency Signal (Dim 3).
   */
  getCoherencyGuide(signal: LogosSignal): {
    recommendation: string;
    quality: 'High' | 'Medium' | 'Low';
  } {
    const coherence = signal.dimensions.temporalCoherence;
    if (coherence < 0.35) {
      return {
        recommendation:
          'Coherence Collapse: Enforce ARCHITECT mode and perform recursion.',
        quality: 'Low',
      };
    }
    if (coherence < 0.75) {
      return {
        recommendation: 'Coherence Drift: Supplement with AXIOM RAG context.',
        quality: 'Medium',
      };
    }
    return {
      recommendation: 'Coherence Stable: Proceed with DIRECT execution.',
      quality: 'High',
    };
  }

  private calculateSignal(manifold: number[]): LogosSignal {
    const dimensions: LogosDimensions = {
      spatialGrounding: (manifold[0] + manifold[1] + manifold[2]) / 3,
      temporalCoherence: manifold[3],
      solutionDiversity: manifold[4],
      axiomConfidence: manifold[5],
      intentAlignment: manifold[6],
      ethicsAlignment: manifold[7],
    };

    const dominantDimension = this.getDominantDimension(dimensions);

    return {
      dominantDimension,
      score: dimensions[dominantDimension as keyof LogosDimensions],
      dimensions,
      manifold,
    };
  }

  /**
   * Updates the global Logos alignment anchor.
   */
  updateAlignment(newAnchor: number[]): void {
    soul.updateLogosAlignment(newAnchor);
  }
}
