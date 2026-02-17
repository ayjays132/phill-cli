/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  type GenerateContentParameters,
  type CountTokensParameters,
  type EmbedContentResponse,
  type EmbedContentParameters,
  type Content,
  FinishReason,
} from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config } from '../config/config.js';
import { toContents } from '../code_assist/converter.js';
import { runLocalTextGenerationWithTransformers } from './localTransformersFallback.js';

interface HuggingFaceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface HuggingFaceChatRequest {
  model?: string;
  messages: HuggingFaceMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

interface HuggingFaceChatResponse {
  id?: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface HuggingFaceStreamChunk {
  id?: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

const HF_LEGACY_API_INFERENCE = 'https://api-inference.huggingface.co';
const HF_ROUTER_BASE = 'https://router.huggingface.co';

function normalizeHfEndpoint(endpoint: string | undefined): {
  endpoint: string;
  isLocal: boolean;
} {
  if (!endpoint) {
    return { endpoint: HF_ROUTER_BASE, isLocal: false };
  }

  const trimmed = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (
      host === 'api-inference.huggingface.co' ||
      trimmed === `${HF_LEGACY_API_INFERENCE}/models`
    ) {
      return { endpoint: HF_ROUTER_BASE, isLocal: false };
    }

    if (
      host === 'router.huggingface.co' ||
      pathname.startsWith('/hf-inference')
    ) {
      return { endpoint: HF_ROUTER_BASE, isLocal: false };
    }

    // huggingface.co is the website host; API calls should use router.
    if (host === 'huggingface.co' || host.endsWith('.huggingface.co')) {
      return { endpoint: HF_ROUTER_BASE, isLocal: false };
    }
  } catch {
    // If endpoint is not a valid URL, treat as local and let fetch error clearly.
  }

  return { endpoint: trimmed, isLocal: true };
}

export class HuggingFaceContentGenerator implements ContentGenerator {
  private endpoint: string;
  private model: string;
  private apiKey?: string;
  private isLocal: boolean;

  constructor(
    endpoint: string | undefined,
    model: string,
    apiKey: string | undefined,
    _config: Config,
  ) {
    // Default to Hugging Face Router API and auto-upgrade legacy API Inference URLs.
    const normalized = normalizeHfEndpoint(endpoint);
    this.endpoint = normalized.endpoint;
    this.isLocal = normalized.isLocal;
    this.model = model;
    this.apiKey = apiKey;
  }

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const messages = this.convertToHuggingFaceMessages(request);
    const model = request.model || this.model;
    
    const hfRequest: HuggingFaceChatRequest = {
      messages,
      stream: false,
      max_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
    };

    // Add model to request if using local endpoint
    if (this.isLocal) {
      hfRequest.model = model;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await this.callChatEndpoint({
      request: hfRequest,
      model,
      headers,
      stream: false,
    });

    if (!response.ok) {
      if (await this.isModelUnavailable(response)) {
        return this.generateWithLocalTransformers(messages, model, request);
      }
      const errorText = await response.text();
      throw new Error(this.formatApiError(response.statusText, errorText));
    }

    const data = (await response.json()) as HuggingFaceChatResponse;

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: {
          parts: [{ text: data.choices[0].message.content }],
          role: 'model',
        },
        finishReason: this.mapFinishReason(data.choices[0].finish_reason),
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
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const messages = this.convertToHuggingFaceMessages(request);
    const model = request.model || this.model;
    
    const hfRequest: HuggingFaceChatRequest = {
      messages,
      stream: true,
      max_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
    };

    if (this.isLocal) {
      hfRequest.model = model;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await this.callChatEndpoint({
      request: hfRequest,
      model,
      headers,
      stream: true,
    });

    if (!response.ok) {
      if (await this.isModelUnavailable(response)) {
        const oneShot = await this.generateWithLocalTransformers(
          messages,
          model,
          request,
        );
        return (async function* () {
          yield oneShot;
        })();
      }
      const errorText = await response.text();
      throw new Error(this.formatApiError(response.statusText, errorText));
    }

    if (!response.body) {
      throw new Error('No response body from HuggingFace');
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            if (!data) continue;

            try {
              const chunk = JSON.parse(data) as HuggingFaceStreamChunk;
              const delta = chunk.choices[0]?.delta;
              
              if (delta?.content) {
                const result = new GenerateContentResponse();
                result.candidates = [
                  {
                    content: {
                      parts: [{ text: delta.content }],
                      role: 'model',
                    },
                    finishReason: chunk.choices[0].finish_reason 
                      ? self.mapFinishReason(chunk.choices[0].finish_reason)
                      : undefined,
                    index: 0,
                  },
                ];
                yield result;
              }
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }
    })();
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // HuggingFace doesn't have a standard token counting API
    // Approximate based on text length (rough estimate: 1 token ≈ 4 characters)
    const text = JSON.stringify(request);
    const approximateTokens = Math.ceil(text.length / 4);
    
    return {
      totalTokens: approximateTokens,
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    const contents = toContents(request.contents);
    const text = contents[0]?.parts?.[0]?.text || '';
    const model = request.model || this.model;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // Use feature extraction endpoint for embeddings.
    const url = this.isLocal
      ? `${this.endpoint}/pipeline/feature-extraction/${model}`
      : `${HF_ROUTER_BASE}/hf-inference/pipeline/feature-extraction/${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(this.formatApiError(response.statusText, errorText));
    }

    const data = (await response.json()) as number[] | number[][];
    const embedding = Array.isArray(data[0]) ? data[0] : data;

    return {
      embeddings: [
        {
          values: embedding as number[],
        },
      ],
    };
  }

  private convertToHuggingFaceMessages(request: GenerateContentParameters): HuggingFaceMessage[] {
    const messages: HuggingFaceMessage[] = [];

    // Add system message if tools are present (tool forcing)
    if (request.config?.tools && request.config.tools.length > 0) {
      const toolDescriptions = request.config.tools
        .map((tool: any) => {
          const funcDecl = tool.functionDeclarations?.[0];
          if (!funcDecl) return '';
          return `- ${funcDecl.name}: ${funcDecl.description}\n  Parameters: ${JSON.stringify(funcDecl.parameters)}`;
        })
        .join('\n');

      messages.push({
        role: 'system',
        content: `You have access to the following tools:\n${toolDescriptions}\n\nTo use a tool, respond with a JSON object in this format:\n{"tool": "tool_name", "parameters": {...}}`,
      });
    }

    // Add system instruction if present
    if (request.config?.systemInstruction) {
      const sysInst = request.config.systemInstruction as Content;
      const systemText = sysInst.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join('\n');
      if (systemText) {
        messages.push({
          role: 'system',
          content: systemText,
        });
      }
    }

    // Convert contents to messages
    const contents = toContents(request.contents);
    for (const content of contents) {
      const text = content.parts?.map((p: any) => p.text).filter(Boolean).join('\n');
      if (text) {
        messages.push({
          role: content.role === 'user' ? 'user' : 'assistant',
          content: text,
        });
      }
    }

    return messages;
  }

  private mapFinishReason(reason: string | null | undefined): FinishReason {
    if (!reason) {
      return FinishReason.FINISH_REASON_UNSPECIFIED;
    }
    const mapping: Record<string, FinishReason> = {
      'stop': FinishReason.STOP,
      'length': FinishReason.MAX_TOKENS,
      'content_filter': FinishReason.SAFETY,
      'tool_calls': FinishReason.STOP,
    };
    return mapping[reason] || FinishReason.OTHER;
  }

  private formatApiError(statusText: string, errorText: string): string {
    const normalized = errorText.trim();
    const isHtml =
      normalized.startsWith('<!DOCTYPE html>') || normalized.startsWith('<html');

    if (isHtml) {
      return `HuggingFace API error: ${statusText} - Received HTML instead of JSON. Check HUGGINGFACE_API_KEY and endpoint (use https://router.huggingface.co).`;
    }

    return `HuggingFace API error: ${statusText} - ${errorText}`;
  }

  private async callChatEndpoint({
    request,
    model,
    headers,
    stream,
  }: {
    request: HuggingFaceChatRequest;
    model: string;
    headers: Record<string, string>;
    stream: boolean;
  }): Promise<Response> {
    // Local endpoints are expected to be OpenAI-compatible.
    if (this.isLocal) {
      return fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });
    }

