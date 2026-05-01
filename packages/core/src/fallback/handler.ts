/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import { AuthType } from '../core/contentGenerator.js';
import { openBrowserSecurely } from '../utils/secure-browser-launcher.js';
import { debugLogger } from '../utils/debugLogger.js';
import { getErrorMessage } from '../utils/errors.js';
import type { FallbackIntent, FallbackRecommendation } from './types.js';
import { classifyFailureKind } from '../availability/errorClassification.js';
import {
  buildFallbackPolicyContext,
  resolvePolicyChain,
  resolvePolicyAction,
  applyAvailabilityTransition,
} from '../availability/policyHelpers.js';
import {
  DEFAULT_PHILL_FLASH_LITE_MODEL,
  DEFAULT_PHILL_FLASH_MODEL,
  DEFAULT_PHILL_MODEL,
  PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
  PREVIEW_PHILL_FLASH_MODEL,
  PREVIEW_PHILL_MODEL,
  isAutoModel,
} from '../config/models.js';
import type { ModelPolicy } from '../availability/modelPolicy.js';
import { createDefaultPolicy } from '../availability/policyCatalog.js';

const UPGRADE_URL_PAGE = 'https://goo.gle/set-up-gemini-code-assist';

export async function handleFallback(
  config: Config,
  failedModel: string,
  authType?: string,
  error?: unknown,
): Promise<string | boolean | null> {
  if (
    authType !== AuthType.LOGIN_WITH_GOOGLE &&
    authType !== AuthType.USE_PHILL &&
    authType !== AuthType.USE_VERTEX_AI &&
    authType !== AuthType.COMPUTE_ADC
  ) {
    return null;
  }

  const chain = resolvePolicyChain(config);
  let { failedPolicy, candidates } = buildFallbackPolicyContext(
    chain,
    failedModel,
  );

  if (!candidates.length) {
    const wrappedChain = resolvePolicyChain(config, undefined, true);
    const wrappedContext = buildFallbackPolicyContext(
      wrappedChain,
      failedModel,
      true,
    );
    failedPolicy = wrappedContext.failedPolicy;
    candidates = wrappedContext.candidates;
  }

  const failureKind = classifyFailureKind(error);
  const availability = config.getModelAvailabilityService();
  const getAvailabilityContext = () => {
    if (!failedPolicy) return undefined;
    return { service: availability, policy: failedPolicy };
  };

  const recoveryCandidates = buildRecoveryCandidates(
    config,
    failedModel,
    candidates,
  );

  let fallbackModel: string;
  if (!recoveryCandidates.length) {
    fallbackModel = failedModel;
  } else {
    const selection = availability.selectFirstAvailable(
      recoveryCandidates.map((policy) => policy.model),
    );

    const lastResortPolicy = recoveryCandidates.find(
      (policy) => policy.isLastResort,
    );
    const selectedFallbackModel =
      selection.selectedModel ?? lastResortPolicy?.model;
    const selectedPolicy = recoveryCandidates.find(
      (policy) => policy.model === selectedFallbackModel,
    );

    if (
      !selectedFallbackModel ||
      selectedFallbackModel === failedModel ||
      !selectedPolicy
    ) {
      return null;
    }

    fallbackModel = selectedFallbackModel;

    // failureKind is already declared and calculated above
    const action = resolvePolicyAction(failureKind, selectedPolicy);

    if (action === 'silent') {
      applyAvailabilityTransition(getAvailabilityContext, failureKind);
      return processIntent(config, 'retry_always', fallbackModel);
    }

    // This will be used in the future when FallbackRecommendation is passed through UI
    const recommendation: FallbackRecommendation = {
      ...selection,
      selectedModel: fallbackModel,
      action,
      failureKind,
      failedPolicy,
      selectedPolicy,
    };
    void recommendation;
  }

  // Emergency fallback for model-not-found when normal policy chain cannot move.
  // This preserves existing behavior for successful chain selection and only
  // kicks in when we'd otherwise return/throw on the same failed model.
  if (fallbackModel === failedModel && failureKind === 'not_found') {
    const emergencyCandidates = [
      DEFAULT_PHILL_FLASH_LITE_MODEL,
      DEFAULT_PHILL_MODEL,
    ].filter((model) => model !== failedModel);
    const emergencySelection =
      availability.selectFirstAvailable(emergencyCandidates);
    const emergencyModel = emergencySelection.selectedModel;
    if (emergencyModel && emergencyModel !== failedModel) {
      fallbackModel = emergencyModel;
      applyAvailabilityTransition(getAvailabilityContext, failureKind);
      return processIntent(config, 'retry_always', fallbackModel);
    }
  }

  const handler = config.getFallbackModelHandler();
  if (typeof handler !== 'function') {
    // No UI handler available; continue with a safe automatic fallback.
    applyAvailabilityTransition(getAvailabilityContext, failureKind);
    return processIntent(config, 'retry_always', fallbackModel);
  }

  try {
    const intent = await handler(failedModel, fallbackModel, error);

    // If the user chose to switch/retry, we apply the availability transition
    // to the failed model (e.g. marking it terminal if it had a quota error).
    // We DO NOT apply it if the user chose 'stop' or 'retry_later', allowing
    // them to try again later with the same model state.
    if (intent === 'retry_always' || intent === 'retry_once') {
      applyAvailabilityTransition(getAvailabilityContext, failureKind);
    }

    return await processIntent(config, intent, fallbackModel);
  } catch (handlerError) {
    debugLogger.error('Fallback handler failed:', handlerError);
    return null;
  }
}

