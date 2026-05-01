/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelResolutionContext {
  useGemini3_1?: boolean;
  useGemini3_1FlashLite?: boolean;
  useCustomTools?: boolean;
  hasAccessToPreview?: boolean;
  requestedModel?: string;
}

/**
 * Interface for the ModelConfigService to break circular dependencies.
 */
export interface IModelConfigService {
  getModelDefinition(modelId: string):
    | {
        tier?: string;
        family?: string;
        isPreview?: boolean;
        displayName?: string;
        features?: {
          thinking?: boolean;
          multimodalToolUse?: boolean;
        };
      }
    | undefined;

  resolveModelId(
    requestedModel: string,
    context?: ModelResolutionContext,
  ): string;

  resolveClassifierModelId(
    tier: string,
    requestedModel: string,
    context?: ModelResolutionContext,
  ): string;
}

/**
 * Interface defining the minimal configuration required for model capability checks.
 * This helps break circular dependencies between Config and models.ts.
 */
export interface ModelCapabilityContext {
  readonly modelConfigService: IModelConfigService;
  getExperimentalDynamicModelConfiguration?: () => boolean;
  getPreviewFeatures?: () => boolean;
  getHasAccessToPreviewModel?: () => boolean;
  getGemini31Launched?: () => Promise<boolean>;
  getGemini31LaunchedSync?: () => boolean;
}

export const PREVIEW_GEMINI_MODEL = 'gemini-3-pro-preview';
export const PREVIEW_GEMINI_3_1_MODEL = 'gemini-3.1-pro-preview';
export const PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL =
  'gemini-3.1-pro-preview-customtools';
export const PREVIEW_GEMINI_FLASH_MODEL = 'gemini-3-flash-preview';
export const PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL =
  'gemini-3.1-flash-lite-preview';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

// Phill compatibility exports. The rest of this codebase still uses Phill
// names as the public API, while the underlying model IDs remain Gemini IDs.
export const PREVIEW_PHILL_3_1_MODEL_ID = PREVIEW_GEMINI_3_1_MODEL;
export const PREVIEW_PHILL_3_1_CUSTOM_TOOLS_MODEL =
  PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL;
export const PREVIEW_PHILL_3_1_FLASH_MODEL_ID = PREVIEW_GEMINI_FLASH_MODEL;
export const PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID =
  PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL;
export const PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID =
  'gemini-3.1-flash-image-preview';

export const PREVIEW_PHILL_3_PRO_MODEL_ID = PREVIEW_GEMINI_MODEL;
export const PREVIEW_PHILL_3_FLASH_MODEL_ID = PREVIEW_GEMINI_FLASH_MODEL;
export const PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID = 'gemini-3-pro-image-preview';

export const STABLE_PHILL_2_5_PRO = DEFAULT_GEMINI_MODEL;
export const STABLE_PHILL_2_5_FLASH = DEFAULT_GEMINI_FLASH_MODEL;
export const STABLE_PHILL_2_5_FLASH_LITE = DEFAULT_GEMINI_FLASH_LITE_MODEL;

export const STABLE_PHILL_EMBEDDING_MODEL = 'gemini-embedding-001';
export const PREVIEW_PHILL_EMBEDDING_MODEL = 'gemini-embedding-2-preview';

export const DEFAULT_PHILL_MODEL = STABLE_PHILL_2_5_PRO;
export const DEFAULT_PHILL_FLASH_MODEL = STABLE_PHILL_2_5_FLASH;
export const DEFAULT_PHILL_FLASH_LITE_MODEL = STABLE_PHILL_2_5_FLASH_LITE;
export const DEFAULT_PHILL_EMBEDDING_MODEL = PREVIEW_PHILL_EMBEDDING_MODEL;

export const PREVIEW_PHILL_MODEL = PREVIEW_PHILL_3_1_MODEL_ID;
export const PREVIEW_PHILL_FLASH_MODEL = PREVIEW_PHILL_3_1_FLASH_MODEL_ID;
export const PREVIEW_PHILL_MODEL_ID = PREVIEW_PHILL_MODEL;
export const PREVIEW_PHILL_FLASH_MODEL_ID = PREVIEW_PHILL_FLASH_MODEL;

