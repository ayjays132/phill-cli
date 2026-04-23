/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ModelPolicy,
  ModelPolicyActionMap,
  ModelPolicyChain,
  ModelPolicyStateMap,
} from './modelPolicy.js';
import {
  DEFAULT_PHILL_FLASH_LITE_MODEL,
  DEFAULT_PHILL_FLASH_MODEL,
  DEFAULT_PHILL_MODEL,
  PREVIEW_PHILL_3_PRO_MODEL_ID,
  PREVIEW_PHILL_FLASH_MODEL,
  PREVIEW_PHILL_MODEL,
  STABLE_PHILL_2_5_PRO,
  STABLE_PHILL_2_5_FLASH,
  STABLE_PHILL_2_5_FLASH_LITE,
  PREVIEW_PHILL_3_1_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID,
  PREVIEW_PHILL_3_PLUS_3_1_MODEL,
  PREVIEW_PHILL_3_PLUS_3_1_FLASH_MODEL,
  PREVIEW_PHILL_3_1_MODEL_AUTO,
  PREVIEW_PHILL_MODEL_AUTO,
  PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO,
  PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO,
  DEFAULT_PHILL_MODEL_AUTO,
} from '../config/models.js';
import type { UserTierId } from '../code_assist/types.js';

// actions and stateTransitions are optional when defining ModelPolicy
type PolicyConfig = Omit<ModelPolicy, 'actions' | 'stateTransitions'> & {
  actions?: ModelPolicyActionMap;
  stateTransitions?: ModelPolicyStateMap;
};

export interface ModelPolicyOptions {
  previewEnabled: boolean;
  autoMode?: string;
  userTier?: UserTierId;
}

const DEFAULT_ACTIONS: ModelPolicyActionMap = {
  terminal: 'prompt',
  transient: 'prompt',
  not_found: 'prompt',
  unknown: 'prompt',
};

const SILENT_ACTIONS: ModelPolicyActionMap = {
  terminal: 'silent',
  transient: 'silent',
  not_found: 'silent',
  unknown: 'silent',
};

const DEFAULT_STATE: ModelPolicyStateMap = {
  terminal: 'cool_off',
  transient: 'sticky_retry',
  not_found: 'cool_off',
  unknown: 'cool_off',
};

const DEFAULT_CHAIN: ModelPolicyChain = [
  definePolicy({ model: DEFAULT_PHILL_MODEL, actions: SILENT_ACTIONS }),
  definePolicy({ model: DEFAULT_PHILL_FLASH_MODEL, actions: SILENT_ACTIONS }),
  definePolicy({
    model: DEFAULT_PHILL_FLASH_LITE_MODEL,
    isLastResort: true,
    actions: SILENT_ACTIONS,
  }),
];

const PREVIEW_CHAIN: ModelPolicyChain = [
  definePolicy({ model: PREVIEW_PHILL_3_1_MODEL_ID, actions: SILENT_ACTIONS }),
  definePolicy({
    model: PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
    actions: SILENT_ACTIONS,
  }),
  definePolicy({
    model: PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
    isLastResort: true,
    actions: SILENT_ACTIONS,
  }),
];

const GEMINI_3_1_CHAIN: ModelPolicyChain = [
  definePolicy({ model: PREVIEW_PHILL_3_PRO_MODEL_ID, actions: SILENT_ACTIONS }),
  definePolicy({ model: PREVIEW_PHILL_3_1_MODEL_ID, actions: SILENT_ACTIONS }),
  definePolicy({
    model: PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
    actions: SILENT_ACTIONS,
  }),
  definePolicy({
    model: PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
    actions: SILENT_ACTIONS,
  }),
  definePolicy({ model: STABLE_PHILL_2_5_PRO, actions: SILENT_ACTIONS }),
  definePolicy({ model: STABLE_PHILL_2_5_FLASH, actions: SILENT_ACTIONS }),
  definePolicy({
    model: STABLE_PHILL_2_5_FLASH_LITE,
    isLastResort: true,
    actions: SILENT_ACTIONS,
  }),
];

