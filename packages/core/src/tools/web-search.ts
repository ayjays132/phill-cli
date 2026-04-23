/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { WEB_SEARCH_TOOL_NAME } from './tool-names.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';

import { getErrorMessage } from '../utils/errors.js';
import { debugLogger } from '../utils/debugLogger.js';
import type { Config } from '../config/config.js';
import { getResponseText } from '../utils/partUtils.js';
import { ideContextStore } from '../ide/ideContext.js';
import type { File } from '../ide/types.js';
import { VectorService } from '../services/vectorService.js';
import { ToolCacheService } from '../services/toolCacheService.js';
import { SelfHealer } from '../utils/selfHealer.js';
import type { HealingCandidate } from '../utils/selfHealer.js';

// @ts-expect-error
import ddgSearchLib from '@pikisoft/duckduckgo-search';

type DuckDuckGoSearch = {
  text: (
    query: string,
  ) => AsyncIterable<{ title: string; href: string; body: string }>;
};

const ddg = ddgSearchLib as unknown as DuckDuckGoSearch;

interface GroundingChunkWeb {
  uri?: string;
  title?: string;
}

interface GroundingChunkItem {
  web?: GroundingChunkWeb;
}

interface GroundingSupportSegment {
  startIndex: number;
  endIndex: number;
  text?: string;
}

interface GroundingSupportItem {
  segment?: GroundingSupportSegment;
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

/**
 * Parameters for the WebSearchTool.
 */
export interface WebSearchToolParams {
  /**
   * The search query.
   */
  query: string;

