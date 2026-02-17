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
import { runLocalTextGenerationWithTransformers } from './localTransformersFallback.js';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

interface OpenAIChatResponse {
  choices: Array<{
    message?: { content?: string };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenAIStreamChunk {
  choices: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
}

export class OpenAICompatibleContentGenerator implements ContentGenerator {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey?: string;
  private readonly apiKeyProvider?: () => Promise<string | undefined>;

  constructor(
    endpoint: string,
    model: string,
    apiKey: string | undefined,
    apiKeyProvider: (() => Promise<string | undefined>) | undefined,
    _config: Config,
  ) {
    this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    this.model = model;
    this.apiKey = apiKey;
    this.apiKeyProvider = apiKeyProvider;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const model = this.mapModelName(request.model || this.model);
    const messages = this.toMessages(request);
    const chatRequest: OpenAIChatRequest = {
      model,
      messages,
      stream: false,
      max_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
    };

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (
        this.isModelUnavailable(response.status, errorText) &&
        !this.endpoint.includes('groq.com') &&
        !this.endpoint.includes('openai.com') &&
        !this.endpoint.includes('anthropic.com')
      ) {
        return this.generateWithLocalTransformers(messages, model, request);
      }
      throw new Error(
        `OpenAI-compatible API error: ${response.statusText} - ${errorText}`,
      );
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const text = data.choices[0]?.message?.content ?? '';

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: { role: 'model', parts: [{ text }] },
        finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
        index: 0,
      },
    ];
    if (data.usage) {
      result.usageMetadata = {
        promptTokenCount: data.usage.prompt_tokens,
        candidatesTokenCount: data.usage.completion_tokens,
        totalTokenCount: data.usage.total_tokens,
      };
    }
    return result;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const model = this.mapModelName(request.model || this.model);
    const messages = this.toMessages(request);
    const chatRequest: OpenAIChatRequest = {
      model,
      messages,
      stream: true,
      max_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
    };

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (
        this.isModelUnavailable(response.status, errorText) &&
        !this.endpoint.includes('groq.com') &&
        !this.endpoint.includes('openai.com') &&
        !this.endpoint.includes('anthropic.com')
      ) {
        const oneShot = await this.generateWithLocalTransformers(
          messages,
          model,
          request,
        );
        return (async function* () {
          yield oneShot;
        })();
      }
      throw new Error(
        `OpenAI-compatible API error: ${response.statusText} - ${errorText}`,
      );
    }
    if (!response.body) {
      throw new Error('No response body from OpenAI-compatible API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const self = this;

    return (async function* () {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const chunk = JSON.parse(payload) as OpenAIStreamChunk;
            const deltaText = chunk.choices[0]?.delta?.content;
            const finish = chunk.choices[0]?.finish_reason;
            if (!deltaText && !finish) continue;

            const result = new GenerateContentResponse();
            result.candidates = [
              {
                content: { role: 'model', parts: [{ text: deltaText ?? '' }] },
                finishReason: self.mapFinishReason(finish),
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
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const contents = toContents(request.contents);
    const text = contents[0]?.parts?.[0]?.text || '';
    const model = this.mapModelName(request.model || this.model);
    const response = await fetch(`${this.endpoint}/embeddings`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI-compatible embeddings error: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    return {
      embeddings: [{ values: data.data?.[0]?.embedding ?? [] }],
    };
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = (await this.apiKeyProvider?.()) || this.apiKey;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private toMessages(request: GenerateContentParameters): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];
    if (request.config?.systemInstruction) {
      const sysInst = request.config.systemInstruction as Content;
      const systemText = sysInst.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join('\n');
      if (systemText) {
        messages.push({ role: 'system', content: systemText });
      }
    }
    const contents = toContents(request.contents);
    for (const content of contents) {
      const text = content.parts?.map((p) => p.text).filter(Boolean).join('\n');
      if (!text) continue;
      messages.push({
        role: content.role === 'user' ? 'user' : 'assistant',
        content: text,
      });
    }
    return messages;
  }

  private mapFinishReason(reason: string | null | undefined): FinishReason {
    if (!reason) {
      return FinishReason.FINISH_REASON_UNSPECIFIED;
    }
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.MAX_TOKENS;
      case 'content_filter':
        return FinishReason.SAFETY;
      default:
        return FinishReason.OTHER;
    }
  }

  private mapModelName(model: string): string {
    // If it's a known futuristic/hallucinated model our user likes to add,
    // we preserve it for the API call (it will likely fail, but that's what's requested).
    if (model.includes('gpt-oss') || model.includes('gpt-5') || model.includes('claude-4')) {
      // Clean prefix if it exists
      if (model.includes('/') && (model.startsWith('groq/') || model.startsWith('openai/') || model.startsWith('anthropic/') || model.startsWith('huggingface/'))) {
        return model.split('/').pop()!;
      }
      return model;
    }

    // Map internal Gemini utility aliases to provider-appropriate models.
    const isGroq = this.endpoint.includes('groq.com');
    const isAnthropic = this.endpoint.includes('anthropic.com');

    // Utility model translations
    if (model === 'gemini-2.5-flash-lite' || model === 'gemini-2.5-flash' || model === 'gemini-2.0-flash-lite' || model === 'gemini-1.5-flash') {
      if (isGroq) return 'llama-3.1-8b-instant';
      if (isAnthropic) return 'claude-3-5-haiku-latest';
      return 'gpt-4o-mini';
    }

    if (model === 'gemini-2.5-pro' || model === 'gemini-2.0-pro' || model === 'gemini-1.5-pro' || model === 'gemini-3-pro') {
      if (isGroq) return 'llama-3.3-70b-versatile';
      if (isAnthropic) return 'claude-3-5-sonnet-latest';
      return 'gpt-4o';
    }

    // Default prefix stripping for everything else
    if (model.includes('/') && (model.startsWith('groq/') || model.startsWith('openai/') || model.startsWith('anthropic/') || model.startsWith('huggingface/'))) {
      return model.split('/').pop()!;
    }

    return model;
  }

  private isModelUnavailable(status: number, errorText: string): boolean {
    if (status !== 400 && status !== 404) {
      return false;
    }
    const lower = errorText.toLowerCase();
    return (
      lower.includes('model_not_found') ||
      lower.includes('model_not_supported') ||
      lower.includes('does not exist') ||
      (lower.includes('model') && lower.includes('not found')) ||
      lower.includes('unsupported model') ||
      lower.includes('gpt-oss') // Specifically catch gpt-oss failures
    );
  }

  private async generateWithLocalTransformers(
    messages: OpenAIMessage[],
    model: string,
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    const maxNewTokens = request.config?.maxOutputTokens ?? 512;
    const temperature = request.config?.temperature ?? 0.7;
    let generatedText = '';
    try {
      generatedText = await runLocalTextGenerationWithTransformers(
        model,
        prompt,
        maxNewTokens,
        temperature,
      );
    } catch (error) {
      throw new Error(
        `Local transformers fallback failed. Detail: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: { role: 'model', parts: [{ text: generatedText }] },
        finishReason: FinishReason.STOP,
        index: 0,
      },
    ];
    return result;
  }
}
