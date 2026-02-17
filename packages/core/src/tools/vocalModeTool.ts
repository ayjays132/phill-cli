/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { TTSService } from '../voice/ttsService.js';
import type { Config } from '../config/config.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolResult,
  type ToolInvocation,
} from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

interface VocalModeParams {
  action: 'activate' | 'deactivate' | 'update';
  personaName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  style?: string;
}

class VocalModeInvocation extends BaseToolInvocation<
  VocalModeParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: VocalModeParams,
    messageBus: MessageBus,
    toolName: string,
    toolDisplayName: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    const { action, personaName } = this.params;
    if (action === 'activate') {
      return `Activating Vocal Mode: "${personaName || 'Custom Persona'}"`;
    }
    if (action === 'deactivate') {
      return 'Deactivating Vocal Mode and returning to standard voice.';
    }
    return `Updating active Vocal Persona: "${personaName || 'Custom'}"`;
  }

  async execute(): Promise<ToolResult> {
    const { action, personaName, rate, pitch, volume, style } = this.params;
    const ttsService = TTSService.getInstance(this.config);

    if (action === 'activate' || action === 'update') {
      const persona = {
        name: personaName || 'Latched Persona',
        rate,
        pitch,
        volume,
        style,
      };
      
      this.config.setVocalPersona(persona);
      
      // Update the underlying TTS service immediately
      ttsService.updateProsody({ rate, pitch, volume, style });
    } else {
      this.config.clearVocalPersona();
      // Reset prosody to defaults
      ttsService.updateProsody({ rate: 1.0, pitch: 1.0, volume: 1.0, style: '' });
    }

    const display = this.getDescription();
    return {
      llmContent: display,
      returnDisplay: display,
    };
  }
}

export class VocalModeTool extends BaseDeclarativeTool<
  VocalModeParams,
  ToolResult
> {
  static readonly Name = 'vocal_mode_manager';

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      VocalModeTool.Name,
      'Vocal Mode Manager',
      "Manages persistent vocal personas. Use this to 'activate' a specific mode (like a character or tone) that stays active until 'deactivated'. Similar to browser mode, this latches your identity.",
      Kind.Communicate,
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['activate', 'deactivate', 'update'],
            description: 'Whether to latch a persona, unlatch it, or update parameters.',
          },
          personaName: {
            type: 'string',
            description: 'The name of the persona (e.g., "Serious Architect", "Rapid Debugger").',
          },
          rate: {
            type: 'number',
            description: 'Speed of speech. 1.0 is normal.',
          },
          pitch: {
            type: 'number',
            description: 'Pitch of speech. 1.0 is normal.',
          },
          volume: {
            type: 'number',
            description: 'Volume of speech. 1.0 is normal.',
          },
          style: {
            type: 'string',
            description: 'Additional style/emotional guidance.',
          },
        },
        required: ['action'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: VocalModeParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<VocalModeParams, ToolResult> {
    return new VocalModeInvocation(
      this.config,
      params,
      messageBus,
      toolName ?? this.name,
      toolDisplayName ?? this.displayName,
    );
  }
}
