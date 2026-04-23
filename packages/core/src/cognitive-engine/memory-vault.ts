/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cosineSimilarity } from '../utils/math.js';
import { debugLogger } from '../utils/debugLogger.js';

export interface LatentMemory {
  id: string;
  dlr: string;
  timestamp: string;
  tags: string[];
  kind?: 'latent' | 'summary';
  summaryOfIds?: string[];
  embedding?: number[];
}

export interface PlanningLatch {
  id: string;
  goal: string;
  plan: string;
  constraints: string;
  scope: 'global' | 'session' | 'ephemeral';
  status: 'active' | 'satisfied' | 'superseded';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface MemoryVaultStore {
  version: 3;
  memories: LatentMemory[];
  latches: PlanningLatch[];
}

export interface MemoryVaultStats {
  memoryCount: number;
  summaryCount: number;
  latchCount: number;
  activeLatchCount: number;
  latestTimestamp?: string;
}

export interface MemoryVaultInsightSummary {
  stats: MemoryVaultStats;
  topTags: string[];
  recentMemories: LatentMemory[];
  activeLatches: PlanningLatch[];
}

export interface MemorySearchResult {
  memory: LatentMemory;
  score: number;
  semanticScore: number;
  lexicalScore: number;
}

const MAX_RAW_MEMORIES = 200;
const SUMMARY_BATCH_SIZE = 25;
const EMBEDDING_DIMENSIONS = 192;
const MAX_SEMANTIC_RESULTS = 50;
const MIN_SEMANTIC_SCORE = 0.18;
const TOKEN_SYNONYMS: Record<string, string[]> = {
  agent: ['assistant', 'delegate', 'worker', 'subagent', 'swarm'],
  browser: ['dom', 'page', 'tab', 'ui', 'web', 'website'],
  web: ['browser', 'page', 'site', 'ui'],
  ui: ['browser', 'screen', 'web'],
  memory: ['context', 'recall', 'vault'],
  context: ['memory', 'recall', 'vault'],
  vault: ['memory', 'context', 'recall'],
  retrieve: ['recall', 'search', 'semantic', 'vector'],
  semantic: ['retrieve', 'search', 'vector'],
  vector: ['semantic', 'retrieve', 'search'],
  tool: ['function', 'integration', 'skill'],
  vision: ['image', 'screen', 'visual'],
  voice: ['audio', 'speech', 'tts'],
  window: ['desktop', 'screen'],
  terminal: ['cli', 'console', 'shell'],
  theme: ['palette', 'style', 'ui'],
};

export class MemoryVault {
  private vaultPath: string;
  private memories: LatentMemory[] = [];
  private latches: PlanningLatch[] = [];

  constructor(storageDir?: string) {
    const baseDir = storageDir || path.join(os.homedir(), '.phill', 'state');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    this.vaultPath = path.join(baseDir, 'cognitive-memory.json');
    this.load();
  }

  private load() {
    if (!fs.existsSync(this.vaultPath)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.vaultPath, 'utf8');
      const parsed = JSON.parse(data) as
        | MemoryVaultStore
        | LatentMemory[]
        | undefined;

      if (Array.isArray(parsed)) {
        this.memories = parsed.map((memory) => ({
          ...memory,
          kind: memory.kind ?? 'latent',
        }));
        this.latches = [];
        return;
      }

      this.memories = (parsed?.memories ?? []).map((memory) => ({
        ...memory,
        kind: memory.kind ?? 'latent',
      }));
      this.latches = parsed?.latches ?? [];
      this.ensureEmbeddings();
    } catch (e) {
      debugLogger.error('Failed to load memory vault:', e);
      this.memories = [];
      this.latches = [];
    }
  }

  private save() {
    try {
      const store: MemoryVaultStore = {
        version: 3,
        memories: this.memories,
        latches: this.latches,
      };
      fs.writeFileSync(this.vaultPath, JSON.stringify(store, null, 2));
    } catch (e) {
      debugLogger.error('Failed to save memory vault:', e);
    }
  }

  addMemory(dlr: string, tags: string[] = []) {
    const normalized = dlr.trim();
    if (!normalized) {
      throw new Error('Cannot store an empty latent memory.');
    }

    const duplicate = this.memories.find(
      (memory) => memory.kind !== 'summary' && memory.dlr.trim() === normalized,
    );
    if (duplicate) {
      const mergedTags = Array.from(new Set([...duplicate.tags, ...tags]));
      duplicate.tags = mergedTags;
      duplicate.timestamp = new Date().toISOString();
      this.save();
      return duplicate;
    }

    const memory: LatentMemory = {
      id: this.createId(),
      dlr: normalized,
      timestamp: new Date().toISOString(),
      tags: Array.from(new Set(tags)),
      kind: 'latent',
      embedding: this.createEmbedding(normalized, tags),
    };
    this.memories.push(memory);
    this.compactIfNeeded();
    this.save();
    return memory;
  }

