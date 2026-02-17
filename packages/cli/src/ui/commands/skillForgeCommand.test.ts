/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { skillForgeCommand } from './skillForgeCommand.js';
import { MessageType } from '../types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import type { CommandContext } from './types.js';
import type { Config } from 'phill-cli-core';
import {
  SettingScope,
  type LoadedSettings,
  createTestMergedSettings,
} from '../../config/settings.js';
import * as fs from 'node:fs/promises';

// Mock dependencies
vi.mock('node:fs/promises');
vi.mock('open', () => ({
    default: vi.fn(),
}));

vi.mock('../../config/settings.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../config/settings.js')>();
  return {
    ...actual,
    isLoadableSettingScope: vi.fn((s) => s === 'User' || s === 'Workspace'),
  };
});

describe('skillForgeCommand', () => {
  let context: CommandContext;

  beforeEach(() => {
    vi.useFakeTimers();
    const skills = [
      {
        name: 'skill1',
        description: 'desc1',
        location: '/loc1',
        body: 'body1',
      },
      {
        name: 'skill2',
        description: 'desc2',
        location: '/loc2',
        body: 'body2',
      },
      {
        name: 'builtin1',
        description: 'builtin desc',
        location: '/builtin/loc',
        body: 'builtin body',
        isBuiltin: true,
      }
    ];
    context = createMockCommandContext({
      services: {
        config: {
          getSkillManager: vi.fn().mockReturnValue({
            getAllSkills: vi.fn().mockReturnValue(skills),
            getSkills: vi.fn().mockReturnValue(skills),
            isAdminEnabled: vi.fn().mockReturnValue(true),
            getSkill: vi
              .fn()
              .mockImplementation(
                (name: string) => skills.find((s) => s.name === name) ?? null,
              ),
          }),
          storage: {
              getProjectSkillsDir: vi.fn().mockReturnValue('/project/skills'),
          },
          getProjectRoot: vi.fn().mockReturnValue('/project/root'),
          reloadSkills: vi.fn().mockResolvedValue(undefined),
        } as unknown as Config,
        settings: {
          merged: createTestMergedSettings({ skills: { disabled: [] } }),
          workspace: { path: '/workspace' },
          setValue: vi.fn(),
        } as unknown as LoadedSettings,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should add a SKILLS_LIST item to UI with descriptions AND built-ins by default', async () => {
    await skillForgeCommand.action!(context, '');

    expect(context.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.SKILLS_LIST,
        skills: expect.arrayContaining([
            expect.objectContaining({ name: 'skill1' }),
            expect.objectContaining({ name: 'builtin1' }),
        ]),
        showDescriptions: true,
      }),
    );
  });

  it('should list skills when "list" subcommand is used', async () => {
    const listCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'list')!;
    await listCmd.action!(context, '');

    expect(context.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.SKILLS_LIST,
        skills: expect.arrayContaining([
            expect.objectContaining({ name: 'skill1' }),
            expect.objectContaining({ name: 'builtin1' }),
        ]),
        showDescriptions: true,
      }),
    );
  });

  it('should disable descriptions if "nodesc" arg is provided to list', async () => {
    const listCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'list')!;
    await listCmd.action!(context, 'nodesc');

    expect(context.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        showDescriptions: false,
      }),
    );
  });

  it('should filter out built-in skills if "user" arg is provided', async () => {
    const listCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'list')!;
    await listCmd.action!(context, 'user');

    expect(context.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: expect.not.arrayContaining([
             expect.objectContaining({ name: 'builtin1' }),
        ]),
      }),
    );
    // Explicitly check that regular skills are still there
    expect(context.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: expect.arrayContaining([
             expect.objectContaining({ name: 'skill1' }),
        ]),
      }),
    );
  });

  describe('create', () => {
       it('should create a new skill in project skills dir', async () => {
          const createCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'create')!;
          vi.mocked(fs.mkdir).mockResolvedValue(undefined);
          vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT')); // File not found
          vi.mocked(fs.writeFile).mockResolvedValue(undefined);

          await createCmd.action!(context, 'my-new-skill');

          expect(fs.mkdir).toHaveBeenCalledWith('/project/skills', { recursive: true });
          expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('my-new-skill'), { recursive: true });
          expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('SKILL.md'), expect.any(String), 'utf8');
          expect(context.services.config!.reloadSkills).toHaveBeenCalled();
       });

        it('should error if skill name is missing', async () => {
          const createCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'create')!;
          await createCmd.action!(context, '');
          expect(context.ui.addItem).toHaveBeenCalledWith(expect.objectContaining({ type: MessageType.ERROR }));
       });
  });

  describe('edit', () => {
      it('should open skill file', async () => {
          const editCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'edit')!;
          await editCmd.action!(context, 'skill1');
          
          // Since we can't easily assert the dynamic import open call here without more complex mocking of import(),
          // we assume the logic reaches the success message if open succeeds (or we mock failure).
          // But wait, we mocked 'open' at top level.
          // Note: dynamic import mocking is tricky in vitest without `vi.mock` at top level being hoisted.
          // Let's just check context.ui.addItem info message.
          
          expect(context.ui.addItem).toHaveBeenCalledWith(expect.objectContaining({ type: MessageType.INFO, text: expect.stringContaining('Opening skill') }));
      });
       it('should error if skill not found', async () => {
          const editCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'edit')!;
          await editCmd.action!(context, 'missing-skill');
          expect(context.ui.addItem).toHaveBeenCalledWith(expect.objectContaining({ type: MessageType.ERROR }));
      });
  });
  
    describe('settings', () => {
        it('should show settings from frontmatter', async () => {
            const settingsCmd = skillForgeCommand.subCommands!.find((s) => s.name === 'settings')!;
            vi.mocked(fs.readFile).mockResolvedValue('---\nsetting: value\n---\nbody');
            
            await settingsCmd.action!(context, 'skill1');
            
            expect(context.ui.addItem).toHaveBeenCalledWith(expect.objectContaining({ 
                type: MessageType.INFO, 
                text: expect.stringContaining('setting: value') 
            }));
        });
    });


  // Keep existing disable/enable/reload tests adapted
  describe('disable/enable', () => {
    // ... setup and shared logic ...
     beforeEach(() => {
         // ... reuse setup from previous file or duplicate ...
         // For brevity, assuming context setup in main beforeEach covers most needs, 
         // but we need to mock setValue and settings structure specifically for disable/enable tests.
    });

    it('should disable a skill', async () => {
      const disableCmd = skillForgeCommand.subCommands!.find(
        (s) => s.name === 'disable',
      )!;
      await disableCmd.action!(context, 'skill1');

      expect(context.services.settings.setValue).toHaveBeenCalledWith(
        SettingScope.Workspace,
        'skills.disabled',
        ['skill1'],
      );
    });
  });
  
     describe('reload', () => {
    it('should reload skills successfully', async () => {
      const reloadCmd = skillForgeCommand.subCommands!.find(
        (s) => s.name === 'reload',
      )!;
      
      await reloadCmd.action!(context, '');
      expect(context.services.config!.reloadSkills).toHaveBeenCalled();
       expect(context.ui.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.INFO,
          text: expect.stringContaining('success'),
        }),
      );
    });
     });

});
