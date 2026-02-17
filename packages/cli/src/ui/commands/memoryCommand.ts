/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addMemory,
  listMemoryFiles,
  memoryStatus,
  refreshMemory,
  resetMemory,
  restoreMemory,
  showMemory,
} from 'phill-cli-core';
import { SettingScope } from '../../config/settings.js';
import { MessageType } from '../types.js';
import type { SlashCommand, SlashCommandActionReturn } from './types.js';
import { CommandKind } from './types.js';

export const memoryCommand: SlashCommand = {
  name: 'memory',
  description: 'Commands for interacting with memory',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'show',
      description: 'Show the current memory contents',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const config = context.services.config;
        if (!config) return;
        const result = showMemory(config);

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: result.content,
          },
          Date.now(),
        );
      },
    },
    {
      name: 'add',
      description: 'Add content to the memory',
      kind: CommandKind.BUILT_IN,
      autoExecute: false,
      action: (context, args): SlashCommandActionReturn | void => {
        const result = addMemory(args);

        if (result.type === 'message') {
          return result;
        }

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: `Attempting to save to memory: "${args.trim()}"`,
          },
          Date.now(),
        );

        return result;
      },
    },
    {
      name: 'refresh',
      description: 'Refresh the memory from the source',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: 'Refreshing memory from source files...',
          },
          Date.now(),
        );

        try {
          const config = context.services.config;
          if (config) {
            const result = await refreshMemory(config);

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: result.content,
              },
              Date.now(),
            );
          }
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error refreshing memory: ${(error as Error).message}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'status',
      description: 'Show memory load/reset status and fallback file health',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const config = context.services.config;
        if (!config) return;

        try {
          const result = await memoryStatus(config);
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: result.content,
            },
            Date.now(),
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error checking memory status: ${(error as Error).message}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'restore',
      description: 'Ensure fallback PHILL.md exists and reload memory',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const config = context.services.config;
        if (!config) return;

        try {
          const result = await restoreMemory(config);
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: result.content,
            },
            Date.now(),
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error restoring memory: ${(error as Error).message}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'reset',
      description: 'Soft reset memory state, then refresh from files',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const config = context.services.config;
        if (!config) return;

        try {
          const result = await resetMemory(config, 'soft');
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: result.content,
            },
            Date.now(),
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error resetting memory: ${(error as Error).message}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'wipe',
      description: 'Hard wipe memory file/state, recreate fallback, then refresh',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const config = context.services.config;
        if (!config) return;

        try {
          context.services.settings.setValue(
            SettingScope.User,
            'general.heartbeat.enabled',
            false,
          );
          context.services.settings.setValue(
            SettingScope.User,
            'general.heartbeat.intervalSeconds',
            300,
          );
          context.services.settings.setValue(
            SettingScope.User,
            'general.heartbeat.prompt',
            'continue',
          );
          const result = await resetMemory(config, 'hard');
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: result.content,
            },
            Date.now(),
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Error wiping memory: ${(error as Error).message}`,
            },
            Date.now(),
          );
        }
      },
    },
    {
      name: 'list',
      description: 'Lists the paths of the PHILL.md files in use',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const config = context.services.config;
        if (!config) return;
        const result = listMemoryFiles(config);

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: result.content,
          },
          Date.now(),
        );
      },
    },
  ],
};