export const PREVIEW_PHILL_3_DEEP_THINK_MODEL = 'gemini-3-deep-think-preview';
export const PREVIEW_PHILL_3_PLUS_3_1_MODEL = PREVIEW_PHILL_3_1_MODEL_ID;
export const PREVIEW_PHILL_3_PLUS_3_1_FLASH_MODEL =
  PREVIEW_PHILL_3_1_FLASH_MODEL_ID;

export const PREVIEW_VEO_3_1_MODEL = 'veo-3.1-generate-preview';
export const PREVIEW_VEO_3_1_FAST_MODEL = 'veo-3.1-fast-generate-preview';
export const STABLE_VEO_2_MODEL = 'veo-2.0-generate-001';

export const VALID_GEMINI_MODELS = new Set([
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_3_1_MODEL,
  PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
  PREVIEW_GEMINI_FLASH_MODEL,
  PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
]);

export const PREVIEW_GEMINI_MODEL_AUTO = 'auto-gemini-3';
export const DEFAULT_GEMINI_MODEL_AUTO = 'auto-gemini-2.5';

export const PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO = 'auto-gemini-deep-think';
export const PREVIEW_PHILL_MODEL_AUTO = PREVIEW_GEMINI_MODEL_AUTO;
export const PREVIEW_PHILL_3_1_MODEL_AUTO = 'auto-gemini-3.1';
export const PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO = 'auto-gemini-3plus-3.1';
export const DEFAULT_PHILL_MODEL_AUTO = DEFAULT_GEMINI_MODEL_AUTO;

// Model aliases for user convenience.
export const GEMINI_MODEL_ALIAS_AUTO = 'auto';
export const GEMINI_MODEL_ALIAS_PRO = 'pro';
export const GEMINI_MODEL_ALIAS_FLASH = 'flash';
export const GEMINI_MODEL_ALIAS_FLASH_LITE = 'flash-lite';

export const PHILL_MODEL_ALIAS_AUTO = GEMINI_MODEL_ALIAS_AUTO;
export const PHILL_MODEL_ALIAS_PRO = GEMINI_MODEL_ALIAS_PRO;
export const PHILL_MODEL_ALIAS_FLASH = GEMINI_MODEL_ALIAS_FLASH;
export const PHILL_MODEL_ALIAS_FLASH_LITE = GEMINI_MODEL_ALIAS_FLASH_LITE;

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

export const VALID_PHILL_MODELS = new Set([
  ...VALID_GEMINI_MODELS,
  PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID,
  PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID,
  PREVIEW_PHILL_3_DEEP_THINK_MODEL,
  STABLE_PHILL_EMBEDDING_MODEL,
  PREVIEW_PHILL_EMBEDDING_MODEL,
  PREVIEW_VEO_3_1_MODEL,
  PREVIEW_VEO_3_1_FAST_MODEL,
  STABLE_VEO_2_MODEL,
]);

// Cap the thinking at 8192 to prevent run-away thinking loops.
export const DEFAULT_THINKING_MODE = 8192;

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

/**
 * Resolves the requested model alias (e.g., 'auto-gemini-3', 'pro', 'flash', 'flash-lite')
 * to a concrete model name.
 *
 * @param requestedModel The model alias or concrete model name requested by the user.
 * @param useGemini3_1 Whether to use Gemini 3.1 Pro Preview for auto/pro aliases.
 * @param hasAccessToPreview Whether the user has access to preview models.
 * @returns The resolved concrete model name.
 */
