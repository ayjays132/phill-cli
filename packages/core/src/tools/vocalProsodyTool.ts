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

interface VocalProsodyParams {
  rate?: number;
  pitch?: number;
  volume?: number;
  style?: string;
}

class VocalProsodyInvocation extends BaseToolInvocation<
  VocalProsodyParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: VocalProsodyParams,
    messageBus: MessageBus,
    toolName: string,
    toolDisplayName: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    const settings = [];
    if (this.params.rate !== undefined) settings.push(`rate=${this.params.rate}`);
    if (this.params.pitch !== undefined) settings.push(`pitch=${this.params.pitch}`);
    if (this.params.volume !== undefined) settings.push(`volume=${this.params.volume}`);
    if (this.params.style !== undefined) settings.push(`style="${this.params.style}"`);
    return `Adjusting vocal delivery: ${settings.join(', ')}`;
  }

  async execute(): Promise<ToolResult> {
    const ttsService = TTSService.getInstance(this.config);
    ttsService.updateProsody({
      rate: this.params.rate,
      pitch: this.params.pitch,
      volume: this.params.volume,
      style: this.params.style,
    });

    const display = this.getDescription();
    return {
      llmContent: display,
      returnDisplay: display,
    };
  }
}

export class VocalProsodyTool extends BaseDeclarativeTool<
  VocalProsodyParams,
  ToolResult
> {
  static readonly Name = 'vocal_prosody_controller';

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      VocalProsodyTool.Name,
      'Vocal Prosody Controller',
      "Adjusts the vocal delivery (prosody) of the agent's speech. Use this to change speed, pitch, volume, or emotional tone of the voice response.",
      Kind.Communicate,
      {
        type: 'object',
        properties: {
          rate: {
            type: 'number',
            description: 'Speed of speech. 1.0 is normal, 0.5 is slow, 2.0 is fast.',
          },
          pitch: {
            type: 'number',
            description: 'Pitch of speech. 1.0 is normal, 0.5 is low, 2.0 is high.',
          },
          volume: {
            type: 'number',
            description: 'Volume of speech. 1.0 is normal, 0.0 is silent.',
          },
          style: {
            type: 'string',
            description: 'Additional style/emotional guidance (e.g., "excited", "whispering", "serious", "rapid-fire").',
          },
        },
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: VocalProsodyParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<VocalProsodyParams, ToolResult> {
    return new VocalProsodyInvocation(
      this.config,
      params,
      messageBus,
      toolName ?? this.name,
      toolDisplayName ?? this.displayName,
    );
  }
}