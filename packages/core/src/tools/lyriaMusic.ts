/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LyriaMusicTool — lets Phill generate real-time AI music via Lyria RealTime.
 *
 * Supported actions:
 *   play    — start / restart a new Lyria session with optional prompts & BPM
 *   pause   — pause the current session
 *   resume  — resume a paused session
 *   stop    — stop and close the session
 *   prompt  — hot-swap weighted prompts during playback
 *   status  — return current session state without changing it
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolResult } from './tools.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { LyriaService } from '../services/lyriaService.js';
import type {
  LyriaPrompt,
  LyriaGenerationConfig,
} from '../services/lyriaService.js';
import { LYRIA_MUSIC_TOOL_NAME } from './tool-names.js';

export interface LyriaMusicParams {
  /** What to do: play | pause | resume | stop | prompt | status */
  action: 'play' | 'pause' | 'resume' | 'stop' | 'prompt' | 'status';
  /** One or more style / mood descriptors for the music */
  prompts?: Array<{ text: string; weight?: number }>;
  /** Target BPM (20–200) */
  bpm?: number;
  /** Generation temperature 0.0–2.0 */
  temperature?: number;
  /** Sample rate Hz — 44100 (default) or 48000 */
  sampleRateHz?: number;
}

export class LyriaMusicTool extends BaseDeclarativeTool<
  LyriaMusicParams,
  ToolResult
> {
  static readonly Name = LYRIA_MUSIC_TOOL_NAME;

  constructor(messageBus: MessageBus) {
    super(
      LyriaMusicTool.Name,
      'Lyria Music Generator',
      [
        'Generate real-time AI music using Google Lyria RealTime.',
        'Use action="play" with prompts to start music.',
        'Use action="prompt" to change the style/mood during playback.',
        'Use action="pause", "resume", or "stop" to control playback.',
        'Use action="status" to check the current session state.',
      ].join(' '),
      Kind.Read,
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['play', 'pause', 'resume', 'stop', 'prompt', 'status'],
            description: 'Playback action to perform.',
          },
          prompts: {
            type: 'array',
            description:
              'Style / mood descriptors for the music. Required for "play" and "prompt".',
            items: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description:
                    'Style description, e.g. "deep house with atmospheric pads"',
                },
                weight: {
                  type: 'number',
                  description: '0.0–1.0 influence weight. Default: 1.0',
                },
              },
              required: ['text'],
            },
          },
          bpm: {
            type: 'number',
            description:
              'Target BPM (20–200). Only used when action is "play".',
          },
          temperature: {
            type: 'number',
            description: 'Creativity 0.0–2.0. Only used when action is "play".',
          },
          sampleRateHz: {
            type: 'number',
            description: 'Audio sample rate Hz. Default 44100.',
          },
        },
        required: ['action'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: LyriaMusicParams,
    messageBus: MessageBus,
    toolName?: string,
    displayName?: string,
  ) {
    return new LyriaMusicInvocation(
      params,
      messageBus,
      toolName ?? this.name,
      displayName ?? this.displayName,
    );
  }
}

class LyriaMusicInvocation extends BaseToolInvocation<
  LyriaMusicParams,
  ToolResult
> {
  constructor(
    params: LyriaMusicParams,
    messageBus: MessageBus,
    toolName: string,
    displayName: string,
  ) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    const { action, prompts } = this.params;
    const promptText = prompts?.[0]?.text ?? '';
    switch (action) {
      case 'play':
        return `Starting Lyria music generation${promptText ? ` — "${promptText}"` : ''}`;
      case 'pause':
        return 'Pausing Lyria music';
      case 'resume':
        return 'Resuming Lyria music';
      case 'stop':
        return 'Stopping Lyria music';
      case 'prompt':
        return `Updating Lyria music style — "${promptText}"`;
      case 'status':
        return 'Checking Lyria music status';
      default:
        return 'Lyria music action';
    }
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const lyria = LyriaService.getInstance(process.env['GEMINI_API_KEY'] ?? '');
    const { action, prompts, bpm, temperature, sampleRateHz } = this.params;

    try {
      switch (action) {
        case 'play': {
          const musicPrompts: LyriaPrompt[] =
            (prompts ?? []).length > 0
              ? (prompts as LyriaPrompt[])
              : [{ text: 'Ambient, flowing, relaxing music', weight: 1.0 }];

          const genConfig: LyriaGenerationConfig = {
            bpm: bpm ?? 120,
            temperature: temperature ?? 1.0,
            sampleRateHz: sampleRateHz ?? 44100,
          };

          await lyria.connect(musicPrompts, genConfig);
          return {
            llmContent: `Lyria music started. Prompts: ${musicPrompts.map((p) => `"${p.text}"`).join(', ')}. BPM: ${genConfig.bpm}, Temp: ${genConfig.temperature}.`,
            returnDisplay: '🎵 Lyria music is now playing.',
          };
        }

        case 'pause': {
          await lyria.pause();
          return {
            llmContent: 'Lyria music paused.',
            returnDisplay: '⏸ Music paused.',
          };
        }

        case 'resume': {
          await lyria.resume();
          return {
            llmContent: 'Lyria music resumed.',
            returnDisplay: '▶️ Music resumed.',
          };
        }

        case 'stop': {
          await lyria.stop();
          return {
            llmContent: 'Lyria music stopped and session closed.',
            returnDisplay: '⏹ Music stopped.',
          };
        }

        case 'prompt': {
          if (!prompts?.length) {
            return {
              llmContent: 'No prompts provided for the "prompt" action.',
              returnDisplay: 'Error: prompts required.',
              error: { message: 'prompts required for action="prompt"' },
            };
          }
          await lyria.setPrompts(prompts as LyriaPrompt[]);
          return {
            llmContent: `Lyria prompts updated: ${prompts.map((p) => `"${p.text}"`).join(', ')}.`,
            returnDisplay: `🎵 Style updated: ${prompts[0]?.text}`,
          };
        }

        case 'status': {
          const statusMsg = `Status: ${lyria.status}${lyria.lastError ? ` | Error: ${lyria.lastError}` : ''}`;
          return { llmContent: statusMsg, returnDisplay: statusMsg };
        }

        default: {
          return {
            llmContent: `Unknown Lyria action: ${action as string}`,
            returnDisplay: `Error: unknown action "${action as string}"`,
            error: { message: `Unknown action: ${action as string}` },
          };
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        llmContent: `Lyria action "${action}" failed: ${msg}`,
        returnDisplay: `❌ Error: ${msg}`,
        error: { message: msg },
      };
    }
  }
}
