/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const PREVIEW_GEMINI_MODEL = 'gemini-3-pro';
export const PREVIEW_GEMINI_FLASH_MODEL = 'gemini-3-flash';
export const PREVIEW_GEMINI_MODEL_ID = 'gemini-3-pro-preview';
export const PREVIEW_GEMINI_FLASH_MODEL_ID = 'gemini-3-flash-preview';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

export const VALID_GEMINI_MODELS = new Set([
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_FLASH_MODEL,
  PREVIEW_GEMINI_MODEL_ID,
  PREVIEW_GEMINI_FLASH_MODEL_ID,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
]);

export const PREVIEW_GEMINI_MODEL_AUTO = 'auto-gemini-3';
export const DEFAULT_GEMINI_MODEL_AUTO = 'auto-gemini-2.5';

// Model aliases for user convenience.
export const GEMINI_MODEL_ALIAS_AUTO = 'auto';
export const GEMINI_MODEL_ALIAS_PRO = 'pro';
export const GEMINI_MODEL_ALIAS_FLASH = 'flash';
export const GEMINI_MODEL_ALIAS_FLASH_LITE = 'flash-lite';
export const GEMINI_MODEL_ALIAS_FLASH_LATEST = 'flash-latest';
export const GEMINI_MODEL_ALIAS_FLASH_PREVIEW = 'flash-preview';
export const GROQ_MODEL_LLAMA_3_3_70B = 'llama-3.3-70b-versatile';
export const GROQ_MODEL_LLAMA_3_1_70B = 'llama-3.1-70b-versatile';
export const GROQ_MODEL_LLAMA_3_1_8B = 'llama-3.1-8b-instant';
export const GROQ_MODEL_GEMMA2_9B = 'gemma2-9b-it';
export const GROQ_MODEL_DEEPSEEK_R1_LLAMA_70B = 'deepseek-r1-distill-llama-70b';
export const GROQ_MODEL_DEEPSEEK_R1_QWEN_32B = 'deepseek-r1-distill-qwen-32b';
export const GROQ_MODEL_MIXTRAL_8X7B = 'mixtral-8x7b-32768';

export const VALID_GROQ_MODELS = new Set([
  GROQ_MODEL_LLAMA_3_3_70B,
  GROQ_MODEL_LLAMA_3_1_70B,
  GROQ_MODEL_LLAMA_3_1_8B,
  GROQ_MODEL_GEMMA2_9B,
  GROQ_MODEL_DEEPSEEK_R1_LLAMA_70B,
  GROQ_MODEL_DEEPSEEK_R1_QWEN_32B,
  GROQ_MODEL_MIXTRAL_8X7B,
  'groq/compound',
  'groq/compound-mini',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-safeguard-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'moonshotai/kimi-k2-instruct-0905',
  'whisper-large-v3',
  'whisper-large-v3-turbo',
]);

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// Cap the thinking at 8192 to prevent run-away thinking loops.
export const DEFAULT_THINKING_MODE = 8192;

/**
 * Resolves the requested model alias (e.g., 'auto-gemini-3', 'pro', 'flash', 'flash-lite')
 * to a concrete model name, considering preview features.
 *
 * @param requestedModel The model alias or concrete model name requested by the user.
 * @param previewFeaturesEnabled A boolean indicating if preview features are enabled.
 * @returns The resolved concrete model name.
 */
export function resolveModel(
  requestedModel: string,
  previewFeaturesEnabled: boolean = false,
): string {
  switch (requestedModel) {
    case PREVIEW_GEMINI_MODEL_AUTO: {
      return PREVIEW_GEMINI_MODEL_ID;
    }
    case DEFAULT_GEMINI_MODEL_AUTO: {
      return DEFAULT_GEMINI_MODEL;
    }
    case GEMINI_MODEL_ALIAS_AUTO:
    case GEMINI_MODEL_ALIAS_PRO: {
      return previewFeaturesEnabled
        ? PREVIEW_GEMINI_MODEL
        : DEFAULT_GEMINI_MODEL;
    }
    case GEMINI_MODEL_ALIAS_FLASH:
    case GEMINI_MODEL_ALIAS_FLASH_LATEST: {
      return previewFeaturesEnabled
        ? PREVIEW_GEMINI_FLASH_MODEL
        : DEFAULT_GEMINI_FLASH_MODEL;
    }
    case GEMINI_MODEL_ALIAS_FLASH_PREVIEW: {
      return PREVIEW_GEMINI_FLASH_MODEL;
    }
    case GEMINI_MODEL_ALIAS_FLASH_LITE: {
      return DEFAULT_GEMINI_FLASH_LITE_MODEL;
    }
    default: {
      return requestedModel;
    }
  }
}