    // Primary Router path: OpenAI-compatible endpoint with model in body.
    const routerRequest: HuggingFaceChatRequest = { ...request, model };
    let response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(routerRequest),
    });
    if (response.ok || response.status !== 404) {
      return response;
    }

    // Fallback path for legacy hf-inference style route.
    response = await fetch(
      `${this.endpoint}/hf-inference/models/${encodeURIComponent(model)}/v1/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      },
    );
    if (response.ok) {
      return response;
    }

    // If user-selected model is unsupported by the enabled HF providers,
    // retry with configured fallback model for this auth profile.
    if (model !== this.model && (await this.isModelUnavailable(response))) {
      const fallbackRequest: HuggingFaceChatRequest = { ...request, model: this.model };
      response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fallbackRequest),
      });
    }

    // Final rescue for HF Router: pick a model from /v1/models if selection
    // and configured fallback are both unavailable on the enabled providers.
    if (
      !this.isLocal &&
      !response.ok &&
      (await this.isModelUnavailable(response))
    ) {
      const discovered = await this.findAnyAvailableRouterModel(headers);
      if (discovered && discovered !== model && discovered !== this.model) {
        const discoveredRequest: HuggingFaceChatRequest = {
          ...request,
          model: discovered,
        };
        response = await fetch(`${this.endpoint}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(discoveredRequest),
        });
      }
    }

    return response;
  }

  private async isModelUnavailable(response: Response): Promise<boolean> {
    if (response.status !== 400) {
      return false;
    }
    try {
      const text = await response.clone().text();
      const parsed = JSON.parse(text) as {
        error?: { code?: string; message?: string };
      };
      return (
        parsed.error?.code === 'model_not_found' ||
        parsed.error?.code === 'model_not_supported' ||
        parsed.error?.message?.toLowerCase().includes('not supported') === true ||
        parsed.error?.message?.toLowerCase().includes('does not exist') === true
      );
    } catch {
      return false;
    }
  }

  private async findAnyAvailableRouterModel(
    headers: Record<string, string>,
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.endpoint}/v1/models`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as {
        data?: Array<{ id?: string }>;
      };
      const candidate = payload.data
        ?.map((m) => (m.id ?? '').trim())
        .find((id) => id.length > 0);
      return candidate ?? null;
    } catch {
      return null;
    }
  }

  private async generateWithLocalTransformers(
    messages: HuggingFaceMessage[],
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
        `HuggingFace local transformers fallback failed. Detail: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: {
          parts: [{ text: generatedText }],
          role: 'model',
        },
        finishReason: FinishReason.STOP,
        index: 0,
      },
    ];
    return result;
  }
}
