/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind, type ToolResult } from './tools.js';
import type { FunctionDeclaration } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  getGlobalMemoryFilePath,
  computeNewContent,
  USER_IDENTITY_SECTION_HEADER
} from './memoryTool.js';
import { USER_IDENTITY_TOOL_NAME } from './tool-names.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

const userIdentityToolSchema: FunctionDeclaration = {
  name: USER_IDENTITY_TOOL_NAME,
  description: 'Manages valuable personal information about the user (e.g., life goals, health data, preferences) in long-term memory to enable personalized assistance.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      fact: {
        type: 'string',
        description: 'The personal fact or goal to store. Should be concise.',
      },
      category: {
        type: 'string',
        enum: ['health', 'goals', 'preferences', 'identity', 'work'],
        description: 'The category of the information.',
      },
    },
    required: ['fact'],
  },
};

export class UserIdentityTool extends BaseDeclarativeTool<UserIdentityParams, ToolResult> {
  static readonly Name = USER_IDENTITY_TOOL_NAME;

  constructor(messageBus: MessageBus) {
    super(
      UserIdentityTool.Name,
      'User Identity Manager',
      userIdentityToolSchema.description!,
      Kind.Think,
      userIdentityToolSchema.parametersJsonSchema!,
      messageBus
    );
  }

  protected createInvocation(
    params: UserIdentityParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string
  ) {
    return new UserIdentityToolInvocation(params, messageBus, toolName, toolDisplayName);
  }
}

export interface UserIdentityParams {
  fact: string;
  category?: string;
}

class UserIdentityToolInvocation extends BaseToolInvocation<UserIdentityParams, ToolResult> {
  getDescription(): string {
    return `Updating User Identity: ${this.params.fact.substring(0, 30)}...`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const memoryPath = getGlobalMemoryFilePath();
    let currentContent = '';
    try {
      currentContent = await fs.readFile(memoryPath, 'utf-8');
    } catch (e) {
      // File might not exist yet
    }

    const entry = this.params.category 
      ? `[${this.params.category.toUpperCase()}] ${this.params.fact}`
      : this.params.fact;

    const newContent = computeNewContent(currentContent, entry, USER_IDENTITY_SECTION_HEADER);
    
    await fs.mkdir(path.dirname(memoryPath), { recursive: true });
    await fs.writeFile(memoryPath, newContent, 'utf-8');

    return {
      llmContent: `User identity updated: ${entry}`,
      returnDisplay: `Persisted personal fact: ${entry}`,
    };
  }
}