  createLatch(input: {
    goal: string;
    plan: string;
    constraints?: string;
    scope?: PlanningLatch['scope'];
    tags?: string[];
  }): PlanningLatch {
    const now = new Date().toISOString();
    const latch: PlanningLatch = {
      id: this.createId(),
      goal: input.goal.trim(),
      plan: input.plan.trim(),
      constraints: input.constraints?.trim() ?? '',
      scope: input.scope ?? 'session',
      status: 'active',
      tags: Array.from(new Set(input.tags ?? [])),
      createdAt: now,
      updatedAt: now,
    };
    this.latches.push(latch);
    this.save();
    return latch;
  }

  updateLatchStatus(
    latchId: string,
    status: PlanningLatch['status'],
  ): PlanningLatch | undefined {
    const latch = this.latches.find((entry) => entry.id === latchId);
    if (!latch) {
      return undefined;
    }
    latch.status = status;
    latch.updatedAt = new Date().toISOString();
    this.save();
    return latch;
  }

  getMemories(tag?: string): LatentMemory[] {
    if (tag) {
      return this.memories.filter((m) => m.tags.includes(tag));
    }
    return [...this.memories];
  }

  getLatches(status?: PlanningLatch['status']): PlanningLatch[] {
    if (!status) {
      return [...this.latches];
    }
    return this.latches.filter((latch) => latch.status === status);
  }

  getStats(): MemoryVaultStats {
    return {
      memoryCount: this.memories.length,
      summaryCount: this.memories.filter((memory) => memory.kind === 'summary')
        .length,
      latchCount: this.latches.length,
      activeLatchCount: this.latches.filter((latch) => latch.status === 'active')
        .length,
      latestTimestamp: this.memories.at(-1)?.timestamp,
    };
  }

