/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleContentGenerator } from './openAiCompatibleContentGenerator.js';

const mockConfig = {
  getSkillManager: () => ({
    getSkills: () => [],
  }),
  isBrowserLaunchSuppressed: () => true,
} as any;

describe('OpenAICompatibleContentGenerator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('maps chat-completions tool calls into functionCall parts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    type: 'function',
                    function: {
                      name: 'list_directory',
                      arguments: '{"dir_path":"E:\\\\phill-cli-0.0.1"}',
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        }),
      }),
    );

    const generator = new OpenAICompatibleContentGenerator(
      'https://api.openai.com/v1',
      'gpt-4o',
      'test-key',
      undefined,
      mockConfig,
    );

    const response = await generator.generateContent(
      {
        model: 'gpt-4o',
        contents: [{ role: 'user', parts: [{ text: 'List files' }] }],
        config: {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'list_directory',
                  parameters: {
                    type: 'object',
                    properties: {
                      dir_path: { type: 'string' },
                    },
                  },
                },
              ],
            },
          ],
        },
      } as any,
      'prompt-id',
    );

    expect(
      response.candidates?.[0]?.content?.parts?.[0]?.functionCall?.name,
    ).toBe('list_directory');
    expect(
      response.candidates?.[0]?.content?.parts?.[0]?.functionCall?.args,
    ).toEqual({
      dir_path: 'E:\\phill-cli-0.0.1',
    });
  });

  it('streams chat-completions tool call deltas as functionCall parts', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"list_directory","arguments":"{\\"dir_path\\":\\"E:\\\\\\\\phill-cli-0.0.1\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n',
          ),
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }),
    );

    const generator = new OpenAICompatibleContentGenerator(
      'https://api.openai.com/v1',
      'gpt-4o',
      'test-key',
      undefined,
      mockConfig,
    );

    const responseStream = await generator.generateContentStream(
      {
        model: 'gpt-4o',
        contents: [{ role: 'user', parts: [{ text: 'List files' }] }],
        config: {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'list_directory',
                  parameters: {
                    type: 'object',
                    properties: {
                      dir_path: { type: 'string' },
                    },
                  },
                },
              ],
            },
          ],
        },
      } as any,
      'prompt-id',
    );

    const chunks = [];
    for await (const chunk of responseStream) {
      chunks.push(chunk);
    }

    expect(
      chunks.at(-1)?.candidates?.[0]?.content?.parts?.[0]?.functionCall?.name,
    ).toBe('list_directory');
    expect(
      chunks.at(-1)?.candidates?.[0]?.content?.parts?.[0]?.functionCall?.args,
    ).toEqual({
      dir_path: 'E:\\phill-cli-0.0.1',
    });
  });

  it('avoids the responses api when tools are present', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'done',
              },
              finish_reason: 'stop',
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OPENAI_USE_RESPONSES_API', 'true');

    const generator = new OpenAICompatibleContentGenerator(
      'https://api.openai.com/v1',
      'gpt-5',
      'test-key',
      undefined,
      mockConfig,
    );

    await generator.generateContent(
      {
        model: 'gpt-5',
        contents: [{ role: 'user', parts: [{ text: 'Use a tool' }] }],
        config: {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'list_directory',
                },
              ],
            },
          ],
        },
      } as any,
      'prompt-id',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/chat/completions');
  });

  it('supports gpt-5.5 tool calls through chat completions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'search_web',
                    arguments: '{"query":"latest model status"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const generator = new OpenAICompatibleContentGenerator(
      'https://api.openai.com/v1',
      'gpt-5.5',
      'test-key',
      undefined,
      mockConfig,
    );

    const response = await generator.generateContent(
      {
        model: 'gpt-5.5',
        contents: [{ role: 'user', parts: [{ text: 'Search the web' }] }],
        config: {
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'search_web',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                    },
                  },
                },
              ],
            },
          ],
        },
      } as any,
      'prompt-id',
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/chat/completions');
    expect(
      response.candidates?.[0]?.content?.parts?.[0]?.functionCall,
    ).toEqual({
      name: 'search_web',
      args: { query: 'latest model status' },
    });
  });

  it('maps chatgpt/latest and chatgpt-prefixed GPT-5.5 model names', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'ready',
            },
            finish_reason: 'stop',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const generator = new OpenAICompatibleContentGenerator(
      'https://api.openai.com/v1',
      'chatgpt/latest',
      'test-key',
      undefined,
      mockConfig,
    );

    await generator.generateContent(
      {
        model: 'chatgpt/gpt-5.5',
        contents: [{ role: 'user', parts: [{ text: 'Say ready' }] }],
      } as any,
      'prompt-id',
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.model).toBe('gpt-5.5');
  });
});
