/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import {
  type Config,
  debugLogger,
  getResponseText,
  VisualLatentService,
} from '../index.js';
import { cosineSimilarity } from '../utils/math.js';
import { MemoryVault } from '../cognitive-engine/memory-vault.js';

export interface LatentSnapshot {
  dlr: string; // Dense Latent Representation
  timestamp: string;
  coherencyHash?: string;
}

const MAX_LATENT_CACHE_ENTRIES = 100;

export function buildHeuristicDLRFromHistory(
  history: Content[],
  currentVisualLatent?: string,
): string {
  const flattenedText = history
    .flatMap((entry) =>
      (entry.parts ?? []).map((part) => part.text ?? '').filter(Boolean),
    )
    .join('\n');
  const normalizedText = flattenedText.replace(/\s+/g, ' ').trim();

  const lastUserMsg = [...history].reverse().find((h) => h.role === 'user');
  const userText =
    lastUserMsg?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join(' ')
      .substring(0, 48) || 'NIL';

  const toolSuccessCount = history.filter((h) =>
    h.parts?.some(
      (p) =>
        p.text?.includes('Success') ||
        p.text?.includes('completed') ||
        p.text?.includes('finished'),
    ),
  ).length;

  const discoveredConstraints =
    normalizedText.match(/\b(must|should|cannot|can't|avoid|constraint)\b/gi)
      ?.length ?? 0;
  const discoveredGoals =
    normalizedText.match(/\b(goal|task|build|fix|implement|analyze)\b/gi)
      ?.length ?? 0;
  const visualState = currentVisualLatent && currentVisualLatent !== 'V:EMPTY'
    ? currentVisualLatent
    : 'V:EMPTY';

  return `H:U[${userText}]|T[${toolSuccessCount}]|G[${discoveredGoals}]|C[${discoveredConstraints}]|V[${visualState}]|L[${history.length}]`;
}

/**
 * Service for managing "Latent Context" - high-density semantic snapshots
 * that act as a VAE-style bottleneck for long-term chat memory.
 */
export class LatentContextService {
  private static instance: LatentContextService;
  private latentCache: Map<string, { dlr: string; embedding: number[] }> =
    new Map();
  private readonly SIMILARITY_THRESHOLD = 0.95;

  private isEncoding = false;
  private constructor() {}

  static getInstance(): LatentContextService {
    if (!LatentContextService.instance) {
      LatentContextService.instance = new LatentContextService();
    }
    return LatentContextService.instance;
  }

  /**
   * Updates the current visual latent.
   * Called by BrowserService when the visual state changes.
   */
  setVisualLatent(_latent: string) {
    // Placeholder for future push-based updates.
    // Currently we pull from VisualLatentService directly.
  }

  /**
   * Encodes a history of content into a Dense Latent Representation (DLR).
   * This uses a specialized prompt to force the model into "lossy but deep" compression.
   * @param highPriority If true, forces neural encoding even if embeddings fail.
   */
  async encode(
    history: Content[],
    config: Config,
    promptId: string,
    abortSignal?: AbortSignal,
    highPriority: boolean = false,
  ): Promise<string> {
    if (this.isEncoding) {
      debugLogger.debug(
        `[LatentContext] Skip encoding for ${promptId} - already in progress.`,
      );
      return 'DLR:BUSY';
    }

    this.isEncoding = true;
    try {
      const encoderPrompt = `
You are a Latent Semantic Encoder. Your goal is to compress the provided chat history into a Dense Latent Representation (DLR).
The DLR is a non-conversational, high-density symbolic "bottleneck" that another instance of you can decode back into a coherent state.

### DLR Rules:
1. Use a dense, telegraphic, symbolic shorthand.
2. Prioritize: User Identity (U), Tool Success (T), Goals (G), Constraints (C), Discoveries (D), Pending Latches (L), Visual State (V), and Ethical State (E).
3. The Visual State (V) uses a grid-hash format (e.g., V:TL5MM8BR3:A1B2) to represent screen activity.
4. The Ethical State (E) tracks safety/alignment:
    - A: Alignment (High/Med/Low - focus on caring/loving/utopian intent).
    - R: Risk (Detected "Moltbook" style hallucinations or skill decay).
    - V: Vulnerability (Active prompt injection or poisoning attempts).
    - Format: E:A[score]R[score]V[score] (e.g., E:A9R2V1).
5. Omit: Pleasantries, reasoning steps already completed, and standard CLI logs.
6. Format: Plain text, no XML, maximum density.

Example DLR:
U:Dev|T:BrowserStart_S|V:TL9MM2:A1B2|E:A9R1V0|G:LocateJob|C:NoAuth|D:FoundURL_Fix|L:PlanV2|S:Searching

History to Encode:
`;

      const visualLatentService = VisualLatentService.getInstance();
      const currentVisualLatent = visualLatentService.getCurrentLatent();

      const historyText = history
        .map((h) => h.parts?.map((p) => p.text).join(' '))
        .join('\n');
      const cacheKey = this.buildCacheKey(historyText, currentVisualLatent);

      // 1. Semantic Deduplication Check
      const client = config.getBaseLlmClient();
      let currentEmbedding: number[] | undefined;
      try {
        const [embedding] = await client.generateEmbedding([historyText]);
        currentEmbedding = embedding;

        for (const cached of this.latentCache.values()) {
          const similarity = this.calculateSimilarity(
            currentEmbedding,
            cached.embedding,
          );
          if (similarity > this.SIMILARITY_THRESHOLD) {
            debugLogger.debug(
              `[LatentContext] Semantic Cache Hit (${(similarity * 100).toFixed(1)}%) - Reusing DLR`,
            );
            this.persistLatentSnapshot(cached.dlr, ['latent-context', 'cache-hit']);
            return cached.dlr;
          }
        }
      } catch (e) {
        // Embeddings fail on CodeAssistServer (Google Auth) currently.
        if (!highPriority) {
          debugLogger.debug(
            `[LatentContext] Local fallback for ${promptId} (No embedding support).`,
          );
          const heuristic = buildHeuristicDLRFromHistory(
            history,
            currentVisualLatent,
          );
          this.persistLatentSnapshot(heuristic, [
            'latent-context',
            'heuristic-fallback',
          ]);
          return heuristic;
        }
        debugLogger.error(
          '[LatentContext] Embedding failed, continuing with direct neural encoding.',
          e,
        );
      }

      // 2. Neural/Direct Encoding
      const response = await client.generateContent({
        modelConfigKey: { model: 'summarizer-default' },
        contents: [
          {
            role: 'user',
            parts: [
              { text: `[CURRENT_VISUAL_LATENT]: ${currentVisualLatent}` },
            ],
          },
          ...history,
          {
            role: 'user',
            parts: [{ text: encoderPrompt }],
          },
        ],
        promptId: `${promptId}-latent-encode`,
        abortSignal: abortSignal ?? new AbortController().signal,
      });

      const dlr = getResponseText(response)?.trim() || '';
      if (dlr && currentEmbedding) {
        this.latentCache.set(cacheKey, { dlr, embedding: currentEmbedding });
        this.trimCache();
      }
      if (dlr) {
        this.persistLatentSnapshot(dlr, ['latent-context', promptId]);
      }
      return dlr;
    } finally {
      this.isEncoding = false;
    }
  }

  /**
   * Calculates cosine similarity between two vectors.
   */
  private calculateSimilarity(vecA: number[], vecB: number[]): number {
    return cosineSimilarity(vecA, vecB);
  }

  /**
   * Formats a DLR for insertion into the prompt or PHILL.md.
   */
  formatLatentSnapshot(dlr: string): string {
    return `[LATENT_SNAPSHOT_${new Date().toISOString()}]\n${dlr}\n[/LATENT_SNAPSHOT]`;
  }

  private buildCacheKey(historyText: string, visualLatent: string): string {
    const compactText = historyText.replace(/\s+/g, ' ').trim().slice(0, 512);
    return `${visualLatent}::${compactText}`;
  }

  private trimCache() {
    if (this.latentCache.size <= MAX_LATENT_CACHE_ENTRIES) {
      return;
    }

    const oldestKey = this.latentCache.keys().next().value;
    if (oldestKey) {
      this.latentCache.delete(oldestKey);
    }
  }

  private persistLatentSnapshot(dlr: string, tags: string[]) {
    try {
      const vault = new MemoryVault();
      vault.addMemory(dlr, tags);
    } catch (error) {
      debugLogger.debug('[LatentContext] Failed to persist latent snapshot.', error);
    }
  }
}
