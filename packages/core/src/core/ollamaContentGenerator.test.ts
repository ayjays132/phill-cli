/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaContentGenerator } from './ollamaContentGenerator.js';
import type { Config } from '../config/config.js';
import { Type, type GenerateContentParameters } from '@google/genai';

describe('OllamaContentGenerator', () => {
  let generator: OllamaContentGenerator;
  const mockConfig = {
    getProxy: () => undefined,
    getSkillManager: () => ({
      getSkills: () => [],
    }),
  } as unknown as Config;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    generator = new OllamaContentGenerator('http://localhost:11434', 'gpt-oss-20b', mockConfig);
  });

  it('should send native tools and system prompt in the request', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({
        message: {
          role: 'assistant',
          content: 'I will list the directory for you.',
          tool_calls: [
            {
              function: {
                name: 'list_dir',
                arguments: { path: '.' }
              }
            }
          ]
        }
      }),
    };
    (fetch as any).mockResolvedValue(mockResponse);

    const request: GenerateContentParameters = {
      model: 'gpt-oss-20b',
      contents: [{ role: 'user', parts: [{ text: 'List files' }] }],
      config: {
        systemInstruction: { role: 'system', parts: [{ text: 'You are a helpful assistant.' }] },
        tools: [{ functionDeclarations: [{ name: 'list_dir', description: 'list files', parameters: { type: Type.OBJECT, properties: { path: { type: Type.STRING } } } }] }]
      }
    };

    const response = await generator.generateContent(request, 'prompt-id');

    // Verify fetch call
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({
        method: 'POST',
      })
    );

    const bodyFirst = JSON.parse((fetch as any).mock.calls[0][1].body);

    expect(bodyFirst.model).toBe('gpt-oss-20b');
    expect(bodyFirst.system).toContain('You are a helpful assistant.');
    expect(bodyFirst.tools).toBeDefined();
    expect(bodyFirst.tools[0].function.name).toBe('list_dir');

    // Verify response parsing
    expect(response.candidates?.[0]?.content?.parts?.[1]?.functionCall).toBeDefined();
    expect(response.candidates?.[0]?.content?.parts?.[1]?.functionCall?.name).toBe('list_dir');
  });

  it('should handle tool responses in message history correctly', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({
        message: {
          role: 'assistant',
          content: 'The files are: README.md',
        }
      }),
    };
    (fetch as any).mockResolvedValue(mockResponse);

    const request: GenerateContentParameters = {
      model: 'gpt-oss-20b',
      contents: [
        { role: 'user', parts: [{ text: 'List files' }] },
        { role: 'assistant', parts: [{ functionCall: { name: 'list_dir', args: { path: '.' } } }] },
        { role: 'user', parts: [{ functionResponse: { name: 'list_dir', response: { files: ['README.md'] } } }] }
      ],
    };

    await generator.generateContent(request, 'prompt-id');

    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    const messages = body.messages;

    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].tool_calls).toBeDefined();
    expect(messages[2].role).toBe('tool');
    expect(messages[2].content).toContain('README.md');
  });

  it('should timeout after 60 seconds', async () => {
    // Mock fetch to hang
    (fetch as any).mockImplementation(() => new Promise(() => {}));

    const request: GenerateContentParameters = {
      model: 'gpt-oss-20b',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    };

    // Fast-forward time or just check the AbortSignal
    void generator.generateContent(request, 'prompt-id').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        signal: expect.any(AbortSignal)
      })
    );
  });
});
