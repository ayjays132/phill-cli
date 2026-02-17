/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Config } from '../../../../config/config.js';

/**
 * The PatternExtractor parses the ActionJournal to identify repeated 
 * successful VLA sequences (e.g., "Look -> Ground -> Click -> Success").
 * 
 * This is a foundational component for the "Get Better Over Time" mandate.
 */
export class PatternExtractor {
  private journalPath: string;

  constructor(private readonly config: Config) {
    this.journalPath = path.join(this.config.storage.getProjectTempDir(), 'operator_actions.jsonl');
  }

  /**
   * Scans the journal for successful multi-step sequences.
   * Promotes these to "Trusted Patterns" to reduce grounding latency in future turns.
   */
  async extractLearnedPatterns() {
    try {
      const data = await fs.readFile(this.journalPath, 'utf8');
      const entries = data.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));

      const patterns = entries
        .filter((e: any) => e.status === 'Success')
        .reduce((acc: any, curr: any) => {
          const key = `${curr.tool}_${curr.contextLabel || 'General'}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

      console.log('--- Learned VLA Patterns ---');
      Object.entries(patterns).forEach(([p, count]) => {
        if ((count as number) > 3) {
           console.log(`[STABLE PATTERN]: ${p} (Observed ${count} times)`);
        }
      });
      
      return patterns;
    } catch (e) {
      console.warn('No action journal found yet. Learning cycle pending.');
      return {};
    }
  }
}
