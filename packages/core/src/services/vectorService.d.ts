/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContentGenerator } from '../core/contentGenerator.js';
interface VectorDocument {
    id: string;
    content: string;
    embedding: number[];
    metadata?: Record<string, any>;
    createdAt: number;
}
export declare class VectorService {
    private contentGenerator;
    private documents;
    private initialized;
    constructor(contentGenerator: ContentGenerator);
    private get storagePath();
    initialize(): Promise<void>;
    private save;
    private cosineSimilarity;
    addDocument(content: string, metadata?: Record<string, any>): Promise<string>;
    search(query: string, limit?: number): Promise<VectorDocument[]>;
    clear(): Promise<void>;
}
export {};
