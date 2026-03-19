/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type BaseLlmClient,
  debugLogger,
  getResponseText,
  type MessageRecord,
  partListUnionToString,
  type ContentGenerator,
} from '../index.js';
import type { Content } from '@google/genai';
import { VectorService } from './vectorService.js';

const DEFAULT_MAX_MESSAGES = 20;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_MESSAGE_LENGTH = 500;

const SUMMARY_PROMPT = `Summarize the user's primary intent or goal in this conversation in ONE sentence (max 80 characters).
Focus on what the user was trying to accomplish.

Examples:
- "Add dark mode to the app"
- "Fix authentication bug in login flow"
- "Understand how the API routing works"
- "Refactor database connection logic"
- "Debug memory leak in production"

Conversation:
{conversation}

Summary (max 80 chars):`;

/**
 * Options for generating a session summary.
 */
export interface GenerateSummaryOptions {
  messages: MessageRecord[];
  maxMessages?: number;
  timeout?: number;
}

/**
 * Service for generating AI summaries of chat sessions.
 * Uses Phill Flash Lite to create concise, user-intent-focused summaries.
 */
export class SessionSummaryService {
  private isSummarizing = false;
  private vectorService: VectorService | null = null;

  constructor(private readonly baseLlmClient: BaseLlmClient) {}

  private async getVectorService(): Promise<VectorService> {
    if (!this.vectorService) {
      // Lazy init to avoid recursive imports
      this.vectorService = VectorService.getInstance(
        (
          this.baseLlmClient as unknown as {
            contentGenerator: ContentGenerator;
          }
        ).contentGenerator,
      );
      await this.vectorService.initialize();
    }
    return this.vectorService;
  }

