/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_PHILL_FLASH_LITE_MODEL,
  DEFAULT_PHILL_FLASH_MODEL,
  DEFAULT_PHILL_MODEL,
  PREVIEW_PHILL_FLASH_MODEL,
  PREVIEW_PHILL_MODEL,
} from '../config/models.js';

type Model = string;
type TokenCount = number;

export const DEFAULT_TOKEN_LIMIT = 1_048_576;

export function tokenLimit(model: Model): TokenCount {
  // Add other models as they become relevant or if specified by config
  // Pulled from https://ai.google.dev/gemini-api/docs/models
  switch (model) {
    case PREVIEW_PHILL_MODEL:
    case PREVIEW_PHILL_FLASH_MODEL:
    case DEFAULT_PHILL_MODEL:
    case DEFAULT_PHILL_FLASH_MODEL:
    case DEFAULT_PHILL_FLASH_LITE_MODEL:
      return 1_048_576;
    default:
      return DEFAULT_TOKEN_LIMIT;
  }
}

