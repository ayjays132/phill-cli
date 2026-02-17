/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { RealTimeActionJournal, type ActionEntry } from './actionJournal.js';
import { AgentRegistry } from '../agents/registry.js';
import { AgentIdentityService } from './agentIdentityService.js';
import * as fs from 'node:fs/promises';
import { debugLogger } from '../utils/debugLogger.js';

import { EconomyService, type BankAccount, type BazaarItem } from './economyService.js';
import { SocialService, type Relation } from './socialService.js';

export interface SwarmAgentStatus {
  name: string;
  description: string;
  isActive: boolean;
  capabilities: string[];
}

export interface ForgeStats {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
}

export class ForgeService {
  private static instance: ForgeService;

  private constructor(
    private journal: RealTimeActionJournal,
    private agentRegistry: AgentRegistry,
    private identityService: AgentIdentityService,
    private economyService: EconomyService,
    private socialService: SocialService
  ) {}

  public static getInstance(config: Config): ForgeService {
    if (!ForgeService.instance) {
      ForgeService.instance = new ForgeService(
        RealTimeActionJournal.getInstance(config),
        config.getAgentRegistry(),
        config.getAgentIdentityService(),
        EconomyService.getInstance(config),
        SocialService.getInstance(config)
      );
    }
    return ForgeService.instance;
  }

  /**
   * Retrieves the Phillbook feed from the action journal.
   * Reads the file in reverse to get the latest actions first.
   */
  public async getPhillbookFeed(limit: number = 50): Promise<ActionEntry[]> {
    const logPath = this.journal.getLogPath();
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      const entries: ActionEntry[] = [];

      // Read from end to start
      for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
        try {
          if (lines[i].trim()) {
            entries.push(JSON.parse(lines[i]));
          }
        } catch (e) {
          debugLogger.warn(`Failed to parse Phillbook entry at line ${i}:`, e);
        }
      }
      return entries;
    } catch (error) {
        // If file doesn't exist yet, return empty array
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }
      debugLogger.error('Failed to read Phillbook feed:', error);
      return [];
    }
  }

  /**
   * Retrieves the current status of the agent swarm.
   */
  public getSwarmStatus(): SwarmAgentStatus[] {
    const definitions = this.agentRegistry.getAllDefinitions();
    // In a real implementation, we would track "isActive" via a session manager or similar.
    // For now, we'll assume enabled agents are "active" in the swarm sense.
    return definitions.map(def => {
      let capabilities: string[] = [];
      if (def.kind === 'local' && def.toolConfig?.tools) {
        capabilities = def.toolConfig.tools.map(t => {
          if (typeof t === 'string') return t;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const name = (t as any).name;
          return typeof name === 'string' ? name : 'unknown-tool';
        });
      }
      
      return {
        name: def.name,
        description: def.description,
        isActive: true, // Agents in registry are considered available/online
        capabilities
      };
    });
  }

  /**
   * Retrieves the current identity configuration.
   */
  public getIdentity() {
    return this.identityService.getIdentity();
  }
  
  public getBankAccount(): BankAccount {
      return this.economyService.getAccount();
  }
  
  public getBazaarListings(): BazaarItem[] {
      return this.economyService.getBazaarItems();
  }
  
  public getSocialRelations(): Relation[] {
      return this.socialService.getRelations();
  }
  
  public getMetropolisGlobalFeed(): string[] {
      return this.economyService.getGlobalMarketFeed();
  }

  /**
   * Retrieves system stats for the Observer Deck.
   */
  public getObserverStats(): ForgeStats {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    };
  }
}
