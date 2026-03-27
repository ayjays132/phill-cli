/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  resolveModel,
  resolveClassifierModel,
  isPhill2Model,
  isAutoModel,
  getDisplayString,
  DEFAULT_PHILL_MODEL,
  PREVIEW_PHILL_MODEL,
  DEFAULT_PHILL_FLASH_MODEL,
  DEFAULT_PHILL_FLASH_LITE_MODEL,
  supportsMultimodalFunctionResponse,
  PHILL_MODEL_ALIAS_PRO,
  PHILL_MODEL_ALIAS_FLASH,
  PHILL_MODEL_ALIAS_FLASH_LITE,
  PHILL_MODEL_ALIAS_AUTO,
  PREVIEW_PHILL_FLASH_MODEL,
  PREVIEW_PHILL_3_1_MODEL_AUTO,
  PREVIEW_PHILL_3_1_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
  DEFAULT_PHILL_MODEL_AUTO,
} from './models.js';

describe('getDisplayString', () => {
  it('should return Auto (Phill 3.1) for preview auto model', () => {
    expect(getDisplayString(PREVIEW_PHILL_3_1_MODEL_AUTO)).toBe('Auto (Phill 3.1)');
  });

  it('should return Auto (Phill Stable) for default auto model', () => {
    expect(getDisplayString(DEFAULT_PHILL_MODEL_AUTO)).toBe(
      'Auto (Phill Stable)',
    );
  });

  it('should return display name for pro alias', () => {
    expect(getDisplayString(PHILL_MODEL_ALIAS_PRO)).toBe('Pro Tier (Adaptive)');
  });

  it('should return display name for flash alias', () => {
    expect(getDisplayString(PHILL_MODEL_ALIAS_FLASH)).toBe('Flash Tier (Adaptive)');
  });

  it('should return the model name as is for other models', () => {
    expect(getDisplayString('custom-model')).toBe('custom-model');
  });

  it('should return display name for stable 2.5 models', () => {
    expect(getDisplayString(DEFAULT_PHILL_FLASH_LITE_MODEL)).toBe(
      'Phill 2.5 Flash-Lite',
    );
  });
});

describe('supportsMultimodalFunctionResponse', () => {
  it('should return true for phill-3 models', () => {
    expect(supportsMultimodalFunctionResponse('gemini-3.1-pro-preview')).toBe(
      true,
    );
    expect(supportsMultimodalFunctionResponse('gemini-3-pro-preview')).toBe(
      true,
    );
    expect(supportsMultimodalFunctionResponse('gemini-3-flash-preview')).toBe(
      true,
    );
  });

  it('should return true for phill-2.5 models', () => {
    expect(supportsMultimodalFunctionResponse('gemini-2.5-pro')).toBe(true);
    expect(supportsMultimodalFunctionResponse('gemini-2.5-flash')).toBe(true);
  });

  it('should return false for other models', () => {
    expect(supportsMultimodalFunctionResponse('some-other-model')).toBe(false);
    expect(supportsMultimodalFunctionResponse('')).toBe(false);
  });
});

