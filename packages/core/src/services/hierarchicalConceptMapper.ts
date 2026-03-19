/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { VectorService } from './vectorService.js';
import type { ContentGenerator } from '../core/contentGenerator.js';
import { debugLogger } from '../utils/debugLogger.js';

export interface ConceptNode {
  id: string;
  name: string;
  description: string;
  parentIds: string[]; // Enables hierarchical mapping
  confidence: number;
}

/**
 * HierarchicalConceptMapper builds a semantic graph of the workspace over time.
 * It works alongside the Semantic Sieve to ensure foundational architectural
 * decisions are never lost, even if they aren't explicitly mentioned recently.
 */
export class HierarchicalConceptMapper {
  private static instance: HierarchicalConceptMapper;
  private vectorService: VectorService;
  private contentGenerator: ContentGenerator;
  private isProcessing = false;

  private constructor(contentGenerator: ContentGenerator) {
    this.contentGenerator = contentGenerator;
    this.vectorService = VectorService.getInstance(contentGenerator);
  }

  public static getInstance(contentGenerator: ContentGenerator): HierarchicalConceptMapper {
    if (!HierarchicalConceptMapper.instance) {
      HierarchicalConceptMapper.instance = new HierarchicalConceptMapper(contentGenerator);
    }
    return HierarchicalConceptMapper.instance;
  }

  /**
   * Distills a raw text snippet into core architectural concepts.
   * Runs asynchronously to prevent blocking the event loop.
   */
  async ingestContext(text: string, source: 'chat' | 'axiom' | 'tool'): Promise<void> {
    if (text.length < 50 || this.isProcessing) return; // Skip trivial or overlapping calls

    this.isProcessing = true;
    try {
      // Use the model to extract hierarchical concepts
      const response = await this.contentGenerator.generateContent({
        model: 'gemini-3.1-flash-lite', // Use the fast utility model
        contents: [{
          role: 'user',
          parts: [{ text: `Extract the core architectural concepts from this text. Return JSON array of objects with 'name' and 'description'. Do not include markdown formatting.\n\nText: ${text}` }]
        }]
      }, 'concept-mapper-ingest');

      const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) return;

      try {
        // Strip potential markdown backticks
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const concepts = JSON.parse(cleanJson) as {name: string, description: string}[];

        for (const concept of concepts) {
          // Index the concept into the VectorService with a special type
          await this.vectorService.addDocument(
            `CONCEPT: ${concept.name} - ${concept.description}`, 
            { type: 'hierarchical_concept', source, confidence: 0.9 }
          );
        }
        debugLogger.debug(`[ConceptMapper] Ingested ${concepts.length} concepts from ${source}.`);
      } catch (parseError) {
        debugLogger.debug(`[ConceptMapper] Failed to parse concept JSON. Skipping.`);
      }
    } catch (e) {
      debugLogger.warn(`[ConceptMapper] Ingestion failed:`, e);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retrieves the most critical foundational concepts for a given query.
   */
  async retrieveFoundationalConcepts(query: string): Promise<string[]> {
    try {
      const results = await this.vectorService.search(query, 3);
      // Filter for concept types
      const conceptResults = results.filter(r => r.metadata?.['type'] === 'hierarchical_concept');
      return conceptResults.map(r => r.content);
    } catch (e) {
      return [];
    }
  }
}
