/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { ScreenshotService } from './screenshotService.js';
import { VisualLatentService } from './visualLatentService.js';
import { LatentContextService } from './latentContextService.js';
import * as fs from 'node:fs/promises';
import { debugLogger } from '../utils/debugLogger.js';

import { EventEmitter } from 'node:events';

/**
 * Orchestrates the "VAE Foundation" for the Operator Protocol.
 * Syncs real-world visual state into dense symbolic latents.
 */
export class OperatorLatentSync extends EventEmitter {
  private static instance: OperatorLatentSync;
  private config: Config;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastLatent: string = 'V:EMPTY';

  private constructor(config: Config) {
    super();
    this.config = config;
  }

  public static getInstance(config: Config): OperatorLatentSync {
    if (!OperatorLatentSync.instance) {
      OperatorLatentSync.instance = new OperatorLatentSync(config);
    }
    return OperatorLatentSync.instance;
  }

  /**
   * Starts periodic visual latent synchronization.
   * Default: every 10 seconds for desktop "awareness".
   */
  public startSync(intervalMs: number = 10000) {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.syncNow().catch((err) => debugLogger.error('Sync failed', err));
    }, intervalMs);
    
    debugLogger.log(`Operator Latent Sync started (interval: ${intervalMs}ms)`);
  }

  public stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Forces a single synchronization of the visual state.
   */
  public async syncNow(): Promise<string> {
    if (this.isSyncing) return 'SYNC_IN_PROGRESS';
    this.isSyncing = true;

    try {
      const screenshotService = ScreenshotService.getInstance(this.config);
      const visualLatentService = VisualLatentService.getInstance();
      const latentContextService = LatentContextService.getInstance();

      // 1. Capture Screenshot
      const screenshotPath = await screenshotService.captureDesktop();
      const imageBuffer = await fs.readFile(screenshotPath);

      // 2. Encode to Visual Latent (V:[GRID]:[ID])
      const latent = await visualLatentService.encode(imageBuffer);

      // 3. Update Latent Context
      latentContextService.setVisualLatent(latent);

      // 4. Emit Change Event if Latent Changed
      if (latent !== this.lastLatent) {
          this.lastLatent = latent;
          this.emit('stateChange', latent);
      }

      // 5. Cleanup temp screenshot
      await fs.unlink(screenshotPath).catch(() => {});

      return latent;
    } catch (error) {
      debugLogger.error('Failed to sync operator latent:', error);
      return 'V:ERROR';
    } finally {
      this.isSyncing = false;
    }
  }
}
