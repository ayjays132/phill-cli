/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AxiomError } from './types.js';
import { AxiomErrorSeverity } from './types.js';
import { AxiomService } from '../../services/axiomService.js';
import { coreEvents, CoreEvent } from '../events.js';
import type { ConsoleLogPayload, OutputPayload } from '../events.js';
import { debugLogger } from '../debugLogger.js';

/**
 * ErrorPipeline intercepts system events and normalizes them into AxiomErrors.
 */
export class ErrorPipeline {
  private static instance: ErrorPipeline;

  private constructor() {}

  static getInstance(): ErrorPipeline {
    if (!ErrorPipeline.instance) {
      ErrorPipeline.instance = new ErrorPipeline();
    }
    return ErrorPipeline.instance;
  }

  /**
   * Starts listening to core events.
   */
  init(): void {
    coreEvents.on(CoreEvent.ConsoleLog, (payload: ConsoleLogPayload) => {
      this.handleLog(payload.type, payload.content);
    });

    coreEvents.on(CoreEvent.Output, (payload: OutputPayload) => {
      if (payload.isStderr) {
        const content =
          typeof payload.chunk === 'string'
            ? payload.chunk
            : Buffer.from(payload.chunk).toString(payload.encoding || 'utf-8');
        this.handleOutput(content);
      }
    });

    debugLogger.debug('[AXIOM] Error pipeline active.');
  }

  private handleLog(type: string, content: string): void {
    if (type === 'error') {
      this.parseAndPush(content, 'console');
    }
  }

  private handleOutput(content: string): void {
    this.parseAndPush(content, 'stderr');
  }

  private parseAndPush(content: string, source: string): void {
    const errors = this.parseErrors(content, source);
    const service = AxiomService.getInstance();
    for (const error of errors) {
      service.addError(error);
    }
  }

  /**
   * Parses common error formats.
   */
  private parseErrors(content: string, source: string): AxiomError[] {
    const errors: AxiomError[] = [];

    // 1. TypeScript Error Regex
    const tsRegex = /(.+\.ts(?:x)?):(\d+):(\d+)\s-\serror\s(TS\d+):\s(.+)/g;
    let match;
    while ((match = tsRegex.exec(content)) !== null) {
      errors.push({
        id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        source: 'typescript',
        severity: AxiomErrorSeverity.ERROR,
        message: match[5],
        filePath: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code: match[4],
        timestamp: Date.now(),
        confidence: 0.95,
      });
    }

    // 2. ESLint Error Regex
    const eslintRegex = /(.+):(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(.+)/g;
    while ((match = eslintRegex.exec(content)) !== null) {
      errors.push({
        id: `eslint-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        source: 'eslint',
        severity:
          match[4] === 'error'
            ? AxiomErrorSeverity.ERROR
            : AxiomErrorSeverity.WARNING,
        message: match[5],
        filePath: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code: match[6],
        timestamp: Date.now(),
        confidence: 0.9,
      });
    }

    // 3. Fallback for generic errors
    if (
      errors.length === 0 &&
      (content.toLowerCase().includes('error') ||
        content.toLowerCase().includes('failed'))
    ) {
      if (content.length < 500) {
        errors.push({
          id: `gen-${Date.now()}`,
          source,
          severity: AxiomErrorSeverity.ERROR,
          message: content.trim(),
          filePath: 'unknown',
          timestamp: Date.now(),
          confidence: 0.5,
        });
      }
    }

    return errors;
  }
}
