/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type MessageActionReturn,
} from 'phill-cli-core';
import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { persistentState } from '../../utils/persistentState.js';

function parseSetupArgs(args: string): {
  name?: string;
  voiceName?: string;
  speechStyle?: string;
} {
  const trimmed = args.trim();
  if (!trimmed) return {};
  const parts = trimmed.split('|').map((p) => p.trim());
  return {
    name: parts[0] || undefined,
    voiceName: parts[1] || undefined,
    speechStyle: parts[2] || undefined,
  };
}

export const identityCommand: SlashCommand = {
  name: 'identity',
  description: 'Manage Phill self identity and voice style',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'show',
      description: 'Show current agent identity',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (ctx) => {
        const service = ctx.services.config!.getAgentIdentityService();
        const identity = await service.getIdentity();
        const content = [
          'Phill Self Identity:',
          `- name: ${identity.name ?? '(unset)'}`,
          `- voiceName: ${identity.voiceName ?? '(unset)'}`,
          `- speechStyle: ${identity.speechStyle ?? '(unset)'}`,
          `- file: ${service.getPath()}`,
        ].join('\n');
        return {
          type: 'message',
          messageType: 'info',
          content,
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'setup',
      description:
        'Set identity: /identity setup <name> | <voiceName> | <speechStyle>',
      kind: CommandKind.BUILT_IN,
      autoExecute: false,
      action: async (ctx, args) => {
        const parsed = parseSetupArgs(args);
        if (!parsed.name) {
          return {
            type: 'message',
            messageType: 'error',
            content:
              'Usage: /identity setup <name> | <voiceName> | <speechStyle>',
          } satisfies MessageActionReturn;
        }
        await ctx.services.config!.getAgentIdentityService().update(parsed);
        persistentState.set('hasSeenAgentIdentityOnboarding', true);
        return {
          type: 'message',
          messageType: 'info',
          content: `Identity updated. name="${parsed.name}"`,
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'learn',
      description: 'Append identity note: /identity learn <text>',
      kind: CommandKind.BUILT_IN,
      autoExecute: false,
      action: async (ctx, args) => {
        const note = args.trim();
        if (!note) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /identity learn <text>',
          } satisfies MessageActionReturn;
        }
        const filePath = await ctx.services.config!.getAgentIdentityService().ensureExists();
        const fs = await import('node:fs/promises');
        await fs.appendFile(filePath, `- ${note}\n`, 'utf-8');
        return {
          type: 'message',
          messageType: 'info',
          content: 'Identity note saved.',
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'reset',
      description: 'Reset self identity to defaults',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (ctx) => {
        await ctx.services.config!.getAgentIdentityService().reset();
        return {
          type: 'message',
          messageType: 'info',
          content: 'Identity reset to defaults.',
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'reset-onboarding',
      description: 'Force the identity setup prompt to show again',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async () => {
        persistentState.set('hasSeenAgentIdentityOnboarding', false);
        return {
          type: 'message',
          messageType: 'info',
          content: 'Identity onboarding reset. The setup prompt will show on next restart.',
        } satisfies MessageActionReturn;
      },
    },
  ],
};
