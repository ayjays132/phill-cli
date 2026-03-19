/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from '../utils/debugLogger.js';

export type ModelId = string;

type TerminalUnavailabilityReason = 'quota' | 'capacity' | 'access_denied' | 'not_found';
export type TurnUnavailabilityReason = 'retry_once_per_turn';

export type UnavailabilityReason =
  | TerminalUnavailabilityReason
  | TurnUnavailabilityReason
  | 'unknown';

export type ModelHealthStatus = 'healthy' | 'cool_off' | 'sticky_retry';

type HealthState =
  | { status: 'healthy' }
  | { 
      status: 'cool_off'; 
      reason: TerminalUnavailabilityReason; 
      expiry: number; // Timestamp when model becomes healthy again
    }
  | {
      status: 'sticky_retry';
      reason: TurnUnavailabilityReason;
      consumed: boolean;
    };

export interface ModelAvailabilitySnapshot {
  available: boolean;
  reason?: UnavailabilityReason;
}

export interface ModelSelectionResult {
  selectedModel: ModelId | null;
  attempts?: number;
  skipped: Array<{
    model: ModelId;
    reason: UnavailabilityReason;
  }>;
}

export class ModelAvailabilityService {
  private readonly health = new Map<ModelId, HealthState>();
  private readonly DEFAULT_COOL_OFF_MS = 5 * 60 * 1000; // 5 minutes default recovery

  markTerminal(model: ModelId, reason: TerminalUnavailabilityReason, coolOffMs?: number) {
    const expiry = Date.now() + (coolOffMs ?? this.DEFAULT_COOL_OFF_MS);
    this.setState(model, {
      status: 'cool_off',
      reason,
      expiry,
    });
    debugLogger.debug(`[ModelAvailability] Sidelining ${model} for ${reason}. Recovers at ${new Date(expiry).toLocaleTimeString()}.`);
  }

  markHealthy(model: ModelId) {
    this.clearState(model);
  }

  markRetryOncePerTurn(model: ModelId) {
    const currentState = this.health.get(model);
    // Do not override a cool-off failure with a transient one.
    if (currentState?.status === 'cool_off') {
      return;
    }

    // Only reset consumption if we are not already in the sticky_retry state.
    // This prevents infinite loops if the model fails repeatedly in the same turn.
    let consumed = false;
    if (currentState?.status === 'sticky_retry') {
      consumed = currentState.consumed;
    }

    this.setState(model, {
      status: 'sticky_retry',
      reason: 'retry_once_per_turn',
      consumed,
    });
  }

  consumeStickyAttempt(model: ModelId) {
    const state = this.health.get(model);
    if (state?.status === 'sticky_retry') {
      this.setState(model, { ...state, consumed: true });
    }
  }

  snapshot(model: ModelId): ModelAvailabilitySnapshot {
    const state = this.health.get(model);

    if (!state) {
      return { available: true };
    }

    if (state.status === 'cool_off') {
      if (Date.now() >= state.expiry) {
        this.markHealthy(model);
        return { available: true };
      }
      return { available: false, reason: state.reason };
    }

    if (state.status === 'sticky_retry' && state.consumed) {
      return { available: false, reason: state.reason };
    }

    return { available: true };
  }

  selectFirstAvailable(models: ModelId[]): ModelSelectionResult {
    const skipped: ModelSelectionResult['skipped'] = [];

    for (const model of models) {
      const snapshot = this.snapshot(model);
      if (snapshot.available) {
        const state = this.health.get(model);
        // A sticky model is being attempted, so note that.
        const attempts = state?.status === 'sticky_retry' ? 1 : undefined;
        return { selectedModel: model, skipped, attempts };
      } else {
        skipped.push({ model, reason: snapshot.reason ?? 'unknown' });
      }
    }
    return { selectedModel: null, skipped };
  }

  resetTurn() {
    for (const [model, state] of this.health.entries()) {
      if (state.status === 'sticky_retry') {
        this.setState(model, { ...state, consumed: false });
      }
    }
  }

  reset() {
    this.health.clear();
  }

  private setState(model: ModelId, nextState: HealthState) {
    this.health.set(model, nextState);
  }

  private clearState(model: ModelId) {
    this.health.delete(model);
  }
}
