/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import os from 'node:os';

export interface LatentMemory {
  id: string;
  dlr: string;
  timestamp: string;
  tags: string[];
}

export class MemoryVault {
  private vaultPath: string;
  private memories: LatentMemory[] = [];

  constructor(storageDir?: string) {
    const baseDir = storageDir || path.join(os.homedir(), '.phill', 'state');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    this.vaultPath = path.join(baseDir, 'cognitive-memory.json');
    this.load();
  }

  private load() {
    if (fs.existsSync(this.vaultPath)) {
      try {
        const data = fs.readFileSync(this.vaultPath, 'utf8');
        this.memories = JSON.parse(data);
      } catch (e) {
        console.error('Failed to load memory vault:', e);
        this.memories = [];
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.vaultPath, JSON.stringify(this.memories, null, 2));
    } catch (e) {
      console.error('Failed to save memory vault:', e);
    }
  }

  public addMemory(dlr: string, tags: string[] = []) {
    const memory: LatentMemory = {
      id: Math.random().toString(16).slice(2),
      dlr,
      timestamp: new Date().toISOString(),
      tags,
    };
    this.memories.push(memory);
    this.save();
    return memory;
  }

  public getMemories(tag?: string): LatentMemory[] {
    if (tag) {
      return this.memories.filter((m) => m.tags.includes(tag));
    }
    return this.memories;
  }

  public clear() {
    this.memories = [];
    this.save();
  }
}
