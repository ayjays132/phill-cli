/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Storage,
  LogosService,
  type Config,
  createContentGenerator,
  type ContentGenerator,
  debugLogger,
  type AxiomError,
  AxiomErrorSeverity,
} from '../index.js';
import { WorkspaceEncoder } from '../utils/axiom/workspaceEncoder.js';
import { VectorService } from './vectorService.js';
import { LatentContextService } from './latentContextService.js';
import { FileDiscoveryService } from './fileDiscoveryService.js';
import { ErrorPipeline } from '../utils/axiom/errorPipeline.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

/**
 * AxiomService is the primary engine for error intelligence and workspace monitoring.
 */
export class AxiomService {
  private static instance: AxiomService;
  private workspaceEncoder: WorkspaceEncoder | null = null;
  private vectorService: VectorService | null = null;
  private contentGenerator: ContentGenerator | null = null;
  private errors: AxiomError[] = [];

  private fsWatcher: import('fs').FSWatcher | null = null;
  private watchDebounceTimer: NodeJS.Timeout | null = null;
  private pendingFilesToEncode = new Set<string>();

  private constructor() {}

  static getInstance(): AxiomService {
    if (!AxiomService.instance) {
      AxiomService.instance = new AxiomService();
    }
    return AxiomService.instance;
  }

  /**
   * Initializes the service with the current config.
   */
  async initialize(config: Config): Promise<void> {
    const projectRoot = config.getProjectRoot();
    const cachePath = path.join(
      Storage.getGlobalPhillDir(),
      'axiom',
      'latent-cache.bin',
    );

    // VectorService needs ContentGenerator
    const contentGeneratorConfig = config.getContentGeneratorConfig();
    this.contentGenerator = await createContentGenerator(
      contentGeneratorConfig,
      config,
    );
    this.vectorService = VectorService.getInstance(this.contentGenerator);
    if (!this.vectorService) {
      throw new Error('Failed to initialize VectorService');
    }
    await this.vectorService.initialize();

    const latentService = LatentContextService.getInstance();
    const fileDiscovery = new FileDiscoveryService(projectRoot);

    this.workspaceEncoder = new WorkspaceEncoder(
      config,
      latentService,
      this.vectorService,
      fileDiscovery,
      cachePath,
    );

    await this.workspaceEncoder.loadCache();

    // Initialize the error pipeline
    ErrorPipeline.getInstance().init();

    // Start background watcher for Live-Indexing
    this.startBackgroundWatcher(projectRoot);

    debugLogger.debug('[AXIOM] Service initialized with Live-Indexing & RAG support.');
  }

