/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  type CommandContext,
  type SlashCommand,
  type SlashCommandActionReturn,
  CommandKind,
} from './types.js';
import {
  MessageType,
  type HistoryItemSkillsList,
  type HistoryItemInfo,
} from '../types.js';
import { SettingScope } from '../../config/settings.js';
import { enableSkill, disableSkill } from '../../utils/skillSettings.js';
import { renderSkillActionFeedback } from '../../utils/skillUtils.js';
import { Storage } from 'phill-cli-core';
// import open from 'open'; // We'll need to see if we can use this or if we need a utility wrapper

async function listAction(
  context: CommandContext,
  args: string,
): Promise<void | SlashCommandActionReturn> {
  const subArgs = args.trim().split(/\s+/);

  // Default to SHOWING descriptions. The user can hide them with 'nodesc'.
  let useShowDescriptions = true;
  // Default to SHOWING ALL (built-in + user). The user can filter with 'user' or 'builtin' if they want,
  // but for now we just show everything by default as requested.
  // We'll add a flag to hide built-ins if needed: --hide-builtin
  let showAll = true; 

  for (const arg of subArgs) {
    if (arg === 'nodesc' || arg === '--nodesc') {
      useShowDescriptions = false;
    } else if (arg === 'user' || arg === '--user') {
       // If user explicitly asks for user skills, we filter out built-ins
       showAll = false;
    }
  }

  const skillManager = context.services.config?.getSkillManager();
  if (!skillManager) {
    context.ui.addItem({
      type: MessageType.ERROR,
      text: 'Could not retrieve skill manager.',
    });
    return;
  }

  const skills = showAll
    ? skillManager.getAllSkills()
    : skillManager.getAllSkills().filter((s) => !s.isBuiltin);

  const skillsListItem: HistoryItemSkillsList = {
    type: MessageType.SKILLS_LIST,
    skills: skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      disabled: skill.disabled,
      location: skill.location,
      body: skill.body,
      isBuiltin: skill.isBuiltin,
    })),
    showDescriptions: useShowDescriptions,
  };

  context.ui.addItem(skillsListItem);
}

async function disableAction(
  context: CommandContext,
  args: string,
): Promise<void | SlashCommandActionReturn> {
  const skillName = args.trim();
  if (!skillName) {
    context.ui.addItem({
      type: MessageType.ERROR,
      text: 'Please provide a skill name to disable.',
    });
    return;
  }
  const skillManager = context.services.config?.getSkillManager();
  if (skillManager?.isAdminEnabled() === false) {
    context.ui.addItem(
      {
        type: MessageType.ERROR,
        text: 'Agent skills are disabled by your admin.',
      },
      Date.now(),
    );
    return;
  }

  const skill = skillManager?.getSkill(skillName);
  if (!skill) {
    context.ui.addItem(
      {
        type: MessageType.ERROR,
        text: `Skill "${skillName}" not found.`,
      },
      Date.now(),
    );
    return;
  }

  const scope = context.services.settings.workspace.path
    ? SettingScope.Workspace
    : SettingScope.User;

  const result = disableSkill(context.services.settings, skillName, scope);

  let feedback = renderSkillActionFeedback(
    result,
    (label, path) => `${label} (${path})`,
  );
  if (result.status === 'success' || result.status === 'no-op') {
    feedback +=
      ' You can run "/skillforge reload" to refresh your current instance.';
  }

  context.ui.addItem({
    type: MessageType.INFO,
    text: feedback,
  });
}

async function enableAction(
  context: CommandContext,
  args: string,
): Promise<void | SlashCommandActionReturn> {
  const skillName = args.trim();
  if (!skillName) {
    context.ui.addItem({
      type: MessageType.ERROR,
      text: 'Please provide a skill name to enable.',
    });
    return;
  }

  const skillManager = context.services.config?.getSkillManager();
  if (skillManager?.isAdminEnabled() === false) {
    context.ui.addItem(
      {
        type: MessageType.ERROR,
        text: 'Agent skills are disabled by your admin.',
      },
      Date.now(),
    );
    return;
  }

  const result = enableSkill(context.services.settings, skillName);

  let feedback = renderSkillActionFeedback(
    result,
    (label, path) => `${label} (${path})`,
  );
  if (result.status === 'success' || result.status === 'no-op') {
    feedback +=
      ' You can run "/skillforge reload" to refresh your current instance.';
  }

  context.ui.addItem({
    type: MessageType.INFO,
    text: feedback,
  });
}

