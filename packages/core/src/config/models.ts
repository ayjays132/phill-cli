/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ModelConfigService } from '../services/modelConfigService.js';

// Gemini 3.x Preview Series (Verified Available)
export const PREVIEW_PHILL_3_1_MODEL_ID = 'gemini-3.1-pro-preview';
export const PREVIEW_PHILL_3_1_CUSTOM_TOOLS_MODEL = 'gemini-3.1-pro-preview-customtools';
export const PREVIEW_PHILL_3_1_FLASH_MODEL_ID = 'gemini-3-flash-preview'; // Aligned to user availability
export const PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID =
  'gemini-3.1-flash-lite-preview';
export const PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID =
  'gemini-3.1-flash-image-preview';

// Gemini 3.0 model family (Legacy Preview)
export const PREVIEW_PHILL_3_PRO_MODEL_ID = 'gemini-3-pro-preview';
export const PREVIEW_PHILL_3_FLASH_MODEL_ID = 'gemini-3-flash-preview';
export const PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID = 'gemini-3-pro-image-preview';

// Stable Gemini (Current Verified Production)
export const STABLE_PHILL_2_5_PRO = 'gemini-2.5-pro';
export const STABLE_PHILL_2_5_FLASH = 'gemini-2.5-flash';
export const STABLE_PHILL_2_5_FLASH_LITE = 'gemini-2.5-flash-lite';

export const STABLE_PHILL_EMBEDDING_MODEL = 'gemini-embedding-001';
export const PREVIEW_PHILL_EMBEDDING_MODEL = 'gemini-embedding-2-preview';

export const DEFAULT_PHILL_MODEL = STABLE_PHILL_2_5_PRO;
export const DEFAULT_PHILL_FLASH_MODEL = STABLE_PHILL_2_5_FLASH;
export const DEFAULT_PHILL_FLASH_LITE_MODEL = STABLE_PHILL_2_5_FLASH_LITE;
export const DEFAULT_PHILL_EMBEDDING_MODEL = PREVIEW_PHILL_EMBEDDING_MODEL;

export const PREVIEW_PHILL_MODEL = PREVIEW_PHILL_3_1_MODEL_ID;
export const PREVIEW_PHILL_FLASH_MODEL = PREVIEW_PHILL_3_1_FLASH_MODEL_ID;
export const DEFAULT_GEMINI_MODEL = DEFAULT_PHILL_MODEL;
export const DEFAULT_GEMINI_FLASH_MODEL = DEFAULT_PHILL_FLASH_MODEL;
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = DEFAULT_PHILL_FLASH_LITE_MODEL;
export const DEFAULT_GEMINI_EMBEDDING_MODEL = DEFAULT_PHILL_EMBEDDING_MODEL;
export const PREVIEW_GEMINI_MODEL = PREVIEW_PHILL_MODEL;
export const PREVIEW_GEMINI_FLASH_MODEL = PREVIEW_PHILL_FLASH_MODEL;
// Back-compat aliases retained for older imports.
export const PREVIEW_PHILL_MODEL_ID = PREVIEW_PHILL_MODEL;
export const PREVIEW_PHILL_FLASH_MODEL_ID = PREVIEW_PHILL_FLASH_MODEL;

// Gemini 3+ 3.1 (High-Tier Reasoning / Deep Think)
export const PREVIEW_PHILL_3_DEEP_THINK_MODEL = 'gemini-3-deep-think-preview';
export const PREVIEW_PHILL_3_PLUS_3_1_MODEL = PREVIEW_PHILL_3_1_MODEL_ID;
export const PREVIEW_PHILL_3_PLUS_3_1_FLASH_MODEL =
  PREVIEW_PHILL_3_1_FLASH_MODEL_ID;

// Veo Video Generation Models
export const PREVIEW_VEO_3_1_MODEL = 'veo-3.1-generate-preview';
export const PREVIEW_VEO_3_1_FAST_MODEL = 'veo-3.1-fast-generate-preview';
export const STABLE_VEO_2_MODEL = 'veo-2.0-generate-001';

export const VALID_PHILL_MODELS = new Set([
  PREVIEW_PHILL_3_1_MODEL_ID,
  PREVIEW_PHILL_3_1_CUSTOM_TOOLS_MODEL,
  PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID,
  PREVIEW_PHILL_3_PRO_MODEL_ID,
  PREVIEW_PHILL_3_FLASH_MODEL_ID,
  PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID,
  PREVIEW_PHILL_3_DEEP_THINK_MODEL,
  // Stable
  STABLE_PHILL_2_5_PRO,
  STABLE_PHILL_2_5_FLASH,
  STABLE_PHILL_2_5_FLASH_LITE,
  // Embedding
  STABLE_PHILL_EMBEDDING_MODEL,
  PREVIEW_PHILL_EMBEDDING_MODEL,
  // Legacy support
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  // Veo
  PREVIEW_VEO_3_1_MODEL,
  PREVIEW_VEO_3_1_FAST_MODEL,
  STABLE_VEO_2_MODEL,
]);

