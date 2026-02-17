/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorService } from './vectorService.js';
import type { ContentGenerator } from '../core/contentGenerator.js';
import * as fs from 'node:fs/promises';
import { Storage } from '../config/storage.js';

vi.mock('node:fs/promises');
vi.mock('../config/storage.js');

describe('VectorService', () => {
  let vectorService: VectorService;
  let mockContentGenerator: ContentGenerator;
  let mockEmbedContent: any;

  beforeEach(() => {
    mockEmbedContent = vi.fn().mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });

    mockContentGenerator = {
      embedContent: mockEmbedContent,
    } as any;

    vi.mocked(Storage.getGlobalPhillDir).mockReturnValue('/mock/path');
    vectorService = new VectorService(mockContentGenerator);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and load existing vectors', async () => {
    const mockData = JSON.stringify([
      { id: '1', content: 'test', embedding: [0.1, 0.2, 0.3], createdAt: 123 },
    ]);
    vi.mocked(fs.readFile).mockResolvedValue(mockData);

    await vectorService.initialize();

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('vectors.json'), 'utf-8');
  });

  it('should add a document and save it', async () => {
    vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });
    vi.mocked(fs.writeFile).mockResolvedValue();

    const id = await vectorService.addDocument('hello world');

    expect(mockEmbedContent).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    expect(id).toBeDefined();
  });

  it('should search and return relevant documents', async () => {
    const doc1 = { id: '1', content: 'apple', embedding: [1, 0, 0], createdAt: 1 };
    const doc2 = { id: '2', content: 'banana', embedding: [0, 1, 0], createdAt: 2 };

    // Mock readFile to return these docs
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([doc1, doc2]));

    // Mock embedContent for the query "fruit" -> closer to apple
    mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: [0.9, 0.1, 0] }], // Close to apple
    });

    // Re-instantiate to ensure load happens (or just wait for initialize)
    // Actually search calls initialize.
    
    // We need to bypass the private 'documents' or just trust search uses readFile
    
    // Since we mocked readFile, initialize will populate documents.
    
    const results = await vectorService.search('fruit');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toBe('apple');
  });
});
