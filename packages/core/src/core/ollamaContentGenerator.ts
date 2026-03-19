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

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: Record<string, unknown>;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

export class OllamaContentGenerator implements ContentGenerator {
  private endpoint: string;
  private model: string;
  private config: Config;

  constructor(endpoint: string, model: string, config: Config) {
    this.endpoint = this.normalizeEndpoint(endpoint);
    this.model = model;
    this.config = config;
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
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const messages = this.convertToOllamaMessages(request);
    const model = request.model || this.model;

    const ollamaRequest: OllamaChatRequest = {
      model,
      messages,
      stream: false,
    };

    const response = await this.callChatWithFallback(ollamaRequest);

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(
        `Ollama API error (${response.status} ${response.statusText})` +
          (details ? `: ${details}` : ''),
      );
    }

    const data = (await response.json()) as OllamaChatResponse;

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: {
          parts: [{ text: data.message.content }],
          role: 'model',
        },
        finishReason: FinishReason.STOP,
        index: 0,
      },
    ];
    return result;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const messages = this.convertToOllamaMessages(request);
    const model = request.model || this.model;

    const ollamaRequest: OllamaChatRequest = {
      model,
      messages,
      stream: true,
    };

    const response = await this.callChatWithFallback(ollamaRequest);

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(
        `Ollama API error (${response.status} ${response.statusText})` +
          (details ? `: ${details}` : ''),
      );
    }

    if (!response.body) {
      throw new Error('No response body from Ollama');
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
          if (line.trim()) {
            const data = JSON.parse(line) as OllamaChatResponse;

            const result = new GenerateContentResponse();
            result.candidates = [
              {
                content: {
                  parts: [{ text: data.message.content }],
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
    })();
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
      throw new Error(
        `Ollama embeddings API error (${response.status} ${response.statusText})` +
          (details ? `: ${details}` : ''),
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
  ): OllamaMessage[] {
    const messages: OllamaMessage[] = [];

    // Add system message if tools or skills are present (tool forcing)
    const skills = this.config.getSkillManager().getSkills();
    const hasTools = request.config?.tools && request.config.tools.length > 0;
    const hasSkills = skills.length > 0;

    if (hasTools || hasSkills) {
      let toolDescriptions = '';
      if (hasTools) {
        toolDescriptions += 'Tools available:\n';
        toolDescriptions += (request.config!.tools as any[])
          .map((tool: any) => {
            const declarations = Array.isArray(tool.functionDeclarations)
              ? tool.functionDeclarations
              : [];
            if (declarations.length === 0) return '';
            return declarations
              .map(
                (funcDecl: any) =>
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
      const text = content.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join('\n');
      if (text) {
        messages.push({
          role: content.role === 'user' ? 'user' : 'assistant',
          content: text,
        });
      }
    }

    return messages;
  }

  private async callChatWithFallback(
    request: OllamaChatRequest,
  ): Promise<Response> {
    let response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
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
