/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolResult,
} from './tools.js';
import { spawnAsync } from '../utils/shell-utils.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import process from 'node:process';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { ToolErrorType } from './tool-error.js';

const SIGNAL_CLI_PATH_REL = 'tools/signal-cli/bin/signal-cli.bat';
const SIGNAL_CLI_PATH_UNIX = 'tools/signal-cli/bin/signal-cli';

async function getSignalCliPath(): Promise<string> {
  const isWin = process.platform === 'win32';
  const relPath = isWin ? SIGNAL_CLI_PATH_REL : SIGNAL_CLI_PATH_UNIX;
  const absPath = path.resolve(process.cwd(), relPath);
  try {
    await fs.access(absPath);
    return absPath;
  } catch {
    return 'signal-cli';
  }
}

async function runCommand(command: string, args: string[]) {
  return spawnAsync(command, args);
}

// --- Signal Link Tool ---

export interface SignalLinkParams {
  name: string;
}

class SignalLinkToolInvocation extends BaseToolInvocation<
  SignalLinkParams,
  ToolResult
> {
  constructor(
      _config: Config,
      params: SignalLinkParams,
      messageBus: MessageBus,
      _toolName?: string,
      _toolDisplayName?: string,
  ) {
      super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Linking Signal device as "${this.params.name}"`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const cmdPath = await getSignalCliPath();
    try {
      const { stdout } = await runCommand(cmdPath, ['link', '-n', this.params.name]);
      const uri = stdout.trim();
      return {
        llmContent: `Link generated. Please generate a QR code from this URI:\n\n${uri}\n\nScan this with your Signal app (Settings > Linked Devices).`,
        returnDisplay: `Link URI generated for "${this.params.name}".`,
      };
    } catch (e: any) {
      return {
        llmContent: `Failed to generate link: ${e.message}`,
        returnDisplay: `Failed to generate link.`,
        error: { message: e.message, type: ToolErrorType.EXECUTION_FAILED },
      };
    }
  }
}

export class SignalLinkTool extends BaseDeclarativeTool<
  SignalLinkParams,
  ToolResult
> {
  static readonly Name = 'signal_link';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      SignalLinkTool.Name,
      'SignalLink',
      'Link this CLI to your Signal account. Returns a URI to convert to QR code.',
      Kind.Communicate,
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for this device (e.g. "GeminiCLI")',
          },
        },
        required: ['name'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: SignalLinkParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<SignalLinkParams, ToolResult> {
    return new SignalLinkToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

// --- Signal Send Tool ---

export interface SignalSendParams {
  recipient: string;
  message: string;
  attachment?: string;
  account?: string;
}

class SignalSendToolInvocation extends BaseToolInvocation<
  SignalSendParams,
  ToolResult
> {
  constructor(
      _config: Config,
      params: SignalSendParams,
      messageBus: MessageBus,
      _toolName?: string,
      _toolDisplayName?: string,
  ) {
      super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Sending Signal message to ${this.params.recipient}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const cmdPath = await getSignalCliPath();
    const cmdArgs = [];
    if (this.params.account) {
      cmdArgs.push('--account', this.params.account);
    }
    cmdArgs.push('send', '-m', this.params.message);
    if (this.params.attachment) {
      cmdArgs.push('--attachment', this.params.attachment);
    }
    cmdArgs.push(this.params.recipient);

    try {
      const { stdout } = await runCommand(cmdPath, cmdArgs);
      return {
        llmContent: `Message sent to ${this.params.recipient}. Output: ${stdout.trim() || 'Success'}`,
        returnDisplay: `Message sent to ${this.params.recipient}.`,
      };
    } catch (e: any) {
      return {
        llmContent: `Failed to send message: ${e.message}`,
        returnDisplay: `Failed to send message.`,
        error: { message: e.message, type: ToolErrorType.EXECUTION_FAILED },
      };
    }
  }
}

export class SignalSendTool extends BaseDeclarativeTool<
  SignalSendParams,
  ToolResult
> {
  static readonly Name = 'signal_send';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      SignalSendTool.Name,
      'SignalSend',
      'Send a message via Signal.',
      Kind.Communicate,
      {
        type: 'object',
        properties: {
          recipient: {
            type: 'string',
            description: 'Phone number of recipient (e.g. +1555...)',
          },
          message: {
            type: 'string',
            description: 'Message text',
          },
          attachment: {
            type: 'string',
            description: 'Path to attachment file',
          },
          account: {
            type: 'string',
            description: 'Sender phone number (optional)',
          },
        },
        required: ['recipient', 'message'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: SignalSendParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<SignalSendParams, ToolResult> {
    return new SignalSendToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

// --- Signal Receive Tool ---

export interface SignalReceiveParams {
  account?: string;
  json?: boolean;
}

class SignalReceiveToolInvocation extends BaseToolInvocation<
  SignalReceiveParams,
  ToolResult
> {
  constructor(
      _config: Config,
      params: SignalReceiveParams,
      messageBus: MessageBus,
      _toolName?: string,
      _toolDisplayName?: string,
  ) {
      super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Receiving Signal messages...`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const cmdPath = await getSignalCliPath();
    const cmdArgs = [];
    if (this.params.account) {
      cmdArgs.push('--account', this.params.account);
    }
    cmdArgs.push('receive');
    if (this.params.json) {
      cmdArgs.push('--json');
    }

    try {
      const { stdout } = await runCommand(cmdPath, cmdArgs);
      return {
        llmContent: stdout.trim() || 'No new messages.',
        returnDisplay: `checked for messages.`,
      };
    } catch (e: any) {
      return {
        llmContent: `Failed to receive messages: ${e.message}`,
        returnDisplay: `Failed to receive messages.`,
        error: { message: e.message, type: ToolErrorType.EXECUTION_FAILED },
      };
    }
  }
}

export class SignalReceiveTool extends BaseDeclarativeTool<
  SignalReceiveParams,
  ToolResult
> {
  static readonly Name = 'signal_receive';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      SignalReceiveTool.Name,
      'SignalReceive',
      'Receive pending Signal messages.',
      Kind.Communicate,
      {
        type: 'object',
        properties: {
          account: {
            type: 'string',
            description: 'Account phone number (optional)',
          },
          json: {
            type: 'boolean',
            description: 'Output in JSON format',
          },
        },
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: SignalReceiveParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<SignalReceiveParams, ToolResult> {
    return new SignalReceiveToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