export function resolveModel(
  requestedModel: string,
  useGemini3_1: boolean = false,
  useGemini3_1FlashLite: boolean | ModelCapabilityContext = false,
  useCustomToolModel: boolean = false,
  hasAccessToPreview: boolean | ModelCapabilityContext = true,
  config?: ModelCapabilityContext,
): string {
  // Backward-compatible call shape:
  // resolveModel(model, previewFeatures, useCustomTools, hasAccess, config)
  if (typeof hasAccessToPreview === 'object') {
    config = hasAccessToPreview;
    hasAccessToPreview = useCustomToolModel;
    useCustomToolModel =
      typeof useGemini3_1FlashLite === 'boolean'
        ? useGemini3_1FlashLite
        : false;
    useGemini3_1FlashLite = false;
  } else if (typeof useGemini3_1FlashLite === 'object') {
    config = useGemini3_1FlashLite;
    useGemini3_1FlashLite = false;
  }

  useGemini3_1 = useGemini3_1 || config?.getGemini31LaunchedSync?.() || false;
  hasAccessToPreview =
    hasAccessToPreview && (config?.getHasAccessToPreviewModel?.() ?? true);

  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    const resolved = config.modelConfigService.resolveModelId(requestedModel, {
      useGemini3_1,
      useGemini3_1FlashLite,
      useCustomTools: useCustomToolModel,
      hasAccessToPreview,
    });

    if (!hasAccessToPreview && isPreviewModel(resolved, config)) {
      // Fallback for unknown preview models.
      if (resolved.includes('flash-lite')) {
        return DEFAULT_GEMINI_FLASH_LITE_MODEL;
      }
      if (resolved.includes('flash')) {
        return DEFAULT_GEMINI_FLASH_MODEL;
      }
      return DEFAULT_GEMINI_MODEL;
    }

    return resolved;
  }

  let resolved: string;
  switch (requestedModel) {
    case PREVIEW_GEMINI_MODEL:
    case PREVIEW_GEMINI_MODEL_AUTO:
    case PREVIEW_PHILL_3_1_MODEL_AUTO:
    case PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO:
    case GEMINI_MODEL_ALIAS_AUTO:
    case GEMINI_MODEL_ALIAS_PRO: {
      if (useGemini3_1) {
        resolved = useCustomToolModel
          ? PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL
          : PREVIEW_GEMINI_3_1_MODEL;
      } else {
        resolved = PREVIEW_GEMINI_MODEL;
      }
      break;
    }
    case PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO: {
      resolved = PREVIEW_PHILL_3_DEEP_THINK_MODEL;
      break;
    }
    case DEFAULT_GEMINI_MODEL_AUTO: {
      resolved = DEFAULT_GEMINI_MODEL;
      break;
    }
    case GEMINI_MODEL_ALIAS_FLASH: {
      resolved = PREVIEW_GEMINI_FLASH_MODEL;
      break;
    }
    case GEMINI_MODEL_ALIAS_FLASH_LITE: {
      resolved = useGemini3_1FlashLite
        ? PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL
        : DEFAULT_GEMINI_FLASH_LITE_MODEL;
      break;
    }
    default: {
      resolved = requestedModel;
      break;
    }
  }

  if (!hasAccessToPreview && isPreviewModel(resolved)) {
    // Downgrade to stable models if user lacks preview access.
    switch (resolved) {
      case PREVIEW_GEMINI_FLASH_MODEL:
        return DEFAULT_GEMINI_FLASH_MODEL;
      case PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL:
        return DEFAULT_GEMINI_FLASH_LITE_MODEL;
      case PREVIEW_GEMINI_MODEL:
      case PREVIEW_GEMINI_3_1_MODEL:
      case PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL:
        return DEFAULT_GEMINI_MODEL;
      default:
        // Fallback for unknown preview models, preserving original logic.
        if (resolved.includes('flash-lite')) {
          return DEFAULT_GEMINI_FLASH_LITE_MODEL;
        }
        if (resolved.includes('flash')) {
          return DEFAULT_GEMINI_FLASH_MODEL;
        }
        return DEFAULT_GEMINI_MODEL;
    }
  }

  return resolved;
}

/**
 * Resolves the appropriate model based on the classifier's decision.
 *
 * @param requestedModel The current requested model (e.g. auto-gemini-2.5).
 * @param modelAlias The alias selected by the classifier ('flash' or 'pro').
 * @param useGemini3_1 Whether to use Gemini 3.1 Pro Preview.
 * @param useCustomToolModel Whether to use the custom tool model.
 * @param config Optional config object for dynamic model configuration.
 * @returns The resolved concrete model name.
 */
