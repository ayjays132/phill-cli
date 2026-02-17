/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from 'phill-cli-core';
import { loadEnvironment, loadSettings } from './settings.js';

export function validateAuthMethod(authMethod: string): string | null {
  loadEnvironment(loadSettings().merged);
  const geminiApiKey =
    process.env['PHILL_API_KEY'] ||
    process.env['GEMINI_API_KEY'] ||
    process.env['GOOGLE_API_KEY'];
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.COMPUTE_ADC
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    if (!geminiApiKey) {
      return (
        'When using Phill API, you must specify one of: PHILL_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    const hasVertexProjectLocationConfig =
      !!process.env['GOOGLE_CLOUD_PROJECT'] &&
      !!process.env['GOOGLE_CLOUD_LOCATION'];
    const hasGoogleApiKey = !!process.env['GOOGLE_API_KEY'];
    if (!hasVertexProjectLocationConfig && !hasGoogleApiKey) {
      return (
        'When using Vertex AI, you must specify either:\n' +
        '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
        '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  if (authMethod === AuthType.OLLAMA) {
    return null;
  }

  if (authMethod === AuthType.HUGGINGFACE) {
    return null;
  }

  if (authMethod === AuthType.OPENAI) {
    return null;
  }

  if (authMethod === AuthType.OPENAI_BROWSER) {
    return null;
  }

  if (authMethod === AuthType.ANTHROPIC) {
    return null;
  }

  if (authMethod === AuthType.GROQ) {
    return null;
  }

  if (authMethod === AuthType.CUSTOM_API) {
    return null;
  }

  return 'Invalid auth method selected.';
}
