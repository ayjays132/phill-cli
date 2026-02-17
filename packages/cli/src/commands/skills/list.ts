/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule } from 'yargs';
import { debugLogger, type SkillDefinition } from 'phill-cli-core';
import { loadSettings } from '../../config/settings.js';
import { loadCliConfig, type CliArgs } from '../../config/config.js';
import { exitCli } from '../utils.js';
import chalk from 'chalk';

export async function handleList(args: { all?: boolean }) {
  const workspaceDir = process.cwd();
  const settings = loadSettings(workspaceDir);

  const config = await loadCliConfig(
    settings.merged,
    'skills-list-session',
    {
      debug: false,
    } as Partial<CliArgs> as CliArgs,
    { cwd: workspaceDir },
  );

  // Initialize to trigger extension loading and skill discovery
  debugLogger.log('Initializing config and discovering skills...');
  await config.initialize();
  debugLogger.log('Config initialized. Getting skill manager...');

  const skillManager = config.getSkillManager();
  const allSkills = skillManager.getAllSkills();
  debugLogger.log(`Found ${allSkills.length} total skills.`);

  let skills: SkillDefinition[];
  if (args.all) {
    skills = [...allSkills];
  } else {
    // By default, only show non-built-in enabled skills
    skills = skillManager.getDisplayableSkills().filter((s) => !s.isBuiltin);
  }
  debugLogger.log(`Displaying ${skills.length} skills after filtering.`);

  // Sort skills: non-built-in first, then alphabetically by name
  skills.sort((a, b) => {
    if (a.isBuiltin === b.isBuiltin) {
      return a.name.localeCompare(b.name);
    }
    return a.isBuiltin ? 1 : -1;
  });

  if (skills.length === 0) {
    debugLogger.log('No skills discovered.');
    return;
  }

  debugLogger.log(chalk.bold('Discovered Agent Skills:'));
  debugLogger.log('');

  for (const skill of skills) {
    const status = skill.disabled
      ? chalk.red('[Disabled]')
      : chalk.green('[Enabled]');

    const builtinSuffix = skill.isBuiltin ? chalk.gray(' [Built-in]') : '';

    debugLogger.log(`${chalk.bold(skill.name)} ${status}${builtinSuffix}`);
    debugLogger.log(`  Description: ${skill.description}`);
    debugLogger.log(`  Location:    ${skill.location}`);
    debugLogger.log('');
  }
}

export const listCommand: CommandModule = {
  command: 'list [--all]',
  describe: 'Lists discovered agent skills.',
  builder: (yargs) =>
    yargs.option('all', {
      type: 'boolean',
      description: 'Show all skills, including built-in ones.',
      default: false,
    }),
  handler: async (argv) => {
    await handleList({ all: argv['all'] as boolean });
    await exitCli();
  },
};
