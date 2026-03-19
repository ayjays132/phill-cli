/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextualPlanningLatchTool } from './planningLatchTool.js';
import type { PlanningLatchParams } from './planningLatchTool.js';
import { PLANNING_LATCH_TOOL_NAME } from './tool-names.js';
import { createMockMessageBus } from '../test-utils/mock-message-bus.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Storage } from '../config/storage.js';
import { PLANNING_LATCH_SECTION_HEADER } from './memoryTool.js';

// Mock fs
vi.mock('node:fs/promises');

// Mock Storage
vi.mock('../config/storage.js', () => ({
  Storage: {
    getGlobalPhillDir: vi.fn(),
  },
}));

describe('ContextualPlanningLatchTool', () => {
  const mockMessageBus = createMockMessageBus();
  const mockAbortSignal = new AbortController().signal;
  const mockGlobalPhillDir = '/mock/phill/dir';
  const mockMemoryPath = path.join(mockGlobalPhillDir, 'PHILL.md');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Storage.getGlobalPhillDir).mockReturnValue(mockGlobalPhillDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have the correct name and description', () => {
    const tool = new ContextualPlanningLatchTool(mockMessageBus);
    expect(tool.name).toBe(PLANNING_LATCH_TOOL_NAME);
    expect(tool.description).toBe(
      'Latches a critical plan or architectural decision into persistent memory to ensure long-term coherency.',
    );
  });

  describe('execute - create_latch', () => {
    it('should create a new latch in a new memory file', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params: PlanningLatchParams = {
        action: 'create_latch',
        goal: 'Test Goal',
        plan: 'Test Plan',
        scope: 'global',
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath === mockMemoryPath) {
          const err = new Error('ENOENT');
          (err as any).code = 'ENOENT';
          throw err;
        }
        return '';
      });
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const invocation = tool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(fs.writeFile).toHaveBeenCalled();
      const [filePath, content] = vi.mocked(fs.writeFile).mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(filePath).toBe(mockMemoryPath);
      expect(content).toContain(PLANNING_LATCH_SECTION_HEADER);
      expect(content).toContain(
        '[LATCH] [GLOBAL] Goal: Test Goal | Plan: Test Plan',
      );
      expect(result.returnDisplay).toContain('Persisted global planning latch');
    });

    it('should append a latch to an existing memory file', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params: PlanningLatchParams = {
        action: 'create_latch',
        goal: 'New Goal',
        plan: 'New Plan',
      };

      const existingContent = `${PLANNING_LATCH_SECTION_HEADER}\n[LATCH] Goal: Old Goal | Plan: Old Plan\n`;
      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath === mockMemoryPath) {
          return existingContent;
        }
        return '';
      });
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const invocation = tool.build(params);
      await invocation.execute(mockAbortSignal);

      expect(fs.writeFile).toHaveBeenCalled();
      const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(content).toContain('[LATCH] Goal: Old Goal | Plan: Old Plan');
      expect(content).toContain('[LATCH] Goal: New Goal | Plan: New Plan');
    });

    it('should return an error if goal or plan is missing', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params = {
        action: 'create_latch' as const,
        goal: 'Test Goal',
        // plan is missing
      } as any;

      const invocation = tool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.error).toBeDefined();
      expect(result.llmContent).toContain('goal and plan are required');
    });
  });

  describe('execute - review_latches', () => {
    it('should return a message if review_latches is called and file does not exist', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params = { action: 'review_latches' as const };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath === mockMemoryPath) {
          const err = new Error('ENOENT');
          (err as any).code = 'ENOENT';
          throw err;
        }
        return '';
      });

      const invocation = tool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toBe(
        'No active latches found to review. File does not exist.',
      );
    });

    it('should return current latches if they exist', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params = { action: 'review_latches' as const };

      const existingContent = `Some Header\nContent\n\n${PLANNING_LATCH_SECTION_HEADER}\n[LATCH] Goal: Old Goal | Plan: Old Plan\n`;
      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath === mockMemoryPath) {
          return existingContent;
        }
        return '';
      });

      const invocation = tool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toContain('Current Active Latches:');
      expect(result.llmContent).toContain(
        '[LATCH] Goal: Old Goal | Plan: Old Plan',
      );
    });

    it('should return a message if no latches are found', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params = { action: 'review_latches' as const };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath === mockMemoryPath) {
          return 'No header here';
        }
        return '';
      });

      const invocation = tool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      expect(result.llmContent).toBe('No active latches populated in memory.');
    });
  });

  describe('execute - create_anti_latch', () => {
    it('should create an anti-latch with correct prefix', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params: PlanningLatchParams = {
        action: 'create_anti_latch',
        goal: 'Avoid Loop',
        plan: "Don't do X",
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath === mockMemoryPath) {
          return '';
        }
        return '';
      });
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const invocation = tool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(content).toContain('[ANTI_LATCH][REFLEXION]');
      expect(result.llmContent).toContain('Anti-Latch engaged');
    });
  });

  describe('execute - create_definition_latch', () => {
    it('should create a definition latch with correct prefix', async () => {
      const tool = new ContextualPlanningLatchTool(mockMessageBus);
      const params: PlanningLatchParams = {
        action: 'create_definition_latch',
        goal: 'API Spec',
        plan: 'Endpoint Y takes Z',
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath === mockMemoryPath) {
          return '';
        }
        return '';
      });
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const invocation = tool.build(params);
      const result = await invocation.execute(mockAbortSignal);

      const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(content).toContain('[DEFINITION_LATCH][GROUND_TRUTH]');
      expect(result.llmContent).toContain('API Definition grounded');
    });
  });
});
