/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Mock } from 'vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { memoryCommand } from './memoryCommand.js';
import type { SlashCommand, CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { MessageType } from '../types.js';
import type { LoadedSettings } from '../../config/settings.js';
import {
  refreshMemory,
  refreshServerHierarchicalMemory,
  resetMemory,
  SimpleExtensionLoader,
  type FileDiscoveryService,
  showMemory,
  addMemory,
  listMemoryFiles,
} from 'phill-cli-core';

vi.mock('phill-cli-core', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('phill-cli-core')>();
  return {
    ...original,
    getErrorMessage: vi.fn((error: unknown) => {
      if (error instanceof Error) return error.message;
      return String(error);
    }),
    refreshMemory: vi.fn(async (config) => {
      if (config.isJitContextEnabled()) {
        await config.getContextManager()?.refresh();
        const memoryContent = config.getUserMemory() || '';
        const fileCount = config.getPhillMdFileCount() || 0;
        return {
          type: 'message',
          messageType: 'info',
          content: `Memory refreshed successfully. Loaded ${memoryContent.length} characters from ${fileCount} file(s).`,
        };
      }
      return {
        type: 'message',
        messageType: 'info',
        content: 'Memory refreshed successfully.',
      };
    }),
    showMemory: vi.fn(),
    addMemory: vi.fn(),
    listMemoryFiles: vi.fn(),
    resetMemory: vi.fn(),
    refreshServerHierarchicalMemory: vi.fn(),
  };
});

const mockRefreshMemory = refreshMemory as Mock;
const mockRefreshServerHierarchicalMemory =
  refreshServerHierarchicalMemory as Mock;
const mockResetMemory = resetMemory as Mock;