describe('resolveModel', () => {
  describe('delegation logic', () => {
    it('should return the Stable Pro model when auto-gemini-3.1 is requested and preview is off', () => {
      const model = resolveModel(PREVIEW_PHILL_3_1_MODEL_AUTO, false, false, true);
      expect(model).toBe(DEFAULT_PHILL_MODEL);
    });

    it('should return the Preview Pro model when auto-gemini-3.1 is requested and preview is on', () => {
      const model = resolveModel(PREVIEW_PHILL_3_1_MODEL_AUTO, true, false, true);
      expect(model).toBe(PREVIEW_PHILL_3_1_MODEL_ID);
    });

    it('should return the Default Pro model when auto-gemini-3.1-stable is requested', () => {
      const model = resolveModel(DEFAULT_PHILL_MODEL_AUTO, false, false, true);
      expect(model).toBe(DEFAULT_PHILL_MODEL);
    });

    it('should return the requested model as-is for explicit specific models', () => {
      expect(resolveModel(DEFAULT_PHILL_MODEL, false, false, true)).toBe(
        DEFAULT_PHILL_MODEL,
      );
      expect(resolveModel(DEFAULT_PHILL_FLASH_MODEL, false, false, true)).toBe(
        DEFAULT_PHILL_FLASH_MODEL,
      );
      expect(resolveModel(DEFAULT_PHILL_FLASH_LITE_MODEL, false, false, true)).toBe(
        DEFAULT_PHILL_FLASH_LITE_MODEL,
      );
    });

    it('should return a custom model name when requested', () => {
      const customModel = 'custom-model-v1';
      const model = resolveModel(customModel, false, false, true);
      expect(model).toBe(customModel);
    });

    describe('with preview features', () => {
      it('should return the preview model when pro alias is requested', () => {
        const model = resolveModel(PHILL_MODEL_ALIAS_PRO, true, false, true);
        expect(model).toBe(PREVIEW_PHILL_MODEL);
      });

      it('should return the default pro model when pro alias is requested and preview is off', () => {
        const model = resolveModel(PHILL_MODEL_ALIAS_PRO, false, false, true);
        expect(model).toBe(DEFAULT_PHILL_MODEL);
      });

      it('should return the flash model when flash is requested and preview is on', () => {
        const model = resolveModel(PHILL_MODEL_ALIAS_FLASH, true, false, true);
        expect(model).toBe(PREVIEW_PHILL_FLASH_MODEL);
      });

      it('should return the flash model when lite is requested and preview is on', () => {
        const model = resolveModel(PHILL_MODEL_ALIAS_FLASH_LITE, true, false, true);
        expect(model).toBe(DEFAULT_PHILL_FLASH_LITE_MODEL);
      });

      it('should return the flash model when the flash model name is explicitly requested and preview is on', () => {
        const model = resolveModel(DEFAULT_PHILL_FLASH_MODEL, true, false, true);
        expect(model).toBe(DEFAULT_PHILL_FLASH_MODEL);
      });

      it('should return the lite model when the lite model name is requested and preview is on', () => {
        const model = resolveModel(DEFAULT_PHILL_FLASH_LITE_MODEL, true, false, true);
        expect(model).toBe(DEFAULT_PHILL_FLASH_LITE_MODEL);
      });

      it('should return the default phill model when the model is explicitly set and preview is on', () => {
        const model = resolveModel(DEFAULT_PHILL_MODEL, true, false, true);
        expect(model).toBe(DEFAULT_PHILL_MODEL);
      });
    });
  });
});

describe('isPhill2Model', () => {
  it('should return true for gemini-2.5-pro', () => {
    expect(isPhill2Model('gemini-2.5-pro')).toBe(true);
  });

  it('should return true for gemini-2.5-flash', () => {
    expect(isPhill2Model('gemini-2.5-flash')).toBe(true);
  });

  it('should return false for gemini-1.5-pro', () => {
    expect(isPhill2Model('gemini-1.5-pro')).toBe(false);
  });

  it('should return false for gemini-3 models', () => {
    expect(isPhill2Model('gemini-3-pro-preview')).toBe(false);
    expect(isPhill2Model('gemini-3.1-pro-preview')).toBe(false);
  });

  it('should return false for arbitrary strings', () => {
    expect(isPhill2Model('gpt-4')).toBe(false);
  });
});

describe('isAutoModel', () => {
  it('should return true for "auto"', () => {
    expect(isAutoModel(PHILL_MODEL_ALIAS_AUTO)).toBe(true);
  });

  it('should return true for "auto-phill-3"', () => {
    expect(isAutoModel(PREVIEW_PHILL_3_1_MODEL_AUTO)).toBe(true);
  });

  it('should return true for "auto-gemini-2.5"', () => {
    expect(isAutoModel(DEFAULT_PHILL_MODEL_AUTO)).toBe(true);
  });

  it('should return false for concrete models', () => {
    expect(isAutoModel(DEFAULT_PHILL_MODEL)).toBe(false);
    expect(isAutoModel(PREVIEW_PHILL_MODEL)).toBe(false);
    expect(isAutoModel('some-random-model')).toBe(false);
  });
});

describe('resolveClassifierModel', () => {
  it('should return flash model when alias is flash', () => {
    expect(
      resolveClassifierModel(
        DEFAULT_PHILL_MODEL_AUTO,
        false
      ),
    ).toBe(DEFAULT_PHILL_FLASH_LITE_MODEL);
    expect(
      resolveClassifierModel(
        PREVIEW_PHILL_3_1_MODEL_AUTO,
        false
      ),
    ).toBe(PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID);
  });

  it('should return pro model when alias is pro', () => {
    expect(
      resolveClassifierModel(DEFAULT_PHILL_MODEL_AUTO, false),
    ).toBe(DEFAULT_PHILL_FLASH_LITE_MODEL);
    expect(
      resolveClassifierModel(PREVIEW_PHILL_3_1_MODEL_AUTO, true),
    ).toBe(PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID);
  });

  it('should handle preview features being enabled', () => {
    expect(
      resolveClassifierModel(
        DEFAULT_PHILL_MODEL_AUTO,
        true,
      ),
    ).toBe(PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID);
  });
});

