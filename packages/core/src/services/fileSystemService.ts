/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';

/**
 * Interface for file system operations that may be delegated to different implementations
 */
export interface FileSystemService {
  /**
   * Read text content from a file
   *
   * @param filePath - The path to the file to read
   * @returns The file content as a string
   */
  readTextFile(filePath: string): Promise<string>;

  /**
   * Write text content to a file
   *
   * @param filePath - The path to the file to write
   * @param content - The content to write
   */
  writeTextFile(filePath: string, content: string): Promise<void>;
  /**
   * Speculatively preloads a file into the LRU cache.
   * Useful for anticipating agent needs and masking I/O latency.
   */
  preloadTextFile?(filePath: string): void;
}

/**
 * Standard file system implementation with basic LRU caching for reads.
 */
export class StandardFileSystemService implements FileSystemService {
  private readonly readCache = new Map<string, { content: string; timestamp: number }>();
  private readonly MAX_CACHE_SIZE = 50;
  private readonly CACHE_TTL_MS = 5000; // 5 seconds TTL

  async readTextFile(filePath: string): Promise<string> {
    const cached = this.readCache.get(filePath);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.content;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    
    // Manage cache size
    if (this.readCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.readCache.keys().next().value;
      if (oldestKey) this.readCache.delete(oldestKey);
    }
    
    this.readCache.set(filePath, { content, timestamp: now });
    return content;
  }

  async writeTextFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
    // Invalidate cache on write
    this.readCache.delete(filePath);
  }

  preloadTextFile(filePath: string): void {
    const cached = this.readCache.get(filePath);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return; // Already fresh
    }

    // Fire and forget read
    fs.readFile(filePath, 'utf-8').then(content => {
      if (this.readCache.size >= this.MAX_CACHE_SIZE) {
        const oldestKey = this.readCache.keys().next().value;
        if (oldestKey) this.readCache.delete(oldestKey);
      }
      this.readCache.set(filePath, { content, timestamp: Date.now() });
    }).catch(() => {
      // Ignore errors during speculative prefetch
    });
  }
}
