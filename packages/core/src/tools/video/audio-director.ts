/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ToolInvocation,
  ToolResult,
} from '../tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
} from '../tools.js';
import { PHILM_AUDIO_DIRECTOR_TOOL_NAME } from '../tool-names.js';
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
import type { Config } from '../../config/config.js';

export interface PhilmAudioDirectorParams {
  dialogueLines: string[];
  ambientDescription: string;
  dynamicSFX: string[];
}

class PhilmAudioDirectorInvocation extends BaseToolInvocation<
  PhilmAudioDirectorParams,
  ToolResult
> {
  constructor(
    params: PhilmAudioDirectorParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { dialogueLines, ambientDescription, dynamicSFX } = this.params;

    const audioPrompt = [
        ...dialogueLines.map(line => `"${line}"`),
        `Ambient: ${ambientDescription}`,
        ...dynamicSFX.map(sfx => `SFX: ${sfx}`)
    ].join('. ');

    const result = {
        audioPromptSegment: audioPrompt,
        status: 'directed'
    };

    return {
        llmContent: JSON.stringify(result, null, 2),
        returnDisplay: `Generated audio cue segment: "${audioPrompt.substring(0, 50)}..."`,
    };
  }

  getDescription(): string {
    return `Directing audio cues for video production.`;
  }
}

export class PhilmAudioDirectorTool extends BaseDeclarativeTool<
  PhilmAudioDirectorParams,
  ToolResult
> {
  static readonly Name = PHILM_AUDIO_DIRECTOR_TOOL_NAME;

  constructor(
    _config: Config,
    messageBus: MessageBus,
  ) {
    super(
      PhilmAudioDirectorTool.Name,
      'Philm Audio Director',
      'Optimizes audio cues (dialogue, SFX, ambient noise) for inclusion in Veo 3.1 video generation prompts.',
      Kind.Think,
      {
        properties: {
          dialogueLines: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Specific lines of dialogue to be spoken.' 
          },
          ambientDescription: { 
              type: 'string', 
              description: 'Description of the background soundscape.' 
          },
          dynamicSFX: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Specific sound events (e.g., tires screeching, wind howling).' 
          },
        },
        required: ['dialogueLines', 'ambientDescription', 'dynamicSFX'],
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: PhilmAudioDirectorParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<PhilmAudioDirectorParams, ToolResult> {
    return new PhilmAudioDirectorInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
