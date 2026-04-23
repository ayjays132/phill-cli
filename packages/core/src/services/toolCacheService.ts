/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Storage } from '../config/storage.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { debugLogger } from '../utils/debugLogger.js';

interface CachedResult {
  tool: string;
  params: string;
  result: any;
  timestamp: number;
  expiresAt?: number;
}

const CACHE_FILE = 'tool_cache.json';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ToolCacheService {
  private static instance: ToolCacheService | null = null;
  private cache: Map<string, CachedResult> = new Map();
  private initialized = false;
  private isSaving = false;

  private constructor() {}

  public static getInstance(): ToolCacheService {
    if (!ToolCacheService.instance) {
      ToolCacheService.instance = new ToolCacheService();
    }
    return ToolCacheService.instance;
  }

  private get cachePath(): string {
    return path.join(Storage.getGlobalPhillDir(), CACHE_FILE);
  }

  async initialize() {
    if (this.initialized) return;
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const loaded = JSON.parse(data);
      this.cache = new Map(Object.entries(loaded));
      
      // Cleanup expired entries
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (value.expiresAt && value.expiresAt < now) {
          this.cache.delete(key);
        }
      }
      
      this.initialized = true;
      debugLogger.debug(`[ToolCache] Initialized with ${this.cache.size} entries.`);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        debugLogger.error('[ToolCache] Failed to load cache:', e);
      }
      this.cache = new Map();
      this.initialized = true;
    }
  }

  private generateKey(tool: string, params: any): string {
    const sessionKey = `${tool}:${JSON.stringify(params)}`;
    return crypto.createHash('sha256').update(sessionKey).digest('hex');
  }

  async get(tool: string, params: any): Promise<any | null> {
    await this.initialize();
    const key = this.generateKey(tool, params);
    const entry = this.cache.get(key);
    
    if (entry) {
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.scheduleSave();
        return null;
      }
      debugLogger.debug(`[ToolCache] Hit for ${tool}: ${key}`);
      return entry.result;
    }
    
    return null;
  }

  async set(tool: string, params: any, result: any, ttlMs: number = DEFAULT_TTL_MS) {
    await this.initialize();
    const key = this.generateKey(tool, params);
    const now = Date.now();
    
    this.cache.set(key, {
      tool,
      params: JSON.stringify(params),
      result,
      timestamp: now,
      expiresAt: now + ttlMs,
    });
    
    this.scheduleSave();
    debugLogger.debug(`[ToolCache] Set entry for ${tool}: ${key}`);
  }

  private async scheduleSave() {
    if (this.isSaving) return;
    this.isSaving = true;
    
    // Batch saves by waiting a bit
    setTimeout(async () => {
      try {
        const obj = Object.fromEntries(this.cache.entries());
        await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
        await fs.writeFile(this.cachePath, JSON.stringify(obj, null, 2));
      } catch (e) {
        debugLogger.error('[ToolCache] Failed to save cache:', e);
      } finally {
        this.isSaving = false;
      }
    }, 2000);
  }

  async clear() {
    this.cache.clear();
    try {
      await fs.unlink(this.cachePath);
    } catch (e) {}
  }
}
