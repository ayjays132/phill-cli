/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerateContentConfig } from '@google/genai';
import type { Config } from '../config/config.js';
import type {
  FailureKind,
  FallbackAction,
  ModelPolicy,
  ModelPolicyChain,
  RetryAvailabilityContext,
} from './modelPolicy.js';
import {
  createDefaultPolicy,
  createSingleModelChain,
} from './policyCatalog.js';
import {
  DEFAULT_PHILL_FLASH_LITE_MODEL,
  DEFAULT_PHILL_MODEL,
  isAutoModel,
  isPhill3Model,
  resolveModel,
} from '../config/models.js';
import type { ModelSelectionResult } from './modelAvailabilityService.js';
import type { ModelConfigKey } from '../services/modelConfigService.js';

/**
 * Resolves the active policy chain for the given config, ensuring the
 * user-selected active model is represented.
 */
export function resolvePolicyChain(
  config: Config,
  preferredModel?: string,
  wrapsAround: boolean = false,
): ModelPolicyChain {
  const modelFromConfig =
    preferredModel ?? config.getActiveModel?.() ?? config.getModel();
  const configuredModel = config.getModel();

  const previewFeaturesEnabled = config.getPreviewFeatures?.() ?? false;
  const hasAccessToPreview = config.getHasAccessToPreviewModel?.() ?? true;

  const context = {
    useGemini3_1: previewFeaturesEnabled,
    useGemini3_1FlashLite: previewFeaturesEnabled,
    hasAccessToPreview,
  };

  let chain;
  const resolvedModel = resolveModel(
    modelFromConfig,
    previewFeaturesEnabled,
    false,
    hasAccessToPreview,
    config,
  );
  const isAutoPreferred = preferredModel ? isAutoModel(preferredModel) : false;
  const isAutoConfigured = isAutoModel(configuredModel);

  if (resolvedModel === DEFAULT_PHILL_FLASH_LITE_MODEL) {
    chain = config.modelConfigService.resolveChain('lite', context);
  } else if (isAutoPreferred || isAutoConfigured || isPhill3Model(resolvedModel)) {
    const targetAlias = isAutoPreferred ? preferredModel! : configuredModel;
    if (
      isAutoModel(targetAlias) &&
      config.modelConfigService.getModelChain(targetAlias)
    ) {
      chain = config.modelConfigService.resolveChain(targetAlias, context);
    }
    
    if (!chain) {
      const chainKey = isPhill3Model(resolvedModel) ? 'auto-gemini-3.1' : 'default';
      chain = config.modelConfigService.resolveChain(chainKey, context);
    }
  } else {
    // If not auto and not a known preview family, we still try the default fallback
    chain = config.modelConfigService.resolveChain('default', context);
  }
  
  if (!chain) {
    chain = createSingleModelChain(modelFromConfig);
  }

  const activeIndex = chain.findIndex(
    (policy) => policy.model === resolvedModel,
  );
  if (activeIndex !== -1) {
    return wrapsAround
      ? [...chain.slice(activeIndex), ...chain.slice(0, activeIndex)]
      : [...chain.slice(activeIndex)];
  }

  // For explicit auto modes, never collapse to a stale out-of-chain model.
  // If the active/resolved model drifts (e.g. prior fallback), keep using the
  // intended auto chain so routing returns to the selected family.
  if (isAutoPreferred || isAutoConfigured) {
    return clonePolicyChainForReturn(chain, wrapsAround);
  }

  // If the user specified a model not in the default chain, we assume they want
  // *only* that model. We do not fallback to the default chain.
  return [createDefaultPolicy(resolvedModel, { isLastResort: true })];
}

function clonePolicyChainForReturn(
  chain: ModelPolicyChain,
  wrapsAround: boolean,
): ModelPolicyChain {
  // When active model is not in-chain, wrapsAround has no practical effect here;
  // return a cloned chain to avoid accidental mutations upstream.
  return wrapsAround ? [...chain] : [...chain];
}

/**
 * Produces the failed policy (if it exists in the chain) and the list of
 * fallback candidates that follow it.
 * @param chain - The ordered list of available model policies.
 * @param failedModel - The identifier of the model that failed.
 * @param wrapsAround - If true, treats the chain as a circular buffer.
 */