export function resolveClassifierModel(
  requestedModel: string,
  modelAlias: string | boolean = GEMINI_MODEL_ALIAS_FLASH,
  useGemini3_1: boolean | ModelCapabilityContext = false,
  useGemini3_1FlashLite: boolean = false,
  useCustomToolModel: boolean = false,
  hasAccessToPreview: boolean = true,
  config?: ModelCapabilityContext,
): string {
  // Backward-compatible call shape:
  // resolveClassifierModel(model, previewFeatures, config)
  if (typeof modelAlias === 'boolean') {
    config = typeof useGemini3_1 === 'object' ? useGemini3_1 : config;
    useGemini3_1 = modelAlias;
    modelAlias = GEMINI_MODEL_ALIAS_FLASH;
  }

  const useGemini31Flag =
    (typeof useGemini3_1 === 'boolean' ? useGemini3_1 : false) ||
    config?.getGemini31LaunchedSync?.() ||
    false;
  hasAccessToPreview =
    hasAccessToPreview && (config?.getHasAccessToPreviewModel?.() ?? true);

  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.resolveClassifierModelId(
      modelAlias,
      requestedModel,
      {
        useGemini3_1: useGemini31Flag,
        useGemini3_1FlashLite,
        useCustomTools: useCustomToolModel,
        hasAccessToPreview,
      },
    );
  }

  if (modelAlias === GEMINI_MODEL_ALIAS_FLASH) {
    if (
      requestedModel === DEFAULT_GEMINI_MODEL_AUTO ||
      requestedModel === DEFAULT_GEMINI_MODEL
    ) {
      return DEFAULT_GEMINI_FLASH_MODEL;
    }
    if (
      requestedModel === PREVIEW_GEMINI_MODEL_AUTO ||
      requestedModel === PREVIEW_GEMINI_MODEL
    ) {
      return PREVIEW_GEMINI_FLASH_MODEL;
    }
    return resolveModel(GEMINI_MODEL_ALIAS_FLASH);
  }
  return resolveModel(
    requestedModel,
    useGemini31Flag,
    useGemini3_1FlashLite,
    useCustomToolModel,
  );
}

export function getDisplayString(
  model: string,
  config?: ModelCapabilityContext,
) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    const definition = config.modelConfigService.getModelDefinition(model);
    if (definition?.displayName) {
      return definition.displayName;
    }
  }

  switch (model) {
    case PREVIEW_GEMINI_MODEL_AUTO:
      return 'Auto (Gemini 3)';
    case PREVIEW_PHILL_3_1_MODEL_AUTO:
      return 'Auto (Phill 3.1)';
    case PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO:
      return 'Auto (Phill 3+ 3.1)';
    case PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO:
      return 'Auto (Deep Think)';
    case DEFAULT_GEMINI_MODEL_AUTO:
      return 'Auto (Phill Stable)';
    case GEMINI_MODEL_ALIAS_PRO:
      return PREVIEW_GEMINI_MODEL;
    case GEMINI_MODEL_ALIAS_FLASH:
      return PREVIEW_GEMINI_FLASH_MODEL;
    case PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL:
      return PREVIEW_GEMINI_3_1_MODEL;
    case PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL:
      return PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL;
    default:
      return model;
  }
}

/**
 * Checks if the model is a preview model.
 *
 * @param model The model name to check.
 * @param config Optional config object for dynamic model configuration.
 * @returns True if the model is a preview model.
 */
export function isPreviewModel(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return (
      config.modelConfigService.getModelDefinition(model)?.isPreview === true
    );
  }

  return (
    model === PREVIEW_GEMINI_MODEL ||
    model === PREVIEW_GEMINI_3_1_MODEL ||
    model === PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL ||
    model === PREVIEW_GEMINI_FLASH_MODEL ||
    model === PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID ||
    model === PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID ||
    model === PREVIEW_PHILL_3_DEEP_THINK_MODEL ||
    model === PREVIEW_GEMINI_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_1_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO ||
    model === GEMINI_MODEL_ALIAS_AUTO ||
    model === PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL
  );
}

/**
 * Checks if the model is a Pro model.
 *
 * @param model The model name to check.
 * @param config Optional config object for dynamic model configuration.
 * @returns True if the model is a Pro model.
 */
export function isProModel(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.getModelDefinition(model)?.tier === 'pro';
  }
  return model.toLowerCase().includes('pro');
}

/**
 * Checks if the model is a Gemini 3 model.
 *
 * @param model The model name to check.
 * @param config Optional config object for dynamic model configuration.
 * @returns True if the model is a Gemini 3 model.
 */
