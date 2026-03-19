/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AxiomErrorSeverity {
  FATAL = 'FATAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export interface AxiomError {
  id: string;
  source: string; // e.g., 'typescript', 'eslint', 'runtime'
  severity: AxiomErrorSeverity;
  message: string;
  filePath: string;
  line?: number;
  column?: number;
  context?: string; // Lines around the error
  code?: string; // Error code (e.g., TS2322)
  fixSuggestion?: string;
  confidence: number; // 0.0 to 1.0
  timestamp: number;
}

export interface LatentFileCache {
  path: string;
  hash: string;
  dlr: string;
  timestamp: number;
}

export interface AxiomCache {
  version: string;
  files: Record<string, LatentFileCache>;
}
