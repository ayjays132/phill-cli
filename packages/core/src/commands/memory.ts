/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import { refreshServerHierarchicalMemory } from '../utils/memoryDiscovery.js';
import { coreEvents } from '../utils/events.js';
import type { MessageActionReturn, ToolActionReturn } from './types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getGlobalMemoryFilePath,
  LATENT_SNAPSHOT_SECTION_HEADER,
  MEMORY_SECTION_HEADER,
  PLANNING_LATCH_SECTION_HEADER,
  USER_IDENTITY_SECTION_HEADER,
  VITALS_SECTION_HEADER,
} from '../tools/memoryTool.js';


const DEFAULT_FALLBACK_MEMORY_CONTENT = [
  '# PHILL Memory',
  '',
  USER_IDENTITY_SECTION_HEADER,
  '',
  VITALS_SECTION_HEADER,
  '',
  PLANNING_LATCH_SECTION_HEADER,
  '',
  LATENT_SNAPSHOT_SECTION_HEADER,
  '',
  MEMORY_SECTION_HEADER,
  '',
].join('\n');

export function showMemory(config: Config): MessageActionReturn {
  const memoryContent = config.getUserMemory() || '';
  const fileCount = config.getPhillMdFileCount() || 0;
  let content: string;

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
}

export function addMemory(
  args?: string,
): MessageActionReturn | ToolActionReturn {
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
}

export async function refreshMemory(
  config: Config,
): Promise<MessageActionReturn> {
  let memoryContent = '';
  let fileCount = 0;

  if (config.isJitContextEnabled()) {
    await config.getContextManager()?.refresh();
    memoryContent = config.getUserMemory();
    fileCount = config.getPhillMdFileCount();
  } else {
    const result = await refreshServerHierarchicalMemory(config);
    memoryContent = result.memoryContent;
    fileCount = result.fileCount;
  }

  config.updateSystemInstructionIfInitialized();
  let content: string;

  if (memoryContent.length > 0) {
    content = `Memory refreshed successfully. Loaded ${memoryContent.length} characters from ${fileCount} file(s).`;
  } else {
    content = 'Memory refreshed successfully. No memory content found.';
  }

  return {
    type: 'message',
    messageType: 'info',
    content,
  };
}

export function listMemoryFiles(config: Config): MessageActionReturn {
  const filePaths = config.getPhillMdFilePaths() || [];
  const fileCount = filePaths.length;
  let content: string;

  if (fileCount > 0) {
    content = `There are ${fileCount} PHILL.md file(s) in use:\n\n${filePaths.join(
      '\n',
    )}`;
  } else {
    content = 'No PHILL.md files in use.';
  }

  return {
    type: 'message',
    messageType: 'info',
    content,
  };
}

async function ensureFallbackMemoryFile(): Promise<string> {
  const filePath = getGlobalMemoryFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, DEFAULT_FALLBACK_MEMORY_CONTENT, 'utf-8');
  }

  return filePath;
}

export async function memoryStatus(config: Config): Promise<MessageActionReturn> {
  const memoryContent = config.getUserMemory() || '';
  const filePaths = config.getPhillMdFilePaths() || [];
  const fileCount = config.getPhillMdFileCount() || 0;
  const globalMemoryPath = getGlobalMemoryFilePath();

  let fallbackExists = false;
  try {
    await fs.access(globalMemoryPath);
    fallbackExists = true;
  } catch {
    fallbackExists = false;
  }

  const content = [
    'Memory status:',
    `- Loaded chars: ${memoryContent.length}`,
    `- Loaded PHILL.md files: ${fileCount}`,
    `- Loaded paths tracked: ${filePaths.length}`,
    `- Global fallback file: ${fallbackExists ? 'present' : 'missing'} (${globalMemoryPath})`,
  ].join('\n');

  return {
    type: 'message',
    messageType: 'info',
    content,
  };
}

export async function restoreMemory(config: Config): Promise<MessageActionReturn> {
  const filePath = await ensureFallbackMemoryFile();
  const refreshResult = await refreshMemory(config);

  return {
    type: 'message',
    messageType: 'info',
    content: `Memory restore complete. Fallback memory file ready at ${filePath}. ${refreshResult.content}`,
  };
}

export async function resetMemory(
  config: Config,
  mode: 'soft' | 'hard' = 'soft',
): Promise<MessageActionReturn> {
  config.setUserMemory('');
  config.setPhillMdFileCount(0);
  config.setPhillMdFilePaths([]);

  const globalMemoryPath = getGlobalMemoryFilePath();
  if (mode === 'hard') {
    await fs.rm(globalMemoryPath, { force: true });
    
    // Wipe Cognitive Line Memory Vault
    const cognitiveMemoryPath = path.join(os.homedir(), '.phill', 'state', 'cognitive-memory.json');
    try {
      await fs.rm(cognitiveMemoryPath, { force: true });
    } catch (e) {
      // Ignore if file doesn't exist
    }
    
    // Signal UI/Engine to clear state
    coreEvents.emitMemoryWiped();

    await ensureFallbackMemoryFile();
    await config.resetBiologicalDrives();
  }
  await config.getAgentIdentityService().reset();

  const refreshResult = await refreshMemory(config);
  const modeText = mode === 'hard' ? 'hard wipe' : 'soft reset';
  return {
    type: 'message',
    messageType: 'info',
    content: `Memory ${modeText} complete. Agent self identity reset. ${refreshResult.content}`,
  };
}
