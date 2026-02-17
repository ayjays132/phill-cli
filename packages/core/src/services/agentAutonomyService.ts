/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { VisualLatentService } from './visualLatentService.js';
import { OperatorLatentSync } from './operatorLatentSync.js';
import { EventEmitter } from 'node:events';

export interface LatchCondition {
  type: 'visual_change' | 'visual_stable';
  timeoutMs: number;
}

export class AgentAutonomyService extends EventEmitter {
  private static instance: AgentAutonomyService;
  private operatorLatentSync: OperatorLatentSync;
  private visualLatentService: VisualLatentService;

  private constructor(config: Config) {
    super();
    this.operatorLatentSync = OperatorLatentSync.getInstance(config);
    this.visualLatentService = VisualLatentService.getInstance();

    this.setupListeners();
  }

  public static getInstance(config: Config): AgentAutonomyService {
    if (!AgentAutonomyService.instance) {
      AgentAutonomyService.instance = new AgentAutonomyService(config);
    }
    return AgentAutonomyService.instance;
  }

  private setupListeners() {
    this.operatorLatentSync.on('stateChange', (newLatent: string) => {
      this.emit('visual_state_changed', newLatent);
    });
  }

  /**
   * Latches onto a specific condition, resolving when met.
   */
  public async waitForCondition(condition: LatchCondition): Promise<boolean> {
    if (condition.type === 'visual_change') {
      return this.waitForVisualChange(condition.timeoutMs);
    }
    return false;
  }

  private waitForVisualChange(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const initialLatent = this.visualLatentService.getCurrentLatent();
      
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false); // Timed out without change
      }, timeoutMs);

      const onChange = (newLatent: string) => {
        if (newLatent !== initialLatent) {
          cleanup();
          resolve(true); // Visual state changed
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.off('visual_state_changed', onChange);
      };

      this.on('visual_state_changed', onChange);
    });
  }
}
