/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolResult } from './tools.js';
import { PhysicalPerceptionService } from '../services/physicalPerceptionService.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { PHYSICAL_VISION_TOOL_NAME } from './tool-names.js';
import { Config } from '../config/config.js';

export interface PhysicalVisionToolParams {
  action: 'describe_scene' | 'capture_image' | 'get_status';
}

export class PhysicalVisionTool extends BaseDeclarativeTool<PhysicalVisionToolParams, ToolResult> {
  static readonly Name = PHYSICAL_VISION_TOOL_NAME;

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      PhysicalVisionTool.Name,
      'Physical Presence Analyzer',
      'Provides real-time visual perception of the physical environment (camera, motion, objects).',
      Kind.Think,
      {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['describe_scene', 'capture_image', 'get_status'],
            description: 'Operation to perform: describe the room, capture a frame, or get provider status.' 
          },
        },
        required: ['action'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: PhysicalVisionToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    return new PhysicalVisionToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class PhysicalVisionToolInvocation extends BaseToolInvocation<PhysicalVisionToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: PhysicalVisionToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    const action = this.params.action;
    if (action === 'describe_scene') return 'Analyzing physical environment...';
    if (action === 'capture_image') return 'Capturing physical frame...';
    return 'Retrieving physical vision status...';
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const service = PhysicalPerceptionService.getInstance(this.config);
    const action = this.params.action;

    if (action === 'capture_image' || action === 'describe_scene') {
        // Ensure data is fresh
        await service.updateSceneInfo();
    }

    const data = await service.getSnapshot();

    if (action === 'describe_scene') {
        return {
            llmContent: JSON.stringify(data, null, 2),
            returnDisplay: `Scene: ${data.sceneDescription}\nPeople: ${data.peopleCount ?? 0} | Objects: ${data.objectCount ?? 0}`,
        };
    }

    return {
      llmContent: JSON.stringify(data, null, 2),
      returnDisplay: `Physical Vision: ${data.cameraStatus} | Motion: ${data.motionIntensity ?? 0}%`,
    };
  }
}