async function reloadAction(
  context: CommandContext,
): Promise<void | SlashCommandActionReturn> {
  const config = context.services.config;
  if (!config) {
    context.ui.addItem({
      type: MessageType.ERROR,
      text: 'Could not retrieve configuration.',
    });
    return;
  }

  const skillManager = config.getSkillManager();
  const beforeNames = new Set(skillManager.getSkills().map((s) => s.name));

  const startTime = Date.now();
  let pendingItemSet = false;
  const pendingTimeout = setTimeout(() => {
    context.ui.setPendingItem({
      type: MessageType.INFO,
      text: 'Reloading agent skills...',
    });
    pendingItemSet = true;
  }, 100);

  try {
    await config.reloadSkills();

    clearTimeout(pendingTimeout);
    if (pendingItemSet) {
      // If we showed the pending item, make sure it stays for at least 500ms
      // total to avoid a "flicker" where it appears and immediately disappears.
      const elapsed = Date.now() - startTime;
      const minVisibleDuration = 500;
      if (elapsed < minVisibleDuration) {
        await new Promise((resolve) =>
          setTimeout(resolve, minVisibleDuration - elapsed),
        );
      }
      context.ui.setPendingItem(null);
    }

    const afterSkills = skillManager.getSkills();
    const afterNames = new Set(afterSkills.map((s) => s.name));

    const added = afterSkills.filter((s) => !beforeNames.has(s.name));
    const removedCount = [...beforeNames].filter(
      (name) => !afterNames.has(name),
    ).length;

    let successText = 'Agent skills reloaded successfully.';
    const details: string[] = [];

    if (added.length > 0) {
      details.push(
        `${added.length} newly available skill${added.length > 1 ? 's' : ''}`,
      );
    }
    if (removedCount > 0) {
      details.push(
        `${removedCount} skill${removedCount > 1 ? 's' : ''} no longer available`,
      );
    }

    if (details.length > 0) {
      successText += ` ${details.join(' and ')}.`;
    }

    context.ui.addItem({
      type: 'info',
      text: successText,
      icon: '✓ ',
      color: 'green',
    } as HistoryItemInfo);
  } catch (error) {
    clearTimeout(pendingTimeout);
    if (pendingItemSet) {
      context.ui.setPendingItem(null);
    }
    context.ui.addItem({
      type: MessageType.ERROR,
      text: `Failed to reload skills: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function editAction(
    context: CommandContext,
    args: string,
): Promise<void | SlashCommandActionReturn> {
    const skillName = args.trim();
    if (!skillName) {
        context.ui.addItem({
            type: MessageType.ERROR,
            text: 'Please provide a skill name to edit.',
        });
        return;
    }

    const skillManager = context.services.config?.getSkillManager();
    const skill = skillManager?.getSkill(skillName);

    if (!skill) {
        context.ui.addItem({
            type: MessageType.ERROR,
            text: `Skill "${skillName}" not found.`,
        });
        return;
    }

    // Try to open the file using the 'open' command from the shell, or a library if available.
    // Since we are in the CLI, we can try to use the configured editor.
    // For now, let's just use a simple message saying we are opening it.
    
    // We can rely on the 'open' command in the system which usually opens the default editor.
    // Or we return a tool call to run the command on the user machine? No, slash commands run on client.
    
    // We will use 'open' from the 'open' package if available, or just a shell command.
    // Assuming 'open' is available in the environment or we can use `code` or `$EDITOR`
    
    // Actually, we can just return a message for now as a placeholder or try to use a dynamic import of 'open'.
    // Better yet, we can try to spawn a process.
    
    try {
        const { default: open } = await import('open');
        await open(skill.location);
         context.ui.addItem({
            type: MessageType.INFO,
            text: `Opening skill "${skillName}" at ${skill.location}...`,
        });
    } catch (e) {
         context.ui.addItem({
            type: MessageType.ERROR,
            text: `Failed to open skill file: ${e}. Location: ${skill.location}`,
        });
    }
}

async function createAction(
    context: CommandContext,
    args: string,
): Promise<void | SlashCommandActionReturn> {
    const skillName = args.trim().replace(/\s+/g, '-').toLowerCase();
    if (!skillName) {
        context.ui.addItem({
            type: MessageType.ERROR,
            text: 'Please provide a name for the new skill.',
        });
        return;
    }

    // Determine location: Project skills dir -> User skills dir
    const config = context.services.config;
    if (!config) return;

    let skillsDir = config.storage.getProjectSkillsDir();
    // If not in a project, fall back to user skills dir? 
    // Actually getProjectSkillsDir defaults to something.
    // Let's iterate and see which one exists or create project one.
    
    // If project root exists, use project skills.
    if (!config.getProjectRoot()) {
        skillsDir = Storage.getUserSkillsDir();
        // Ensure it exists
        await fs.mkdir(skillsDir, { recursive: true });
    } else {
        // Ensure project skills dir exists
        await fs.mkdir(skillsDir, { recursive: true });
    }

    const skillDir = path.join(skillsDir, skillName);
    const skillFile = path.join(skillDir, 'SKILL.md');

    try {
        await fs.mkdir(skillDir, { recursive: true });
        
        // check if exists
        try {
            await fs.access(skillFile);
            context.ui.addItem({
                type: MessageType.ERROR,
                text: `Skill "${skillName}" already exists at ${skillFile}.`,
            });
            return;
        } catch {
            // verified it doesn't exist
        }

        const template = `---
name: ${skillName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')}
description: A new skill created via SkillForge.
version: 1.0.0
---

# ${skillName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')}

Describe what this skill does here.

## Capabilities

1.  **Capability 1**: Description.
2.  **Capability 2**: Description.

## Instructions

1.  Step 1
2.  Step 2
`;
        await fs.writeFile(skillFile, template, 'utf8');

        context.ui.addItem({
            type: MessageType.INFO,
            text: `Skill "${skillName}" created at ${skillFile}. Reloading...`,
        });

        // Auto reload
        await reloadAction(context);

        // Auto open
        await editAction(context, skillName);

    } catch (e) {
        context.ui.addItem({
            type: MessageType.ERROR,
            text: `Failed to create skill: ${e}`,
        });
    }
}

async function settingsAction(
    context: CommandContext,
    args: string,
): Promise<void | SlashCommandActionReturn> {
    const skillName = args.trim();
        if (!skillName) {
        context.ui.addItem({
            type: MessageType.ERROR,
            text: 'Please provide a skill name to view settings.',
        });
        return;
    }

    const skillManager = context.services.config?.getSkillManager();
    const skill = skillManager?.getSkill(skillName);

    if (!skill) {
        context.ui.addItem({
            type: MessageType.ERROR,
            text: `Skill "${skillName}" not found.`,
        });
        return;
    }

    // Parse frontmatter again to get raw settings/metadata?
    // Or just display what we have.
    // Currently SkillDefinition doesn't hold arbitrary frontmatter.
    // We might need to read the file.
    
    try {
        const content = await fs.readFile(skill.location, 'utf8');
        // Extract frontmatter
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (match) {
            context.ui.addItem({
                type: MessageType.INFO,
                text: `**Settings for ${skill.name}:**\n\n\`\`\`yaml\n${match[1]}\n\`\`\``,
            });
        } else {
             context.ui.addItem({
                type: MessageType.INFO,
                text: `No frontmatter settings found for ${skill.name}.`,
            });
        }
    } catch (e) {
         context.ui.addItem({
            type: MessageType.ERROR,
            text: `Failed to read skill file: ${e}`,
        });
    }
}


