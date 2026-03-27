/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Silences ONNX Runtime and Transformers.js verbose logging.
 * This prevents graph cleanup warnings from cluttering the CLI.
 */
export async function silenceOnnxLogging() {
  const { env } = await import('@huggingface/transformers');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (env as any).logLevel = 'error';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((env as any).backends?.onnx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env as any).backends.onnx.logLevel = 'error';
  }
}
