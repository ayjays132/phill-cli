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
import { DEEP_COGNITION_TOOL_NAME } from '../tool-names.js';

export interface DeepCognitionParams {
  query: string;
  context?: string;
}

class DeepCognitionInvocation extends BaseToolInvocation<
  DeepCognitionParams,
  ToolResult
> {
  constructor(
    _config: Config,
    params: DeepCognitionParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { query, context } = this.params;

    const reasoningTemplate = `
### 1. Decomposition 🧩
- **Goal**: Analyze and plan for: "${query}"
- **Internal Context**: ${context || 'General system state and current project directory.'}
- **Atomic Sub-tasks**:
    - [ ] Phase A: Internal architectural scan and dependency mapping.
    - [ ] Phase B: Logic verification and edge-case simulation.
    - [ ] Phase C: Implementation strategy refinement.

### 2. Hypothesis Generation 💡
- **Approach A (Conservative)**: Use existing patterns and established utilities to minimize risk.
- **Approach B (Optimized)**: Introduce a new abstraction or refactor existing paths for better long-term scalability.
- **Approach C (Experimental)**: Leverage advanced cognitive features or tertiary tools for a novel solution.

### 3. Adversarial Critique 🛡️
- **Critique A**: May introduce technical debt or verbosity.
- **Critique B**: Higher initial implementation cost and complexity.
- **Critique C**: Potential security or stability risks if not properly sandboxed.

### 4. Synthesis & Strategy 💎
- **Recommended Path**: [Synthesized based on project constraints]
- **Immediate Steps**:
    1. Scan relevant files/modules.
    2. Model the state changes.
    3. Execute with Grounded Continuity verification.
`;

    return {
      llmContent: JSON.stringify({
        status: 'reasoning_mode_active',
        query,
        template_applied: true
      }),
      returnDisplay: `## System 2 Reasoning Engine Active\n\n${reasoningTemplate}\n\n*Cognitive load optimized for strategic analysis.*`,
    };
  }

  getDescription(): string {
    return `Performing System 2 reasoning and decomposition for: "${this.params.query.substring(0, 50)}..."`;
  }
}

export class DeepCognitionTool extends BaseDeclarativeTool<
  DeepCognitionParams,
  ToolResult
> {
  static readonly Name = DEEP_COGNITION_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      DeepCognitionTool.Name,
      'Deep Cognition (Base)',
      'Activates System 2 reasoning protocol for inward-facing codebase analysis, planning, and adversarial critique.',
      Kind.Think,
      {
        properties: {
          query: { type: 'string', description: 'The complex problem or plan to reason about.' },
          context: { type: 'string', description: 'Additional internal context or file paths to prioritize.' }
        },
        required: ['query'],
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: DeepCognitionParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<DeepCognitionParams, ToolResult> {
    return new DeepCognitionInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
