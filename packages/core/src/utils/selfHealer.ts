/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from '../utils/debugLogger.js';
import { retryWithBackoff } from '../utils/retry.js';

export interface HealingCandidate<T> {
  name: string;
  execute: () => Promise<T>;
  isApplicable?: () => boolean;
}

/**
 * SelfHealer
 * Orchestrates multiple execution paths to solve a tool invocation.
 * Pivots to fallback candidates if the primary path fails.
 */
export class SelfHealer {
  /**
   * Attempts to resolve a Result through a chain of candidates.
   */
  static async resolve<T>(
    primary: HealingCandidate<T>,
    fallbacks: HealingCandidate<T>[],
  ): Promise<T> {
    let lastError: unknown;

    // Try primary
    try {
      debugLogger.debug(`[SelfHealer] Attempting primary: ${primary.name}`);
      return await primary.execute();
    } catch (e) {
      lastError = e;
      debugLogger.warn(`[SelfHealer] Primary failed (${primary.name}):`, e);
    }

    // Try fallbacks in order
    for (const fb of fallbacks) {
      if (fb.isApplicable && !fb.isApplicable()) {
        continue;
      }

      try {
        debugLogger.debug(`[SelfHealer] Attempting fallback: ${fb.name}`);
        return await fb.execute();
      } catch (e) {
        lastError = e;
        debugLogger.warn(`[SelfHealer] Fallback failed (${fb.name}):`, e);
      }
    }

    throw lastError || new Error(`Self-healing failed: All paths exhausted.`);
  }

  /**
   * Executes a task with automatic retries and backoff.
   */
  static async executeWithRetry<T>(
    task: () => Promise<T>,
    options: { maxAttempts?: number; taskName?: string } = {},
  ): Promise<T> {
    const { maxAttempts = 3, taskName = 'task' } = options;
    
    return await retryWithBackoff(task, {
      maxAttempts,
      onRetry: (attempt) => {
        debugLogger.log(`[SelfHealer] Retrying ${taskName} (Attempt ${attempt}/${maxAttempts})...`);
      },
    });
  }
}