function buildRecoveryCandidates(
  config: Config,
  failedModel: string,
  candidates: ModelPolicy[],
): ModelPolicy[] {
  const byModel = new Map<string, ModelPolicy>();
  const addPolicy = (policy: ModelPolicy) => {
    if (policy.model !== failedModel && !byModel.has(policy.model)) {
      byModel.set(policy.model, policy);
    }
  };

  candidates.forEach(addPolicy);

  if (byModel.size === 0) {
    const wrappedChain = resolvePolicyChain(config, undefined, true);
    const wrappedContext = buildFallbackPolicyContext(
      wrappedChain,
      failedModel,
      true,
    );
    wrappedContext.candidates.forEach(addPolicy);
  }

  if (byModel.size === 0) {
    // Some model aliases or externally supplied model IDs are not present in the
    // active policy chain. Keep a final known-good ladder so recovery never
    // offers the exact route that just failed when another route exists.
    [
      PREVIEW_PHILL_MODEL,
      PREVIEW_PHILL_FLASH_MODEL,
      PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
      DEFAULT_PHILL_MODEL,
      DEFAULT_PHILL_FLASH_MODEL,
      DEFAULT_PHILL_FLASH_LITE_MODEL,
    ].forEach((model) =>
      addPolicy(
        createDefaultPolicy(model, {
          isLastResort: model === DEFAULT_PHILL_FLASH_LITE_MODEL,
        }),
      ),
    );
  }

  return [...byModel.values()];
}

async function handleUpgrade() {
  try {
    await openBrowserSecurely(UPGRADE_URL_PAGE);
  } catch (error) {
    debugLogger.warn(
      'Failed to open browser automatically:',
      getErrorMessage(error),
    );
  }
}

async function processIntent(
  config: Config,
  intent: FallbackIntent | null,
  fallbackModel: string,
): Promise<boolean> {
  if (intent == null) {
    // Some handlers intentionally return null to indicate "no decision".
    // Treat this as a safe no-op instead of throwing.
    return false;
  }

  switch (intent) {
    case 'retry_always':
      // TODO(telemetry): Implement generic fallback event logging. Existing
      // logFlashFallback is specific to a single Model.
      if (isAutoModel(config.getModel())) {
        // Preserve auto mode so subsequent turns continue cycling through the
        // auto policy chain instead of collapsing to the concrete fallback.
        config.setActiveModel(fallbackModel);
      } else {
        config.activateFallbackMode(fallbackModel);
      }
      return true;

    case 'retry_once':
      // For distinct retry (retry_once), we do NOT set the active model permanently.
      // The FallbackStrategy will handle routing to the available model for this turn
      // based on the availability service state (which is updated before this).
      return true;

    case 'stop':
      // Do not switch model on stop. User wants to stay on current model (and stop).
      return false;

    case 'retry_later':
      return false;

    case 'upgrade':
      await handleUpgrade();
      return false;

    default:
      throw new Error(
        `Unexpected fallback intent received from fallbackModelHandler: "${intent}"`,
      );
  }
}
