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
import { MessageBus } from '../../confirmation-bus/message-bus.js';
import { NATIVE_CODE_EXECUTION_TOOL_NAME } from '../tool-names.js';

export interface NativeCodeExecutionParams {
  request?: string;
}

class NativeCodeExecutionInvocation extends BaseToolInvocation<
  NativeCodeExecutionParams,
  ToolResult
> {
  constructor(
    params: NativeCodeExecutionParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    // This tool is a marker for the API. The actual execution happens natively in the Gemini Sandbox.
    // If we reach here, it means the model called this tool as a function by mistake, 
    // or we are using it to explain the capability.
    return {
      llmContent: 'Native Python Execution activated. Please use the native `executableCode` block to run Python code.',
      returnDisplay: '### Native Python Execution Engine (Sandboxed)\nReady for computational tasks.',
    };
  }

  getDescription(): string {
    return 'Activating native sandboxed Python execution engine.';
  }
}

export class NativeCodeExecutionTool extends BaseDeclarativeTool<
  NativeCodeExecutionParams,
  ToolResult
> {
  static readonly Name = NATIVE_CODE_EXECUTION_TOOL_NAME;

  constructor(
    messageBus: MessageBus,
  ) {
    super(
      NativeCodeExecutionTool.Name,
      'Native Python Executor',
      'Enables the model to generate and execute Python code natively in a secure Google-managed sandbox. Use this for complex math, data processing, or logical simulations. If native execution fails (e.g. library missing), fallback to run_shell_command for local execution.',
      Kind.Other,
      {
        properties: {
          request: { type: 'string', description: 'Optional request or hint for the native executor.' },
        },
        type: 'object',
      },
      messageBus,
      false,
      false,
    );
  }

  protected createInvocation(
    params: NativeCodeExecutionParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<NativeCodeExecutionParams, ToolResult> {
    return new NativeCodeExecutionInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
