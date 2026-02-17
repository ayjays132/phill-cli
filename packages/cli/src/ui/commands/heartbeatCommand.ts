/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageActionReturn } from 'phill-cli-core';
import { SettingScope } from '../../config/settings.js';
import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';

function getIntervalSeconds(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 300;
  }
  return Math.max(10, Math.floor(value as number));
}

function getPrompt(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : 'continue';
}

export const heartbeatCommand: SlashCommand = {
  name: 'heartbeat',
  description:
    'Manage background heartbeat that periodically asks the model to continue',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'status',
      description: 'Show heartbeat status',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const hb = context.services.settings.merged.general.heartbeat;
        const enabled = hb?.enabled === true;
        const intervalSeconds = getIntervalSeconds(hb?.intervalSeconds);
        const prompt = getPrompt(hb?.prompt);
        return {
          type: 'message',
          messageType: 'info',
          content: `Heartbeat: ${enabled ? 'enabled' : 'disabled'}\nintervalSeconds: ${intervalSeconds}\nprompt: ${prompt}`,
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'on',
      description: 'Enable heartbeat',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        context.services.settings.setValue(
          SettingScope.User,
          'general.heartbeat.enabled',
          true,
        );
        return {
          type: 'message',
          messageType: 'info',
          content: 'Heartbeat enabled.',
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'off',
      description: 'Disable heartbeat',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        context.services.settings.setValue(
          SettingScope.User,
          'general.heartbeat.enabled',
          false,
        );
        return {
          type: 'message',
          messageType: 'info',
          content: 'Heartbeat disabled.',
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'interval',
      description: 'Set heartbeat interval in seconds: /heartbeat interval <n>',
      kind: CommandKind.BUILT_IN,
      autoExecute: false,
      action: async (context, args) => {
        const parsed = Number.parseInt(args.trim(), 10);
        if (!Number.isFinite(parsed)) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /heartbeat interval <seconds>',
          } satisfies MessageActionReturn;
        }
        const intervalSeconds = getIntervalSeconds(parsed);
        context.services.settings.setValue(
          SettingScope.User,
          'general.heartbeat.intervalSeconds',
          intervalSeconds,
        );
        return {
          type: 'message',
          messageType: 'info',
          content: `Heartbeat interval set to ${intervalSeconds} seconds.`,
        } satisfies MessageActionReturn;
      },
    },
    {
      name: 'prompt',
      description:
        'Set heartbeat prompt text: /heartbeat prompt <message text>',
      kind: CommandKind.BUILT_IN,
      autoExecute: false,
      action: async (context, args) => {
        const prompt = getPrompt(args);
        context.services.settings.setValue(
          SettingScope.User,
          'general.heartbeat.prompt',
          prompt,
        );
        return {
          type: 'message',
          messageType: 'info',
          content: `Heartbeat prompt set to: ${prompt}`,
        } satisfies MessageActionReturn;
      },
    },
  ],
};