function disableCompletion(
  context: CommandContext,
  partialArg: string,
): string[] {
  const skillManager = context.services.config?.getSkillManager();
  if (!skillManager) {
    return [];
  }
  return skillManager
    .getAllSkills()
    .filter((s) => !s.disabled && s.name.startsWith(partialArg))
    .map((s) => s.name);
}

function enableCompletion(
  context: CommandContext,
  partialArg: string,
): string[] {
  const skillManager = context.services.config?.getSkillManager();
  if (!skillManager) {
    return [];
  }
  return skillManager
    .getAllSkills()
    .filter((s) => s.disabled && s.name.startsWith(partialArg))
    .map((s) => s.name);
}

function skillNameCompletion(
    context: CommandContext,
    partialArg: string,
): string[] {
    const skillManager = context.services.config?.getSkillManager();
    if (!skillManager) {
        return [];
    }
    return skillManager
        .getAllSkills()
         .filter((s) => s.name.toLowerCase().startsWith(partialArg.toLowerCase()))
        .map((s) => s.name);
}

export const skillForgeCommand: SlashCommand = {
  name: 'skillforge',
  description:
    'Manage, create, and edit Phill CLI capabilities. Usage: /skillforge [list | edit | create | settings | disable | enable | reload]',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'list',
      description:
        'List available agent skills. Usage: /skillforge list [nodesc] [user]',
      kind: CommandKind.BUILT_IN,
      action: listAction,
    },
    {
      name: 'disable',
      description: 'Disable a skill by name. Usage: /skillforge disable <name>',
      kind: CommandKind.BUILT_IN,
      action: disableAction,
      completion: disableCompletion,
    },
    {
      name: 'enable',
      description:
        'Enable a disabled skill by name. Usage: /skillforge enable <name>',
      kind: CommandKind.BUILT_IN,
      action: enableAction,
      completion: enableCompletion,
    },
    {
      name: 'reload',
      description:
        'Reload the list of discovered skills. Usage: /skillforge reload',
      kind: CommandKind.BUILT_IN,
      action: reloadAction,
    },
    {
        name: 'edit',
        description: 'Edit a skill in your default editor. Usage: /skillforge edit <name>',
        kind: CommandKind.BUILT_IN,
        action: editAction,
        completion: skillNameCompletion,
    },
    {
        name: 'create',
        description: 'Create a new skill. Usage: /skillforge create <name>',
        kind: CommandKind.BUILT_IN,
        action: createAction,
    },
    {
        name: 'settings',
        description: 'View skill settings (frontmatter). Usage: /skillforge settings <name>',
        kind: CommandKind.BUILT_IN,
        action: settingsAction,
        completion: skillNameCompletion,
    }
  ],
  action: listAction,
};