  getRecentMemories(limit: number = 5): LatentMemory[] {
    return [...this.memories]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, Math.max(limit, 0));
  }

  queryMemories(query: string, limit: number = 5): LatentMemory[] {
    return this.searchMemories(query, limit).map((entry) => entry.memory);
  }

  searchMemories(query: string, limit: number = 5): MemorySearchResult[] {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) {
      return this.getRecentMemories(limit).map((memory) => ({
        memory,
        score: 0,
        semanticScore: 0,
        lexicalScore: 0,
      }));
    }

    const queryEmbedding = this.createEmbedding(query);
    return [...this.memories]
      .map((memory) => this.scoreMemory(memory, queryTerms, queryEmbedding))
      .filter(
        (entry) =>
          entry.lexicalScore > 0 || entry.semanticScore >= MIN_SEMANTIC_SCORE,
      )
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.memory.timestamp.localeCompare(a.memory.timestamp);
      })
      .slice(0, Math.max(limit, 0));
  }

  getInsightsSummary(limit: number = 5): MemoryVaultInsightSummary {
    const tagCounts = new Map<string, number>();
    for (const memory of this.memories) {
      for (const tag of memory.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([tag]) => tag);

    return {
      stats: this.getStats(),
      topTags,
      recentMemories: this.getRecentMemories(limit),
      activeLatches: this.getLatches('active').slice(0, limit),
    };
  }

  clear() {
    this.memories = [];
    this.latches = [];
    this.save();
  }

  private scoreMemory(
    memory: LatentMemory,
    queryTerms: string[],
    queryEmbedding: number[],
  ): MemorySearchResult {
    const memoryTerms = new Set(
      this.tokenize(`${memory.dlr} ${memory.tags.join(' ')}`),
    );
    let lexicalScore = 0;
    for (const term of queryTerms) {
      if (memoryTerms.has(term)) {
        lexicalScore += 2;
      }
      if (memory.tags.some((tag) => tag.toLowerCase() === term)) {
        lexicalScore += 3;
      }
    }
    if (memory.kind === 'summary') {
      lexicalScore += 0.5;
    }
    const memoryEmbedding =
      memory.embedding ?? this.createEmbedding(memory.dlr, memory.tags);
    const semanticScore = Math.max(
      cosineSimilarity(queryEmbedding, memoryEmbedding),
      0,
    );
    const score = lexicalScore + semanticScore * 6;
    return {
      memory,
      score,
      semanticScore,
      lexicalScore,
    };
  }

  private tokenize(value: string): string[] {
    return value
      .toLowerCase()
      .split(/[^a-z0-9_:-]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2);
  }

  private createEmbedding(value: string, tags: string[] = []): number[] {
    const embedding = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    const features = this.expandFeatures(value, tags).slice(0, MAX_SEMANTIC_RESULTS);
    for (const feature of features) {
      const weight = this.featureWeight(feature);
      const bucket = this.hashFeature(feature) % EMBEDDING_DIMENSIONS;
      const sign = (this.hashFeature(`${feature}:sign`) & 1) === 0 ? 1 : -1;
      embedding[bucket] += weight * sign;
    }

    const magnitude = Math.sqrt(
      embedding.reduce((sum, current) => sum + current * current, 0),
    );
    if (magnitude === 0) {
      return embedding;
    }
    return embedding.map((valueAtIndex) => valueAtIndex / magnitude);
  }

  private expandFeatures(value: string, tags: string[]): string[] {
    const baseTokens = this.tokenize(`${value} ${tags.join(' ')}`);
    const features = new Set<string>();
    for (let index = 0; index < baseTokens.length; index++) {
      const token = baseTokens[index];
      if (!token) {
        continue;
      }
      features.add(token);
      features.add(this.normalizeToken(token));
      for (const synonym of TOKEN_SYNONYMS[this.normalizeToken(token)] ?? []) {
        features.add(synonym);
      }
      const nextToken = baseTokens[index + 1];
      if (nextToken) {
        features.add(`${token}_${nextToken}`);
        features.add(`${this.normalizeToken(token)}_${this.normalizeToken(nextToken)}`);
      }
      for (const trigram of this.buildCharacterNgrams(token, 3)) {
        features.add(`tri:${trigram}`);
      }
    }
    return [...features];
  }

  private normalizeToken(token: string): string {
    if (token.endsWith('ing') && token.length > 5) {
      return token.slice(0, -3);
    }
    if (token.endsWith('ed') && token.length > 4) {
      return token.slice(0, -2);
    }
    if (token.endsWith('es') && token.length > 4) {
      return token.slice(0, -2);
    }
    if (token.endsWith('s') && token.length > 3) {
      return token.slice(0, -1);
    }
    return token;
  }

  private buildCharacterNgrams(token: string, size: number): string[] {
    const value = `^${token}$`;
    const ngrams: string[] = [];
    for (let index = 0; index <= value.length - size; index++) {
      ngrams.push(value.slice(index, index + size));
    }
    return ngrams;
  }

  private featureWeight(feature: string): number {
    if (feature.startsWith('tri:')) {
      return 0.4;
    }
    if (feature.includes('_')) {
      return 1.6;
    }
    return 1;
  }

  private hashFeature(feature: string): number {
    let hash = 2166136261;
    for (let index = 0; index < feature.length; index++) {
      hash ^= feature.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private ensureEmbeddings() {
    let changed = false;
    this.memories = this.memories.map((memory) => {
      if (memory.embedding?.length === EMBEDDING_DIMENSIONS) {
        return memory;
      }
      changed = true;
      return {
        ...memory,
        embedding: this.createEmbedding(memory.dlr, memory.tags),
      };
    });

    if (changed) {
      this.save();
    }
  }

  private compactIfNeeded() {
    const rawMemories = this.memories.filter((memory) => memory.kind !== 'summary');
    if (rawMemories.length <= MAX_RAW_MEMORIES) {
      return;
    }

    const memoriesToCompress = rawMemories.slice(0, SUMMARY_BATCH_SIZE);
    const summaryMemory: LatentMemory = {
      id: this.createId(),
      dlr: this.buildSummary(memoriesToCompress),
      timestamp: new Date().toISOString(),
      tags: Array.from(
        new Set(memoriesToCompress.flatMap((memory) => memory.tags)),
      ),
      kind: 'summary',
      summaryOfIds: memoriesToCompress.map((memory) => memory.id),
      embedding: this.createEmbedding(
        this.buildSummary(memoriesToCompress),
        Array.from(new Set(memoriesToCompress.flatMap((memory) => memory.tags))),
      ),
    };

    const compressedIds = new Set(memoriesToCompress.map((memory) => memory.id));
    this.memories = [
      summaryMemory,
      ...this.memories.filter((memory) => !compressedIds.has(memory.id)),
    ];
  }

  private buildSummary(memories: LatentMemory[]): string {
    const tagSummary = Array.from(
      new Set(memories.flatMap((memory) => memory.tags)),
    )
      .sort()
      .join(',');
    const excerpt = memories
      .map((memory) => memory.dlr.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(' || ');

    return `SUMMARY[count=${memories.length};tags=${tagSummary || 'none'}]: ${excerpt}`;
  }

  private createId(): string {
    return Math.random().toString(16).slice(2);
  }
}
