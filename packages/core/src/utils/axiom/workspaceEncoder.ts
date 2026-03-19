/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { LatentContextService } from '../../services/latentContextService.js';
import type { VectorService } from '../../services/vectorService.js';
import type { FileDiscoveryService } from '../../services/fileDiscoveryService.js';
import { debugLogger } from '../debugLogger.js';
import type { AxiomCache } from './types.js';
import type { Config } from '../../config/config.js';

/**
 * WorkspaceEncoder transforms workspace files into a compressed latent representation.
 * It uses MD5 hashing for delta updates and LatentContextService for semantic compression.
 */
export class WorkspaceEncoder {
  private cache: AxiomCache = {
    version: '1.0.0',
    files: {},
  };

  constructor(
    private config: Config,
    private latentService: LatentContextService,
    private vectorService: VectorService,
    private fileDiscovery: FileDiscoveryService,
    private cachePath: string,
  ) {}

  /**
   * Loads the existing cache from disk.
   */
  async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        (e as NodeJS.ErrnoException).code !== 'ENOENT'
      ) {
        debugLogger.error('Failed to load AXIOM cache:', e);
      }
      this.cache = { version: '1.0.0', files: {} };
    }
  }

  /**
   * Saves the current cache to disk.
   */
  async saveCache(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
      await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      debugLogger.error('Failed to save AXIOM cache:', e);
    }
  }

  /**
   * Calculates the MD5 hash of a file's content.
   */
  private async calculateHash(content: string): Promise<string> {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Encodes the workspace, skipping files that haven't changed.
   * Parallelized with concurrency limits to optimize speed vs stability.
   * @param projectRoot The root directory to scan.
   * @param deepScan If true, uses an LLM for semantic compression. If false, uses heuristic compression.
   */
  async encodeWorkspace(
    projectRoot: string,
    deepScan: boolean = false,
  ): Promise<void> {
    await this.loadCache();
    const files = await this.getAllFiles(projectRoot);
    let updatedCount = 0;

    const CONCURRENCY_LIMIT = deepScan ? 5 : 20;
    const activeTasks: Promise<void>[] = [];

    for (const filePath of files) {
      const task = (async () => {
        const relativePath = path.relative(projectRoot, filePath);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const hash = await this.calculateHash(content);

          if (this.cache.files[relativePath]?.hash === hash) {
            return;
          }

          debugLogger.debug(
            `[AXIOM] ${deepScan ? 'Neural' : 'Heuristic'} Encoding ${relativePath}...`,
          );

          let dlr = '';
          if (deepScan) {
            dlr = await this.latentService.encode(
              [{ role: 'user', parts: [{ text: `FILE_CONTENT: ${content}` }] }],
              this.config,
              'axiom-file-encoder',
            );
            // Rate limiting for model quotas
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            dlr = this.generateHeuristicDLR(content, relativePath);
          }

          await this.vectorService.addDocument(dlr, {
            path: relativePath,
            type: 'file_latent',
          });

          this.cache.files[relativePath] = {
            path: relativePath,
            hash,
            dlr,
            timestamp: Date.now(),
          };
          updatedCount++;
        } catch (e) {
          debugLogger.warn(`[AXIOM] Failed to encode ${relativePath}:`, e);
        }
      })();

      activeTasks.push(task);
      task.finally(() => {
        const idx = activeTasks.indexOf(task);
        if (idx > -1) activeTasks.splice(idx, 1);
      });

      if (activeTasks.length >= CONCURRENCY_LIMIT) {
        await Promise.race(activeTasks);
      }
    }

    await Promise.all(activeTasks);

    if (updatedCount > 0) {
      await this.saveCache();
      debugLogger.log(
        `[AXIOM] Workspace encoded: ${updatedCount} files updated.`,
      );
    }
  }

  /**
   * Encodes a single file. Used for live-indexing by the background watcher.
   */
  async encodeSingleFile(projectRoot: string, filePath: string, deepScan: boolean = false): Promise<void> {
    try {
      const relativePath = path.relative(projectRoot, filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const hash = await this.calculateHash(content);

      if (this.cache.files[relativePath]?.hash === hash) {
        return;
      }

      let dlr = '';
      if (deepScan) {
        dlr = await this.latentService.encode(
          [{ role: 'user', parts: [{ text: `FILE_CONTENT: ${content}` }] }],
          this.config,
          'axiom-file-encoder',
        );
      } else {
        dlr = this.generateHeuristicDLR(content, relativePath);
      }

      await this.vectorService.addDocument(dlr, {
        path: relativePath,
        type: 'file_latent',
      });

      this.cache.files[relativePath] = {
        path: relativePath,
        hash,
        dlr,
        timestamp: Date.now(),
      };
      await this.saveCache();
    } catch (e) {
      // Silently ignore single file errors during background watch
    }
  }

  /**
   * Retrieves all files in the workspace, respecting ignore rules.
   * Parallelized for high-speed discovery.
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    const results = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (this.fileDiscovery.shouldIgnoreFile(fullPath)) {
          return [];
        }

        if (entry.isDirectory()) {
          return this.getAllFiles(fullPath);
        } else if (entry.isFile()) {
          return [fullPath];
        }
        return [];
      })
    );

    return results.flat();
  }

  /**
   * Returns the DLR for a specific file path if cached.
   */
  getFileLatent(relativePath: string): string | undefined {
    return this.cache.files[relativePath]?.dlr;
  }

  /**
   * Generates a high-density symbolic shorthand without using AI.
   * Format: H:[FILE_EXT]:[IMPORTS]:[CLASSES]:[FUNCTIONS]:[VARS]
   */
  private generateHeuristicDLR(content: string, filePath: string): string {
    const ext = path.extname(filePath).substring(1).toUpperCase() || 'BIN';
    const lines = content.split('\n');

    const imports: string[] = [];
    const structures: string[] = [];
    const variables: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        const match = trimmed.match(/from\s+['"]([^'"]+)['"]/);
        if (match) imports.push(match[1]);
      } else if (trimmed.startsWith('export class ') || trimmed.startsWith('class ')) {
        const match = trimmed.match(/class\s+([a-zA-Z0-9_]+)/);
        if (match) structures.push(`C:${match[1]}`);
      } else if (trimmed.startsWith('export function ') || trimmed.startsWith('function ')) {
        const match = trimmed.match(/function\s+([a-zA-Z0-9_]+)/);
        if (match) structures.push(`F:${match[1]}`);
      } else if (trimmed.startsWith('export interface ') || trimmed.startsWith('interface ')) {
        const match = trimmed.match(/interface\s+([a-zA-Z0-9_]+)/);
        if (match) structures.push(`I:${match[1]}`);
      } else if (trimmed.startsWith('export const ') || trimmed.startsWith('const ')) {
        const match = trimmed.match(/const\s+([a-zA-Z0-9_]+)/);
        if (match) variables.push(`V:${match[1]}`);
      }
    }

    const impStr = imports.length > 0 ? `|IMP:${imports.slice(0, 3).join(',')}` : '';
    const strStr = structures.length > 0 ? `|DEF:${structures.slice(0, 5).join(',')}` : '';
    const varStr = variables.length > 0 ? `|VAR:${variables.slice(0, 3).join(',')}` : '';

    return `H:${ext}${impStr}${strStr}${varStr}|[${lines.length}L]`;
  }
}