export function isGemini3Model(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    // Legacy behavior resolves the model first.
    const resolved = resolveModel(model);
    return (
      config.modelConfigService.getModelDefinition(resolved)?.family ===
      'gemini-3'
    );
  }

  const resolved = resolveModel(model);
  return /^gemini-3(\.|-|$)/.test(resolved);
}

/**
 * Checks if the model is a Gemini 2.x model.
 *
 * @param model The model name to check.
 * @returns True if the model is a Gemini-2.x model.
 */
export function isGemini2Model(model: string): boolean {
  // This is legacy behavior, will remove this when gemini 2 models are no
  // longer needed.
  return /^gemini-2(\.|$)/.test(model);
}

export function isPhill2Model(model: string): boolean {
  return isGemini2Model(model);
}

export function isPhill3Model(model: string): boolean {
  return isGemini3Model(model);
}

/**
 * Checks if the model is a "custom" model (not Gemini branded).
 *
 * @param model The model name to check.
 * @param config Optional config object for dynamic model configuration.
 * @returns True if the model is not a Gemini branded model.
 */
export function isCustomModel(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    const resolved = resolveModel(model, false, false, false, true, config);
    return (
      config.modelConfigService.getModelDefinition(resolved)?.tier ===
        'custom' || !resolved.startsWith('gemini-')
    );
  }
  const resolved = resolveModel(model);
  return !resolved.startsWith('gemini-');
}

/**
 * Checks if the model should be treated as a modern model.
 * This includes Gemini 3 models and any custom models.
 *
 * @param model The model name to check.
 * @returns True if the model supports modern features like thoughts.
 */
export function supportsModernFeatures(model: string): boolean {
  if (isGemini3Model(model)) return true;
  return isCustomModel(model);
}

/**
 * Checks if the model is an auto model.
 *
 * @param model The model name to check.
 * @param config Optional config object for dynamic model configuration.
 * @returns True if the model is an auto model.
 */
export function isAutoModel(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.getModelDefinition(model)?.tier === 'auto';
  }
  return (
    model === GEMINI_MODEL_ALIAS_AUTO ||
    model === PREVIEW_GEMINI_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_1_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_PLUS_3_1_MODEL_AUTO ||
    model === PREVIEW_PHILL_3_DEEP_THINK_MODEL_AUTO ||
    model === DEFAULT_GEMINI_MODEL_AUTO
  );
}

export function supportsThinking(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return (
      config.modelConfigService.getModelDefinition(model)?.features
        ?.thinking === true
    );
  }
  return (
    isGemini3Model(model) ||
    model.includes('gemini-2.5-pro') ||
    model.includes('gemini-2.5-flash')
  );
}

/**
 * Checks if the model supports multimodal function responses (multimodal data nested within function response).
 * This is supported in Gemini 3.
 *
 * @param model The model name to check.
 * @returns True if the model supports multimodal function responses.
 */
export function supportsMultimodalFunctionResponse(
  model: string,
  config?: ModelCapabilityContext,
): boolean {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return (
      config.modelConfigService.getModelDefinition(model)?.features
        ?.multimodalToolUse === true
    );
  }
  return isGemini3Model(model) || model.includes('gemini-2.5');
}

/**
 * Checks if the given model is considered active based on the current configuration.
 *
 * @param model The model name to check.
 * @param useGemini3_1 Whether Gemini 3.1 Pro Preview is enabled.
 * @returns True if the model is active.
 */
export function isActiveModel(
  model: string,
  useGemini3_1: boolean = false,
  useGemini3_1FlashLite: boolean = false,
  useCustomToolModel: boolean = false,
): boolean {
  if (!VALID_GEMINI_MODELS.has(model)) {
    return false;
  }
  if (model === PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL) {
    return useGemini3_1FlashLite;
  }
  if (useGemini3_1) {
    if (model === PREVIEW_GEMINI_MODEL) {
      return false;
    }
    if (useCustomToolModel) {
      return model !== PREVIEW_GEMINI_3_1_MODEL;
    } else {
      return model !== PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL;
    }
  } else {
    return (
      model !== PREVIEW_GEMINI_3_1_MODEL &&
      model !== PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL
    );
  }
}