  /**
   * Optional: If true, performs an autonomous multi-step deep research by fetching and
   * synthesizing the top search results.
   */
  deepResearch?: boolean;
}

/**
 * Extends ToolResult to include sources for web search.
 */
export interface WebSearchToolResult extends ToolResult {
  sources?: GroundingChunkItem[];
}

class WebSearchToolInvocation extends BaseToolInvocation<
  WebSearchToolParams,
  WebSearchToolResult
> {
  constructor(
    private readonly config: Config,
    params: WebSearchToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    const settings = this.config.getWebSearchSettings();
    const deepResearchEnabled =
      this.params.deepResearch ?? settings.deepResearchByDefault ?? false;
    const mode = deepResearchEnabled ? ' (Deep Research)' : '';
    return `Searching the web for${mode}: "${this.params.query}"`;
  }

  private async performDuckDuckGoFallback(
    query: string,
  ): Promise<WebSearchToolResult> {
    const results: Array<{
      title: string;
      href?: string;
      url?: string;
      body?: string;
      description?: string;
    }> = [];
    try {
      // The @pikisoft/duckduckgo-search package returns an async iterator
      for await (const result of ddg.text(query)) {
        results.push(result);
        if (results.length >= 10) break;
      }
    } catch (error) {
      debugLogger.warn(
        `DuckDuckGo scraper encountered an issue: ${getErrorMessage(error)}`,
      );
    }

    if (results.length === 0) {
      throw new Error(`No results found on DuckDuckGo for query: "${query}"`);
    }

    const sources: GroundingChunkItem[] = results.map((r) => ({
      web: {
        uri: r.href || r.url,
        title: r.title || 'Untitled',
      },
    }));

    const responseText = results
      .map(
        (r, i: number) =>
          `[${i + 1}] ${r.title}\n${r.body || r.description || ''}\nURL: ${r.href || r.url}`,
      )
      .join('\n\n');

    return {
      llmContent: `## DuckDuckGo Search Results (Fallback)\n\n${responseText}\n\nSources:\n${sources
        .map((s, i) => `[${i + 1}] ${s.web?.title} (${s.web?.uri})`)
        .join('\n')}`,
      returnDisplay: `DuckDuckGo fallback search results for "${query}" returned.`,
      sources,
    };
  }

  private async performDeepResearch(
    query: string,
    sources: GroundingChunkItem[],
    signal: AbortSignal,
  ): Promise<string> {
    const phillClient = this.config.getPhillClient();
    const settings = this.config.getWebSearchSettings();
    const maxSources = settings.maxDeepResearchSources ?? 3;

    const topUrls = sources
      .map((s) => s.web?.uri)
      .filter((uri): uri is string => !!uri)
      .slice(0, maxSources);

    if (topUrls.length === 0) {
      return 'No specific sources found to perform deep research.';
    }

    debugLogger.log(
      `[DeepResearch] Fetching top ${topUrls.length} sources for synthesis (max: ${maxSources})...`,
    );

    const fetchPrompt = `Analyze the following top resources to answer the query: "${query}". 
Synthesize a high-density technical brief, cross-verifying facts between the sources and noting any discrepancies.

Sources to analyze:
${topUrls.join('\n')}
`;

    try {
      const response = await phillClient.generateContent(
        { model: 'web-fetch' },
        [{ role: 'user', parts: [{ text: fetchPrompt }] }],
        signal,
      );

      const synthesis = getResponseText(response);
      return synthesis || 'Failed to synthesize deep research content.';
    } catch (error) {
      debugLogger.warn('Deep research synthesis failed:', error);
      return `Deep research synthesis encountered an error: ${getErrorMessage(error)}`;
    }
  }

  async execute(signal: AbortSignal): Promise<WebSearchToolResult> {
    try {
      const phillClient = this.config.getPhillClient();
      const settings = this.config.getWebSearchSettings();
      const toolCache = ToolCacheService.getInstance();
      
      // Attempt cache lookup
      const cachedResult = await toolCache.get(WEB_SEARCH_TOOL_NAME, this.params);
      if (cachedResult) {
        return {
          ...cachedResult,
          returnDisplay: `[Cache Hit] ${cachedResult.returnDisplay || 'Search results retrieved from local cache.'}`,
        };
      }

      let augmentedQuery = this.params.query;
      const ideContext = ideContextStore.get();
      const activeFile = ideContext?.workspaceState?.openFiles?.find(
        (f: File) => f.isActive,
      );

      if ((settings.includeIdeContext ?? true) && activeFile?.selectedText) {
        augmentedQuery = `Context: ${activeFile.selectedText}\n\nQuery: ${this.params.query}`;
        debugLogger.log(
          `Augmented search query with IDE context: "${augmentedQuery}"`,
        );
      }

      const primarySearch: HealingCandidate<any> = {
        name: 'Gemini Web Search (Google)',
        execute: async () => {
          return await phillClient.generateContent(
            { model: 'web-search' },
            [{ role: 'user', parts: [{ text: augmentedQuery }] }],
            signal,
          );
        }
      };

      const ddgFallback: HealingCandidate<any> = {
        name: 'DuckDuckGo Fallback',
        execute: async () => {
          const ddgResult = await this.performDuckDuckGoFallback(augmentedQuery);
          // Transform result to match response shape
          return {
            candidates: [{
              content: { parts: [{ text: ddgResult.llmContent }] }
            }]
          };
        }
      };

      const ragFallback: HealingCandidate<any> = {
        name: 'Local Workspace RAG Fallback',
        execute: async () => {
          const contentGenerator = this.config.getContentGenerator();
          if (!contentGenerator) throw new Error('No content generator');
          const vectorService = VectorService.getInstance(contentGenerator);
          const ragResults = await vectorService.search(augmentedQuery, 5);
          if (ragResults.length === 0) throw new Error('No local results');
          
          const ragText = ragResults
            .map(
              (r) =>
                `[Local File: ${r.metadata?.['path'] || 'Unknown'}]\n${r.content}`,
            )
            .join('\n\n');
          const res = await phillClient.generateContent(
            { model: this.config.getModel() },
            [{ role: 'user', parts: [{ text: `Based on the following local workspace context:\n\n${ragText}\n\nAnswer the query: ${augmentedQuery}` }] }],
            signal,
          );
          return res;
        }
      };

      const response = await SelfHealer.resolve(primarySearch, [ddgFallback, ragFallback]);

      const responseText = getResponseText(response);
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const sources = groundingMetadata?.groundingChunks as
        | GroundingChunkItem[]
        | undefined;
      const groundingSupports = groundingMetadata?.groundingSupports as
        | GroundingSupportItem[]
        | undefined;

      if (!responseText || !responseText.trim()) {
        return {
          llmContent: `No search results or information found for query: "${this.params.query}"`,
          returnDisplay: 'No information found.',
        };
      }

      let modifiedResponseText = responseText;
      const sourceListFormatted: string[] = [];

      if (sources && sources.length > 0) {
        sources.forEach((source: GroundingChunkItem, index: number) => {
          const title = source.web?.title || 'Untitled';
          const uri = source.web?.uri || 'No URI';
          sourceListFormatted.push(`[${index + 1}] ${title} (${uri})`);
        });

        if (groundingSupports && groundingSupports.length > 0) {
          const insertions: Array<{ index: number; marker: string }> = [];
          groundingSupports.forEach((support: GroundingSupportItem) => {
            if (support.segment && support.groundingChunkIndices) {
              const citationMarker = support.groundingChunkIndices
                .map((chunkIndex: number) => `[${chunkIndex + 1}]`)
                .join('');
              insertions.push({
                index: support.segment.endIndex,
                marker: citationMarker,
              });
            }
          });

          insertions.sort((a, b) => b.index - a.index);
          const responseChars = modifiedResponseText.split('');
          insertions.forEach((insertion) => {
            responseChars.splice(insertion.index, 0, insertion.marker);
          });
          modifiedResponseText = responseChars.join('');
        }

        if (sourceListFormatted.length > 0) {
          modifiedResponseText +=
            '\n\nSources:\n' + sourceListFormatted.join('\n');
        }
      }

      let finalLlmContent = modifiedResponseText;
      let displayMessage = `Search results for "${this.params.query}" returned.`;

      const deepResearchEnabled =
        this.params.deepResearch ?? settings.deepResearchByDefault ?? false;
      if (deepResearchEnabled && sources && sources.length > 0) {
        const researchBrief = await this.performDeepResearch(
          this.params.query,
          sources,
          signal,
        );
        finalLlmContent = `## Deep Research Synthesis\n${researchBrief}\n\n---\n## Initial Search Results\n${modifiedResponseText}`;
        displayMessage = `Deep research completed for "${this.params.query}". Synthesis generated.`;
      }

      const result: WebSearchToolResult = {
        llmContent: finalLlmContent,
        returnDisplay: displayMessage,
        sources,
      };

      // Persist to cache
      await toolCache.set(WEB_SEARCH_TOOL_NAME, this.params, result);

      // Persist to Vector Memory (Knowledge Bank)
      try {
        const contentGenerator = this.config.getContentGenerator();
        if (contentGenerator) {
          const vectorService = VectorService.getInstance(contentGenerator);
          await vectorService.addDocument(finalLlmContent, {
            type: 'web_search_result',
            query: this.params.query,
            timestamp: Date.now(),
            sourceCount: sources?.length || 0,
          });
        }
      } catch (e) {
        debugLogger.error('[WebSearch] Memory persistence failed:', e);
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = `Error during web search for query "${
        this.params.query
      }": ${getErrorMessage(error)}`;
      debugLogger.warn(errorMessage, error);
      return {
        llmContent: `Error: ${errorMessage}`,
        returnDisplay: `Error performing web search.`,
        error: {
          message: errorMessage,
          type: ToolErrorType.WEB_SEARCH_FAILED,
        },
      };
    }
  }
}

/**
 * A tool to perform advanced web searches using Google Search via the Gemini API,
 * with optional autonomous deep research.
 */
export class WebSearchTool extends BaseDeclarativeTool<
  WebSearchToolParams,
  WebSearchToolResult
> {
  static readonly Name = WEB_SEARCH_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      WebSearchTool.Name,
      'Advanced Google Search',
      'Performs an advanced web search using Google Search (via the Gemini API). Supports IDE context-awareness and optional deep research synthesis.',
      Kind.Search,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find information on the web.',
          },
          deepResearch: {
            type: 'boolean',
            description:
              'Optional: If true, performs autonomous multi-step deep research by fetching and synthesizing top results into a technical brief.',
          },
        },
        required: ['query'],
      },
      messageBus,
      true, // isOutputMarkdown
      false, // canUpdateOutput
    );
  }

  protected override validateToolParamValues(
    params: WebSearchToolParams,
  ): string | null {
    if (!params.query || params.query.trim() === '') {
      return "The 'query' parameter cannot be empty.";
    }
    return null;
  }

  protected createInvocation(
    params: WebSearchToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<WebSearchToolParams, WebSearchToolResult> {
    return new WebSearchToolInvocation(
      this.config,
      params,
      messageBus ?? this.messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