export const PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO = 'auto-gemini-deep-think';
export const PREVIEW_PHILL_MODEL_AUTO = 'auto-gemini-3';
export const PREVIEW_PHILL_3_1_MODEL_AUTO = 'auto-gemini-3.1';
export const PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO = 'auto-gemini-3plus-3.1';
export const DEFAULT_PHILL_MODEL_AUTO = 'auto-gemini-3.1-stable';

// Model aliases for user convenience.
export const PHILL_MODEL_ALIAS_AUTO = 'auto';
export const PHILL_MODEL_ALIAS_PRO = 'pro';
export const PHILL_MODEL_ALIAS_FLASH = 'flash';
export const PHILL_MODEL_ALIAS_FLASH_LITE = 'flash-lite';

/** Context provided during model resolution. */
export interface ModelCapabilityContext {
  modelConfigService: ModelConfigService;
  getPreviewFeatures?: () => boolean;
  getHasAccessToPreviewModel?: () => boolean;
  getGemini31Launched?: () => Promise<boolean>;
  getGemini31LaunchedSync?: () => boolean;
}

/**
 * Resolves a requested model name or alias to a valid Gemini model ID.
 * This is the Apex Resolution Engine, matching official Google reference logic.
 */
export function resolveModel(
  requestedModel: string,
  previewFeaturesEnabled: boolean = false,
  useCustomToolModel: boolean = false,
  hasAccessToPreview: boolean = true,
  config?: ModelCapabilityContext,
): string {
  // If we have the full capability context, use the declarative resolution engine.
  if (config?.modelConfigService?.resolveModelId) {
    const resolved = config.modelConfigService.resolveModelId(requestedModel, {
      useGemini3_1:
        previewFeaturesEnabled || config.getGemini31LaunchedSync?.() || false,
      useCustomTools: useCustomToolModel,
      hasAccessToPreview:
        hasAccessToPreview && (config.getHasAccessToPreviewModel?.() ?? true),
      requestedModel,
    });
    
    if (!hasAccessToPreview && isPreviewModel(resolved)) {
      if (resolved.includes('flash-lite')) {
        return DEFAULT_PHILL_FLASH_LITE_MODEL;
      }
      if (resolved.includes('flash')) {
        return DEFAULT_PHILL_FLASH_MODEL;
      }
      return DEFAULT_PHILL_MODEL;
    }
    
    return resolved;
  }

  // Fast-path / Fallback for procedural resolution
  const normalizedRequestedModel = requestedModel.toLowerCase();
  switch (normalizedRequestedModel) {
    case PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO:
      return PREVIEW_PHILL_3_DEEP_THINK_MODEL;
    case PREVIEW_PHILL_3_1_MODEL_AUTO:
      return previewFeaturesEnabled && hasAccessToPreview
        ? (useCustomToolModel ? PREVIEW_PHILL_3_1_CUSTOM_TOOLS_MODEL : PREVIEW_PHILL_3_1_MODEL_ID)
        : STABLE_PHILL_2_5_PRO;
    case PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO:
      return useCustomToolModel ? PREVIEW_PHILL_3_1_CUSTOM_TOOLS_MODEL : PREVIEW_PHILL_3_1_MODEL_ID;
    case DEFAULT_PHILL_MODEL_AUTO:
      return DEFAULT_PHILL_MODEL;
    case PHILL_MODEL_ALIAS_PRO:
      return previewFeaturesEnabled && hasAccessToPreview
        ? PREVIEW_PHILL_MODEL
        : DEFAULT_PHILL_MODEL;
    case PHILL_MODEL_ALIAS_FLASH:
      return previewFeaturesEnabled && hasAccessToPreview
        ? PREVIEW_PHILL_FLASH_MODEL
        : DEFAULT_PHILL_FLASH_MODEL;
    case PHILL_MODEL_ALIAS_FLASH_LITE:
      return DEFAULT_PHILL_FLASH_LITE_MODEL;
    case PHILL_MODEL_ALIAS_AUTO:
      return previewFeaturesEnabled && hasAccessToPreview
        ? PREVIEW_PHILL_MODEL
        : DEFAULT_PHILL_MODEL;
    default:
      return requestedModel;
  }
}

/**
 * Resolves the classifier model based on the requested model and preview features.
 */
export function resolveClassifierModel(
  requestedModel: string,
  previewFeaturesEnabled: boolean = false,
  config?: ModelCapabilityContext,
): string {
  if (config?.modelConfigService) {
    return config.modelConfigService.resolveClassifierModelId(
      'flash', // Classifiers typically use the flash tier
      requestedModel,
      {
        useGemini3_1:
          previewFeaturesEnabled || config.getGemini31LaunchedSync?.() || false,
        hasAccessToPreview: config.getHasAccessToPreviewModel?.() ?? true,
      },
    );
  }

  if (
    previewFeaturesEnabled ||
    requestedModel === PREVIEW_PHILL_3_1_MODEL_AUTO ||
    requestedModel === PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO
  ) {
    return PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID;
  }
  return DEFAULT_PHILL_FLASH_LITE_MODEL;
}

