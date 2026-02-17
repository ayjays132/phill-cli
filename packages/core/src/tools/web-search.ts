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
import { Config } from '../config/config.js';
import { getResponseText } from '../utils/partUtils.js';
import { ideContextStore } from '../ide/ideContext.js';
import type { File } from '../ide/types.js';

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
    const deepResearchEnabled = this.params.deepResearch ?? settings.deepResearchByDefault ?? false;
    const mode = deepResearchEnabled ? ' (Deep Research)' : '';
    return `Searching the web for${mode}: "${this.params.query}"`;
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

    debugLogger.log(`[DeepResearch] Fetching top ${topUrls.length} sources for synthesis (max: ${maxSources})...`);

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
      
      let augmentedQuery = this.params.query;
      const ideContext = ideContextStore.get();
      const activeFile = ideContext?.workspaceState?.openFiles?.find((f: File) => f.isActive);

      if ((settings.includeIdeContext ?? true) && activeFile?.selectedText) {
        augmentedQuery = `Context: ${activeFile.selectedText}\n\nQuery: ${this.params.query}`;
        debugLogger.log(`Augmented search query with IDE context: "${augmentedQuery}"`);
      }

      const response = await phillClient.generateContent(
        { model: 'web-search' },
        [{ role: 'user', parts: [{ text: augmentedQuery }] }],
        signal,
      );

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

          // Sort insertions by index in descending order to avoid shifting subsequent indices
          insertions.sort((a, b) => b.index - a.index);

          const encoder = new TextEncoder();
          const responseBytes = encoder.encode(modifiedResponseText);
          const parts: Uint8Array[] = [];
          let lastIndex = responseBytes.length;
          for (const ins of insertions) {
            const pos = Math.min(ins.index, lastIndex);
            parts.unshift(responseBytes.subarray(pos, lastIndex));
            parts.unshift(encoder.encode(ins.marker));
            lastIndex = pos;
          }
          parts.unshift(responseBytes.subarray(0, lastIndex));

          const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
          const finalBytes = new Uint8Array(totalLength);
          let offset = 0;
          for (const part of parts) {
            finalBytes.set(part, offset);
            offset += part.length;
          }
          modifiedResponseText = new TextDecoder().decode(finalBytes);
        }

        if (sourceListFormatted.length > 0) {
          modifiedResponseText +=
            '\n\nSources:\n' + sourceListFormatted.join('\n');
        }
      }

      let finalLlmContent = modifiedResponseText;
      let displayMessage = `Search results for "${this.params.query}" returned.`;

      const deepResearchEnabled = this.params.deepResearch ?? settings.deepResearchByDefault ?? false;
      if (deepResearchEnabled && sources && sources.length > 0) {
        const researchBrief = await this.performDeepResearch(this.params.query, sources, signal);
        finalLlmContent = `## Deep Research Synthesis\n${researchBrief}\n\n---\n## Initial Search Results\n${modifiedResponseText}`;
        displayMessage = `Deep research completed for "${this.params.query}". Synthesis generated.`;
      }

      return {
        llmContent: finalLlmContent,
        returnDisplay: displayMessage,
        sources,
      };
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
            description: 'Optional: If true, performs autonomous multi-step deep research by fetching and synthesizing top results into a technical brief.',
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