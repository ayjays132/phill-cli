/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator } from '../core/contentGenerator.js';
import { Storage } from '../config/storage.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { 
  PREVIEW_PHILL_EMBEDDING_MODEL, 
  STABLE_PHILL_EMBEDDING_MODEL 
} from '../config/models.js';

import * as crypto from 'node:crypto';
import { cosineSimilarity } from '../utils/math.js';
import { debugLogger } from '../utils/debugLogger.js';

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
  createdAt: number;
}

const VECTOR_STORE_FILE = 'vectors.json';
const SIMILARITY_THRESHOLD = 0.7; // Adjust as needed

export class VectorService {
  private static instance: VectorService | null = null;
  private documents: VectorDocument[] = [];
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving = false;
  private pendingSave: Promise<void> | null = null;
  private activeEmbeddingModel: string = PREVIEW_PHILL_EMBEDDING_MODEL;

  private constructor(private contentGenerator: ContentGenerator) {}

  public static getInstance(contentGenerator: ContentGenerator): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService(contentGenerator);
    }
    return VectorService.instance;
  }

  private get storagePath(): string {
    return path.join(Storage.getGlobalPhillDir(), VECTOR_STORE_FILE);
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      try {
        const data = await fs.readFile(this.storagePath, 'utf-8');
        this.documents = JSON.parse(data);
      } catch (e: any) {
        if (e.code !== 'ENOENT') {
          console.error('Failed to load vector store:', e);
        }
        this.documents = [];
      } finally {
        this.initialized = true;
        this.initializing = null;
      }
    })();

    return this.initializing;
  }

  /**
   * Schedules a background save. Debounced by 500ms to batch multiple additions.
   */
  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.performSave();
    }, 500);
  }

  private async performSave() {
    if (this.isSaving) {
      // If already saving, queue another one after it finishes
      this.pendingSave = (this.pendingSave || Promise.resolve()).then(() => this.performSave());
      return;
    }

    this.isSaving = true;
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(this.documents, null, 2));
    } catch (e) {
      console.error('Failed to save vector store:', e);
    } finally {
      this.isSaving = false;
      this.pendingSave = null;
    }
  }

  private async save() {
    // initialize() already handles idempotent initialization
    await this.initialize();
    await this.performSave();
  }

  async addDocument(content: string, metadata?: Record<string, any>): Promise<string | null> {
    await this.initialize();

    // Generate embedding with dual-tier fallback logic
    let response;
    try {
      response = await this.contentGenerator.embedContent({
        model: this.activeEmbeddingModel,
        contents: [{ role: 'user', parts: [{ text: content }] }],
      });
    } catch (error) {
      // If preview fails, pivot to stable for this session
      if (this.activeEmbeddingModel === PREVIEW_PHILL_EMBEDDING_MODEL) {
        debugLogger.debug(`[VectorService] Preview embedding failed, pivoting to stable: ${STABLE_PHILL_EMBEDDING_MODEL}`);
        this.activeEmbeddingModel = STABLE_PHILL_EMBEDDING_MODEL;
        try {
          response = await this.contentGenerator.embedContent({
            model: this.activeEmbeddingModel,
            contents: [{ role: 'user', parts: [{ text: content }] }],
          });
        } catch (stableError) {
          debugLogger.warn(`[VectorService] Stable embedding also failed. Skipping indexing for this content. ${stableError instanceof Error ? stableError.message : String(stableError)}`);
          return null;
        }
      } else {
        debugLogger.warn(`[VectorService] Embedding failed. Skipping indexing for this content. ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    }

    if (!response || !response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
        debugLogger.warn('[VectorService] Received empty embedding from provider.');
        return null;
    }

    const embedding = response.embeddings[0].values;
    const id = crypto.randomUUID();

    const doc: VectorDocument = {
      id,
      content,
      embedding,
      metadata,
      createdAt: Date.now(),
    };

    this.documents.push(doc);
    this.scheduleSave();

    return id;
  }

  async search(query: string, limit: number = 5): Promise<VectorDocument[]> {
    await this.initialize();

    // Generate embedding for query with fallback
    let response;
    try {
      response = await this.contentGenerator.embedContent({
        model: this.activeEmbeddingModel,
        contents: [{ role: 'user', parts: [{ text: query }] }],
      });
    } catch (error) {
      if (this.activeEmbeddingModel === PREVIEW_PHILL_EMBEDDING_MODEL) {
        this.activeEmbeddingModel = STABLE_PHILL_EMBEDDING_MODEL;
        try {
          response = await this.contentGenerator.embedContent({
            model: this.activeEmbeddingModel,
            contents: [{ role: 'user', parts: [{ text: query }] }],
          });
        } catch (stableError) {
          debugLogger.debug('[VectorService] Search embedding failed. Returning empty results.');
          return [];
        }
      } else {
        debugLogger.debug('[VectorService] Search embedding failed. Returning empty results.');
        return [];
      }
    }

    const queryEmbedding = response?.embeddings?.[0]?.values;
    if (!queryEmbedding) return [];

    // Calculate similarities
    const results = this.documents.map(doc => ({
      doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Filter and sort
    return results
      .filter(r => r.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(r => r.doc);
  }

  // Clear all memories (useful for testing/reset)
  async clear() {
      this.documents = [];
      await this.save();
  }
}

