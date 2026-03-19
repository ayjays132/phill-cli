/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AxiomService } from './axiomService.js';
import { EthicalGuardService } from './ethicalGuardService.js';
import { LogosService } from './logosService.js';
import type { LogosSignal } from './logosService.js';
import { ManifoldMemoryService } from './manifoldMemoryService.js';
import { debugLogger } from '../utils/debugLogger.js';
import { coreEvents, CoreEvent } from '../utils/events.js';
import type { Config } from '../config/config.js';
import type { Content } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

export enum NexusPipeline {
  DIRECT = 'direct', // Standard model call
  DEBUG = 'debug', // AXIOM scan + RAG
  ARCHITECT = 'architect', // COUNCIL Agent escalation
  EXPLAIN = 'explain', // Context-heavy explanation
  SECURE = 'secure', // MOLT-GUARD locked down mode
}

export interface NexusContextPacket {
  pipeline: NexusPipeline;
  confidence: number;
  assembledContext: string;
  recommendedModel?: string;
}

export interface NexusMemory {
  history: Array<{
    prompt: string;
    pipeline: NexusPipeline;
    confidence: number;
    reason?: string;
    timestamp: string;
  }>;
}

/**
 * NexusService orchestrates the proactive intelligence pipeline.
 */
export class NexusService {
  private static instance: NexusService;
  private pipelineMemory: Map<string, unknown> = new Map();
  private memoryFilePath: string | null = null;
  private memory: NexusMemory = { history: [] };
  private router = {
    classify: async (_prompt: string, _history: unknown, _config: Config) => ({
      pipeline: NexusPipeline.DIRECT,
    }),
  };

  private constructor() {}

  static getInstance(): NexusService {
    if (!NexusService.instance) {
      NexusService.instance = new NexusService();
    }
    return NexusService.instance;
  }

  /**
   * Initializes the service with workspace storage.
   */
  async initialize(config: Config): Promise<void> {
    const tempDir = config.storage.getProjectTempDir();
    const nexusDir = path.join(tempDir, 'nexus');
    this.memoryFilePath = path.join(nexusDir, 'memory.json');

    try {
      if (!fs.existsSync(nexusDir)) {
        fs.mkdirSync(nexusDir, { recursive: true });
      }

      if (fs.existsSync(this.memoryFilePath)) {
        const data = fs.readFileSync(this.memoryFilePath, 'utf-8');
        this.memory = JSON.parse(data);
        debugLogger.debug(
          `[NEXUS] Loaded persistence memory from ${this.memoryFilePath}`,
        );
      }

      // Initialize Manifold Memory
      const manifoldMemory = ManifoldMemoryService.getInstance();
      await manifoldMemory.initialize();
    } catch (error) {
      debugLogger.error('[NEXUS] Failed to initialize persistence:', error);
    }
  }

  /**
   * Processes a user prompt through the Nexus pipeline.
   */
  async processPrompt(
    prompt: string,
    history: Content[],
    config: Config,
  ): Promise<NexusContextPacket> {
    debugLogger.debug(
      `[NEXUS] Intercepting prompt: "${prompt.substring(0, 50)}..."`,
    );

    // 1. Intent Routing
    const decision = await this.router.classify(prompt, history, config);
    const pipeline = decision.pipeline;

    // 2. Context Assembly
    const logos = LogosService.getInstance();
    let logosSignal = await logos.analyze(prompt);

    // 2.5 Test-Time Compute (TTC)
    // If we're not in DIRECT mode, or coherence is low, refine the reasoning manifold.
    if (
      pipeline !== NexusPipeline.DIRECT ||
      logosSignal.dimensions.temporalCoherence < 0.6
    ) {
      debugLogger.debug(
        `[NEXUS] Coherence Drift (${logosSignal.dimensions.temporalCoherence.toFixed(2)}) Triggering Test-Time Compute...`,
      );
      logosSignal = await logos.refineManifestation(prompt);
    }

    const assembledContext = await this.assembleContext(
      pipeline,
      prompt,
      history,
      config,
      logosSignal,
    );

    // 3. Confidence Calculation
    const confidence = this.calculateConfidence(
      pipeline,
      assembledContext,
      logosSignal,
    );

    // 4. Threshold Logic & Escalation
    const guard = EthicalGuardService.getInstance();
    guard.supplementAlignment(logosSignal.dimensions.ethicsAlignment);

    let finalPipeline = pipeline;
    let escalationReason: string | undefined;

    if (logosSignal.dimensions.solutionDiversity > 0.8) {
      finalPipeline = NexusPipeline.ARCHITECT;
      escalationReason = `LOGOS Solution Diversity High (${logosSignal.dimensions.solutionDiversity.toFixed(2)}) - Enforcing ARCHITECT reasoning`;
      debugLogger.warn(`[NEXUS] LOGOS Escalation: ${escalationReason}`);
    } else if (confidence <= 0.7) {
      finalPipeline = NexusPipeline.ARCHITECT;
      escalationReason =
        'Low confidence signal - Escalating to COUNCIL reasoning';
      debugLogger.warn(
        `[NEXUS] Escalating to COUNCIL: Confidence ${confidence.toFixed(2)}`,
      );
    } else if (confidence <= 0.92) {
      escalationReason = 'Medium confidence - Awaiting user confirmation';
    } else {
      escalationReason = 'High confidence - Auto-applying pipeline';
    }

    // 5. Persistence Update
    this.updateMemory(prompt, finalPipeline, confidence, escalationReason);

    // 5.5 Assimilate LOGOS manifold into global memory
    const manifoldMemory = ManifoldMemoryService.getInstance();
    manifoldMemory.assimilate(logosSignal.manifold);
    // Periodically persist (based on history length for now)
    if (this.memory.history.length % 5 === 0) {
      manifoldMemory.persist().catch((e) => {
        debugLogger.error(
          `[NEXUS] Failed to persist manifold memory: ${e.message}`,
        );
      });
    }

    coreEvents.emit(CoreEvent.NexusPipelineChanged, {
      pipeline: finalPipeline,
      confidence,
      reason: escalationReason,
      logosDominantDimension: logosSignal.dominantDimension,
      logosScore: logosSignal.score,
    });

    debugLogger.debug(
      `[NEXUS] Pipeline selected: ${finalPipeline} (Confidence: ${confidence.toFixed(2)})`,
    );

    return {
      pipeline: finalPipeline,
      confidence,
      assembledContext,
    };
  }