/**
 * Resolves the appropriate model based on the classifier's decision.
 *
 * @param requestedModel The current requested model (e.g. auto-gemini-2.0).
 * @param modelAlias The alias selected by the classifier ('flash' or 'pro').
 * @param previewFeaturesEnabled Whether preview features are enabled.
 * @returns The resolved concrete model name.
 */
export function resolveClassifierModel(
  requestedModel: string,
  modelAlias: string,
  previewFeaturesEnabled: boolean = false,
): string {
  if (modelAlias === GEMINI_MODEL_ALIAS_FLASH) {
    const normalized = requestedModel.toLowerCase();
    
    // Catch-all for Gemini 2.x family (including 2.5) if it's a 'pro' variant
    if (
      requestedModel === DEFAULT_GEMINI_MODEL_AUTO ||
      (isGemini2Model(normalized) && normalized.includes('pro'))
    ) {
      return DEFAULT_GEMINI_FLASH_MODEL;
    }
    
    // Catch-all for Gemini 3 family if it's a 'pro' variant
    if (
      requestedModel === PREVIEW_GEMINI_MODEL_AUTO ||
      (isGemini3Model(normalized) && normalized.includes('pro'))
    ) {
      // If we are in explicitly requested auto-3 or a preview variant, use the preview flash
      if (requestedModel === PREVIEW_GEMINI_MODEL_AUTO || normalized.includes('preview')) {
        return PREVIEW_GEMINI_FLASH_MODEL_ID;
      }
      return PREVIEW_GEMINI_FLASH_MODEL;
    }
    
    return resolveModel(GEMINI_MODEL_ALIAS_FLASH, previewFeaturesEnabled);
  }
  return resolveModel(requestedModel, previewFeaturesEnabled);
}
export function getDisplayString(
  model: string,
  previewFeaturesEnabled: boolean = false,
) {
  switch (model) {
    case PREVIEW_GEMINI_MODEL_AUTO:
      return 'Auto (Phill 3)';
    case DEFAULT_GEMINI_MODEL_AUTO:
      return 'Auto (Phill 2.5)';
    case GEMINI_MODEL_ALIAS_PRO:
      return previewFeaturesEnabled
        ? PREVIEW_GEMINI_MODEL
        : DEFAULT_GEMINI_MODEL;
    case GEMINI_MODEL_ALIAS_FLASH:
    case GEMINI_MODEL_ALIAS_FLASH_LATEST:
      return previewFeaturesEnabled
        ? PREVIEW_GEMINI_FLASH_MODEL
        : DEFAULT_GEMINI_FLASH_MODEL;
    case GEMINI_MODEL_ALIAS_FLASH_PREVIEW:
      return PREVIEW_GEMINI_FLASH_MODEL;
    default:
      return model;
  }
}

/**
 * Checks if the model is a preview model.
 *
 * @param model The model name to check.
 * @returns True if the model is a preview model.
 */
export function isPreviewModel(model: string): boolean {
  return (
    model.startsWith('gemini-3-') ||
    model === PREVIEW_GEMINI_MODEL_AUTO
  );
}

/**
 * Checks if the model is a Gemini 2.x model.
 *
 * @param model The model name to check.
 * @returns True if the model is a Gemini-2.x model.
 */
export function isGemini2Model(model: string): boolean {
  return /^gemini-2([-.]|$)/.test(model);
}

/**
 * Checks if the model is a Gemini 3 model.
 *
 * @param model The model name to check.
 * @returns True if the model is a Gemini-3 model.
 */
export function isGemini3Model(model: string): boolean {
  return /^gemini-3([-.]|$)/.test(model);
}

/**
 * Checks if the model is an auto model.
 *
 * @param model The model name to check.
 * @returns True if the model is an auto model.
 */
export function isAutoModel(model: string): boolean {
  return (
    model === GEMINI_MODEL_ALIAS_AUTO ||
    model === PREVIEW_GEMINI_MODEL_AUTO ||
    model === DEFAULT_GEMINI_MODEL_AUTO
  );
}

/**
 * Checks if the model supports multimodal function responses (multimodal data nested within function response).
 * This is supported in Gemini 3.
 *
 * @param model The model name to check.
 * @returns True if the model supports multimodal function responses.
 */
export function supportsMultimodalFunctionResponse(model: string): boolean {
  return model.startsWith('gemini-3-');
}
/**
 * Checks if the model supports thinking (reasoning) features.
 *
 * @param model The model name to check.
 * @returns True if the model supports thinking.
 */
export function supportsThinking(model: string): boolean {
  // Gemini 3 models support thinking.
  if (model.startsWith('gemini-3-')) {
    return true;
  }
  // Gemini 2.5 Pro and Flash models support thinking.
  if (model.includes('gemini-2.5-pro') || model.includes('gemini-2.5-flash')) {
    return true;
  }
  // Gemini 2.0 Pro models support thinking (legacy support).
  if (model.includes('gemini-2.0-pro')) {
    return true;
  }
  return false;
}
