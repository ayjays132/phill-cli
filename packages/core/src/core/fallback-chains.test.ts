/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhillChat, StreamEventType } from './phillChat.js';
import type { Config } from '../config/config.js';

import { ModelConfigService } from '../services/modelConfigService.js';
import { ModelAvailabilityService } from '../availability/modelAvailabilityService.js';
import { createMockMessageBus } from '../test-utils/mock-message-bus.js';
import { TerminalQuotaError } from '../utils/googleQuotaErrors.js';
import { GenerateContentResponse } from '@google/genai';
import { handleFallback } from '../fallback/handler.js';

vi.mock('../telemetry/loggers.js', () => ({
  logContentRetry: vi.fn(),
  logContentRetryFailure: vi.fn(),
  logNextSpeakerCheck: vi.fn(),
}));

vi.mock('./prompts.js', () => ({
  getCoreSystemPrompt: vi.fn().mockReturnValue('system prompt'),
  getCompressionPrompt: vi.fn().mockReturnValue('compression prompt'),
}));

vi.mock('../utils/delay.js', () => ({
  delay: vi.fn().mockResolvedValue(undefined),
  createAbortError: vi.fn().mockReturnValue(new Error('Aborted')),
}));

vi.mock('../utils/tokenCalculation.js', () => ({
  estimateTokenCountSync: vi.fn().mockReturnValue(10),
  calculateRequestTokenCount: vi.fn().mockResolvedValue(10),
}));

describe('Fallback Chains Integration', () => {
  let mockContentGenerator: any;
  let mockConfig: Config;
  let modelConfigService: ModelConfigService;
  let chat: PhillChat;

  const collectResponseText = async (stream: AsyncGenerator<any>) => {
    let text = '';
    for await (const event of stream) {
      if (event.type === StreamEventType.CHUNK) {
        text += event.value.text?.() || '';
      }
    }
    return text;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockContentGenerator = {
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
      countTokens: vi.fn().mockResolvedValue({ totalTokens: 10 }),
    };

    const availabilityService = new ModelAvailabilityService();
    modelConfigService = new ModelConfigService({
      modelIdResolutions: {},
      modelChains: {
        'default': [
          {
            model: 'gemini-1.5-pro-latest',
            actions: {},
            stateTransitions: { terminal: 'cool_off' },
          },
          {
            model: 'gemini-1.5-pro',
            actions: {},
            stateTransitions: { terminal: 'cool_off' },
          },
          {
            model: 'gemini-1.5-flash',
            isLastResort: true,
            actions: {},
            stateTransitions: {},
          },
        ]
      },
    });

    let currentModel = 'gemini-1.5-pro-latest';
    let currentActiveModel = 'gemini-1.5-pro-latest';

    mockConfig = {
      getSessionId: () => 'test-session-id',
      getTelemetryLogPromptsEnabled: () => false,
      getUsageStatisticsEnabled: () => false,
      getDebugMode: () => false,
      getPreviewFeatures: () => false,
      getHasAccessToPreviewModel: () => true,
      getModel: () => currentModel,
      getActiveModel: () => currentActiveModel,
      setModel: vi.fn().mockImplementation((m) => {
        currentModel = m;
        currentActiveModel = m;
      }),
      setActiveModel: vi.fn().mockImplementation((m) => {
        currentActiveModel = m;
      }),
      activateFallbackMode: vi.fn().mockImplementation((m) => {
        currentActiveModel = m;
      }),
      getContentGenerator: () => mockContentGenerator,
      getModelAvailabilityService: () => availabilityService,
      modelConfigService: modelConfigService,
      getProjectRoot: () => '/test/project/root',
      getTargetDir: () => '/test/project/root',
      getModelConfigService: () => modelConfigService,
      getContentGeneratorConfig: () => ({ authType: 'phill-api-key' }),
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
      storage: {
        getProjectTempDir: () => '/tmp',
        getProjectTempPlansDir: () => '/tmp/plans',
        getProjectAgentsDir: () => '/tmp/agents',
      },
      getToolRegistry: () => ({
        getTool: () => undefined,
        getFunctionDeclarations: () => [],
      }),
      isInteractive: () => false,
      getEnableHooks: () => false,
      getHookSystem: () => undefined,
      getRetryFetchErrors: () => false,
      getUserTier: () => undefined,
      getEnableShellOutputEfficiency: () => true,
      getSkillManager: () => ({
        getSkills: () => [],
      }),
      getAgentRegistry: () => ({
        getDirectoryContext: () => '',
        getAllDefinitions: () => [],
      }),
      getApprovalMode: () => 'default',
      getFallbackModelHandler: () => undefined,
      getVoice: () => ({ enabled: false }),
      getBiologicalDrives: () => ({
        dopamine_level: 0.5,
        boredom_level: 0.5,
        prime_directive: 'test',
      }),
      getAgentIdentityService: () => ({
        getIdentity: () => ({}),
      }),
      getMessageBus: () => createMockMessageBus(),
    } as unknown as Config;

    chat = new PhillChat(mockConfig);
  });

  const mockSuccessfulStream = (text: string) => {
    return (async function* () {
      yield {
        candidates: [{
          content: { role: 'model', parts: [{ text }] },
          finishReason: 'STOP'
        }],
        text: () => text
      } as unknown as GenerateContentResponse;
    })();
  };

  it('should fallback from gemini-1.5-pro-latest to gemini-1.5-pro on terminal error', async () => {
    // First call fails with terminal quota error
    mockContentGenerator.generateContentStream.mockRejectedValueOnce(
      new TerminalQuotaError('Quota exceeded', { status: 429 } as any)
    );

    // Second call (fallback) succeeds
    mockContentGenerator.generateContentStream.mockResolvedValueOnce(
      mockSuccessfulStream('Fallback response')
    );

    const stream = await chat.sendMessageStream(
      'gemini-1.5-pro-latest',
      'Hello',
      'test-prompt',
      new AbortController().signal,
    );
    const text = await collectResponseText(stream);

    expect(text).toBe('Fallback response');
    expect(mockConfig.activateFallbackMode).toHaveBeenCalledWith(
      'gemini-1.5-pro',
    );
    expect(mockContentGenerator.generateContentStream).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        model: 'gemini-1.5-pro',
      }),
      expect.any(String),
    );
  }, 30000);

  it('should fallback multiple times in a chain if errors persist', async () => {
    const quotaError = new TerminalQuotaError('Quota exceeded', {
      status: 429,
    } as any);

    await handleFallback(
      mockConfig,
      'gemini-1.5-pro-latest',
      'phill-api-key',
      quotaError,
    );
    expect(mockConfig.activateFallbackMode).toHaveBeenCalledWith(
      'gemini-1.5-pro',
    );

    await handleFallback(
      mockConfig,
      'gemini-1.5-pro',
      'phill-api-key',
      quotaError,
    );

    expect(mockConfig.activateFallbackMode).toHaveBeenNthCalledWith(
      2,
      'gemini-1.5-flash',
    );
  }, 30000);
});