  /**
   * Returns the latest pipeline utilized.
   */
  getCurrentPipeline(): NexusPipeline {
    if (this.memory.history.length === 0) return NexusPipeline.DIRECT;
    return this.memory.history[this.memory.history.length - 1].pipeline;
  }

  /**
   * Retrieves a cached pipeline result.
   */
  getPipelineResult(sessionId: string): unknown | undefined {
    return this.pipelineMemory.get(sessionId);
  }

  /**
   * Caches a pipeline result for the current session.
   */
  setPipelineResult(sessionId: string, result: unknown): void {
    this.pipelineMemory.set(sessionId, result);
    debugLogger.debug(`[NEXUS] Cached result for session: ${sessionId}`);
  }

  private updateMemory(
    prompt: string,
    pipeline: NexusPipeline,
    confidence: number,
    reason?: string,
  ): void {
    this.memory.history.push({
      prompt,
      pipeline,
      confidence,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 entries
    if (this.memory.history.length > 50) {
      this.memory.history.shift();
    }

    if (this.memoryFilePath) {
      try {
        fs.writeFileSync(
          this.memoryFilePath,
          JSON.stringify(this.memory, null, 2),
        );
      } catch (error) {
        debugLogger.error('[NEXUS] Failed to save memory:', error);
      }
    }
  }

  private async assembleContext(
    pipeline: NexusPipeline,
    _prompt: string,
    _history: Content[],
    _config: Config,
    logosSignal: LogosSignal,
  ): Promise<string> {
    let context = '';

    // Always pull Ethical Safeguards (MOLT-GUARD)
    const guard = EthicalGuardService.getInstance();
    const guardConf = guard.getConfidence();
    const logos = LogosService.getInstance();
    const coherencyGuide = logos.getCoherencyGuide(logosSignal);

    context += `[MOLT_GUARD_ALIGNMENT: ${guardConf.alignment}/10]\n`;
    context += `[LOGOS_REASONING: ${logosSignal.dominantDimension} | Score: ${logosSignal.score.toFixed(2)}]\n`;
    context += `[LOGOS_COHERENCY: ${coherencyGuide.quality} | Recommendation: ${coherencyGuide.recommendation}]\n`;

    if (pipeline === NexusPipeline.DEBUG) {
      const axiom = AxiomService.getInstance();
      const errors = axiom.getErrors();
      if (errors.length > 0) {
        context += `\n[AXIOM_ALERTS]\nDetected ${errors.length} workspace issues:\n`;
        errors.forEach((e) => {
          context += `- ${e.message} in ${e.filePath}\n`;
        });
      }
    }

    if (pipeline === NexusPipeline.ARCHITECT) {
      context += `\n[NEXUS_ARCHITECT_MODE] Escalating to high-level reasoning. Contextualizing workspace patterns...`;
    }

    return context;
  }

  private calculateConfidence(
    pipeline: NexusPipeline,
    context: string,
    logosSignal: LogosSignal,
  ): number {
    const guard = EthicalGuardService.getInstance();
    const guardConf = guard.getConfidence();
    const alignment = guardConf.alignment / 10;
    const risk = guardConf.risk / 10;

    let score = alignment;
    score -= risk * 0.5;

    if (pipeline === NexusPipeline.DIRECT) score += 0.1;
    if (pipeline === NexusPipeline.DEBUG && context.includes('AXIOM_ALERTS'))
      score += 0.2;
    if (pipeline === NexusPipeline.SECURE) score -= 0.2; // Security mode requires manual verification by default

    // LOGOS Confidence Injection (Dim 5: Axiom Confidence)
    score = (score + logosSignal.dimensions.axiomConfidence) / 2;

    return Math.max(0, Math.min(1, score));
  }
}