describe('memoryCommand', () => {
  let mockContext: CommandContext;

  const getSubCommand = (
    name: 'show' | 'add' | 'refresh' | 'list',
  ): SlashCommand => {
    const subCommand = memoryCommand.subCommands?.find(
      (cmd) => cmd.name === name,
    );
    if (!subCommand) {
      throw new Error(`/memory ${name} command not found.`);
    }
    return subCommand;
  };

  describe('/memory show', () => {
    let showCommand: SlashCommand;
    let mockGetUserMemory: Mock;
    let mockGetPhillMdFileCount: Mock;

    beforeEach(() => {
      showCommand = getSubCommand('show');

      mockGetUserMemory = vi.fn();
      mockGetPhillMdFileCount = vi.fn();

      vi.mocked(showMemory).mockImplementation((config) => {
        const memoryContent = config.getUserMemory() || '';
        const fileCount = config.getPhillMdFileCount() || 0;
        let content;
        if (memoryContent.length > 0) {
          content = `Current memory content from ${fileCount} file(s):\n\n---\n${memoryContent}\n---`;
        } else {
          content = 'Memory is currently empty.';
        }
        return {
          type: 'message',
          messageType: 'info',
          content,
        };
      });

      mockContext = createMockCommandContext({
        services: {
          config: {
            getUserMemory: mockGetUserMemory,
            getPhillMdFileCount: mockGetPhillMdFileCount,
            getExtensionLoader: () => new SimpleExtensionLoader([]),
          },
        },
      });
    });

    it('should display a message if memory is empty', async () => {
      if (!showCommand.action) throw new Error('Command has no action');

      mockGetUserMemory.mockReturnValue('');
      mockGetPhillMdFileCount.mockReturnValue(0);

      await showCommand.action(mockContext, '');

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: 'Memory is currently empty.',
        },
        expect.any(Number),
      );
    });

    it('should display the memory content and file count if it exists', async () => {
      if (!showCommand.action) throw new Error('Command has no action');

      const memoryContent = 'This is a test memory.';

      mockGetUserMemory.mockReturnValue(memoryContent);
      mockGetPhillMdFileCount.mockReturnValue(1);

      await showCommand.action(mockContext, '');

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: `Current memory content from 1 file(s):\n\n---\n${memoryContent}\n---`,
        },
        expect.any(Number),
      );
    });
  });

  describe('/memory add', () => {
    let addCommand: SlashCommand;

    beforeEach(() => {
      addCommand = getSubCommand('add');
      vi.mocked(addMemory).mockImplementation((args) => {
        if (!args || args.trim() === '') {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /memory add <text to remember>',
          };
        }
        return {
          type: 'tool',
          toolName: 'save_memory',
          toolArgs: { fact: args.trim() },
        };
      });
      mockContext = createMockCommandContext();
    });

    it('should return an error message if no arguments are provided', () => {
      if (!addCommand.action) throw new Error('Command has no action');

      const result = addCommand.action(mockContext, '  ');
      expect(result).toEqual({
        type: 'message',
        messageType: 'error',
        content: 'Usage: /memory add <text to remember>',
      });

      expect(mockContext.ui.addItem).not.toHaveBeenCalled();
    });

    it('should return a tool action and add an info message when arguments are provided', () => {
      if (!addCommand.action) throw new Error('Command has no action');

      const fact = 'remember this';
      const result = addCommand.action(mockContext, `  ${fact}  `);

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: `Attempting to save to memory: "${fact}"`,
        },
        expect.any(Number),
      );

      expect(result).toEqual({
        type: 'tool',
        toolName: 'save_memory',
        toolArgs: { fact },
      });
    });
  });

  describe('/memory refresh', () => {
    let refreshCommand: SlashCommand;
    let mockSetUserMemory: Mock;
    let mockSetPhillMdFileCount: Mock;
    let mockSetPhillMdFilePaths: Mock;
    let mockContextManagerRefresh: Mock;

    beforeEach(() => {
      refreshCommand = getSubCommand('refresh');
      mockSetUserMemory = vi.fn();
      mockSetPhillMdFileCount = vi.fn();
      mockSetPhillMdFilePaths = vi.fn();
      mockContextManagerRefresh = vi.fn().mockResolvedValue(undefined);

      const mockConfig = {
        setUserMemory: mockSetUserMemory,
        setPhillMdFileCount: mockSetPhillMdFileCount,
        setPhillMdFilePaths: mockSetPhillMdFilePaths,
        getWorkingDir: () => '/test/dir',
        getDebugMode: () => false,
        getFileService: () => ({}) as FileDiscoveryService,
        getExtensionLoader: () => new SimpleExtensionLoader([]),
        getExtensions: () => [],
        shouldLoadMemoryFromIncludeDirectories: () => false,
        getWorkspaceContext: () => ({
          getDirectories: () => [],
        }),
        getFileFilteringOptions: () => ({
          ignore: [],
          include: [],
        }),
        isTrustedFolder: () => false,
        updateSystemInstructionIfInitialized: vi
          .fn()
          .mockResolvedValue(undefined),
        isJitContextEnabled: vi.fn().mockReturnValue(false),
        getContextManager: vi.fn().mockReturnValue({
          refresh: mockContextManagerRefresh,
        }),
        getUserMemory: vi.fn().mockReturnValue(''),
        getPhillMdFileCount: vi.fn().mockReturnValue(0),
      };

      mockContext = createMockCommandContext({
        services: {
          config: mockConfig,
          settings: {
            merged: {
              memoryDiscoveryMaxDirs: 1000,
              context: {
                importFormat: 'tree',
              },
            },
          } as unknown as LoadedSettings,
        },
      });
      mockRefreshMemory.mockClear();
    });

    it('should use ContextManager.refresh when JIT is enabled', async () => {
      if (!refreshCommand.action) throw new Error('Command has no action');

      // Enable JIT in mock config
      const config = mockContext.services.config;
      if (!config) throw new Error('Config is undefined');

      vi.mocked(config.isJitContextEnabled).mockReturnValue(true);
      vi.mocked(config.getUserMemory).mockReturnValue('JIT Memory Content');
      vi.mocked(config.getPhillMdFileCount).mockReturnValue(3);

      await refreshCommand.action(mockContext, '');

      expect(mockContextManagerRefresh).toHaveBeenCalledOnce();
      expect(mockRefreshServerHierarchicalMemory).not.toHaveBeenCalled();

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: 'Memory refreshed successfully. Loaded 18 characters from 3 file(s).',
        },
        expect.any(Number),
      );
    });

    it('should display success message when memory is refreshed with content (Legacy)', async () => {
      if (!refreshCommand.action) throw new Error('Command has no action');

      const successMessage = {
        type: 'message',
        messageType: MessageType.INFO,
        content:
          'Memory refreshed successfully. Loaded 18 characters from 2 file(s).',
      };
      mockRefreshMemory.mockResolvedValue(successMessage);

      await refreshCommand.action(mockContext, '');

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: 'Refreshing memory from source files...',
        },
        expect.any(Number),
      );

      expect(mockRefreshMemory).toHaveBeenCalledOnce();

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: 'Memory refreshed successfully. Loaded 18 characters from 2 file(s).',
        },
        expect.any(Number),
      );
    });

    it('should display success message when memory is refreshed with no content', async () => {
      if (!refreshCommand.action) throw new Error('Command has no action');

      const successMessage = {
        type: 'message',
        messageType: MessageType.INFO,
        content: 'Memory refreshed successfully. No memory content found.',
      };
      mockRefreshMemory.mockResolvedValue(successMessage);

      await refreshCommand.action(mockContext, '');

      expect(mockRefreshMemory).toHaveBeenCalledOnce();

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: 'Memory refreshed successfully. No memory content found.',
        },
        expect.any(Number),
      );
    });

    it('should display an error message if refreshing fails', async () => {
      if (!refreshCommand.action) throw new Error('Command has no action');

      const error = new Error('Failed to read memory files.');
      mockRefreshMemory.mockRejectedValue(error);

      await refreshCommand.action(mockContext, '');

      expect(mockRefreshMemory).toHaveBeenCalledOnce();
      expect(mockSetUserMemory).not.toHaveBeenCalled();
      expect(mockSetPhillMdFileCount).not.toHaveBeenCalled();
      expect(mockSetPhillMdFilePaths).not.toHaveBeenCalled();

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.ERROR,
          text: `Error refreshing memory: ${error.message}`,
        },
        expect.any(Number),
      );
    });

    it('should not throw if config service is unavailable', async () => {
      if (!refreshCommand.action) throw new Error('Command has no action');

      const nullConfigContext = createMockCommandContext({
        services: { config: null },
      });

      await expect(
        refreshCommand.action(nullConfigContext, ''),
      ).resolves.toBeUndefined();

      expect(nullConfigContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: 'Refreshing memory from source files...',
        },
        expect.any(Number),
      );

      expect(mockRefreshMemory).not.toHaveBeenCalled();
    });
  });

  describe('/memory list', () => {
    let listCommand: SlashCommand;
    let mockGetPhillMdfilePaths: Mock;

    beforeEach(() => {
      listCommand = getSubCommand('list');
      mockGetPhillMdfilePaths = vi.fn();
      vi.mocked(listMemoryFiles).mockImplementation((config) => {
        const filePaths = config.getPhillMdFilePaths() || [];
        const fileCount = filePaths.length;
        let content;
        if (fileCount > 0) {
          content = `There are ${fileCount} PHILL.md file(s) in use:\n\n${filePaths.join('\n')}`;
        } else {
          content = 'No PHILL.md files in use.';
        }
        return {
          type: 'message',
          messageType: 'info',
          content,
        };
      });
      mockContext = createMockCommandContext({
        services: {
          config: {
            getPhillMdFilePaths: mockGetPhillMdfilePaths,
          },
        },
      });
    });

    it('should display a message if no PHILL.md files are found', async () => {
      if (!listCommand.action) throw new Error('Command has no action');

      mockGetPhillMdfilePaths.mockReturnValue([]);

      await listCommand.action(mockContext, '');

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: 'No PHILL.md files in use.',
        },
        expect.any(Number),
      );
    });

    it('should display the file count and paths if they exist', async () => {
      if (!listCommand.action) throw new Error('Command has no action');

      const filePaths = ['/path/one/PHILL.md', '/path/two/PHILL.md'];
      mockGetPhillMdfilePaths.mockReturnValue(filePaths);

      await listCommand.action(mockContext, '');

      expect(mockContext.ui.addItem).toHaveBeenCalledWith(
        {
          type: MessageType.INFO,
          text: `There are 2 PHILL.md file(s) in use:\n\n${filePaths.join('\n')}`,
        },
        expect.any(Number),
      );
    });
  });

  describe('/memory wipe', () => {
    it('should reset heartbeat settings to defaults before hard wipe', async () => {
      const wipeCommand = memoryCommand.subCommands?.find(
        (cmd) => cmd.name === 'wipe',
      );
      if (!wipeCommand?.action) throw new Error('Command has no action');

      mockResetMemory.mockResolvedValue({
        type: 'message',
        messageType: 'info',
        content: 'Memory hard wipe complete.',
      });

      const mockConfig = {
        getExtensionLoader: () => new SimpleExtensionLoader([]),
      };
      const mockSetValue = vi.fn();
      const context = createMockCommandContext({
        services: {
          config: mockConfig,
          settings: {
            setValue: mockSetValue,
          } as unknown as LoadedSettings,
        },
      });

      await wipeCommand.action(context, '');

      expect(mockSetValue).toHaveBeenCalledWith(
        'User',
        'general.heartbeat.enabled',
        false,
      );
      expect(mockSetValue).toHaveBeenCalledWith(
        'User',
        'general.heartbeat.intervalSeconds',
        300,
      );
      expect(mockSetValue).toHaveBeenCalledWith(
        'User',
        'general.heartbeat.prompt',
        'continue',
      );
      expect(mockResetMemory).toHaveBeenCalledWith(mockConfig, 'hard');
    });
  });
});
