/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ToolInvocation,
  ToolResult,
} from '../tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
} from '../tools.js';
import type { Config } from '../../config/config.js';
import { MessageBus } from '../../confirmation-bus/message-bus.js';
import { debugLogger } from '../../utils/debugLogger.js';
import { EXTREME_DEEP_RESEARCH_TOOL_NAME } from '../tool-names.js';
import { getCodeAssistServer } from '../../code_assist/codeAssist.js';
import { AuthType } from '../../core/contentGenerator.js';

export interface ExtremeDeepResearchParams {
  input: string;
  agent?: string;
  previousInteractionId?: string;
  fileSearchStoreNames?: string[];
}

class ExtremeDeepResearchInvocation extends BaseToolInvocation<
  ExtremeDeepResearchParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ExtremeDeepResearchParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  private isOpenAiAuth(): boolean {
    const authType = this.config.getContentGeneratorConfig()?.authType;
    return (
      authType === AuthType.OPENAI || authType === AuthType.OPENAI_BROWSER
    );
  }

  private async runOpenAiFallbackSynthesis(
    input: string,
    signal: AbortSignal,
  ): Promise<ToolResult> {
    const phillClient = this.config.getPhillClient();
    const response = await phillClient.generateContent(
      { model: this.config.getModel() },
      [
        {
          role: 'user',
          parts: [
            {
              text:
                `Perform a deep research style synthesis for this query:\n\n${input}\n\n` +
                'You are running in fallback mode because Gemini interactions are unavailable. ' +
                'Provide a structured technical brief and clearly label any uncertainty.',
            },
          ],
        },
      ],
      signal,
    );

    const fallbackText =
      response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        .filter(Boolean)
        .join('\n') || 'Fallback synthesis completed with limited output.';

    const interactionId = `openai-fallback-${Date.now()}`;
    return {
      llmContent: JSON.stringify(
        {
          interactionId,
          report: fallbackText,
          status: 'success',
          fallback: 'openai-model-synthesis',
        },
        null,
        2,
      ),
      returnDisplay:
        `### External Deep Research Report (Fallback ID: ${interactionId})\n\n` +
        `${fallbackText}\n\n*Generated via Codex/OpenAI fallback synthesis.*`,
    };
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { 
      input, 
      agent = 'deep-research-pro-preview-12-2025',
      previousInteractionId,
      fileSearchStoreNames = []
    } = this.params;

    const contentGenConfig = await this.config.getContentGeneratorConfig();
    const apiKey = contentGenConfig?.apiKey;

    debugLogger.debug(`[ExtremeDeepResearch] Initializing external research: ${input.substring(0, 100)}...`);

    // --- AUTHENTICATION RESOLUTION ---
    let baseUrl = `https://generativelanguage.googleapis.com/v1beta`;
    let url = `${baseUrl}/interactions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (apiKey) {
      url += `?key=${apiKey}`;
    } else {
      const server = getCodeAssistServer(this.config);
      if (server) {
        const { token } = await server.client.getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          debugLogger.debug(`[ExtremeDeepResearch] Using OAuth Bearer Token.`);
        }
      }
    }

    if (!apiKey && !headers['Authorization']) {
      if (this.isOpenAiAuth()) {
        debugLogger.warn(
          '[ExtremeDeepResearch] Gemini credentials unavailable under OpenAI/Codex auth. Falling back to model synthesis.',
        );
        return this.runOpenAiFallbackSynthesis(input, _signal);
      }
      throw new Error('Extreme Deep Research requires either a Gemini API Key or an active Google Login session (OAuth).');
    }

    try {
        // --- PREPARE PAYLOAD ---
        const payload: any = {
            input: { 
                type: 'text', 
                text: input 
            },
            agent: agent,
            background: true,
            store: true, // Required for background=true
            agent_config: {
                type: 'deep-research',
                thinking_summaries: 'auto'
            }
        };

        if (previousInteractionId) {
            payload.previous_interaction_id = previousInteractionId;
        }

        if (fileSearchStoreNames.length > 0) {
            payload.tools = [
                { 
                    type: 'file_search', 
                    file_search_store_names: fileSearchStoreNames 
                }
            ];
        }

        // --- START INTERACTION ---
        const startResponse = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!startResponse.ok) {
            const errText = await startResponse.text();
            if (this.isOpenAiAuth()) {
              debugLogger.warn(
                `[ExtremeDeepResearch] Interactions API failed (${startResponse.status}). Falling back to model synthesis.`,
              );
              return this.runOpenAiFallbackSynthesis(input, _signal);
            }
            throw new Error(`Interactions API Start Error: ${startResponse.status} ${errText}`);
        }

        const initialInteraction = await startResponse.json() as any;
        const interactionId = initialInteraction.id;

        debugLogger.debug(`[ExtremeDeepResearch] Interaction created: ${interactionId}. Polling for completion...`);

        // --- POLLING LOOP ---
        let completedInteraction: any = null;
        let attempts = 0;
        const maxAttempts = 120; // 20 minutes (10s intervals)

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            attempts++;

            const pollUrl = `${baseUrl}/interactions/${interactionId}${apiKey ? `?key=${apiKey}` : ''}`;
            const pollResponse = await fetch(pollUrl, { headers });

            if (!pollResponse.ok) {
                debugLogger.warn(`[ExtremeDeepResearch] Polling error (${pollResponse.status}), retrying...`);
                continue;
            }

            const interactionStatus = await pollResponse.json();
            
            if (interactionStatus.status === 'completed') {
                completedInteraction = interactionStatus;
                break;
            } else if (interactionStatus.status === 'failed') {
                throw new Error(`Research Agent Failed: ${interactionStatus.error || 'Unknown error'}`);
            }

            debugLogger.debug(`[ExtremeDeepResearch] Status: ${interactionStatus.status}... (${attempts * 10}s elapsed)`);
        }

        if (!completedInteraction) {
            if (this.isOpenAiAuth()) {
              debugLogger.warn(
                '[ExtremeDeepResearch] Gemini interaction polling timed out under OpenAI/Codex auth. Falling back to model synthesis.',
              );
              return this.runOpenAiFallbackSynthesis(input, _signal);
            }
            throw new Error('Research Agent timed out after 20 minutes.');
        }

        // --- PERSIST INTERACTION ID FOR FOLLOW-UPS ---
        const stateDir = path.join(this.config.getProjectRoot(), '.phill', 'state', 'extreme-deep-cognition');
        if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
        }
        const stateFile = path.join(stateDir, 'latest_interaction.json');
        fs.writeFileSync(stateFile, JSON.stringify({
            interactionId: interactionId,
            timestamp: new Date().toISOString(),
            query: input.substring(0, 50)
        }, null, 2));

        // --- EXTRACT OUTPUT ---
        const output = completedInteraction.outputs[completedInteraction.outputs.length - 1];
        const finalReport = output.text;

        return {
            llmContent: JSON.stringify({
                interactionId: interactionId,
                report: finalReport,
                status: 'success'
            }, null, 2),
            returnDisplay: `### External Deep Research Report (ID: ${interactionId})\n\n${finalReport}\n\n*Source citation and technical data synthesized.*`,
        };

    } catch (err: any) {
        debugLogger.error(`[ExtremeDeepResearch] Research task failed: ${err.message}`);
        if (this.isOpenAiAuth()) {
          debugLogger.warn(
            '[ExtremeDeepResearch] Falling back to model synthesis after research task failure under OpenAI/Codex auth.',
          );
          return this.runOpenAiFallbackSynthesis(input, _signal);
        }
        throw err;
    }
  }

  getDescription(): string {
    return `Coordinating external Deep Research via Gemini Agent: "${this.params.input.substring(0, 50)}..."`;
  }
}

export class ExtremeDeepResearchTool extends BaseDeclarativeTool<
  ExtremeDeepResearchParams,
  ToolResult
> {
  static readonly Name = EXTREME_DEEP_RESEARCH_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      ExtremeDeepResearchTool.Name,
      'Extreme Deep Research',
      'Autonomous outward-facing research agent for web search, academic papers, and detailed cited reporting. Fused with Phill System 2 for extreme cognition.',
      Kind.Other,
      {
        properties: {
          input: { type: 'string', description: 'The research query or prompt with internal context scaffolding.' },
          agent: { 
            type: 'string', 
            default: 'deep-research-pro-preview-12-2025' ,
            description: 'The specific research agent to use.'
          },
          previousInteractionId: { 
              type: 'string', 
              description: 'Optional ID of a previous research task for follow-up questions.' 
          },
          fileSearchStoreNames: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional file search stores to include in research.'
          }
        },
        required: ['input'],
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: ExtremeDeepResearchParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ExtremeDeepResearchParams, ToolResult> {
    return new ExtremeDeepResearchInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
