/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface ActionEntry {
  timestamp: string;
  tool: string;
  params: any;
  result?: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

/**
 * Real-time journal for auditing all Operator interactions.
 * Core component of Molt-Guard 2.0 transparency.
 */
export class RealTimeActionJournal {
  private static instance: RealTimeActionJournal;
  private logPath: string;

  private constructor(config: Config) {
    const storageDir = config.storage.getProjectTempDir();
    this.logPath = path.join(storageDir, 'operator_actions.jsonl');
  }

  public static getInstance(config: Config): RealTimeActionJournal {
    if (!RealTimeActionJournal.instance) {
      RealTimeActionJournal.instance = new RealTimeActionJournal(config);
    }
    return RealTimeActionJournal.instance;
  }

  /**
   * Records an action to the journal.
   */
  public async record(entry: Omit<ActionEntry, 'timestamp'>): Promise<void> {
    const fullEntry: ActionEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    try {
      await fs.appendFile(this.logPath, JSON.stringify(fullEntry) + '\n');
    } catch (error) {
      console.error('Failed to write to ActionJournal:', error);
    }
  }

  public getLogPath(): string {
    return this.logPath;
  }
}
