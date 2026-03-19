/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolResult } from './tools.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { META_COGNITION_TOOL_NAME } from './tool-names.js';
import { coreEvents, CoreEvent } from '../utils/events.js';

export interface MetacognitionToolParams {
  action: 'dream' | 'get_insights' | 'reset_memory';
}

export class MetacognitionTool extends BaseDeclarativeTool<
  MetacognitionToolParams,
  ToolResult
> {
  static readonly Name = META_COGNITION_TOOL_NAME;

  constructor(messageBus: MessageBus) {
    super(
      MetacognitionTool.Name,
      'Meta-Cognitive Processor',
      "Manages the agent's internal cognitive state, including pattern recognition, memory compression (dreaming), and latent insights.",
      Kind.Think,
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['dream', 'get_insights', 'reset_memory'],
            description:
              'Cognitive operation: "dream" to compress experience, "get_insights" to retrieve learned patterns, or "reset_memory" to clear latent state.',
          },
        },
        required: ['action'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: MetacognitionToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    return new MetacognitionToolInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

class MetacognitionToolInvocation extends BaseToolInvocation<
  MetacognitionToolParams,
  ToolResult
> {
  constructor(
    params: MetacognitionToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    const action = this.params.action;
    if (action === 'dream')
      return 'Initiating cognitive memory compression (dreaming)...';
    if (action === 'get_insights')
      return 'Retrieving cognitive insights and learned patterns...';
    return 'Resetting metacognitive memory...';
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const action = this.params.action;

    if (action === 'dream') {
      coreEvents.emit(CoreEvent.MetacognitiveAction, { action: 'dream' });
      return {
        llmContent: 'Cognitive dreaming sequence initiated.',
        returnDisplay:
          '✦ Dreaming state active. Memory compression in progress.',
      };
    } else if (action === 'get_insights') {
      coreEvents.emit(CoreEvent.MetacognitiveAction, { action: 'insights' });
      return {
        llmContent: 'Requesting insights from cognitive engine.',
        returnDisplay:
          '✦ Analysis complete. Check the cognitive line for updated insights.',
      };
    } else {
      coreEvents.emit(CoreEvent.MetacognitiveAction, { action: 'reset' });
      return {
        llmContent: 'Metacognitive state reset.',
        returnDisplay: '✦ Latent memory cleared.',
      };
    }
  }
}