/**
 * Returns a user-friendly display string for a model or auto mode.
 */
export function getDisplayString(
  model: string,
  config?: ModelCapabilityContext,
) {
  // If we have metadata in the definition, use the display name from there.
  const definition = config?.modelConfigService?.getModelDefinition(model);
  if (definition?.displayName) {
    return definition.displayName;
  }

  switch (model) {
    case PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO:
      return 'Auto (Deep Think)';
    case PREVIEW_PHILL_3_1_MODEL_AUTO:
      return 'Auto (Phill 3.1)';
    case PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO:
      return 'Auto (Phill 3+ 3.1)';
    case STABLE_PHILL_2_5_PRO:
      return 'Phill 2.5 Pro';
    case STABLE_PHILL_2_5_FLASH:
      return 'Phill 2.5 Flash';
    case STABLE_PHILL_2_5_FLASH_LITE:
      return 'Phill 2.5 Flash-Lite';
    case PREVIEW_PHILL_3_1_MODEL_ID:
      return 'Phill 3.1 Pro Preview';
    case PREVIEW_PHILL_3_1_FLASH_MODEL_ID:
      return 'Phill 3 Flash Preview';
    case PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID:
      return 'Phill 3.1 Flash-Lite Preview';
    case PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID:
      return 'Phill 3.1 Flash-Image Preview';
    case PREVIEW_PHILL_3_PRO_MODEL_ID:
      return 'Phill 3 Pro Preview';
    case PREVIEW_PHILL_3_FLASH_MODEL_ID:
      return 'Phill 3 Flash Preview';
    case PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID:
      return 'Nano Banana 2 (Image)';
    case PREVIEW_PHILL_3_DEEP_THINK_MODEL:
      return 'Phill 3 Deep Think';
    case DEFAULT_PHILL_MODEL_AUTO:
      return 'Auto (Phill Stable)';
    case PHILL_MODEL_ALIAS_PRO:
      return 'Pro Tier (Adaptive)';
    case PHILL_MODEL_ALIAS_FLASH:
      return 'Flash Tier (Adaptive)';
    case PHILL_MODEL_ALIAS_FLASH_LITE:
      return 'Flash-Lite (Stable)';
    default:
      return model;
  }
}

/**
 * Returns whether the given model is an 'auto' model.
 */
export function isAutoModel(model: string): boolean {
  return (
    model === PREVIEW_PHILL_3_1_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO ||
    model === DEFAULT_PHILL_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO ||
    model === PHILL_MODEL_ALIAS_AUTO
  );
}

/**
 * Returns whether the given model is a 'preview' model.
 */
export function isPreviewModel(model: string): boolean {
  return (
    model === PREVIEW_PHILL_3_1_MODEL_ID ||
    model === PREVIEW_PHILL_3_1_FLASH_MODEL_ID ||
    model === PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID ||
    model === PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID ||
    model === PREVIEW_PHILL_3_PRO_MODEL_ID ||
    model === PREVIEW_PHILL_3_FLASH_MODEL_ID ||
    model === PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID ||
    model === PREVIEW_PHILL_3_DEEP_THINK_MODEL
  );
}

/**
 * Returns whether the given model is a 'gemini-2' model.
 */
export function isPhill2Model(model: string): boolean {
  return model.includes('gemini-2');
}

/**
 * Returns whether the given model is a 'gemini-3' model.
 */
export function isPhill3Model(model: string): boolean {
  return model.includes('gemini-3');
}

/**
 * Returns whether the given model supports multi-modal function responses.
 */
export function supportsMultimodalFunctionResponse(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.modelConfigService) {
    return (
      config.modelConfigService.getModelDefinition(model)?.features
        ?.multimodalToolUse ?? false
    );
  }
  return isPhill3Model(model) || model.includes('gemini-2.5');
}

/**
 * Returns whether the given model supports the 'Thinking' feature.
 */
export function supportsThinking(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.modelConfigService) {
    return (
      config.modelConfigService.getModelDefinition(model)?.features?.thinking ??
      false
    );
  }
  // Gemini 3.x models support thinking.
  if (
    model.includes('gemini-3.1-pro') ||
    model.includes('gemini-3-flash') ||
    model.includes('gemini-3.1-flash-lite') ||
    model.includes('gemini-3.1-flash-image')
  ) {
    return true;
  }
  // Gemini 2.5 Pro models support thinking.
  if (model.includes('gemini-2.5-pro')) {
    return true;
  }
  return false;
}

export enum ThinkingBudget {
  OFF = 0,
  LOW = 1024,
  MEDIUM = 4096,
  HIGH = 16384,
  MAX = 32768,
}

export enum ThinkingLevel {
  OFF = 'off',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export const DEFAULT_THINKING_BUDGET = ThinkingBudget.MEDIUM;
export const DEFAULT_THINKING_MODE = ThinkingLevel.MEDIUM;
