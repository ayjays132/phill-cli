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
import type { Config } from '../../config/config.js';
import { MessageBus } from '../../confirmation-bus/message-bus.js';
import { PHILM_STORYBOARD_TOOL_NAME } from '../tool-names.js';

export interface ShotPlan {
  subject: string;
  action: string;
  style: string;
  cameraMovement?: string;
  lighting?: string;
  dialogue?: string[];
  sfx?: string[];
}

export interface PhilmStoryboardParams {
  sceneDescription: string;
  shots: ShotPlan[];
}

class PhilmStoryboardInvocation extends BaseToolInvocation<
  PhilmStoryboardParams,
  ToolResult
> {
  constructor(
    params: PhilmStoryboardParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { sceneDescription, shots } = this.params;

    const formattedShots = shots.map((shot, index) => {
        let prompt = `Shot ${index + 1}: ${shot.subject} is ${shot.action}. Style: ${shot.style}.`;
        if (shot.cameraMovement) prompt += ` Camera: ${shot.cameraMovement}.`;
        if (shot.lighting) prompt += ` Lighting: ${shot.lighting}.`;
        if (shot.dialogue && shot.dialogue.length > 0) {
            prompt += ` Dialogue: ${shot.dialogue.map(d => `"${d}"`).join(' ')}`;
        }
        if (shot.sfx && shot.sfx.length > 0) {
            prompt += ` SFX: ${shot.sfx.join(', ')}.`;
        }
        return prompt;
    }).join('\n\n');

    const result = {
        masterPrompt: `Master Scene: ${sceneDescription}\n\n${formattedShots}`,
        totalShots: shots.length,
        status: 'planned'
    };

    return {
        llmContent: JSON.stringify(result, null, 2),
        returnDisplay: `Planned a storyboard with ${shots.length} shots for scene: "${sceneDescription.substring(0, 30)}..."`,
    };
  }

  getDescription(): string {
    return `Planning video storyboard for: "${this.params.sceneDescription.substring(0, 50)}..."`;
  }
}

export class PhilmStoryboardTool extends BaseDeclarativeTool<
  PhilmStoryboardParams,
  ToolResult
> {
  static readonly Name = PHILM_STORYBOARD_TOOL_NAME;

  constructor(
    _config: Config,
    messageBus: MessageBus,
  ) {
    super(
      PhilmStoryboardTool.Name,
      'Philm Storyboard Planner',
      'Assists in planning cinematic sequences by breaking down scenes into subjects, actions, and camera movements for Veo 3.1 optimization.',
      Kind.Think,
      {
        properties: {
          sceneDescription: { type: 'string', description: 'Overall description of the scene.' },
          shots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                subject: { type: 'string' },
                action: { type: 'string' },
                style: { type: 'string' },
                cameraMovement: { type: 'string' },
                lighting: { type: 'string' },
                dialogue: { type: 'array', items: { type: 'string' } },
                sfx: { type: 'array', items: { type: 'string' } },
              },
              required: ['subject', 'action', 'style']
            }
          }
        },
        required: ['sceneDescription', 'shots'],
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: PhilmStoryboardParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<PhilmStoryboardParams, ToolResult> {
    return new PhilmStoryboardInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
