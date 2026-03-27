/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ModelConfigServiceConfig } from '../index.js';

import {
  PREVIEW_PHILL_FLASH_MODEL,
  PREVIEW_PHILL_MODEL,
  PREVIEW_PHILL_3_PRO_MODEL_ID,
  PREVIEW_PHILL_3_FLASH_MODEL_ID,
  PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID,
  STABLE_PHILL_2_5_PRO,
  STABLE_PHILL_2_5_FLASH,
  STABLE_PHILL_2_5_FLASH_LITE,
  PREVIEW_PHILL_3_1_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID,
  ThinkingBudget,
} from './models.js';

/**
 * The default model configs. We use `base` as the parent for all of our model
 * configs, while `chat-base`, a child of `base`, is the parent of the models
 * we use in the "chat" experience.
 */
export const DEFAULT_MODEL_CONFIGS: ModelConfigServiceConfig = {
  aliases: {
    base: {
      modelConfig: {
        generateContentConfig: {
          temperature: 0,
          topP: 1,
        },
      },
    },
    'chat-base': {
      extends: 'base',
      modelConfig: {
        generateContentConfig: {
          thinkingConfig: {
            includeThoughts: true,
          },
          temperature: 1,
          topP: 0.95,
          topK: 64,
        },
      },
    },
    'chat-base-3': {
      extends: 'chat-base',
      modelConfig: {
        generateContentConfig: {
          thinkingConfig: {
            thinkingBudget: ThinkingBudget.HIGH,
          },
        },
      },
    },
    'gemini-3.1-pro': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_3_1_MODEL_ID,
      },
    },
    'gemini-3.1-flash': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
      },
    },
    'gemini-3.1-flash-lite': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
      },
    },
    'gemini-3.1-flash-image': {
      extends: 'base',
      modelConfig: {
        model: PREVIEW_PHILL_3_1_FLASH_IMAGE_MODEL_ID,
        generateContentConfig: {
          temperature: 1,
        },
      },
    },
    'gemini-3-pro': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_3_PRO_MODEL_ID,
      },
    },
    'gemini-3-flash': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_3_FLASH_MODEL_ID,
      },
    },
    'gemini-3-pro-image': {
      extends: 'base',
      modelConfig: {
        model: PREVIEW_PHILL_3_PRO_IMAGE_MODEL_ID,
        generateContentConfig: {
          temperature: 1,
        },
      },
    },
    'gemini-2-pro': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_MODEL,
      },
    },
    'gemini-2-pro-preview': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_MODEL,
      },
    },
    'gemini-2-flash': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_FLASH_MODEL,
      },
    },
    'gemini-2-flash-preview': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_FLASH_MODEL,
      },
    },
    'gemini-flash-latest': {
      extends: 'chat-base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'gemini-1.5-pro': {
      extends: 'chat-base-3',
      modelConfig: {
        model: STABLE_PHILL_2_5_PRO,
      },
    },
    'gemini-1.5-flash': {
      extends: 'chat-base-3',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'gemini-1.5-flash-lite': {
      extends: 'chat-base-3',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
      },
    },
    'gemini-1.5-flash-base': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'gemini-2-flash-base': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'gemini-2-pro-base': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_PRO,
      },
    },
    'gemini-2.5-flash-base': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'gemini-2.5-pro-base': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_PRO,
      },
    },
    'gemini-3.1-flash-base': {
      extends: 'base',
      modelConfig: {
        model: PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
      },
    },
    'gemini-3.1-pro-base': {
      extends: 'base',
      modelConfig: {
        model: PREVIEW_PHILL_3_1_MODEL_ID,
      },
    },
    classifier: {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
        generateContentConfig: {
          maxOutputTokens: 1024,
        },
      },
    },
    'prompt-completion': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
        generateContentConfig: {
          temperature: 0.3,
          maxOutputTokens: 16000,
        },
      },
    },
    'edit-corrector': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
      },
    },
    'summarizer-default': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
        generateContentConfig: {
          maxOutputTokens: 2000,
        },
      },
    },
    'summarizer-shell': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
        generateContentConfig: {
          maxOutputTokens: 2000,
        },
      },
    },
    'web-search': {
      extends: 'gemini-2-flash-base',
      modelConfig: {
        generateContentConfig: {
          tools: [{ googleSearch: {} }],
        },
      },
    },
    'web-fetch': {
      extends: 'gemini-2-flash-base',
      modelConfig: {
        generateContentConfig: {
          tools: [{ urlContext: {} }],
        },
      },
    },
    'web-fetch-fallback': {
      extends: 'gemini-2-flash-base',
      modelConfig: {},
    },
    'loop-detection': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'loop-detection-double-check': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_PRO,
      },
    },
    'llm-edit-fixer': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'next-speaker-checker': {
      extends: 'base',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'chat-compression-pro': {
      extends: 'chat-base-3',
      modelConfig: {
        model: STABLE_PHILL_2_5_PRO,
      },
    },
    'chat-compression-flash': {
      extends: 'chat-base-3',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH,
      },
    },
    'chat-compression-flash-lite': {
      extends: 'chat-base-3',
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
      },
    },
    'chat-compression-pro-preview': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_MODEL,
      },
    },
    'chat-compression-flash-preview': {
      extends: 'chat-base-3',
      modelConfig: {
        model: PREVIEW_PHILL_FLASH_MODEL,
      },
    },
    'chat-compression-default': {
      modelConfig: {
        model: STABLE_PHILL_2_5_FLASH_LITE,
      },
    },
  },
  modelDefinitions: {
    'gemini-3.1-pro-preview': {
      tier: 'pro',
      family: 'gemini-3',
      isPreview: true,
      isVisible: true,
      features: {
        thinking: true,
        multimodalToolUse: true,
      },
    },
    'gemini-3-flash-preview': {
      tier: 'flash',
      family: 'gemini-3',
      isPreview: true,
      isVisible: true,
      features: {
        thinking: false,
        multimodalToolUse: true,
      },
    },
    'gemini-3.1-flash-lite-preview': {
      tier: 'flash-lite',
      family: 'gemini-3',
      isPreview: true,
      isVisible: true,
      features: {
        thinking: true,
        multimodalToolUse: false,
      },
    },
    'gemini-3.1-flash-image-preview': {
      tier: 'flash',
      family: 'gemini-3',
      isPreview: true,
      isVisible: true,
      features: {
        thinking: false,
        multimodalToolUse: true,
      },
    },
    'gemini-2.5-pro': {
      tier: 'pro',
      family: 'gemini-2.5',
      isPreview: false,
      isVisible: true,
      features: {
        thinking: true,
        multimodalToolUse: true,
      },
    },
    'gemini-2.5-flash': {
      tier: 'flash',
      family: 'gemini-2.5',
      isPreview: false,
      isVisible: true,
      features: {
        thinking: false,
        multimodalToolUse: true,
      },
    },
    'gemini-2.5-flash-lite': {
      tier: 'flash-lite',
      family: 'gemini-2.5',
      isPreview: false,
      isVisible: true,
      features: {
        thinking: false,
        multimodalToolUse: true,
      },
    },
  },
  modelIdResolutions: {
    'auto-gemini-3': {
      default: 'gemini-3.1-pro-preview',
      contexts: [
        {
          condition: { hasAccessToPreview: false },
          target: 'gemini-2.5-pro',
        },
      ],
    },
    'auto-gemini-2.5': {
      default: 'gemini-2.5-pro',
    },
    flash: {
      default: 'gemini-3-flash-preview',
      contexts: [
        {
          condition: { hasAccessToPreview: false },
          target: 'gemini-2.5-flash',
        },
      ],
    },
    pro: {
      default: 'gemini-3.1-pro-preview',
      contexts: [
        {
          condition: { hasAccessToPreview: false },
          target: 'gemini-2.5-pro',
        },
      ],
    },
  },
  classifierIdResolutions: {
    flash: {
      default: 'gemini-3-flash-preview',
      contexts: [
        {
          condition: {
            requestedModels: ['auto-gemini-2.5', 'gemini-2.5-pro'],
          },
          target: 'gemini-2.5-flash',
        },
      ],
    },
    pro: {
      default: 'gemini-3.1-pro-preview',
      contexts: [
        {
          condition: {
            requestedModels: ['auto-gemini-2.5', 'gemini-2.5-pro'],
          },
          target: 'gemini-2.5-pro',
        },
      ],
    },
  },
  overrides: [
    {
      match: { model: 'chat-base', isRetry: true },
      modelConfig: {
        generateContentConfig: {
          temperature: 1,
        },
      },
    },
  ],
};

