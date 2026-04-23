/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenerateContentResponse,
  type GenerateContentParameters,
  type CountTokensResponse,
  type CountTokensParameters,
  type EmbedContentResponse,
  type EmbedContentParameters,
  type Content,
  type Part,
  FinishReason,
} from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config } from '../config/config.js';
import { toContents } from '../code_assist/converter.js';
import { createProviderHttpError } from './providerHttpError.js';
import { Semaphore } from '../utils/semaphore.js';
import { simplifyToolSchema } from '../utils/toolSimplifier.js';

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
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

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  system?: string;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  options?: Record<string, unknown>;
  keep_alive?: string;
  format?: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

const OLLAMA_TIMEOUT_MS = 60000;

export class OllamaContentGenerator implements ContentGenerator {
  private endpoint: string;
  private model: string;
  private config: Config;
  private semaphore: Semaphore;
  private hardwareOptions: {
    num_ctx?: number;
    num_gpu?: number;
    low_vram?: boolean;
    concurrency_limit?: number;
    keep_alive?: string;
  };

  constructor(
    endpoint: string, 
    model: string, 
    config: Config,
    hardwareOptions?: {
      num_ctx?: number;
      num_gpu?: number;
      low_vram?: boolean;
      concurrency_limit?: number;
      keep_alive?: string;
    }
  ) {
    this.endpoint = this.normalizeEndpoint(endpoint);
    this.model = model;
    this.config = config;
    this.hardwareOptions = hardwareOptions || {};
    this.semaphore = new Semaphore(this.hardwareOptions.concurrency_limit || 1);
  }

