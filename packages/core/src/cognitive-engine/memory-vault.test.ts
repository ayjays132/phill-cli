/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryVault } from './memory-vault.js';

describe('MemoryVault', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function createVault() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-vault-test-'));
    tempDirs.push(dir);
    return new MemoryVault(dir);
  }

  it('deduplicates memories and merges tags', () => {
    const vault = createVault();

    const first = vault.addMemory('DLR:alpha', ['browser']);
    const second = vault.addMemory('DLR:alpha', ['agents']);

    expect(second.id).toBe(first.id);
    expect(vault.getMemories()).toHaveLength(1);
    expect(vault.getMemories()[0]?.tags.sort()).toEqual(['agents', 'browser']);
  });

  it('creates and tracks planning latches', () => {
    const vault = createVault();

    const latch = vault.createLatch({
      goal: 'Harden swarm delegation',
      plan: 'Allow non-cyclic subagent delegation',
      constraints: 'No recursive call chains',
      scope: 'global',
      tags: ['agents', 'swarm'],
    });

    expect(vault.getLatches('active')).toHaveLength(1);
    expect(vault.updateLatchStatus(latch.id, 'satisfied')?.status).toBe(
      'satisfied',
    );
    expect(vault.getLatches('active')).toHaveLength(0);
  });

  it('loads legacy array-based memory files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-vault-test-'));
    tempDirs.push(dir);
    const filePath = path.join(dir, 'cognitive-memory.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify([
        {
          id: 'legacy',
          dlr: 'DLR:legacy',
          timestamp: new Date().toISOString(),
          tags: ['legacy'],
        },
      ]),
    );

    const vault = new MemoryVault(dir);

    expect(vault.getMemories()).toHaveLength(1);
    expect(vault.getMemories()[0]?.kind).toBe('latent');
  });

  it(
    'compacts older raw memories into summary entries when the vault grows large',
    () => {
    const vault = createVault();

    for (let i = 0; i < 205; i++) {
      vault.addMemory(`DLR:${i}`, ['stress']);
    }

    const memories = vault.getMemories();
    const summaryEntries = memories.filter((memory) => memory.kind === 'summary');

    expect(summaryEntries.length).toBeGreaterThan(0);
    expect(summaryEntries[0]?.dlr).toContain('SUMMARY[count=');
    expect(vault.getStats().memoryCount).toBe(memories.length);
    },
    15000,
  );

  it('returns relevant memories for a simple query', () => {
    const vault = createVault();
    vault.addMemory('agent swarm delegation finalized', ['agents', 'swarm']);
    vault.addMemory('browser viewport grounding stable', ['browser']);

    const matches = vault.queryMemories('swarm agents');

    expect(matches).toHaveLength(1);
    expect(matches[0]?.tags).toContain('swarm');
  });

  it('uses hybrid semantic retrieval for related concepts', () => {
    const vault = createVault();
    vault.addMemory('browser automation clicked the submit button in the tab', [
      'browser',
      'automation',
    ]);
    vault.addMemory('memory vault compaction created a latent summary', [
      'memory',
      'summary',
    ]);

    const matches = vault.searchMemories('web ui interaction automation', 2);

    expect(matches[0]?.memory.tags).toContain('browser');
    expect(matches[0]?.semanticScore).toBeGreaterThan(0);
    expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? 0);
  });

  it('backfills embeddings when loading older structured stores', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-vault-test-'));
    tempDirs.push(dir);
    const filePath = path.join(dir, 'cognitive-memory.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        version: 2,
        memories: [
          {
            id: 'legacy-structured',
            dlr: 'browser navigation completed',
            timestamp: new Date().toISOString(),
            tags: ['browser'],
            kind: 'latent',
          },
        ],
        latches: [],
      }),
    );

    const vault = new MemoryVault(dir);

    expect(vault.getMemories()[0]?.embedding?.length).toBeGreaterThan(0);
    expect(vault.queryMemories('web ui')).toHaveLength(1);
  });

  it('builds an insights summary from recent memories and active latches', () => {
    const vault = createVault();
    vault.addMemory('latent memory alpha', ['latent', 'alpha']);
    vault.addMemory('latent memory beta', ['latent', 'beta']);
    vault.createLatch({
      goal: 'Preserve agent coherence',
      plan: 'Review latches before delegation',
      tags: ['agents'],
    });

    const summary = vault.getInsightsSummary(2);

    expect(summary.stats.memoryCount).toBe(2);
    expect(summary.topTags).toContain('latent');
    expect(summary.recentMemories).toHaveLength(2);
    expect(summary.activeLatches[0]?.goal).toBe('Preserve agent coherence');
  });
});
