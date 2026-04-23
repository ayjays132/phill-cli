/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProviderHttpError extends Error {
  status: number;
  retryAfterMs?: number;
  response?: {
    status: number;
    headers: Record<string, string>;
  };
}

function parseRetryAfterMs(retryAfter: string | null): number | undefined {
  if (!retryAfter) {
    return undefined;
  }

  const trimmed = retryAfter.trim();
  if (!trimmed) {
    return undefined;
  }

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const retryDate = Date.parse(trimmed);
  if (Number.isNaN(retryDate)) {
    return undefined;
  }

  return Math.max(0, retryDate - Date.now());
}

function formatRetryAfterDuration(retryAfterMs: number): string {
  if (retryAfterMs < 1000) {
    return `${retryAfterMs}ms`;
  }

  const seconds = retryAfterMs / 1000;
  if (Number.isInteger(seconds)) {
    return `${seconds}s`;
  }

  return `${seconds.toFixed(1)}s`;
}

export function createProviderHttpError(
  prefix: string,
  response: Response,
  details: string,
): ProviderHttpError {
  const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
  const normalizedDetails = details.trim();
  const retrySuffix =
    retryAfterMs !== undefined
      ? ` Please retry in ${formatRetryAfterDuration(retryAfterMs)}.`
      : '';
  const message =
    `${prefix}: ${response.status} ${response.statusText}` +
    (normalizedDetails ? ` - ${normalizedDetails}` : '') +
    retrySuffix;

  const error = new Error(message) as ProviderHttpError;
  error.name = 'ProviderHttpError';
  error.status = response.status;
  error.retryAfterMs = retryAfterMs;
  error.response = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  };
  return error;
}
