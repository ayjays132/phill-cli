/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CommandKind,
  type CommandContext,
  type SlashCommand,
} from './types.js';
import { type MessageActionReturn, ShellExecutionService } from 'phill-cli-core';
import { persistentState } from '../../utils/persistentState.js';

export const browserCommand: SlashCommand = {
  name: 'browser',
  description: 'Manage browser for automation',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'setup',
      description: 'Install browser dependencies (Playwright)',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context: CommandContext): Promise<MessageActionReturn> => {
        context.ui.addItem({
          type: 'info',
          text: 'Installing browser dependencies. This may take a few minutes...',
        });

        const abortController = new AbortController();
        const { result } = await ShellExecutionService.execute(
          'npx playwright install chromium',
          process.cwd(),
          (event) => {
            if (event.type === 'data') {
              const text = typeof event.chunk === 'string' ? event.chunk : JSON.stringify(event.chunk);
              context.ui.addItem({
                type: 'info',
                text: text.trim(),
              });
            }
          },
          abortController.signal,
          false,
          {
            sanitizationConfig: {
              allowedEnvironmentVariables: ['PATH', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA'],
              blockedEnvironmentVariables: [],
              enableEnvironmentVariableRedaction: true,
            },
          }
        );

        const executionResult = await result;

        if (executionResult.exitCode === 0) {
          persistentState.set('hasSeenBrowserOnboarding', true);
          return {
            type: 'message',
            messageType: 'info',
            content: 'Browser dependencies installed successfully. You can now use /browser start.',
          };
        } else {
          return {
            type: 'message',
            messageType: 'error',
            content: `Failed to install browser dependencies. Exit code: ${executionResult.exitCode}`,
          };
        }
      },
    },
    {
      name: 'start',
      description: 'Start the browser',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context: CommandContext): Promise<MessageActionReturn> => {
        const config = context.services.config;
        if (!config) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Config unavailable.',
          };
        }
        
        try {
            const { BrowserService } = await import('phill-cli-core');
            const browserService = BrowserService.getInstance(config);
            await browserService.startBrowser({ headed: true });
            return {
                type: 'message',
                messageType: 'info',
                content: 'Browser started.',
            };
        } catch (error) {
            return {
                type: 'message',
                messageType: 'error',
                content: `Failed to start browser: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
      },
    },
    {
        name: 'stop',
        description: 'Stop the browser',
        kind: CommandKind.BUILT_IN,
        autoExecute: true,
        action: async (context: CommandContext): Promise<MessageActionReturn> => {
          const config = context.services.config;
          if (!config) {
            return {
              type: 'message',
              messageType: 'error',
              content: 'Config unavailable.',
            };
          }
          
          try {
              const { BrowserService } = await import('phill-cli-core');
              const browserService = BrowserService.getInstance(config);
              await browserService.closeBrowser();
              return {
                  type: 'message',
                  messageType: 'info',
                  content: 'Browser stopped.',
              };
          } catch (error) {
              return {
                  type: 'message',
                  messageType: 'error',
                  content: `Failed to stop browser: ${error instanceof Error ? error.message : String(error)}`,
              };
          }
        },
      },
      {
        name: 'skip',
        description: 'Skip browser setup onboarding reminder',
        kind: CommandKind.BUILT_IN,
        autoExecute: true,
        action: async (): Promise<MessageActionReturn> => {
          persistentState.set('hasSeenBrowserOnboarding', true);
          return {
            type: 'message',
            messageType: 'info',
            content: 'Browser setup onboarding skipped.',
          };
        },
      },
  ],
  action: async (): Promise<MessageActionReturn> => ({
    type: 'message',
    messageType: 'info',
    content: 'Usage: /browser <setup|start|stop|skip>',
  }),
};
