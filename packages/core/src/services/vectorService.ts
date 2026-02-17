/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator } from '../core/contentGenerator.js';
import { Storage } from '../config/storage.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { DEFAULT_GEMINI_EMBEDDING_MODEL } from '../config/models.js';

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
  private documents: VectorDocument[] = [];
  private initialized = false;

  constructor(private contentGenerator: ContentGenerator) {}

  private get storagePath(): string {
    return path.join(Storage.getGlobalPhillDir(), VECTOR_STORE_FILE);
  }

  async initialize() {
    if (this.initialized) return;
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.documents = JSON.parse(data);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.error('Failed to load vector store:', e);
      }
      this.documents = [];
    }
    this.initialized = true;
  }

  private async save() {
    await this.initialize();
    await fs.writeFile(this.storagePath, JSON.stringify(this.documents, null, 2));
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magA * magB);
  }

  async addDocument(content: string, metadata?: Record<string, any>): Promise<string> {
    await this.initialize();

    // Generate embedding
    const response = await this.contentGenerator.embedContent({
      model: DEFAULT_GEMINI_EMBEDDING_MODEL,
      contents: [{ role: 'user', parts: [{ text: content }] }],
    });

    if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
        throw new Error('Failed to generate embedding');
    }

    const embedding = response.embeddings[0].values;
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    const doc: VectorDocument = {
      id,
      content,
      embedding,
      metadata,
      createdAt: Date.now(),
    };

    this.documents.push(doc);
    await this.save();

    return id;
  }

  async search(query: string, limit: number = 5): Promise<VectorDocument[]> {
    await this.initialize();

    // Generate query embedding
    const response = await this.contentGenerator.embedContent({
        model: DEFAULT_GEMINI_EMBEDDING_MODEL,
        contents: [{ role: 'user', parts: [{ text: query }] }],
    });
    const queryEmbedding = response.embeddings?.[0]?.values;
    if (!queryEmbedding) return [];

    // Calculate similarities
    const results = this.documents.map(doc => ({
      doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
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