const GEMINI_3_PLUS_3_1_CHAIN: ModelPolicyChain = [
  // 1. Premium Tier (3.1 Pro)
  definePolicy({
    model: PREVIEW_PHILL_3_PLUS_3_1_MODEL,
    actions: SILENT_ACTIONS,
  }),

  // 2. High-Speed Premium Fallback (3.1 Flash)
  definePolicy({
    model: PREVIEW_PHILL_3_PLUS_3_1_FLASH_MODEL,
    actions: SILENT_ACTIONS,
  }),

  // 3. Multimodal Premium Fallback (3.1 Flash-Image)
  definePolicy({
    model: PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID,
    actions: SILENT_ACTIONS,
  }),

  // 4. Stable Last Resort (2.5 Flash)
  definePolicy({ model: STABLE_PHILL_2_5_PRO, actions: SILENT_ACTIONS }),
  definePolicy({ model: STABLE_PHILL_2_5_FLASH, actions: SILENT_ACTIONS }),
  definePolicy({
    model: STABLE_PHILL_2_5_FLASH_LITE,
    isLastResort: true,
  }),
];

const FLASH_LITE_CHAIN: ModelPolicyChain = [
  definePolicy({
    model: DEFAULT_PHILL_FLASH_LITE_MODEL,
    actions: SILENT_ACTIONS,
  }),
  definePolicy({
    model: DEFAULT_PHILL_FLASH_MODEL,
    actions: SILENT_ACTIONS,
  }),
  definePolicy({
    model: DEFAULT_PHILL_MODEL,
    isLastResort: true,
    actions: SILENT_ACTIONS,
  }),
];

const GEMINI_3_CHAIN: ModelPolicyChain = [
  // Legacy "auto-gemini-3" should map to the latest practical Gemini 3.x text ladder,
  // not the deprecated Gemini 3 Pro Preview that shut down on March 9, 2026.
  definePolicy({ model: PREVIEW_PHILL_MODEL, actions: SILENT_ACTIONS }),
  definePolicy({ model: PREVIEW_PHILL_FLASH_MODEL, actions: SILENT_ACTIONS }),
  definePolicy({
    model: PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
    isLastResort: true,
    actions: SILENT_ACTIONS,
  }),
];

/**
 * Returns the default ordered model policy chain for the user.
 */
export function getModelPolicyChain(
  options: ModelPolicyOptions,
): ModelPolicyChain {
  if (options.autoMode === PREVIEW_PHILL_3_1_MODEL_AUTO) {
    return cloneChain(GEMINI_3_1_CHAIN);
  }
  if (options.autoMode === PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO) {
    // Deep Think Tier
    return cloneChain(GEMINI_3_1_CHAIN);
  }
  if (options.autoMode === PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO) {
    return cloneChain(GEMINI_3_PLUS_3_1_CHAIN);
  }
  if (options.autoMode === PREVIEW_PHILL_MODEL_AUTO) {
    return cloneChain(GEMINI_3_CHAIN);
  }
  if (options.autoMode === DEFAULT_PHILL_MODEL_AUTO) {
    return cloneChain(DEFAULT_CHAIN);
  }

  if (options.previewEnabled) {
    // Explicit preview mode fallback
    return cloneChain(PREVIEW_CHAIN);
  }

  return cloneChain(DEFAULT_CHAIN);
}

export function createSingleModelChain(model: string): ModelPolicyChain {
  return [definePolicy({ model, isLastResort: true })];
}

export function getFlashLitePolicyChain(): ModelPolicyChain {
  return cloneChain(FLASH_LITE_CHAIN);
}

/**
 * Provides a default policy scaffold for models not present in the catalog.
 */
export function createDefaultPolicy(
  model: string,
  options?: { isLastResort?: boolean },
): ModelPolicy {
  return definePolicy({ model, isLastResort: options?.isLastResort });
}

export function validateModelPolicyChain(chain: ModelPolicyChain): void {
  if (chain.length === 0) {
    throw new Error('Model policy chain must include at least one model.');
  }
  const lastResortCount = chain.filter((policy) => policy.isLastResort).length;
  if (lastResortCount === 0) {
    throw new Error('Model policy chain must include an `isLastResort` model.');
  }
  if (lastResortCount > 1) {
    throw new Error('Model policy chain must only have one `isLastResort`.');
  }
}

/**
 * Helper to define a ModelPolicy with default actions and state transitions.
 * Ensures every policy is a fresh instance to avoid shared state.
 */
function definePolicy(config: PolicyConfig): ModelPolicy {
  return {
    model: config.model,
    isLastResort: config.isLastResort,
    actions: { ...DEFAULT_ACTIONS, ...(config.actions ?? {}) },
    stateTransitions: {
      ...DEFAULT_STATE,
      ...(config.stateTransitions ?? {}),
    },
  };
}

function clonePolicy(policy: ModelPolicy): ModelPolicy {
  return {
    ...policy,
    actions: { ...policy.actions },
    stateTransitions: { ...policy.stateTransitions },
  };
}

function cloneChain(chain: ModelPolicyChain): ModelPolicyChain {
  return chain.map(clonePolicy);
}
