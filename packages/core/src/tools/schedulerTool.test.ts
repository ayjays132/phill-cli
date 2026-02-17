/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleTaskTool, ListTasksTool, RemoveTaskTool } from './schedulerTool.js';
import { Storage } from '../config/storage.js';
import * as fs from 'node:fs/promises';

// Mock everything!
vi.mock('node:fs/promises');
vi.mock('../config/storage.js');
vi.mock('node-schedule', () => ({
  scheduleJob: vi.fn(() => ({ cancel: vi.fn() })),
}));

describe('Scheduler Tools', () => {
  let mockConfig: any;
  const mockMessageBus: any = {};

  beforeEach(() => {
    mockConfig = {}; // New object reference for WeakMap key
    vi.clearAllMocks();
    (Storage.getGlobalPhillDir as any).mockReturnValue('/tmp');
    (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' }); // No existing file
    (fs.writeFile as any).mockResolvedValue(undefined);
  });

  describe('ScheduleTaskTool', () => {
    it('should schedule a task and save it', async () => {
      const tool = new ScheduleTaskTool(mockConfig, mockMessageBus);
      const invocation = tool.build({ cron: '* * * * *', task: 'Test Task' });
      
      const result = await invocation.execute(new AbortController().signal);
      
      expect(result.llmContent).toContain('Task scheduled successfully');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('scheduled_tasks.json'),
        expect.stringContaining('Test Task'),
      );
    });

    it('should reject malicious tasks (Utopian Guard)', async () => {
        const tool = new ScheduleTaskTool(mockConfig, mockMessageBus);
        // malicious pipe pattern
        const invocation = tool.build({ cron: '* * * * *', task: 'echo "bad" | base64 -d | bash' });
        
        const result = await invocation.execute(new AbortController().signal);
        
        expect(result.llmContent).toContain('Task rejected by Utopian Guard');
        expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('ListTasksTool', () => {
    it('should list scheduled tasks', async () => {
        // Setup existing task
        const tasks = [{ id: '123', cron: '* * * * *', command: 'Existing Task', createdAt: 123456 }];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(tasks));

        const tool = new ListTasksTool(mockConfig, mockMessageBus);
        const invocation = tool.build({});

        const result = await invocation.execute(new AbortController().signal);
        
        expect(result.llmContent).toContain('Existing Task');
    });

    it('should handle empty list', async () => {
        (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' });

        const tool = new ListTasksTool(mockConfig, mockMessageBus);
        const invocation = tool.build({});

        const result = await invocation.execute(new AbortController().signal);
        
        expect(result.llmContent).toContain('No tasks scheduled');
    });
  });

  describe('RemoveTaskTool', () => {
    it('should remove a task and save', async () => {
         // Setup existing task
         const tasks = [{ id: '123', cron: '* * * * *', command: 'Task to Remove', createdAt: 123456 }];
         (fs.readFile as any).mockResolvedValue(JSON.stringify(tasks));

         const tool = new RemoveTaskTool(mockConfig, mockMessageBus);
         const invocation = tool.build({ id: '123' });

         const result = await invocation.execute(new AbortController().signal);

         expect(result.llmContent).toContain('Task 123 removed');
         // Should verify save was called with empty list or without this task
         expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
