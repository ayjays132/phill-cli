/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  CommandContext,
  SlashCommand,
  SlashCommandActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import { performInit } from 'phill-cli-core';

export const initCommand: SlashCommand = {
  name: 'init',
  description: 'Analyzes the project and creates a tailored PHILL.md file',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (
    context: CommandContext,
    _args: string,
  ): Promise<SlashCommandActionReturn> => {
    if (!context.services.config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }
    const targetDir = context.services.config.getTargetDir();
    const phillMdPath = path.join(targetDir, 'PHILL.md');

    const result = performInit(fs.existsSync(phillMdPath));

    if (result.type === 'submit_prompt') {
      // Create an empty PHILL.md file
      fs.writeFileSync(phillMdPath, '', 'utf8');

      context.ui.addItem(
        {
          type: 'info',
          text: 'Empty PHILL.md created. Now analyzing the project to populate it.',
        },
        Date.now(),
      );
    }

    return result as SlashCommandActionReturn;
  },
};
