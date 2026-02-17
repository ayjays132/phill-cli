/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ToolEditConfirmationDetails, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
import type { ModifiableDeclarativeTool, ModifyContext } from './modifiable-tool.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { Config } from '../config/config.js';
export declare const DEFAULT_CONTEXT_FILENAME = "PHILL.md";
export declare const MEMORY_SECTION_HEADER = "## Phill Added Memories";
export declare const VITALS_SECTION_HEADER = "## Vitals & Embodiment";
export declare const PLANNING_LATCH_SECTION_HEADER = "## Planning Latches";
export declare const LATENT_SNAPSHOT_SECTION_HEADER = "## Latent Snapshots";
export declare const USER_IDENTITY_SECTION_HEADER = "## User Identity & Life Goals";
export declare function setPhillMdFilename(newFilename: string | string[]): void;
export declare function getCurrentPhillMdFilename(): string;
export declare function getAllPhillMdFilenames(): string[];
interface SaveMemoryParams {
    fact: string;
    modified_by_user?: boolean;
    modified_content?: string;
}
export declare function getGlobalMemoryFilePath(): string;
/**
 * Computes the new content that would result from adding a memory entry
 */
export declare function computeNewContent(currentContent: string, fact: string, header?: string): string;
declare class MemoryToolInvocation extends BaseToolInvocation<SaveMemoryParams, ToolResult> {
    private config?;
    private static readonly allowlist;
    constructor(params: SaveMemoryParams, messageBus: MessageBus, toolName?: string, displayName?: string, config?: Config | undefined);
    getDescription(): string;
    protected getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolEditConfirmationDetails | false>;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export declare class MemoryTool extends BaseDeclarativeTool<SaveMemoryParams, ToolResult> implements ModifiableDeclarativeTool<SaveMemoryParams> {
    private config;
    static readonly Name = "save_memory";
    constructor(messageBus: MessageBus, config: Config);
    protected validateToolParamValues(params: SaveMemoryParams): string | null;
    protected createInvocation(params: SaveMemoryParams, messageBus: MessageBus, toolName?: string, displayName?: string): MemoryToolInvocation;
    static performAddMemoryEntry(text: string, memoryFilePath: string, fsAdapter: {
        readFile: (path: string, encoding: 'utf-8') => Promise<string>;
        writeFile: (path: string, data: string, encoding: 'utf-8') => Promise<void>;
        mkdir: (path: string, options: {
            recursive: boolean;
        }) => Promise<string | undefined>;
    }): Promise<void>;
    getModifyContext(_abortSignal: AbortSignal): ModifyContext<SaveMemoryParams>;
}
export interface PurgeMemoryParams {
    sectionHeader: string;
    confirm: boolean;
}
export declare class PurgeMemoryToolInvocation extends BaseToolInvocation<PurgeMemoryParams, ToolResult> {
    private static readonly PROTECTED_HEADERS;
    getDescription(): string;
    protected getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolEditConfirmationDetails | false>;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export declare class PurgeMemoryTool extends BaseDeclarativeTool<PurgeMemoryParams, ToolResult> {
    static readonly Name = "purge_memory_section";
    constructor(messageBus: MessageBus);
    protected createInvocation(params: PurgeMemoryParams, messageBus: MessageBus): PurgeMemoryToolInvocation;
}
export {};
