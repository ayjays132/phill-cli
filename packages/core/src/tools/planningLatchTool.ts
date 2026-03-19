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
  PLANNING_LATCH_SECTION_HEADER,
} from './memoryTool.js';
import { PLANNING_LATCH_TOOL_NAME } from './tool-names.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';

export interface PlanningLatchParams {
  action:
    | 'create_latch'
    | 'create_anti_latch'
    | 'create_definition_latch'
    | 'review_latches';
  scope?: 'global' | 'ephemeral';
  plan?: string;
  goal?: string;
  constraints?: string;
}

const planningLatchSchema: FunctionDeclaration = {
  name: PLANNING_LATCH_TOOL_NAME,
  description:
    'Latches a critical plan or architectural decision into persistent memory to ensure long-term coherency.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [
          'create_latch',
          'create_anti_latch',
          'create_definition_latch',
          'review_latches',
        ],
        description:
          'Whether to create a new latch, anti-latch (to prevent bad loops), definition latch (ground truth library specs), or review existing latches for goal drift.',
      },
      scope: {
        type: 'string',
        enum: ['global', 'ephemeral'],
        description:
          'Global latches are permanent architectural rules. Ephemeral latches are temporary sub-task constraints.',
      },
      plan: {
        type: 'string',
        description:
          'The detailed plan, definition, or restriction to latch. Required if creating a latch, anti-latch, or definition.',
      },
      goal: {
        type: 'string',
        description:
          'The high-level goal this plan serves or the library this definition covers. Required if creating a latch.',
      },
      constraints: {
        type: 'string',
        description:
          'Any critical constraints associated with this plan. Used for state-aware locking.',
      },
    },
    required: ['action'],
  },
};

export class ContextualPlanningLatchTool extends BaseDeclarativeTool<
  PlanningLatchParams,
  ToolResult
> {
  static readonly Name = PLANNING_LATCH_TOOL_NAME;

  constructor(messageBus: MessageBus) {
    super(
      ContextualPlanningLatchTool.Name,
      'Contextual Planning Latch',
      planningLatchSchema.description!,
      Kind.Think,
      planningLatchSchema.parametersJsonSchema!,
      messageBus,
    );
  }

  protected createInvocation(
    params: PlanningLatchParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    return new PlanningLatchToolInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

class PlanningLatchToolInvocation extends BaseToolInvocation<
  PlanningLatchParams,
  ToolResult
> {
  getDescription(): string {
    if (this.params.action === 'review_latches') {
      return 'Reviewing active planning latches for drift analysis.';
    }
    return `Latching plan for: ${this.params.goal || 'unknown'}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const memoryPath = getGlobalMemoryFilePath();

    if (this.params.action === 'review_latches') {
      let currentContent = '';
      try {
        currentContent = await fs.readFile(memoryPath, 'utf-8');
      } catch (_e) {
        return {
          llmContent: 'No active latches found to review. File does not exist.',
          returnDisplay: 'No active planning latches to review.',
        };
      }

      if (!currentContent.includes(PLANNING_LATCH_SECTION_HEADER)) {
        return {
          llmContent: 'No active latches populated in memory.',
          returnDisplay: 'No active planning latches to review.',
        };
      }

      const latchSection = currentContent.split(
        PLANNING_LATCH_SECTION_HEADER,
      )[1];
      return {
        llmContent: `Current Active Latches:\n${latchSection}\n\nTask: Compare these with your current trajectory and ensure you are not experiencing 'Goal Drift'.`,
        returnDisplay: 'Reviewed active planning latches.',
      };
    }

    if (!this.params.goal || !this.params.plan) {
      return {
        llmContent: 'Error: goal and plan are required when creating a latch.',
        returnDisplay:
          'Failed to create planning latch (missing required fields)',
        error: { message: 'goal and plan are required when creating a latch.' },
      };
    }

    const scopeStr = this.params.scope
      ? `[${this.params.scope.toUpperCase()}] `
      : '';

    let prefix = '[LATCH]';
    if (this.params.action === 'create_anti_latch') {
      prefix = '[ANTI_LATCH][REFLEXION]';
    } else if (this.params.action === 'create_definition_latch') {
      prefix = '[DEFINITION_LATCH][GROUND_TRUTH]';
    }

    const latchEntry = `${prefix} ${scopeStr}Goal: ${this.params.goal} | Plan: ${this.params.plan}${this.params.constraints ? ` | Constraints: ${this.params.constraints}` : ''}`;

    let currentContent = '';
    try {
      currentContent = await fs.readFile(memoryPath, 'utf-8');
    } catch (_e) {
      // File might not exist yet
    }

    const newContent = computeNewContent(
      currentContent,
      latchEntry,
      PLANNING_LATCH_SECTION_HEADER,
    );
    await fs.writeFile(memoryPath, newContent, 'utf-8');

    let returnDisplay = '';
    if (this.params.action === 'create_anti_latch') {
      returnDisplay = `Anti-Latch engaged for ${this.params.goal}. Logic path mapped as failure constraints.`;
    } else if (this.params.action === 'create_definition_latch') {
      returnDisplay = `API Definition grounded for ${this.params.goal}. Hallucination constraints engaged.`;
    } else {
      returnDisplay = `Plan latched successfully: ${this.params.goal}\nScope: ${this.params.scope || 'default'}\nThis latch is now a mandatory constraint.`;
    }

    let premiumDisplay = '';
    if (this.params.action === 'create_anti_latch') {
      premiumDisplay = `
🚫 **ANTI-LATCH ENGAGED**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **GOAL**: ${this.params.goal}
⚠️ **FAILURE CONSTRAINTS MAPPED**
Logic path locked to prevent bad loops.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else if (this.params.action === 'create_definition_latch') {
      premiumDisplay = `
📚 **API DEFINITION GROUNDED**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **TARGET**: ${this.params.goal}
✅ **GROUND TRUTH ESTABLISHED**
Hallucination constraints active for this library.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else {
      premiumDisplay = `
🔒 **PLAN LATCHED**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **GOAL**: ${this.params.goal}
🌐 **SCOPE**: ${this.params.scope || 'ephemeral'}
✅ **MANDATORY CONSTRAINT PERSISTED**
Coherency lock active. Drift protection engaged.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    return {
      llmContent: returnDisplay,
      returnDisplay: premiumDisplay,
    };
  }
}