export function buildFallbackPolicyContext(
  chain: ModelPolicyChain,
  failedModel: string,
  wrapsAround: boolean = false,
): {
  failedPolicy?: ModelPolicy;
  candidates: ModelPolicy[];
} {
  const index = chain.findIndex((policy) => policy.model === failedModel);
  if (index === -1) {
    return { failedPolicy: undefined, candidates: chain };
  }
  // Return [candidates_after, candidates_before] to prioritize downgrades
  // (continuing the chain) before wrapping around to upgrades.
  const candidates = wrapsAround
    ? [...chain.slice(index + 1), ...chain.slice(0, index)]
    : [...chain.slice(index + 1)];
  return {
    failedPolicy: chain[index],
    candidates,
  };
}

export function resolvePolicyAction(
  failureKind: FailureKind,
  policy: ModelPolicy,
): FallbackAction {
  return policy.actions?.[failureKind] ?? 'prompt';
}

/**
 * Creates a context provider for retry logic that returns the availability
 * sevice and resolves the current model's policy.
 *
 * @param modelGetter A function that returns the model ID currently being attempted.
 *        (Allows handling dynamic model changes during retries).
 */
export function createAvailabilityContextProvider(
  config: Config,
  modelGetter: () => string,
): () => RetryAvailabilityContext | undefined {
  return () => {
    const service = config.getModelAvailabilityService();
    const currentModel = modelGetter();

    // Resolve the chain for the specific model we are attempting.
    const chain = resolvePolicyChain(config, currentModel);
    const policy = chain.find((p) => p.model === currentModel);

    return policy ? { service, policy } : undefined;
  };
}

/**
 * Selects the model to use for an attempt via the availability service and
 * returns the selection context.
 */
export function selectModelForAvailability(
  config: Config,
  requestedModel: string,
): ModelSelectionResult {
  const chain = resolvePolicyChain(config, requestedModel);
  const selection = config
    .getModelAvailabilityService()
    .selectFirstAvailable(chain.map((p) => p.model));

  if (selection.selectedModel) return selection;

  const backupModel =
    chain.find((p) => p.isLastResort)?.model ?? DEFAULT_PHILL_MODEL;

  return { selectedModel: backupModel, skipped: [] };
}

/**
 * Applies the model availability selection logic, including side effects
 * (setting active model, consuming sticky attempts) and config updates.
 */
export function applyModelSelection(
  config: Config,
  modelConfigKey: ModelConfigKey,
  options: { consumeAttempt?: boolean } = {},
): { model: string; config: GenerateContentConfig; maxAttempts?: number } {
  const resolved = config.modelConfigService.getResolvedConfig(modelConfigKey);
  const model = resolved.model;
  const selection = selectModelForAvailability(config, model);

  if (!selection) {
    return { model, config: resolved.generateContentConfig };
  }

  const finalModel = selection.selectedModel ?? model;
  let generateContentConfig = resolved.generateContentConfig;

  if (finalModel !== model) {
    const fallbackResolved = config.modelConfigService.getResolvedConfig({
      ...modelConfigKey,
      model: finalModel,
    });
    generateContentConfig = fallbackResolved.generateContentConfig;
  }

  config.setActiveModel(finalModel);

  if (selection.attempts && options.consumeAttempt !== false) {
    config.getModelAvailabilityService().consumeStickyAttempt(finalModel);
  }

  return {
    model: finalModel,
    config: generateContentConfig,
    maxAttempts: selection.attempts,
  };
}

export function applyAvailabilityTransition(
  getContext: (() => RetryAvailabilityContext | undefined) | undefined,
  failureKind: FailureKind,
): void {
  const context = getContext?.();
  if (!context) return;

  const transition = context.policy.stateTransitions?.[failureKind];
  if (!transition) return;

  if (transition === 'cool_off') {
    const reason =
      failureKind === 'terminal'
        ? 'quota'
        : failureKind === 'not_found'
          ? 'not_found'
          : 'capacity';
    context.service.markTerminal(
      context.policy.model,
      reason,
    );
  } else if (transition === 'sticky_retry') {
    context.service.markRetryOncePerTurn(context.policy.model);
  }
}
