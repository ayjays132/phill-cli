/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FinishReason,
  GenerateContentResponse,
  type CountTokensResponse,
  type CountTokensParameters,
  type EmbedContentParameters,
  type EmbedContentResponse,
  type GenerateContentParameters,
  type Content,
} from '@google/genai';
import process from 'node:process';
import type { ContentGenerator } from './contentGenerator.js';
import { toContents } from '../code_assist/converter.js';
import type { Config } from '../config/config.js';
import { runLocalTextGenerationWithTransformers } from './localTransformersFallback.js';
import { getOpenAIBrowserAccessToken } from './openAiBrowserAuth.js';
import { createProviderHttpError } from './providerHttpError.js';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface TextPartLike {
  text?: string;
}

interface ToolFunctionDeclarationLike {
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

interface ToolDefinitionLike {
  functionDeclarations?: ToolFunctionDeclarationLike[];
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

interface OpenAIChatResponse {
  choices: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
}

interface OpenAIStreamChunk {
  choices: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

interface OpenAIResponsesRequest {
  model: string;
  input: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream?: boolean;
  max_output_tokens?: number;
  temperature?: number;
  tools?: Array<{
    type: 'function';
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

interface OpenAIResponsesResponse {
  output_text?: string;
  output?: Array<{
    type?: string;
    name?: string;
    arguments?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: OpenAIChatResponse['usage'];
}

const OPENAI_MODEL_ALIASES: Record<string, string> = {
  // Latest-style aliases
  'openai/latest': 'gpt-5.5',
  'chatgpt/latest': 'gpt-5.5',
  'gpt-latest': 'gpt-5.5',
  'codex-latest': 'gpt-5.5',
  codex: 'gpt-5.5',
  'openai/codex': 'gpt-5.5',
  // Stable convenience aliases
  gpt: 'gpt-5.5',
  'gpt-mini': 'gpt-5.4-mini',
};

export class OpenAICompatibleContentGenerator implements ContentGenerator {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey?: string;
  private readonly apiKeyProvider?: () => Promise<string | undefined>;
  private readonly config: Config;

  constructor(
    endpoint: string,
    model: string,
    apiKey: string | undefined,
    apiKeyProvider: (() => Promise<string | undefined>) | undefined,
    config: Config,
  ) {
    this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    this.model = model;
    this.apiKey = apiKey;
    this.apiKeyProvider = apiKeyProvider;
    this.config = config;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const model = this.mapModelName(request.model || this.model);
    const nativeTooling = this.buildNativeTooling(request);
    const messages = this.toMessages(request, nativeTooling.canUseNativeTools);
    if (this.shouldUseResponsesApi(model, request)) {
      return this.generateContentViaResponsesApi(
        model,
        messages,
        request,
        nativeTooling,
      );
    }
    const chatRequest: OpenAIChatRequest = {
      model,
      messages,
      stream: false,
      max_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
      ...(nativeTooling.canUseNativeTools &&
      nativeTooling.chatTools.length > 0
        ? {
            tools: nativeTooling.chatTools,
            ...(nativeTooling.toolChoice
              ? { tool_choice: nativeTooling.toolChoice }
              : {}),
          }
        : {}),
    };

    let response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      let errorText = await response.text();
      const recovered = await this.retryWithOpenAIBrowserTokenOnBillingError(
        response.status,
        errorText,
        chatRequest,
      );
      if (recovered) {
        response = recovered.response;
        errorText = recovered.errorText;
      }
      if (response.ok) {
        const data = (await response.json()) as OpenAIChatResponse;
        const result = this.buildChatResponse(data);
        if (data.usage) {
          result.usageMetadata = this.buildUsageMetadata(data.usage);
        }
        return result;
      }
      if (
        this.isModelUnavailable(response.status, errorText) &&
        !this.endpoint.includes('groq.com') &&
        !this.endpoint.includes('openai.com') &&
        !this.endpoint.includes('anthropic.com')
      ) {
        return this.generateWithLocalTransformers(messages, model, request);
      }
      throw createProviderHttpError(
        'OpenAI-compatible API error',
        response,
        errorText,
      );
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const result = this.buildChatResponse(data);
    if (data.usage) {
      result.usageMetadata = this.buildUsageMetadata(data.usage);
    }
    return result;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const model = this.mapModelName(request.model || this.model);
    const nativeTooling = this.buildNativeTooling(request);
    const messages = this.toMessages(request, nativeTooling.canUseNativeTools);
    if (this.shouldUseResponsesApi(model, request)) {
      return this.generateContentStreamViaResponsesApi(
        model,
        messages,
        request,
        nativeTooling,
      );
    }
    const chatRequest: OpenAIChatRequest = {
      model,
      messages,
      stream: true,
      max_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
      ...(nativeTooling.canUseNativeTools &&
      nativeTooling.chatTools.length > 0
        ? {
            tools: nativeTooling.chatTools,
            ...(nativeTooling.toolChoice
              ? { tool_choice: nativeTooling.toolChoice }
              : {}),
          }
        : {}),
    };

    let response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      let errorText = await response.text();
      const recovered = await this.retryWithOpenAIBrowserTokenOnBillingError(
        response.status,
        errorText,
        chatRequest,
      );
      if (recovered) {
        response = recovered.response;
        errorText = recovered.errorText;
      }
      if (response.ok) {
        // Continue to stream handling below.
      } else if (
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
      } else {
        throw createProviderHttpError(
          'OpenAI-compatible API error',
          response,
          errorText,
        );
      }
    }
    if (!response.body) {
      throw new Error('No response body from OpenAI-compatible API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const mapFinishReason = this.mapFinishReason.bind(this);
    const buildToolCallChunk = this.buildToolCallChunk.bind(this);

    return (async function* () {
      let buffer = '';
      const toolCalls = new Map<number, { name: string; arguments: string }>();
      let emittedToolCalls = false;
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
            const deltaToolCalls = chunk.choices[0]?.delta?.tool_calls ?? [];
            const finish = chunk.choices[0]?.finish_reason;
            for (const toolCall of deltaToolCalls) {
              const index = toolCall.index ?? 0;
              const current = toolCalls.get(index) ?? {
                name: '',
                arguments: '',
              };
              if (toolCall.function?.name) {
                current.name += toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                current.arguments += toolCall.function.arguments;
              }
              toolCalls.set(index, current);
            }
            if (!deltaText && !finish && deltaToolCalls.length === 0) continue;

            if (deltaText) {
              const result = new GenerateContentResponse();
              result.candidates = [
                {
                  content: { role: 'model', parts: [{ text: deltaText }] },
                  finishReason: mapFinishReason(finish),
                  index: 0,
                },
              ];
              yield result;
            }

            if (
              !emittedToolCalls &&
              toolCalls.size > 0 &&
              (finish === 'tool_calls' || finish === 'stop')
            ) {
              emittedToolCalls = true;
              yield buildToolCallChunk(toolCalls, finish);
            } else if (!deltaText && finish) {
              const result = new GenerateContentResponse();
              result.candidates = [
                {
                  content: { role: 'model', parts: [{ text: '' }] },
                  finishReason: mapFinishReason(finish),
                  index: 0,
                },
              ];
              yield result;
            }
          } catch {
            continue;
          }
        }
      }

      if (!emittedToolCalls && toolCalls.size > 0) {
        yield buildToolCallChunk(toolCalls, 'tool_calls');
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
      throw createProviderHttpError(
        'OpenAI-compatible embeddings error',
        response,
        response.statusText,
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

  private toMessages(
    request: GenerateContentParameters,
    suppressToolForcing = false,
  ): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // Add system message if tools or skills are present (tool forcing)
    const skills = this.config.getSkillManager().getSkills();
    const hasTools = request.config?.tools && request.config.tools.length > 0;
    const hasSkills = skills.length > 0;

    if ((!suppressToolForcing && hasTools) || hasSkills) {
      let toolDescriptions = '';
      if (!suppressToolForcing && hasTools) {
        toolDescriptions += 'Tools available:\n';
        toolDescriptions += (request.config!.tools as ToolDefinitionLike[])
          .map((tool) => {
            const declarations = Array.isArray(tool.functionDeclarations)
              ? tool.functionDeclarations
              : [];
            if (declarations.length === 0) return '';
            return declarations
              .map(
                (funcDecl) =>
                  `- ${funcDecl.name}: ${funcDecl.description}\n  Parameters: ${JSON.stringify(funcDecl.parameters)}`,
              )
              .join('\n');
          })
          .join('\n');
      }

      if (hasSkills) {
        if (toolDescriptions) toolDescriptions += '\n\n';
        toolDescriptions += 'Skills available:\n';
        toolDescriptions += skills
          .map(
            (s) =>
              `- ${s.name}: ${s.description || 'No description available'}`,
          )
          .join('\n');
      }

      messages.push({
        role: 'system',
        content: `You have access to the following capabilities:\n${toolDescriptions}\n\nTo use a tool, YOU MUST respond with a JSON object in this format:\n{"tool": "tool_name", "parameters": {...}}\n\nExample for listing a directory:\n{"tool": "list_directory", "parameters": {"dir_path": "E:\\\\phill-cli-0.0.1"}}\n\nDo not provide any other text outside the JSON if you are calling a tool. Ensure you see all tools and follow this format exactly.`,
      });
    }

    if (request.config?.systemInstruction) {
      const sysInst = request.config.systemInstruction as Content;
      const systemText = sysInst.parts
        ?.map((p) => (p as TextPartLike).text)
        .filter(Boolean)
        .join('\n');
      if (systemText) {
        messages.push({ role: 'system', content: systemText });
      }
    }
    const contents = toContents(request.contents);
    for (const content of contents) {
      const text = content.parts
        ?.map((p) => (p as TextPartLike).text)
        .filter(Boolean)
        .join('\n');
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
      case 'tool_calls':
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
    const normalized = model.trim().toLowerCase();
    const aliasResolved = OPENAI_MODEL_ALIASES[normalized];
    if (aliasResolved) {
      return aliasResolved;
    }

    if (
      model.includes('gpt-oss') ||
      model.includes('gpt-5') ||
      model.includes('gpt-4.1')
    ) {
      if (
        model.includes('/') &&
        (model.startsWith('groq/') ||
          model.startsWith('openai/') ||
          model.startsWith('chatgpt/') ||
          model.startsWith('anthropic/') ||
          model.startsWith('huggingface/') ||
          model.startsWith('xai/'))
      ) {
        return model.split('/').pop()!;
      }
      return model;
    }

    // Map internal Gemini utility aliases to provider-appropriate models.
    const isGroq = this.endpoint.includes('groq.com');
    const isAnthropic = this.endpoint.includes('anthropic.com');

    // Utility model translations
    if (
      model === 'gemini-2.5-flash-lite' ||
      model === 'gemini-2.5-flash' ||
      model === 'gemini-2.0-flash-lite' ||
      model === 'gemini-1.5-flash' ||
      model === 'gemini-3.1-flash'
    ) {
      if (isGroq) return 'llama-3.1-8b-instant';
      if (isAnthropic) return 'claude-3-5-haiku-20241022';
      return 'gpt-5.4-mini';
    }

    if (
      model === 'gemini-2.5-pro' ||
      model === 'gemini-2.0-pro' ||
      model === 'gemini-1.5-pro' ||
      model === 'gemini-3-pro' ||
      model === 'gemini-3.1-pro'
    ) {
      if (isGroq) return 'llama-3.3-70b-versatile';
      if (isAnthropic) return 'claude-sonnet-4-20250514';
      return 'gpt-5.4';
    }

    // Default prefix stripping for everything else
    if (
      model.includes('/') &&
      (model.startsWith('groq/') ||
        model.startsWith('openai/') ||
        model.startsWith('chatgpt/') ||
        model.startsWith('anthropic/') ||
        model.startsWith('huggingface/') ||
        model.startsWith('xai/'))
    ) {
      return model.split('/').pop()!;
    }

    return model;
  }

  private shouldUseResponsesApi(
    model: string,
    request?: GenerateContentParameters,
  ): boolean {
    const hasTools = ((request?.config?.tools as unknown[]) || []).length > 0;
    if (hasTools) {
      return false;
    }
    const explicit = (process.env['OPENAI_USE_RESPONSES_API'] || '')
      .trim()
      .toLowerCase();
    const supportsResponses =
      this.endpoint.includes('openai.com') || this.endpoint.includes('api.x.ai');
    if (explicit === '1' || explicit === 'true' || explicit === 'yes') {
      return supportsResponses;
    }
    // Default to Responses API for GPT-5 on OpenAI and for xAI, whose docs
    // expose /v1/responses as the forward-compatible chat endpoint.
    return (
      (this.endpoint.includes('openai.com') && model.startsWith('gpt-5')) ||
      this.endpoint.includes('api.x.ai')
    );
  }

  private buildNativeTooling(request: GenerateContentParameters): {
    canUseNativeTools: boolean;
    chatTools: NonNullable<OpenAIChatRequest['tools']>;
    responsesTools: NonNullable<OpenAIResponsesRequest['tools']>;
    toolChoice?: OpenAIChatRequest['tool_choice'];
  } {
    const canUseNativeTools =
      this.endpoint.includes('openai.com') ||
      this.endpoint.includes('api.x.ai') ||
      this.endpoint.includes('groq.com');
    if (!canUseNativeTools) {
      return { canUseNativeTools, chatTools: [], responsesTools: [] };
    }

    const declarations = ((request.config?.tools as Array<{
      functionDeclarations?: Array<{
        name?: string;
        description?: string;
        parameters?: Record<string, unknown>;
      }>;
    }>) || [])
      .flatMap((tool) => tool.functionDeclarations || [])
      .filter((decl) => typeof decl.name === 'string' && decl.name.length > 0);

    const chatTools =
      declarations.map((decl) => ({
        type: 'function' as const,
        function: {
          name: decl.name as string,
          description: decl.description,
          parameters: decl.parameters,
        },
      })) || [];

    const responsesTools =
      declarations.map((decl) => ({
        type: 'function' as const,
        name: decl.name as string,
        description: decl.description,
        parameters: decl.parameters,
      })) || [];

    const fc = (request.config?.toolConfig as {
      functionCallingConfig?: {
        mode?: string;
        allowedFunctionNames?: string[];
      };
    } | undefined)?.functionCallingConfig;

    let toolChoice: OpenAIChatRequest['tool_choice'] | undefined;
    const mode = (fc?.mode || '').toUpperCase();
    const allowed = (fc?.allowedFunctionNames || []).filter(Boolean);
    if (mode === 'NONE') {
      toolChoice = 'none';
    } else if (mode === 'ANY') {
      if (allowed.length === 1) {
        toolChoice = { type: 'function', function: { name: allowed[0] } };
      } else {
        toolChoice = 'required';
      }
    } else if (allowed.length === 1) {
      toolChoice = { type: 'function', function: { name: allowed[0] } };
    } else if (allowed.length > 1) {
      toolChoice = 'auto';
    }

    return { canUseNativeTools, chatTools, responsesTools, toolChoice };
  }

  private async generateContentViaResponsesApi(
    model: string,
    messages: OpenAIMessage[],
    request: GenerateContentParameters,
    nativeTooling?: {
      canUseNativeTools: boolean;
      responsesTools: NonNullable<OpenAIResponsesRequest['tools']>;
      toolChoice?: OpenAIResponsesRequest['tool_choice'];
    },
  ): Promise<GenerateContentResponse> {
    const responsesRequest: OpenAIResponsesRequest = {
      model,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      max_output_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
      ...(nativeTooling?.canUseNativeTools &&
      (nativeTooling.responsesTools?.length || 0) > 0
        ? {
            tools: nativeTooling.responsesTools,
            ...(nativeTooling.toolChoice
              ? { tool_choice: nativeTooling.toolChoice }
              : {}),
          }
        : {}),
    };

    const response = await fetch(`${this.endpoint}/responses`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(responsesRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createProviderHttpError(
        'OpenAI-compatible Responses API error',
        response,
        errorText,
      );
    }

    const data = (await response.json()) as OpenAIResponsesResponse;
    const text =
      data.output_text ??
      (data.output ?? [])
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
        .map((c) => c.text as string)
        .join('');
    const toolParts = (data.output ?? [])
      .filter((item) => item.type === 'function_call' && item.name)
      .map((item) => ({
        functionCall: {
          name: item.name as string,
          args: this.parseToolArguments(item.arguments),
        },
      }));

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: {
          role: 'model',
          parts: text ? [{ text }, ...toolParts] : toolParts.length > 0 ? toolParts : [{ text: '' }],
        },
        finishReason: FinishReason.STOP,
        index: 0,
      },
    ];
    if (data.usage) {
      result.usageMetadata = this.buildUsageMetadata(data.usage);
    }
    return result;
  }

  private async generateContentStreamViaResponsesApi(
    model: string,
    messages: OpenAIMessage[],
    request: GenerateContentParameters,
    nativeTooling?: {
      canUseNativeTools: boolean;
      responsesTools: NonNullable<OpenAIResponsesRequest['tools']>;
      toolChoice?: OpenAIResponsesRequest['tool_choice'];
    },
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const responsesRequest: OpenAIResponsesRequest = {
      model,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      max_output_tokens: request.config?.maxOutputTokens,
      temperature: request.config?.temperature,
      ...(nativeTooling?.canUseNativeTools &&
      (nativeTooling.responsesTools?.length || 0) > 0
        ? {
            tools: nativeTooling.responsesTools,
            ...(nativeTooling.toolChoice
              ? { tool_choice: nativeTooling.toolChoice }
              : {}),
          }
        : {}),
    };

    const response = await fetch(`${this.endpoint}/responses`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(responsesRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createProviderHttpError(
        'OpenAI-compatible Responses API error',
        response,
        errorText,
      );
    }
    if (!response.body) {
      throw new Error('No response body from OpenAI-compatible Responses API');
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

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const event = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              text?: string;
            };
            if (event.type === 'response.output_text.delta' && event.delta) {
              const result = new GenerateContentResponse();
              result.candidates = [
                {
                  content: { role: 'model', parts: [{ text: event.delta }] },
                  index: 0,
                },
              ];
              yield result;
              continue;
            }
            if (event.type === 'response.output_text.done' && event.text) {
              const result = new GenerateContentResponse();
              result.candidates = [
                {
                  content: { role: 'model', parts: [{ text: '' }] },
                  finishReason: FinishReason.STOP,
                  index: 0,
                },
              ];
              yield result;
            }
          } catch {
            continue;
          }
        }
      }
    })();
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

  private isOpenAIBillingError(status: number, errorText: string): boolean {
    if (status !== 429 && status !== 403) {
      return false;
    }
    const lower = errorText.toLowerCase();
    return (
      lower.includes('billing_not_active') ||
      lower.includes('account is not active') ||
      lower.includes('billing details') ||
      lower.includes('insufficient_quota')
    );
  }

  private async retryWithOpenAIBrowserTokenOnBillingError(
    status: number,
    errorText: string,
    chatRequest: OpenAIChatRequest,
  ): Promise<{ response: Response; errorText: string } | null> {
    if (
      !this.endpoint.includes('openai.com') ||
      !this.isOpenAIBillingError(status, errorText)
    ) {
      return null;
    }

    const browserToken = await getOpenAIBrowserAccessToken(
      true,
      !this.config.isBrowserLaunchSuppressed(),
    );
    if (!browserToken) {
      return null;
    }

    const retryResponse = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${browserToken}`,
      },
      body: JSON.stringify(chatRequest),
    });

    if (retryResponse.ok) {
      return { response: retryResponse, errorText: '' };
    }

    const retryErrorText = await retryResponse.text();
    return { response: retryResponse, errorText: retryErrorText };
  }

  private buildChatResponse(data: OpenAIChatResponse): GenerateContentResponse {
    const choice = data.choices[0];
    const text = choice?.message?.content ?? '';
    const toolParts = (choice?.message?.tool_calls ?? [])
      .map((toolCall) => {
        const name = toolCall.function?.name?.trim();
        if (!name) {
          return null;
        }
        return {
          functionCall: {
            name,
            args: this.parseToolArguments(toolCall.function?.arguments),
          },
        };
      })
      .filter((part): part is { functionCall: { name: string; args: Record<string, unknown> } } => part !== null);

    const parts =
      text.length > 0
        ? [{ text }, ...toolParts]
        : toolParts.length > 0
          ? toolParts
          : [{ text: '' }];

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: { role: 'model', parts },
        finishReason: this.mapFinishReason(choice?.finish_reason),
        index: 0,
      },
    ];
    return result;
  }

  private buildUsageMetadata(
    usage: NonNullable<OpenAIChatResponse['usage']>,
  ): GenerateContentResponse['usageMetadata'] {
    return {
      promptTokenCount: usage.prompt_tokens,
      candidatesTokenCount: usage.completion_tokens,
      totalTokenCount: usage.total_tokens,
      cachedContentTokenCount: usage.prompt_tokens_details?.cached_tokens,
    };
  }

  private buildToolCallChunk(
    toolCalls: Map<number, { name: string; arguments: string }>,
    finish: string | null | undefined,
  ): GenerateContentResponse {
    const parts = [...toolCalls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, toolCall]) => ({
        functionCall: {
          name: toolCall.name,
          args: this.parseToolArguments(toolCall.arguments),
        },
      }))
      .filter((part) => part.functionCall.name.length > 0);

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: {
          role: 'model',
          parts: parts.length > 0 ? parts : [{ text: '' }],
        },
        finishReason: this.mapFinishReason(finish),
        index: 0,
      },
    ];
    return result;
  }

  private parseToolArguments(
    rawArguments: string | undefined,
  ): Record<string, unknown> {
    if (!rawArguments) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawArguments);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
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
