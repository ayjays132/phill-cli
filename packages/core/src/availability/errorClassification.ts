/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TerminalQuotaError,
  RetryableQuotaError,
} from '../utils/googleQuotaErrors.js';
import { ModelNotFoundError } from '../utils/httpErrors.js';
import type { FailureKind } from './modelPolicy.js';

export function classifyFailureKind(error: unknown): FailureKind {
  if (error instanceof TerminalQuotaError) {
    return 'terminal';
  }
  if (error instanceof RetryableQuotaError) {
    return 'transient';
  }
  if (error instanceof ModelNotFoundError) {
    return 'not_found';
  }

  // Handle OpenAI-compatible provider errors that may be wrapped as generic Error.
  // Example payloads include:
  // - code/type: billing_not_active
  // - message: "Your account is not active, please check your billing details"
  // - code: insufficient_quota
  // - status text/message: "Too Many Requests" / "Rate limit"
  const message = extractErrorMessage(error).toLowerCase();
  if (!message) {
    return 'unknown';
  }

  if (
    message.includes('billing_not_active') ||
    message.includes('account is not active') ||
    message.includes('billing details') ||
    message.includes('insufficient_quota') ||
    message.includes('quota exceeded')
  ) {
    return 'terminal';
  }

  if (
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('resource_exhausted')
  ) {
    return 'transient';
  }

  if (
    message.includes('model_not_found') ||
    message.includes('model not found') ||
    message.includes('does not exist') ||
    message.includes('unsupported model')
  ) {
    return 'not_found';
  }

  return 'unknown';
}

function extractErrorMessage(error: unknown): string {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message ?? '';
  }
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return '';
    }
  }
  return '';
}
