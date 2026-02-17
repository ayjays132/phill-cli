/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolResult,
} from './tools.js';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { ToolErrorType } from './tool-error.js';
import { VectorService } from '../services/vectorService.js';
import { createContentGenerator } from '../core/contentGenerator.js';

let sharedVectorService: VectorService | null = null;

async function getVectorService(config: Config): Promise<VectorService> {
    if (!sharedVectorService) {
        const contentGenerator = await createContentGenerator(
            await config.getContentGeneratorConfig(),
            config
        );
        sharedVectorService = new VectorService(contentGenerator);
    }
    return sharedVectorService;
}

// --- Recall Memory Tool ---

export interface RecallMemoryParams {
  query: string;
  limit?: number;
}

class RecallMemoryToolInvocation extends BaseToolInvocation<
  RecallMemoryParams,
  ToolResult
> {
  constructor(
    private config: Config,
    params: RecallMemoryParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Recalling memories about "${this.params.query}"`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
        const vectorService = await getVectorService(this.config);
        const results = await vectorService.search(this.params.query, this.params.limit || 5);
        
        if (results.length === 0) {
            return {
                llmContent: `No relevant memories found for "${this.params.query}".`,
                returnDisplay: `No memories found.`,
            };
        }

        const context = results.map(r => `- ${r.content} (Created: ${new Date(r.createdAt).toLocaleDateString()})`).join('\n');

        return {
            llmContent: `Found relevant memories:\n${context}`,
            returnDisplay: `Recalled ${results.length} memories.`,
        };

    } catch (e: any) {
        return {
            llmContent: `Failed to recall memory: ${e.message}`,
            returnDisplay: `Failed to recall memory.`,
            error: { message: e.message, type: ToolErrorType.EXECUTION_FAILED },
        };
    }
  }
}

export class MemoryRecallTool extends BaseDeclarativeTool<
  RecallMemoryParams,
  ToolResult
> {
  static readonly Name = 'recall_memory';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      MemoryRecallTool.Name,
      'RecallMemory',
      'Search your long-term memory for relevant facts, events, or preferences.',
      Kind.Think,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The query to search for (e.g., "User preferences for UI", "Discussion about database schema").',
          },
          limit: {
            type: 'number',
            description: 'Max number of memories to return (default: 5).',
          },
        },
        required: ['query'],
      },
      messageBus,
    );
  }


  protected createInvocation(
    params: RecallMemoryParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<RecallMemoryParams, ToolResult> {
    return new RecallMemoryToolInvocation(
      this.config,
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}

// --- Ingest Memory Tool ---

export interface IngestMemoryParams {
  content: string;
}

class IngestMemoryToolInvocation extends BaseToolInvocation<
  IngestMemoryParams,
  ToolResult
> {
  constructor(
    private config: Config,
    params: IngestMemoryParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Ingesting memory: "${this.params.content.substring(0, 30)}..."`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
        const vectorService = await getVectorService(this.config);
        const id = await vectorService.addDocument(this.params.content);
        
        return {
            llmContent: `Memory ingested successfully. ID: ${id}`,
            returnDisplay: `Memory ingested.`,
        };

    } catch (e: any) {
        return {
            llmContent: `Failed to ingest memory: ${e.message}`,
            returnDisplay: `Failed to ingest memory.`,
            error: { message: e.message, type: ToolErrorType.EXECUTION_FAILED },
        };
    }
  }
}

export class MemoryIngestTool extends BaseDeclarativeTool<
  IngestMemoryParams,
  ToolResult
> {
  static readonly Name = 'ingest_memory';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      MemoryIngestTool.Name,
      'IngestMemory',
      'Manually add a specific text to the vector memory. Use "save_memory" for general facts instead.',
      Kind.Think,
      {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The text content to ingest.',
          },
        },
        required: ['content'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: IngestMemoryParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<IngestMemoryParams, ToolResult> {
    return new IngestMemoryToolInvocation(
      this.config,
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
