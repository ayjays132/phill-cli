/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  FinishReason,
  GenerateContentResponse,
  type CountTokensParameters,
  type EmbedContentParameters,
  type EmbedContentResponse,
  type GenerateContentParameters,
  type Content,
} from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import { toContents } from '../code_assist/converter.js';
import type { Config } from '../config/config.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AnthropicContentGenerator implements ContentGenerator {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey?: string;

  constructor(
    endpoint: string,
    model: string,
    apiKey: string | undefined,
    _config: Config,
  ) {
    this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    this.model = model;
    this.apiKey = apiKey;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const { system, messages } = this.toAnthropicMessages(request);
    const model = this.mapModelName(request.model || this.model);
    const response = await fetch(`${this.endpoint}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        system,
        messages,
        max_tokens: request.config?.maxOutputTokens ?? 4096,
        temperature: request.config?.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text)
      .join('');

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: { role: 'model', parts: [{ text }] },
        finishReason: this.mapFinishReason(data.stop_reason),
        index: 0,
      },
    ];
    if (data.usage) {
      const prompt = data.usage.input_tokens ?? 0;
      const completion = data.usage.output_tokens ?? 0;
      result.usageMetadata = {
        promptTokenCount: prompt,
        candidatesTokenCount: completion,
        totalTokenCount: prompt + completion,
      };
    }
    return result;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const { system, messages } = this.toAnthropicMessages(request);
    const model = this.mapModelName(request.model || this.model);
    const response = await fetch(`${this.endpoint}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        system,
        messages,
        stream: true,
        max_tokens: request.config?.maxOutputTokens ?? 4096,
        temperature: request.config?.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.statusText} - ${errorText}`);
    }
    if (!response.body) {
      throw new Error('No response body from Anthropic API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    return (async function* () {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventName = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventName = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith('data: ')) {
            continue;
          }
          const payload = line.slice(6).trim();
          if (!payload) continue;

          try {
            const parsed = JSON.parse(payload) as {
              delta?: { text?: string };
              type?: string;
            };
            const deltaText = parsed.delta?.text;
            const isStop =
              eventName === 'message_stop' || parsed.type === 'message_stop';
            if (!deltaText && !isStop) {
              continue;
            }

            const result = new GenerateContentResponse();
            result.candidates = [
              {
                content: { role: 'model', parts: [{ text: deltaText ?? '' }] },
                finishReason: isStop ? FinishReason.STOP : undefined,
                index: 0,
              },
            ];
            yield result;
          } catch {
            continue;
          }
        }
      }
    })();
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    const approximateTokens = Math.ceil(JSON.stringify(request).length / 4);
    return { totalTokens: approximateTokens };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    return { embeddings: [{ values: [] }] };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }
    return headers;
  }

  private mapModelName(model: string): string {
    // Futuristic models
    if (model.includes('claude-4')) {
      return model;
    }

    // Utility model translations (Gemini -> Claude)
    if (model === 'gemini-2.5-flash-lite' || model === 'gemini-2.5-flash' || model === 'gemini-2.0-flash-lite' || model === 'gemini-1.5-flash') {
      return 'claude-3-5-haiku-latest';
    }

    if (model === 'gemini-2.5-pro' || model === 'gemini-2.0-pro' || model === 'gemini-1.5-pro' || model === 'gemini-3-pro') {
      return 'claude-3-5-sonnet-latest';
    }

    return model;
  }

  private toAnthropicMessages(request: GenerateContentParameters): {
    system?: string;
    messages: AnthropicMessage[];
  } {
    let system: string | undefined;
    if (request.config?.systemInstruction) {
      const sysInst = request.config.systemInstruction as Content;
      const systemText = sysInst.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join('\n');
      if (systemText) {
        system = systemText;
      }
    }

    const messages: AnthropicMessage[] = [];
    const contents = toContents(request.contents);
    for (const content of contents) {
      const text = content.parts?.map((p) => p.text).filter(Boolean).join('\n');
      if (!text) continue;
      messages.push({
        role: content.role === 'user' ? 'user' : 'assistant',
        content: text,
      });
    }
    return { system, messages };
  }

  private mapFinishReason(reason: string | null | undefined): FinishReason {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return FinishReason.STOP;
      case 'max_tokens':
        return FinishReason.MAX_TOKENS;
      default:
        return FinishReason.OTHER;
    }
  }
}
