/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { classifyFailureKind } from './errorClassification.js';

describe('classifyFailureKind', () => {
  it('classifies billing_not_active OpenAI-compatible errors as terminal', () => {
    const error = new Error(
      'OpenAI-compatible API error: Too Many Requests - {"error":{"message":"Your account is not active, please check your billing details on our website.","type":"billing_not_active","code":"billing_not_active"}}',
    );

    expect(classifyFailureKind(error)).toBe('terminal');
  });

  it('classifies generic rate-limit errors as transient', () => {
    const error = new Error('OpenAI-compatible API error: Too Many Requests');
    expect(classifyFailureKind(error)).toBe('transient');
  });

  it('classifies unsupported-model text as not_found', () => {
    const error = new Error('OpenAI-compatible API error: unsupported model');
    expect(classifyFailureKind(error)).toBe('not_found');
  });
});