  private normalizeEndpoint(endpoint: string): string {
    let normalized = endpoint.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // Users often set OLLAMA_ENDPOINT to .../api or .../v1.
    // Ollama chat/embeddings paths already include /api/* below.
    if (normalized.endsWith('/api')) {
      normalized = normalized.slice(0, -4);
    } else if (normalized.endsWith('/v1')) {
      normalized = normalized.slice(0, -3);
    }
    return normalized;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const { messages, system, tools, options } =
      this.convertToOllamaMessages(request);
    const model = request.model || this.model;

    const ollamaRequest: OllamaChatRequest = {
      model,
      messages,
      stream: false,
      system,
      tools,
      options,
      keep_alive: this.hardwareOptions.keep_alive,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    await this.semaphore.acquire();
    try {
      const response = await this.callChatWithFallback(
        ollamaRequest,
        controller.signal,
      );

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw createProviderHttpError('Ollama API error', response, details);
      }

      const data = (await response.json()) as OllamaChatResponse;

      const result = new GenerateContentResponse();
      const parts: Part[] = [];

      if (data.message.content) {
        const content = data.message.content;
        const thoughtRegex = /<(?:thought|thinking|think)>([\s\S]*?)<\/(?:thought|thinking|think)>/gi;
        let lastIndex = 0;
        let match;

        while ((match = thoughtRegex.exec(content)) !== null) {
          // Normal text before thought
          if (match.index > lastIndex) {
            parts.push({ text: content.substring(lastIndex, match.index) });
          }
          // The thought itself
          parts.push({
            text: `**Thought**\n${match[1].trim()}\n**`,
            // @ts-ignore: Custom property for Swarm dashboard compatibility
            thought: true,
          } as any);
          lastIndex = thoughtRegex.lastIndex;
        }

        // Remaining text
        if (lastIndex < content.length) {
          parts.push({ text: content.substring(lastIndex) });
        }

        // Fallback: If no tags were found but it looks like a reasoning model outputting prefix
        if (parts.length === 0 && content.length > 0) {
           parts.push({ text: content });
        }
      }

      if (data.message.tool_calls && data.message.tool_calls.length > 0) {
        for (const tc of data.message.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: tc.function.arguments,
            },
          });
        }
      }

      result.candidates = [
        {
          content: {
            parts,
            role: 'model',
          },
          finishReason: FinishReason.STOP,
          index: 0,
        },
      ];
      return result;
    } finally {
      clearTimeout(timeoutId);
      this.semaphore.release();
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const { messages, system, tools, options } =
      this.convertToOllamaMessages(request);
    const model = request.model || this.model;

    const ollamaRequest: OllamaChatRequest = {
      model,
      messages,
      stream: true,
      system,
      tools,
      options,
      keep_alive: this.hardwareOptions.keep_alive,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    await this.semaphore.acquire();
    try {
      const response = await this.callChatWithFallback(
        ollamaRequest,
        controller.signal,
      );

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw createProviderHttpError('Ollama API error', response, details);
      }

      if (!response.body) {
        throw new Error('No response body from Ollama');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const semaphoreToRelease = this.semaphore;

      return (async function* () {
        try {
          let buffer = '';
          let isThinking = false;

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                const data = JSON.parse(line) as OllamaChatResponse;

                const result = new GenerateContentResponse();
                const parts: Part[] = [];

                if (data.message.content) {
                  let text = data.message.content;
                  
                  // Simple stateful tag detection for streaming
                  if (!isThinking && /<(?:thought|thinking|think)>/i.test(text)) {
                    isThinking = true;
                    text = text.replace(/<(?:thought|thinking|think)>/gi, '**Thought**\n');
                    parts.push({ 
                      text, 
                      // @ts-ignore
                      thought: true 
                    } as any);
                  } else if (isThinking && /<\/(?:thought|thinking|think)>/i.test(text)) {
                    isThinking = false;
                    text = text.replace(/<\/(?:thought|thinking|think)>/gi, '\n**\n');
                    parts.push({ text });
                  } else if (isThinking) {
                    parts.push({ 
                      text, 
                      // @ts-ignore
                      thought: true 
                    } as any);
                  } else {
                    parts.push({ text });
                  }
                }

                if (
                  data.message.tool_calls &&
                  data.message.tool_calls.length > 0
                ) {
                  for (const tc of data.message.tool_calls) {
                    parts.push({
                      functionCall: {
                        name: tc.function.name,
                        args: tc.function.arguments,
                      },
                    });
                  }
                }

                result.candidates = [
                  {
                    content: {
                      parts,
                      role: 'model',
                    },
                    finishReason: data.done ? FinishReason.STOP : undefined,
                    index: 0,
                  },
                ];
                yield result;
              }
            }
          }
        } finally {
          clearTimeout(timeoutId);
          semaphoreToRelease.release();
        }
      })();
    } catch (e) {
      clearTimeout(timeoutId);
      this.semaphore.release();
      throw e;
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // Ollama doesn't have a direct token counting API
    // Approximate based on text length (rough estimate: 1 token ≈ 4 characters)
    const text = JSON.stringify(request);
    const approximateTokens = Math.ceil(text.length / 4);

    return {
      totalTokens: approximateTokens,
    };
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    // Ollama has an embeddings endpoint
    const contents = toContents(request.contents);
    const text = contents[0]?.parts?.[0]?.text || '';
    const model = request.model || this.model;

    const response = await fetch(`${this.endpoint}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw createProviderHttpError(
        'Ollama embeddings API error',
        response,
        details,
      );
    }

    const data = (await response.json()) as { embedding: number[] };

    return {
      embeddings: [
        {
          values: data.embedding,
        },
      ],
    };
  }

  private convertToOllamaMessages(
    request: GenerateContentParameters,
  ): {
    messages: OllamaMessage[];
    system?: string;
    tools?: OllamaChatRequest['tools'];
    options?: OllamaChatRequest['options'];
  } {
    const messages: OllamaMessage[] = [];
    let system = '';

    // Add tools to the request
    const ollamaTools: OllamaChatRequest['tools'] = [];
    const hasTools = request.config?.tools && request.config.tools.length > 0;
    if (hasTools) {
      for (const tool of request.config!.tools as ToolDefinitionLike[]) {
        const declarations = Array.isArray(tool.functionDeclarations)
          ? tool.functionDeclarations
          : [];
        for (const funcDecl of declarations) {
          if (funcDecl.name) {
            const simplified = simplifyToolSchema(funcDecl as any);
            ollamaTools.push({
              type: 'function',
              function: {
                name: simplified.name!,
                description: simplified.description,
                parameters: simplified.parametersJsonSchema as Record<string, unknown>,
              },
            });
          }
        }
      }
    }

    // Add skills and fallback tool descriptions to system prompt
    const skills = this.config.getSkillManager().getSkills();
    const hasSkills = skills.length > 0;

    if (hasTools || hasSkills) {
      let toolDescriptions = '';
      if (hasTools) {
        toolDescriptions += 'Tools available:\n';
        toolDescriptions += ollamaTools
          .map(
            (t) =>
              `- ${t.function.name}: ${t.function.description}\n  Parameters: ${JSON.stringify(t.function.parameters)}`,
          )
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

      system += `You have access to the following capabilities:\n${toolDescriptions}\n\nTo use a tool, YOU MUST respond with a JSON object in this format:\n{"tool": "tool_name", "parameters": {...}}\n\nExample for listing a directory:\n{"tool": "list_directory", "parameters": {"dir_path": "E:\\\\phill-cli-0.0.1"}}\n\nDo not provide any other text outside the JSON if you are calling a tool. Ensure you see all tools and follow this format exactly.`;
    }

    // Add explicit system instruction if present
    if (request.config?.systemInstruction) {
      const sysInst = request.config.systemInstruction as Content;
      const systemText = sysInst.parts
        ?.map((p) => (p as TextPartLike).text)
        .filter(Boolean)
        .join('\n');
      if (systemText) {
        if (system) system += '\n\n';
        system += systemText;
      }
    }

    // Convert contents to messages
    const contents = toContents(request.contents);
    for (const content of contents) {
      const parts = content.parts || [];
      const text = parts
        .map((p) => (p as TextPartLike).text)
        .filter(Boolean)
        .join('\n');

      const toolCalls: OllamaToolCall[] = [];
      for (const part of parts) {
        if ('functionCall' in part && part.functionCall) {
          if (part.functionCall.name) {
            toolCalls.push({
              function: {
                name: part.functionCall.name,
                arguments: part.functionCall.args as Record<string, unknown>,
              },
            });
          }
        }
      }

      const hasFunctionResponse = parts.some(
        (p) => 'functionResponse' in p && p.functionResponse,
      );

      if (hasFunctionResponse) {
        // Create a 'tool' message for each function response
        for (const part of parts) {
          if ('functionResponse' in part && part.functionResponse) {
            messages.push({
              role: 'tool',
              content: JSON.stringify(part.functionResponse.response),
              // Note: Ollama might need the tool name here, but the role: tool with content is standard
            });
          }
        }
      } else {
        messages.push({
          role: content.role === 'user' ? 'user' : 'assistant',
          content: text || '',
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        });
      }
    }

    // Pass through generation options
    const options: Record<string, unknown> = {};
    if (request.config?.temperature !== undefined) options['temperature'] = request.config.temperature;
    if (request.config?.topP !== undefined) options['top_p'] = request.config.topP;
    if (request.config?.topK !== undefined) options['top_k'] = request.config.topK;
    if (request.config?.maxOutputTokens !== undefined) options['num_predict'] = request.config.maxOutputTokens;
    if (this.hardwareOptions.num_ctx !== undefined) options['num_ctx'] = this.hardwareOptions.num_ctx;
    if (this.hardwareOptions.num_gpu !== undefined) options['num_gpu'] = this.hardwareOptions.num_gpu;
    if (this.hardwareOptions.low_vram !== undefined) options['low_vram'] = this.hardwareOptions.low_vram;

    return {
      messages,
      system: system || undefined,
      tools: ollamaTools.length > 0 ? ollamaTools : undefined,
      options: Object.keys(options).length > 0 ? options : undefined,
    };
  }

  private async callChatWithFallback(
    request: OllamaChatRequest,
    signal?: AbortSignal,
  ): Promise<Response> {
    let response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });
    if (response.ok || !(await this.isModelMissing(response))) {
      return response;
    }

    const fallbackModel = await this.findInstalledFallbackModel(request.model);
    if (!fallbackModel) {
      return response;
    }

    response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        model: fallbackModel,
      }),
      signal,
    });
    return response;
  }

  private async isModelMissing(response: Response): Promise<boolean> {
    if (response.status !== 404) {
      return false;
    }
    const details = (
      await response
        .clone()
        .text()
        .catch(() => '')
    ).toLowerCase();
    return details.includes('model') && details.includes('not found');
  }

  private async findInstalledFallbackModel(
    excludedModel: string,
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as OllamaTagsResponse;
      const models = (payload.models ?? [])
        .flatMap((m) => [m.name, m.model])
        .map((m) => (m ?? '').trim())
        .filter((m) => m.length > 0);
      const first = models.find((m) => m !== excludedModel);
      return first ?? null;
    } catch {
      return null;
    }
  }
}
