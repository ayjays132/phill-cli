
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  type ToolResult,
  Kind,
} from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { Config } from '../config/config.js';

export const RELOAD_SKILLS_TOOL_NAME = 'reload_skills';

export interface ReloadSkillsParams {}

export class ReloadSkillsTool extends BaseDeclarativeTool<
  ReloadSkillsParams,
  ToolResult
> {
  static Name = RELOAD_SKILLS_TOOL_NAME;

  constructor(
    private config: Config,
    messageBus: MessageBus,
  ) {
    super(
      RELOAD_SKILLS_TOOL_NAME,
      'Reload Skills',
      'Reloads all skills from the filesystem. Use this after creating or modifying a skill to make it available immediately.',
      Kind.Other,
      {
        type: 'object',
        properties: {},
      },
      messageBus,
    );
  }

  protected createInvocation(
    params: ReloadSkillsParams,
    messageBus: MessageBus,
    toolName: string,
    toolDisplayName: string,
  ): ReloadSkillsInvocation {
    return new ReloadSkillsInvocation(params, messageBus, toolName, toolDisplayName, this.config);
  }
}

export class ReloadSkillsInvocation extends BaseToolInvocation<
  ReloadSkillsParams,
  ToolResult
> {
  constructor(
    params: ReloadSkillsParams,
    messageBus: MessageBus,
    toolName: string,
    toolDisplayName: string,
    private config: Config,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return 'Reloading skills from filesystem...';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const start = Date.now();
    await this.config.reloadSkills();
    const duration = Date.now() - start;
    const count = this.config.getSkillManager().getSkills().length;

    return {
      llmContent: `Skills reloaded in ${duration}ms. Total available skills: ${count}.`,
      returnDisplay: `Skills reloaded. Total: ${count}`,
    };
  }
}
