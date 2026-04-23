/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamEventType } from './phillChat.js';
import { OllamaContentGenerator } from './ollamaContentGenerator.js';
import { PhillChat } from './phillChat.js';
import type { Config } from '../config/config.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { WEB_SEARCH_TOOL_NAME } from '../tools/tool-names.js';
import { WebSearchTool } from '../tools/web-search.js';
import { ToolCacheService } from '../services/toolCacheService.js';
import { createMockMessageBus } from '../test-utils/mock-message-bus.js';
import { AuthType } from './contentGenerator.js';

const OLLAMA_MODEL = 'llama3.1';

describe('Ollama Internet Tools Integration', () => {
  let mockConfig: any;
  let toolRegistry: ToolRegistry;
  const messageBus = createMockMessageBus();

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    await ToolCacheService.getInstance().clear();

    // Mock Config
    mockConfig = {
      getModel: () => 'llama3.1',
      getProxy: () => undefined,
      getWebSearchSettings: () => ({ deepResearchByDefault: false, enabled: true }),
      getContentGenerator: vi.fn(),
      getSkillManager: () => ({ getSkills: () => [] }),
      getModelAvailabilityService: () => ({
        resetTurn: vi.fn(),
        selectFirstAvailable: (models: string[]) => ({ selectedModel: models[0], skipped: [] }),
        consumeStickyAttempt: vi.fn(),
        markHealthy: vi.fn(),
        markUnhealthy: vi.fn(),
        markTerminal: vi.fn(),
      }),
      setActiveModel: vi.fn(),
      getActiveModel: () => 'llama3.1',
      getMcpClientManager: () => undefined,
      getMcpServers: () => ({}),
      getPreviewFeatures: () => ({}),
      getHasAccessToPreviewModel: () => true,
      getSessionId: () => 'test-session',
      getProjectRoot: () => 'E:/phill-cli-0.0.1',
      getExcludeTools: () => new Set([]),
      getIncludeTools: () => new Set([WEB_SEARCH_TOOL_NAME]),
      getContentGeneratorConfig: () => ({
        authType: AuthType.OLLAMA,
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
      }),
      getRetryFetchErrors: () => false,
      getHookSystem: () => undefined,
      getEnableHooks: () => false,
      getTelemetryLogPromptsEnabled: () => false,
      getUsageStatisticsEnabled: () => false,
      getDebugMode: () => false,
      isInteractive: () => false,
      getBaseLlmClient: () => ({}),
      getExperiments: () => ({}),
      getFolderTrust: () => true,
      isTrustedFolder: () => true,
      getAcknowledgedAgentsService: () => ({
        isAcknowledged: vi.fn().mockResolvedValue(true),
      }),
      getGlobalMemory: () => '',
      isJitContextEnabled: () => false,
      getUserMemory: () => '',
      getSkipNextSpeakerCheck: () => true,
      getMaxSessionTurns: () => 10,
      resetTurn: vi.fn(),
      getQuotaErrorOccurred: () => false,
      setQuotaErrorOccurred: vi.fn(),
      getUserTier: () => undefined,
      getEnableShellOutputEfficiency: () => true,
      getAgentRegistry: () => ({
        getDirectoryContext: () => '',
        getAllDefinitions: () => [],
      }),
      getApprovalMode: () => 'default',
      getVoice: () => ({ enabled: false }),
      getBiologicalDrives: () => ({
        dopamine_level: 0.5,
        boredom_level: 0.5,
        prime_directive: 'test',
      }),
      getAgentIdentityService: () => ({
        getIdentity: () => ({}),
      }),
      getMessageBus: () => messageBus,
      getToolSettings: () => ({ [WEB_SEARCH_TOOL_NAME]: { enabled: true } }),
      modelConfigService: {
        getResolvedConfig: vi.fn().mockReturnValue({
          model: 'llama3.1',
          generateContentConfig: {},
        }),
        resolveChain: vi.fn().mockReturnValue(undefined),
      },
      storage: {
        getProjectTempDir: () => '/tmp',
        getProjectTempPlansDir: () => '/tmp/plans',
        getProjectAgentsDir: () => '/tmp/agents',
      },
      getToolRegistry: () => toolRegistry,
    };

    toolRegistry = new ToolRegistry(mockConfig as Config, messageBus);
    toolRegistry.registerTool(new WebSearchTool(mockConfig as Config, messageBus));
  });

  const setupMocks = (searchQuery: string, searchResult: string) => {
    const ollamaSearchCallResponse = {
      model: OLLAMA_MODEL,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: 'I need to search.',
        tool_calls: [
          {
            function: {
              name: WEB_SEARCH_TOOL_NAME,
              arguments: { query: searchQuery },
            },
          },
        ],
      },
      done: true,
    };

    const ollamaFinalResponse = {
      model: OLLAMA_MODEL,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: `I found that ${searchResult}`,
      },
      done: true,
    };

    const groundingResponse = {
      candidates: [{
        content: { parts: [{ text: searchResult }] },
        groundingMetadata: {
          groundingChunks: [{ web: { title: 'Source', uri: 'https://source.com' } }]
        }
      }]
    };

    const mockPhillClient = {
      generateContent: vi.fn().mockImplementation(async (target: any) => {
        if (target.model === 'web-search') {
          return groundingResponse;
        }
        // Fallback for other calls in tool execution
        return { candidates: [{ content: { parts: [{ text: 'Default tool model response' }] } }] };
      })
    };
    mockConfig.getPhillClient = () => mockPhillClient;

    (fetch as any).mockImplementation((url: string, opts: any) => {
      // Handle embeddings
      if (url.includes('/api/embed') || url.includes('/api/embeddings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ embeddings: [new Array(768).fill(0)] })
        });
      }

      // Handle chat calls
      if (url.includes('/api/chat')) {
        const body = JSON.parse(opts.body);
        const hasToolResult = body.messages.some((m: any) => m.role === 'tool');
        const toolPayload = hasToolResult
          ? JSON.parse(body.messages.find((m: any) => m.role === 'tool')?.content || '{}')
          : undefined;
        const responseObj = hasToolResult
          ? {
              ...ollamaFinalResponse,
              message: {
                ...ollamaFinalResponse.message,
                content: `I found that ${toolPayload?.llmContent || searchResult}`,
              },
            }
          : ollamaSearchCallResponse;
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(JSON.stringify(responseObj) + '\n'));
            controller.close();
          }
        });

        return Promise.resolve({
          ok: true,
          body: stream,
          json: () => Promise.resolve(responseObj)
        });
      }

      return Promise.resolve({ ok: false, status: 404 });
    });
  };

  it('phill-chat agentic loop with ollama tools', async () => {
    setupMocks('gravity value', 'gravity is 9.81 m/s^2');

    const ollamaGenerator = new OllamaContentGenerator('http://localhost:11434', 'llama3', mockConfig as Config);
    mockConfig.getContentGenerator = () => ollamaGenerator;

    const chat = new PhillChat(mockConfig as Config, '', [
      { functionDeclarations: toolRegistry.getFunctionDeclarations() },
    ]);

    const response = await chat.sendMessageStream(
      { model: 'llama3.1' },
      [{ text: 'What is the value of gravity?' }],
      'test-prompt',
      new AbortController().signal
    );
    
    let finalOutput = '';
    for await (const event of response) {
      if (event.type === StreamEventType.CHUNK) {
        finalOutput += event.value.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    }

    expect(finalOutput).toContain('9.81');
    // Verify Ollama was called (at least once for tool call, once for final)
    const chatCalls = (fetch as any).mock.calls.filter((c: any) => c[0].includes('/api/chat'));
    expect(chatCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('phill-chat with internet tools and tool cache', async () => {
    const searchQuery = 'cached gravity';
    const cachedText = 'Cached: Gravity is constant.';
    
    // Seed cache
    const toolCache = ToolCacheService.getInstance();
    await toolCache.set(WEB_SEARCH_TOOL_NAME, { query: searchQuery }, {
      llmContent: cachedText,
      returnDisplay: 'From cache'
    });

    setupMocks(searchQuery, 'This should not be used if cache hits');

    const tool = new WebSearchTool(mockConfig as Config, messageBus);
    const invocation = tool.build({ query: searchQuery });
    const result = await invocation.execute(new AbortController().signal);

    // Agent should produce final answer based on cached content
    expect(result.llmContent).toContain('Gravity');
    
    // Key verify: phillClient.generateContent({model: 'web-search'}) should NOT have been called
    // because cache hit happened in WebSearchTool.execute
    const phillClient = mockConfig.getPhillClient();
    const searchCalls = (phillClient.generateContent as any).mock.calls.filter((c: any) => c[0].model === 'web-search');
    expect(searchCalls.length).toBe(0);
  });
});
