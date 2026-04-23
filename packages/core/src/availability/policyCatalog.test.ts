/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  createDefaultPolicy,
  getModelPolicyChain,
  validateModelPolicyChain,
} from './policyCatalog.js';
import {
  DEFAULT_PHILL_FLASH_MODEL,
  DEFAULT_PHILL_FLASH_LITE_MODEL,
  DEFAULT_PHILL_MODEL,
  DEFAULT_PHILL_MODEL_AUTO,
  PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
  PREVIEW_PHILL_3_1_MODEL_AUTO,
  PREVIEW_PHILL_3_PRO_MODEL_ID,
  PREVIEW_PHILL_FLASH_MODEL,
  PREVIEW_PHILL_MODEL,
  PREVIEW_PHILL_MODEL_AUTO,
} from '../config/models.js';

describe('policyCatalog', () => {
  it('returns the stable auto chain when preview is disabled', () => {
    const chain = getModelPolicyChain({
      previewEnabled: false,
      autoMode: DEFAULT_PHILL_MODEL_AUTO,
    });

    expect(chain.map((policy) => policy.model)).toEqual([
      DEFAULT_PHILL_MODEL,
      DEFAULT_PHILL_FLASH_MODEL,
      DEFAULT_PHILL_FLASH_LITE_MODEL,
    ]);
    expect(chain.at(-1)?.isLastResort).toBe(true);
  });

  it('returns the latest preview-first auto chain for gemini 3.1 auto', () => {
    const chain = getModelPolicyChain({
      previewEnabled: true,
      autoMode: PREVIEW_PHILL_3_1_MODEL_AUTO,
    });

    expect(chain.map((policy) => policy.model)).toEqual([
      PREVIEW_PHILL_3_PRO_MODEL_ID,
      PREVIEW_PHILL_MODEL,
      PREVIEW_PHILL_FLASH_MODEL,
      PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
      DEFAULT_PHILL_MODEL,
      DEFAULT_PHILL_FLASH_MODEL,
      DEFAULT_PHILL_FLASH_LITE_MODEL,
    ]);
    expect(chain.at(-1)?.isLastResort).toBe(true);
  });

  it('keeps legacy auto-gemini-3 aligned to current non-deprecated preview models', () => {
    const chain = getModelPolicyChain({
      previewEnabled: true,
      autoMode: PREVIEW_PHILL_MODEL_AUTO,
    });

    expect(chain.slice(0, 3).map((policy) => policy.model)).toEqual([
      PREVIEW_PHILL_MODEL,
      PREVIEW_PHILL_FLASH_MODEL,
      PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
    ]);
    expect(chain).not.toContainEqual(
      expect.objectContaining({ model: 'gemini-3-pro-preview' }),
    );
  });

  it('returns a latest-preview fallback chain when preview mode is enabled without an explicit auto mode', () => {
    const chain = getModelPolicyChain({ previewEnabled: true });

    expect(chain.map((policy) => policy.model)).toEqual([
      PREVIEW_PHILL_MODEL,
      PREVIEW_PHILL_FLASH_MODEL,
      PREVIEW_PHILL_3_1_FLASH_LITE_MODEL_ID,
    ]);
  });

  it('marks transient failures as sticky_retry and terminal failures as cool_off', () => {
    const [policy] = getModelPolicyChain({
      previewEnabled: true,
      autoMode: PREVIEW_PHILL_3_1_MODEL_AUTO,
    });

    expect(policy.stateTransitions.transient).toBe('sticky_retry');
    expect(policy.stateTransitions.terminal).toBe('cool_off');
    expect(policy.stateTransitions.not_found).toBe('cool_off');
  });

  it('clones policy maps so edits do not leak between calls', () => {
    const firstCall = getModelPolicyChain({
      previewEnabled: false,
      autoMode: DEFAULT_PHILL_MODEL_AUTO,
    });
    firstCall[0].actions.terminal = 'prompt';

    const secondCall = getModelPolicyChain({
      previewEnabled: false,
      autoMode: DEFAULT_PHILL_MODEL_AUTO,
    });
    expect(secondCall[0].actions.terminal).toBe('silent');
  });

  it('passes when there is exactly one last-resort policy', () => {
    const validChain = [
      createDefaultPolicy('test-model'),
      { ...createDefaultPolicy('last-resort'), isLastResort: true },
    ];
    expect(() => validateModelPolicyChain(validChain)).not.toThrow();
  });

  it('fails when no policies are marked last-resort', () => {
    const chain = [
      createDefaultPolicy('model-a'),
      createDefaultPolicy('model-b'),
    ];
    expect(() => validateModelPolicyChain(chain)).toThrow(
      'must include an `isLastResort`',
    );
  });

  it('fails when multiple policies are marked last-resort', () => {
    const chain = [
      { ...createDefaultPolicy('model-a'), isLastResort: true },
      { ...createDefaultPolicy('model-b'), isLastResort: true },
    ];
    expect(() => validateModelPolicyChain(chain)).toThrow(
      'must only have one `isLastResort`',
    );
  });
});
