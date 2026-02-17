/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Storage } from '../config/storage.js';

export interface SuccessTrace {
  id: string;
  goal: string;
  dlr: string; // Dense Latent Representation
  timestamp: string;
  latencyMs?: number;
}

/**
 * Service for managing the "Success Bank" - a collection of successful 
 * execution traces distilled into latent representations.
 */
export class SuccessTraceService {
  private static instance: SuccessTraceService;
  private readonly traceFilePath: string;

  private constructor() {
    this.traceFilePath = path.join(Storage.getGlobalPhillDir(), 'SUCCESS_TRACES.md');
  }

  public static getInstance(): SuccessTraceService {
    if (!SuccessTraceService.instance) {
      SuccessTraceService.instance = new SuccessTraceService();
    }
    return SuccessTraceService.instance;
  }

  /**
   * Indexes a successful trace into the RAG-persistent success bank.
   */
  async indexTrace(trace: SuccessTrace): Promise<void> {
    const entry = `\n[SUCCESS_GEM_${trace.id}]
- Goal: ${trace.goal}
- DLR: ${trace.dlr}
- Latency: ${trace.latencyMs}ms
- Date: ${trace.timestamp}
[/SUCCESS_GEM]\n`;

    try {
      await fs.mkdir(path.dirname(this.traceFilePath), { recursive: true });
      await fs.appendFile(this.traceFilePath, entry, 'utf-8');
    } catch (error) {
      console.error('[SuccessTraceService] Failed to index trace:', error);
    }
  }

  /**
   * Retrieves latent wisdom (relevant DLRs) based on a goal.
   * Currently uses simple string matching, but intended for RAG retrieval.
   */
  async retrieveLatentWisdom(goal: string): Promise<string[]> {
    try {
      if (! (await this.exists(this.traceFilePath))) return [];
      
      const content = await fs.readFile(this.traceFilePath, 'utf-8');
      const gems = content.split('[/SUCCESS_GEM]');
      
      // Filter for gems matching keywords in the goal
      const keywords = new Set(goal.toLowerCase().split(/\W+/).filter(kw => kw.length > 3));
      const relevantGems = gems
        .filter(gem => {
          const gemLower = gem.toLowerCase();
          return Array.from(keywords).some(kw => gemLower.includes(kw));
        })
        // Sort by how many keywords match (rudimentary relevance)
        .sort((a, b) => {
          const countA = Array.from(keywords).filter(kw => a.toLowerCase().includes(kw)).length;
          const countB = Array.from(keywords).filter(kw => b.toLowerCase().includes(kw)).length;
          return countB - countA;
        });

      const relevantDLRs = relevantGems
        .slice(0, 5) // Limit to top 5 most relevant traces
        .map(gem => {
          const dlrMatch = gem.match(/- DLR: (.*)/);
          return dlrMatch ? dlrMatch[1].trim() : '';
        })
        .filter(dlr => dlr !== '');

      return relevantDLRs;
    } catch (e) {
      return [];
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
