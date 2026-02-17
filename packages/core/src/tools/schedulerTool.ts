/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolResult,
} from './tools.js';
import { Storage } from '../config/storage.js';
import { utopianGuardHeuristics } from '../skills/builtin/utopian-guard/index.js';
import * as schedule from 'node-schedule';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { ToolErrorType } from './tool-error.js';
import { debugLogger } from '../utils/debugLogger.js';

interface ScheduledTask {
  id: string;
  cron: string;
  command: string; // The natural language task description
  createdAt: number;
}


class SchedulerService {
  private tasks: Map<string, schedule.Job> = new Map();
  private metadata: Map<string, ScheduledTask> = new Map();
  private initialized = false;

  constructor() {}

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    await this.loadTasks();
  }

  private get persistencePath(): string {
       // Persist tasks globally for the user
    return path.join(Storage.getGlobalPhillDir(), 'scheduled_tasks.json');
  }

  private async loadTasks() {
    try {
      const content = await fs.readFile(this.persistencePath, 'utf-8');
      const tasks: ScheduledTask[] = JSON.parse(content);
      for (const task of tasks) {
        this.scheduleJob(task);
      }
      debugLogger.log(`Loaded ${tasks.length} scheduled tasks.`);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        debugLogger.error('Failed to load scheduled tasks:', e);
      }
    }
  }

  private async saveTasks() {
    const tasks = Array.from(this.metadata.values());
    try {
      await fs.writeFile(this.persistencePath, JSON.stringify(tasks, null, 2));
    } catch (e) {
      debugLogger.error('Failed to save scheduled tasks:', e);
    }
  }

  async addTask(cron: string, command: string): Promise<string> {
    const task: ScheduledTask = {
      id: randomUUID(),
      cron,
      command,
      createdAt: Date.now(),
    };
    this.scheduleJob(task);
    await this.saveTasks();
    return task.id;
  }

  private scheduleJob(task: ScheduledTask) {
    // Cancel existing if any (shouldn't happen with UUIDs)
    if (this.tasks.has(task.id)) {
      this.tasks.get(task.id)?.cancel();
    }

    const job = schedule.scheduleJob(task.cron, () => {
      debugLogger.log(`[Scheduler] Executing task: ${task.command}`);
      console.log(`\n⏰ [Scheduler] Time to execute: "${task.command}"\n(This is a reminder. You need to take action manually for now, or I can run it if set up as an autonomous loop.)`);
      // Future: Trigger agent loop here
    });

    if (job) {
      this.tasks.set(task.id, job);
      this.metadata.set(task.id, task);
    } else {
        throw new Error(`Failed to schedule job with cron: ${task.cron}`);
    }
  }

  async removeTask(id: string): Promise<boolean> {
    const job = this.tasks.get(id);
    if (job) {
      job.cancel();
      this.tasks.delete(id);
      this.metadata.delete(id);
      await this.saveTasks();
      return true;
    }
    return false;
  }

  listTasks(): ScheduledTask[] {
    return Array.from(this.metadata.values());
  }
}

// Global instance cache to share state across tool invocations if needed
// Or attach to Config if possible. For now, we'll use a module-level singleton helper
// that attaches to the config object if we can, or just lazily init.
// Since Config is per-session but persistence is global/user-based, this is tricky.
// We'll attach it to the tool instance, but since tools are recreated, we need a static map.

const schedulers = new WeakMap<Config, SchedulerService>();

function getScheduler(config: Config): SchedulerService {
  let scheduler = schedulers.get(config);
  if (!scheduler) {
    scheduler = new SchedulerService();
    // Initialize async - but we can't await here.
    // It's acceptable for the first operation to trigger loading or rely on 'ensureInitialized'
    schedulers.set(config, scheduler);
    scheduler.initialize().catch(e => debugLogger.error('Scheduler init failed', e));
  }
  return scheduler;
}


// --- Schedule Task Tool ---

export interface ScheduleTaskParams {
  cron: string;
  task: string;
}

class ScheduleTaskToolInvocation extends BaseToolInvocation<
  ScheduleTaskParams,
  ToolResult
