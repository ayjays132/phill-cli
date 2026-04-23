/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaContentGenerator } from './ollamaContentGenerator.js';
import type { Config } from '../config/config.js';
import { type GenerateContentParameters } from '@google/genai';

describe('OllamaContentGenerator Advanced Routing & Reasoning', () => {
  let generator: OllamaContentGenerator;
  const mockConfig = {
    getProxy: () => undefined,
    getSkillManager: () => ({
      getSkills: () => [],
    }),
  } as unknown as Config;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Using gemma4-cloud as requested by user context
    generator = new OllamaContentGenerator('http://localhost:11434', 'gemma4-cloud', mockConfig);
  });

  it('should extract thought tags from gemma4-cloud response content', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        message: {
          role: 'assistant',
          content: '<thought>I should analyze the request.</thought>Here is your answer.',
        }
      }),
    };
    (fetch as any).mockResolvedValue(mockResponse);

    const request: GenerateContentParameters = {
      model: 'gemma4-cloud',
      contents: [{ role: 'user', parts: [{ text: 'Think deeply' }] }],
    };

    const response = await generator.generateContent(request, 'p1');
    const parts = response.candidates?.[0]?.content?.parts;

    expect(parts).toHaveLength(2);
    expect(parts?.[0]?.text).toContain('Thought');
    expect(parts?.[0]?.text).toContain('analyze the request');
    // @ts-ignore
    expect(parts?.[0]?.thought).toBe(true);
    expect(parts?.[1]?.text).toBe('Here is your answer.');
  });

  it('should handle model fallback if gemma4-cloud is missing (404)', async () => {
    // First call returns 404 Model Not Found
    const mock404 = {
      ok: false,
      status: 404,
      text: () => Promise.resolve('model "gemma4-cloud" not found'),
      clone: function() { return this; }
    };
    // Second call for /api/tags
    const mockTags = {
      ok: true,
      json: () => Promise.resolve({
        models: [{ name: 'llama3:latest' }]
      }),
    };
    // Third call for fallback attempt
    const mockSuccess = {
      ok: true,
      json: () => Promise.resolve({
        message: { role: 'assistant', content: 'Fallback success' }
      }),
    };

    (fetch as any)
      .mockResolvedValueOnce(mock404)
      .mockResolvedValueOnce(mockTags)
      .mockResolvedValueOnce(mockSuccess);

    const request: GenerateContentParameters = {
      model: 'gemma4-cloud',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    };

    const response = await generator.generateContent(request, 'p1');
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('Fallback success');
    
    // Check it queried /api/tags
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/tags'), expect.anything());
    // Check it eventually called chat with llama3
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({
        body: expect.stringContaining('"model":"llama3:latest"')
      })
    );
  });

  it('should normalize endpoints correctly (stripping /api or /v1)', () => {
    const gen = new OllamaContentGenerator('http://localhost:11434/api', 'm', mockConfig);
    // @ts-ignore - access private endpoint for test verification
    expect(gen.endpoint).toBe('http://localhost:11434');

    const genV1 = new OllamaContentGenerator('http://localhost:11434/v1/', 'm', mockConfig);
    // @ts-ignore
    expect(genV1.endpoint).toBe('http://localhost:11434');
  });

  it('should handle hardware options and semaphore concurrency', async () => {
    const gen = new OllamaContentGenerator('http://localhost:11434', 'm', mockConfig, {
      concurrency_limit: 1,
      num_ctx: 32000
    });

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ message: { content: 'ok' } }),
    };
    (fetch as any).mockResolvedValue(mockResponse);

    const request: GenerateContentParameters = { model: 'm', contents: [] };
    await gen.generateContent(request, 'p1');

    const lastCallBody = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(lastCallBody.options.num_ctx).toBe(32000);
  });
});
