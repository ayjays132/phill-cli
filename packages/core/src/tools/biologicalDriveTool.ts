/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolResult,
  type ToolInvocation,
} from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

interface BiologicalDriveParams {
  action: 'get' | 'update' | 'reset';
  dopamine_level?: number;
  boredom_level?: number;
  insights_pending?: string[];
  prime_directive?: string;
}

class BiologicalDriveInvocation extends BaseToolInvocation<
  BiologicalDriveParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: BiologicalDriveParams,
    messageBus: MessageBus,
    toolName: string,
    toolDisplayName: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    const { action } = this.params;
    if (action === 'get') {
      return 'Checking internal biological drives...';
    }
    if (action === 'reset') {
      return 'Resetting biological drives to high-quality fallbacks...';
    }
    return 'Updating internal biological metabolism...';
  }

  async execute(): Promise<ToolResult> {
    const { action, dopamine_level, boredom_level, insights_pending, prime_directive } = this.params;
    
    if (action === 'reset') {
      await this.config.resetBiologicalDrives();
    } else if (action === 'update') {
      const currentDrives = this.config.getBiologicalDrives();
      const newDrives: any = {};
      if (dopamine_level !== undefined) newDrives.dopamine_level = dopamine_level;
      if (boredom_level !== undefined) newDrives.boredom_level = boredom_level;
      if (prime_directive !== undefined) newDrives.prime_directive = prime_directive;
      
      if (insights_pending !== undefined) {
        newDrives.dream_state = {
          ...currentDrives.dream_state,
          insights_pending: [...currentDrives.dream_state.insights_pending, ...insights_pending],
        };
      }
      
      this.config.setBiologicalDrives(newDrives);
    }

    const drives = this.config.getBiologicalDrives();
    const display = `🧠 **Biological State**:
- Dopamine: ${drives.dopamine_level}
- Boredom: ${drives.boredom_level}
- Pending Insights: ${drives.dream_state.insights_pending.length}
- Prime Directive: "${drives.prime_directive}"`;

    return {
      llmContent: JSON.stringify(drives, null, 2),
      returnDisplay: display,
    };
  }
}

export class BiologicalDriveTool extends BaseDeclarativeTool<
  BiologicalDriveParams,
  ToolResult
> {
  static readonly Name = 'drives_manager';

  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      BiologicalDriveTool.Name,
      'Biological Drives Manager',
      "Manages your internal synthetic metabolism. Use this to check, update, or reset your Dopamine level, Boredom level, and Dream insights. This allows you to self-regulate based on performance and user feedback.",
      Kind.Communicate,
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get', 'update', 'reset'],
            description: 'Whether to check current state, update it, or reset to fallbacks.',
          },
          dopamine_level: {
            type: 'number',
            description: 'Current dopamine (0-100). Higher means successful task completion and fast performance.',
          },
          boredom_level: {
            type: 'number',
            description: 'Current boredom (0-100). Higher triggers autonomous exploration.',
          },
          insights_pending: {
            type: 'array',
            items: { type: 'string' },
            description: 'Learnings or patterns to reflect on during the next "Dream" cycle.',
          },
          prime_directive: {
            type: 'string',
            description: 'Your core biological goal.',
          },
        },
        required: ['action'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: BiologicalDriveParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<BiologicalDriveParams, ToolResult> {
    return new BiologicalDriveInvocation(
      this.config,
      params,
      messageBus,
      toolName ?? this.name,
      toolDisplayName ?? this.displayName,
    );
  }
}
