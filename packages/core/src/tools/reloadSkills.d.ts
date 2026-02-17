import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { Config } from '../config/config.js';
export declare const RELOAD_SKILLS_TOOL_NAME = "reload_skills";
export interface ReloadSkillsParams {
}
export declare class ReloadSkillsTool extends BaseDeclarativeTool<ReloadSkillsParams, ToolResult> {
    private config;
    static Name: string;
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: ReloadSkillsParams, messageBus: MessageBus, toolName: string, toolDisplayName: string): ReloadSkillsInvocation;
}
export declare class ReloadSkillsInvocation extends BaseToolInvocation<ReloadSkillsParams, ToolResult> {
    private config;
    constructor(params: ReloadSkillsParams, messageBus: MessageBus, toolName: string, toolDisplayName: string, config: Config);
    getDescription(): string;
    execute(signal: AbortSignal): Promise<ToolResult>;
}