> {
  constructor(
      private readonly config: Config,
      params: ScheduleTaskParams,
      messageBus: MessageBus,
      _toolName?: string,
      _toolDisplayName?: string,
  ) {
      super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Scheduling task "${this.params.task}" with cron "${this.params.cron}"`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const scheduler = getScheduler(this.config);
    try {
        // Security Check: Prevent malicious tasks (sleeper agents/botnets)
        if (utopianGuardHeuristics.isMaliciousPipe(this.params.task)) {
            throw new Error('Task rejected by Utopian Guard: Malicious pipe detected.');
        }
        if (utopianGuardHeuristics.isBotnetDistortion(this.params.task)) {
            throw new Error('Task rejected by Utopian Guard: Botnet distortion detected.');
        }

        // Wait for init just in case
        await scheduler.initialize();
        const id = await scheduler.addTask(this.params.cron, this.params.task);
        return {
            llmContent: `Task scheduled successfully. ID: ${id}`,
            returnDisplay: `Scheduled: "${this.params.task}" (${this.params.cron})`,
        };
    } catch (e: any) {
        return {
            llmContent: `Failed to schedule: ${e.message}`,
            returnDisplay: `Scheduling failed.`,
            error: { message: e.message, type: ToolErrorType.EXECUTION_FAILED },
        };
    }
  }
}

export class ScheduleTaskTool extends BaseDeclarativeTool<
  ScheduleTaskParams,
  ToolResult
> {
  static readonly Name = 'schedule_task';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      ScheduleTaskTool.Name,
      'ScheduleTask',
      'Schedule a task to run repeatedly using Cron syntax.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          cron: {
            type: 'string',
            description: 'Cron expression (e.g. "* * * * *" for every minute)',
          },
          task: {
            type: 'string',
            description: 'Description of the task to run',
          },
        },
        required: ['cron', 'task'],
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: ScheduleTaskParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ScheduleTaskParams, ToolResult> {
    return new ScheduleTaskToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

// --- List Tasks Tool ---

export interface ListTasksParams {}

class ListTasksToolInvocation extends BaseToolInvocation<
  ListTasksParams,
  ToolResult
> {
  constructor(
      private readonly config: Config,
      params: ListTasksParams,
      messageBus: MessageBus,
      _toolName?: string,
      _toolDisplayName?: string,
  ) {
      super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Listing scheduled tasks`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const scheduler = getScheduler(this.config);
    await scheduler.initialize();
    const tasks = scheduler.listTasks();
    
    if (tasks.length === 0) {
        return {
            llmContent: 'No tasks scheduled.',
            returnDisplay: 'No tasks scheduled.',
        };
    }

    const output = tasks.map(t => `- [${t.id}] "${t.command}" (${t.cron})`).join('\n');
    return {
        llmContent: output,
        returnDisplay: `Found ${tasks.length} tasks.`,
    };
  }
}

export class ListTasksTool extends BaseDeclarativeTool<
  ListTasksParams,
  ToolResult
> {
  static readonly Name = 'list_tasks';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      ListTasksTool.Name,
      'ListTasks',
      'List all currently scheduled tasks.',
      Kind.Read,
      {
        type: 'object',
        properties: {},
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: ListTasksParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ListTasksParams, ToolResult> {
    return new ListTasksToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

// --- Remove Task Tool ---

export interface RemoveTaskParams {
    id: string;
}

class RemoveTaskToolInvocation extends BaseToolInvocation<
  RemoveTaskParams,
  ToolResult
> {
  constructor(
      private readonly config: Config,
      params: RemoveTaskParams,
      messageBus: MessageBus,
      _toolName?: string,
      _toolDisplayName?: string,
  ) {
      super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Removing task ${this.params.id}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const scheduler = getScheduler(this.config);
    await scheduler.initialize();
    
    if (await scheduler.removeTask(this.params.id)) {
        return {
            llmContent: `Task ${this.params.id} removed.`,
            returnDisplay: `Task removed.`,
        };
    } else {
        return {
            llmContent: `Task ${this.params.id} not found.`,
            returnDisplay: `Task not found.`,
            error: { message: 'Task not found', type: ToolErrorType.EXECUTION_FAILED },
        };
    }
  }
}

export class RemoveTaskTool extends BaseDeclarativeTool<
  RemoveTaskParams,
  ToolResult
> {
  static readonly Name = 'remove_task';

  constructor(private config: Config, messageBus: MessageBus) {
    super(
      RemoveTaskTool.Name,
      'RemoveTask',
      'Remove a scheduled task by ID.',
      Kind.Delete,
      {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'ID of the task to remove' }
        },
        required: ['id']
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: RemoveTaskParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<RemoveTaskParams, ToolResult> {
    return new RemoveTaskToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