  /**
   * Starts a non-blocking recursive file watcher to keep the semantic index in sync.
   */
  private startBackgroundWatcher(projectRoot: string) {
    if (this.fsWatcher) return;

    try {
      import('fs').then((fsNode) => {
        this.fsWatcher = fsNode.watch(projectRoot, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          const fullPath = path.join(projectRoot, filename);
          
          // Skip typical noisy directories
          if (filename.includes('.git') || filename.includes('node_modules') || filename.includes('.phill')) return;

          this.pendingFilesToEncode.add(fullPath);

          if (this.watchDebounceTimer) {
            clearTimeout(this.watchDebounceTimer);
          }

          // Debounce rapid saves (e.g., from format-on-save)
          this.watchDebounceTimer = setTimeout(() => {
            void this.processPendingEncodes(projectRoot);
          }, 2000);
        });
      });
    } catch (e) {
      debugLogger.debug('[AXIOM] Failed to start native watcher. Live-indexing disabled.', e);
    }
  }

  private async processPendingEncodes(projectRoot: string) {
    if (!this.workspaceEncoder || this.pendingFilesToEncode.size === 0) return;

    const files = Array.from(this.pendingFilesToEncode);
    this.pendingFilesToEncode.clear();

    try {
      for (const file of files) {
        // We do a fast heuristic encode on save
        await this.workspaceEncoder.encodeSingleFile(projectRoot, file, false);
      }
      debugLogger.debug(`[AXIOM] Live-Indexed ${files.length} files in background.`);
    } catch (e) {
      debugLogger.debug('[AXIOM] Background index error:', e);
    }
  }

  /**
   * Performs a workspace scan and encoding.
   * By default, this uses heuristic encoding (No AI) to protect quotas.
   * @param config The application config.
   * @param deep If true, performs an LLM-backed neural scan of all files.
   */
  async scanWorkspace(config: Config, deep: boolean = false): Promise<void> {
    if (!this.workspaceEncoder) {
      await this.initialize(config);
    }

    debugLogger.log(
      `[AXIOM] Initializing ${deep ? 'Neural' : 'Algorithmic'} Workspace Scan...`,
    );

    const projectRoot = config.getProjectRoot();

    // If deep is false, we pass false to encodeWorkspace which will:
    // 1. Use generationHeuristicDLR instead of latentService.encode
    // 2. We should also skip vector indexing by default if not deep?
    // Actually, VectorService currently ALWAYS uses embeddings.
    // To truly avoid AI, we'll tell the encoder whether to skip vector indexing too.

    await this.workspaceEncoder!.encodeWorkspace(projectRoot, deep);

    debugLogger.log(
      `[AXIOM] Scan complete. Use 'axiom fix' for intelligence on detected errors.`,
    );
  }

  /**
   * Adds a normalized error to the AXIOM pipeline.
   */
  addError(error: AxiomError): void {
    debugLogger.debug(
      `[AXIOM] Error intercepted: ${error.message} (${error.source})`,
    );
    this.errors.push(error);
  }

  /**
   * Retrieves current errors, filtered by severity if needed.
   */
  getErrors(severity?: AxiomErrorSeverity): AxiomError[] {
    if (!severity) return this.errors;
    return this.errors.filter((e) => e.severity === severity);
  }

  /**
   * Clears all detected errors.
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Suggests a fix for an error using RAG context and LOGOS signal.
   */
  async suggestFix(
    error: AxiomError,
    config: Config,
  ): Promise<string | undefined> {
    if (!this.workspaceEncoder || !this.vectorService || !this.contentGenerator)
      return undefined;

    // 1. Get Latent context for the error file
    const latent = this.workspaceEncoder.getFileLatent(error.filePath);
    let fileSnippet = '';

    // If we only have a heuristic DLR (starts with 'H:'), we should pull actual file content
    // for the fix generator to have deep context.
    if (!latent || latent.startsWith('H:')) {
      try {
        const fullPath = path.isAbsolute(error.filePath)
          ? error.filePath
          : path.join(config.getProjectRoot(), error.filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        const start = Math.max(0, (error.line || 1) - 20);
        const end = Math.min(lines.length, (error.line || 1) + 20);
        fileSnippet = lines.slice(start, end).join('\n');

        debugLogger.debug(
          `[AXIOM] Neural DLR missing, extracted ${end - start} lines of raw context.`,
        );
      } catch (_e) {
        debugLogger.warn(
          `[AXIOM] Could not read file for fix context: ${error.filePath}`,
        );
      }
    }

    // 2. Get Logos spatial grounding signal to weight retrieval
    const logos = LogosService.getInstance();
    const logosSignal = await logos.analyze(error.message);
    const groundingWeight = logosSignal.dimensions.spatialGrounding;

    // 3. Perform RAG over the vector store to find similar issues/context
    // We only search if vectorService is functional
    let ragContext = 'No similar codebase context found.';
    try {
      const searchResults = await this.vectorService.search(error.message, 3);
      if (searchResults.length > 0) {
        ragContext = searchResults
          .map(
            (r) => `[CODESPACE CONTEXT: ${r.metadata?.['path']}]\n${r.content}`,
          )
          .join('\n\n');
      }
    } catch (_e) {
      debugLogger.debug('[AXIOM] RAG search skipped or failed.');
    }

    debugLogger.debug(
      `[AXIOM] Generating fix for ${path.basename(error.filePath)} | Context: ${latent?.startsWith('H:') ? 'Hybrid (Heuristic + Snippet)' : 'Neural DLR'} | Weight: ${groundingWeight.toFixed(2)}`,
    );

    const prompt = `
[AXIOM ERROR ANALYSIS]
Source: ${error.source}
Code: ${error.code ?? 'N/A'}
File: ${error.filePath}
Line: ${error.line ?? 'N/A'}
Message: ${error.message}

[LOCAL FILE CONTEXT]
${fileSnippet ? `File Content around error:\n${fileSnippet}` : 'Snippet unavailable.'}

[DENSE LATENT REPRESENTATION]
${latent ?? 'No latent context available.'}

[GLOBAL CODESPACE CONTEXT (RAG)]
${ragContext}

[LOGOS REASONING SIGNAL]
Dominant Dimension: ${logosSignal.dominantDimension}
Grounding Confidence: ${groundingWeight.toFixed(4)}

INSTRUCTION: 
Based on the error above and the provided codebase context, suggest a concise and surgical fix.
Include only the necessary code changes or a brief explanation.
    `.trim();

    try {
      const response = await this.contentGenerator.generateContent(
        {
          model: config.getModel(),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        },
        'axiom-fix-generator',
      );

      const fix = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (fix) {
        error.fixSuggestion = fix;
        return fix;
      }
    } catch (e) {
      debugLogger.error('[AXIOM] Fix generation failed:', e);
    }

    return undefined;
  }

  /**
   * Returns a hygiene report for the workspace.
   */
  getAxiomOverview(): string {
    const total = this.errors.length;
    const errors = this.getErrors(AxiomErrorSeverity.ERROR).length;
    const warnings = this.getErrors(AxiomErrorSeverity.WARNING).length;
    const fatal = this.getErrors(AxiomErrorSeverity.FATAL).length;

    return [
      '--- AXIOM HYGIENE REPORT ---',
      `Status: ${fatal > 0 ? 'CRITICAL' : errors > 0 ? 'UNSTABLE' : 'STABLE'}`,
      `Total Issues: ${total}`,
      ` - Fatal: ${fatal}`,
      ` - Errors: ${errors}`,
      ` - Warnings: ${warnings}`,
      '--------------------------',
    ].join('\n');
  }
}
