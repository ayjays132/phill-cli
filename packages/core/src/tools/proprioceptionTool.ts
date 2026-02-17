/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolResult } from './tools.js';
import { ProprioceptionService } from '../services/proprioceptionService.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { PROPRIOCEPTION_TOOL_NAME } from './tool-names.js';

export interface ProprioceptionToolParams {
  includeHistory?: boolean;
}

export class ProprioceptionTool extends BaseDeclarativeTool<ProprioceptionToolParams, ToolResult> {
  static readonly Name = PROPRIOCEPTION_TOOL_NAME;

  constructor(messageBus: MessageBus) {
    super(
      ProprioceptionTool.Name,
      'Get Proprioception',
      'Retrieves the model\'s real-time awareness of its host hardware (CPU, memory, pulse).',
      Kind.Think,
      {
        type: 'object',
        properties: {
          includeHistory: { 
            type: 'boolean', 
            description: 'Whether to include a short history of recent vitals (if available).' 
          },
        },
      },
      messageBus
    );
  }

  protected createInvocation(
    params: ProprioceptionToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    return new ProprioceptionToolInvocation(params, messageBus, _toolName, _toolDisplayName);
  }
}

class ProprioceptionToolInvocation extends BaseToolInvocation<ProprioceptionToolParams, ToolResult> {
  getDescription(): string {
    return 'Retrieving system vitals...';
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const service = ProprioceptionService.getInstance();
    const vitals = await service.getVitals();
    const formatted = service.formatVitals(vitals);

    return {
      llmContent: JSON.stringify(vitals, null, 2),
      returnDisplay: formatted,
    };
  }
}
