/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { FunctionDeclaration } from '@google/genai';
import * as fs from 'node:fs/promises';
import { 
  getGlobalMemoryFilePath, 
  computeNewContent, 
  PLANNING_LATCH_SECTION_HEADER 
} from './memoryTool.js';
import { PLANNING_LATCH_TOOL_NAME } from './tool-names.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';

export interface PlanningLatchParams {
  plan: string;
  goal: string;
  constraints?: string;
}

const planningLatchSchema: FunctionDeclaration = {
  name: PLANNING_LATCH_TOOL_NAME,
  description: 'Latches a critical plan or architectural decision into persistent memory to ensure long-term coherency.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      plan: {
        type: 'string',
        description: 'The detailed plan or decision to latch.',
      },
      goal: {
        type: 'string',
        description: 'The high-level goal this plan serves.',
      },
      constraints: {
        type: 'string',
        description: 'Any critical constraints associated with this plan.',
      },
    },
    required: ['plan', 'goal'],
  },
};

export class ContextualPlanningLatchTool extends BaseDeclarativeTool<PlanningLatchParams, ToolResult> {
  static readonly Name = PLANNING_LATCH_TOOL_NAME;

  constructor(messageBus: MessageBus) {
    super(
      ContextualPlanningLatchTool.Name,
      'Contextual Planning Latch',
      planningLatchSchema.description!,
      Kind.Think,
      planningLatchSchema.parametersJsonSchema!,
      messageBus
    );
  }

  protected createInvocation(
    params: PlanningLatchParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    return new PlanningLatchToolInvocation(params, messageBus, _toolName, _toolDisplayName);
  }
}

class PlanningLatchToolInvocation extends BaseToolInvocation<PlanningLatchParams, ToolResult> {
  getDescription(): string {
    return `Latching plan for: ${this.params.goal}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const latchEntry = `[LATCH] Goal: ${this.params.goal} | Plan: ${this.params.plan}${this.params.constraints ? ` | Constraints: ${this.params.constraints}` : ''}`;
    
    const memoryPath = getGlobalMemoryFilePath();
    let currentContent = '';
    try {
      currentContent = await fs.readFile(memoryPath, 'utf-8');
    } catch (e) {
      // File might not exist yet
    }

    const newContent = computeNewContent(currentContent, latchEntry, PLANNING_LATCH_SECTION_HEADER);
    await fs.writeFile(memoryPath, newContent, 'utf-8');

    return {
      llmContent: `Plan latched successfully: ${this.params.goal}`,
      returnDisplay: `Persisted planning latch for goal: ${this.params.goal}`,
    };
  }
}