  /**
   * Generate a 1-line summary of a chat session focusing on user intent.
   * Returns null if generation fails for any reason.
   */
  async generateSummary(
    options: GenerateSummaryOptions,
  ): Promise<string | null> {
    if (this.isSummarizing) {
      debugLogger.debug(
        '[SessionSummary] Skip generation - already in progress.',
      );
      return null;
    }

    this.isSummarizing = true;
    try {
      const {
        messages,
        maxMessages = DEFAULT_MAX_MESSAGES,
        timeout = DEFAULT_TIMEOUT_MS,
      } = options;

      // Filter to user/phill messages only (exclude system messages)
      const filteredMessages = messages.filter((msg) => {
        // Skip system messages (info, error, warning)
        if (msg.type !== 'user' && msg.type !== 'phill') {
          return false;
        }
        const content = partListUnionToString(msg.content);
        return content.trim().length > 0;
      });

      // Apply sliding window selection: first N + last N messages
      let relevantMessages: MessageRecord[];
      if (filteredMessages.length <= maxMessages) {
        // If fewer messages than max, include all
        relevantMessages = filteredMessages;
      } else {
        // Sliding window: take the first and last messages.
        const firstWindowSize = Math.ceil(maxMessages / 2);
        const lastWindowSize = Math.floor(maxMessages / 2);
        const firstMessages = filteredMessages.slice(0, firstWindowSize);
        const lastMessages = filteredMessages.slice(-lastWindowSize);
        relevantMessages = firstMessages.concat(lastMessages);
      }

      if (relevantMessages.length === 0) {
        debugLogger.debug('[SessionSummary] No messages to summarize');
        return null;
      }

      // Format conversation for the prompt
      const conversationText = relevantMessages
        .map((msg) => {
          const role = msg.type === 'user' ? 'User' : 'Assistant';
          const content = partListUnionToString(msg.content);
          // Truncate very long messages to avoid token limit
          const truncated =
            content.length > MAX_MESSAGE_LENGTH
              ? content.slice(0, MAX_MESSAGE_LENGTH) + '...'
              : content;
          return `${role}: ${truncated}`;
        })
        .join('\n\n');

      const prompt = SUMMARY_PROMPT.replace('{conversation}', conversationText);

      // Create abort controller with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeout);

      try {
        const contents: Content[] = [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ];

        const response = await this.baseLlmClient.generateContent({
          modelConfigKey: { model: 'summarizer-default' },
          contents,
          abortSignal: abortController.signal,
          promptId: 'session-summary-generation',
        });

        const summary = getResponseText(response);

        if (!summary || summary.trim().length === 0) {
          debugLogger.debug('[SessionSummary] Empty summary returned');
          return null;
        }

        // Clean the summary
        let cleanedSummary = summary
          .replace(/\n+/g, ' ') // Collapse newlines to spaces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim(); // Trim after all processing

        // Remove quotes if the model added them
        cleanedSummary = cleanedSummary.replace(/^["']|["']$/g, '');

        // Self-Correction Reflexion: evaluate if the intent was met and what lessons were learned
        this.evaluateOutcomeAndLearn(cleanedSummary, conversationText).catch(
          (e) => {
            debugLogger.debug(`[Reflexion] Evaluation failed: ${e}`);
          },
        );

        debugLogger.debug(`[SessionSummary] Generated: "${cleanedSummary}"`);
        return cleanedSummary;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Log the error but don't throw - we want graceful degradation
      if (error instanceof Error && error.name === 'AbortError') {
        debugLogger.debug('[SessionSummary] Timeout generating summary');
      } else {
        debugLogger.debug(
          `[SessionSummary] Error generating summary: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return null;
    } finally {
      this.isSummarizing = false;
    }
  }

  /**
   * Evaluates the execution outcome against the original intent to extract "Lessons Learned"
   * and automatically commit them to global memory to prevent context rot and repeated mistakes.
   */
  private async evaluateOutcomeAndLearn(
    intentSummary: string,
    conversationText: string,
  ) {
    const EVALUATION_PROMPT = `As a critical Self-Reviewer AI, evaluate the outcome of the following conversation against the user's primary intent: "${intentSummary}".
Did the AI succeed without major halting, unhandled errors, or 'Goal Drift'? 
If it failed, drifted, or struggled due to tool errors or wrong assumptions, synthesize a 1-sentence "Lesson Learned" to prevent this in the future.
If it succeeded smoothly, output exactly "SUCCESS".

Conversation:
${conversationText}

Analysis & Lesson (if any, otherwise exactly "SUCCESS"):`;

    try {
      // 1. Latent Focus: Prune conversation using embeddings to save tokens
      const chunks = conversationText.split('\n\n');
      let prunedConversation = conversationText;

      if (chunks.length > 5) {
        try {
          const queryEmbedding = (
            await this.baseLlmClient.generateEmbedding([intentSummary])
          )[0];
          const chunkEmbeddings =
            await this.baseLlmClient.generateEmbedding(chunks);

          const rankedChunks = chunks
            .map((chunk, i) => ({
              chunk,
              similarity: this.calculateSimilarity(
                queryEmbedding,
                chunkEmbeddings[i],
              ),
            }))
            .sort((a, b) => b.similarity - a.similarity);

          // Take top 5 chunks + first and last for context
          const topChunks = new Set(
            rankedChunks.slice(0, 5).map((r) => r.chunk),
          );
          topChunks.add(chunks[0]);
          topChunks.add(chunks[chunks.length - 1]);

          prunedConversation = chunks
            .filter((c) => topChunks.has(c))
            .join('\n\n');
          debugLogger.debug(
            `[Reflexion] Pruned conversation from ${chunks.length} to ${topChunks.size} chunks.`,
          );
        } catch (e) {
          debugLogger.warn(
            `[Reflexion] Latent focus failed, using full context: ${e}`,
          );
        }
      }

      const response = await this.baseLlmClient.generateContent({
        modelConfigKey: { model: 'summarizer-default' },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: EVALUATION_PROMPT.replace(
                  '${conversationText}',
                  prunedConversation,
                ),
              },
            ],
          },
        ],
        promptId: 'session-reflexion-evaluation',
        abortSignal: new AbortController().signal,
      });

      const analysis = getResponseText(response)?.trim();
      if (!analysis || analysis === 'SUCCESS' || analysis.includes('SUCCESS')) {
        return; // Nothing to learn, went smoothly
      }

      // We have a lesson learned. Write it to global memory.
      const fs = await import('node:fs/promises');
      const { getGlobalMemoryFilePath, computeNewContent } =
        await import('../index.js');

      const memoryPath = getGlobalMemoryFilePath();
      let currentContent = '';
      try {
        currentContent = await fs.readFile(memoryPath, 'utf-8');
      } catch (_e) {
        // File may not exist
      }

      const lessonEntry = `* [REFLEXION] Failed Intent: ${intentSummary}\n  Lesson: ${analysis.replace(/\n/g, ' ')}`;
      const newContent = computeNewContent(
        currentContent,
        lessonEntry,
        '## Lessons Learned',
      );
      await fs.writeFile(memoryPath, newContent, 'utf-8');

      // Store lesson in Vector Store for future semantic lookups
      const vService = await this.getVectorService();
      await vService.addDocument(lessonEntry, {
        type: 'reflexion_lesson',
        intent: intentSummary,
      });

      debugLogger.debug(
        '[Reflexion] New lesson learned and stored (Latent & Text).',
      );
    } catch (error) {
      debugLogger.debug(`[Reflexion] Error: ${error}`);
    }
  }

  private calculateSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magA * magB);
  }
}
