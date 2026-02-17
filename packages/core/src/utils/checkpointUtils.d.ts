/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { GitService } from '../services/gitService.js';
import type { PhillClient } from '../core/client.js';
import { z } from 'zod';
import type { Content } from '@google/genai';
import type { ToolCallRequestInfo } from '../scheduler/types.js';
export interface ToolCallData<HistoryType = unknown, ArgsType = unknown> {
    history?: HistoryType;
    clientHistory?: Content[];
    commitHash?: string;
    toolCall: {
        name: string;
        args: ArgsType;
    };
    messageId?: string;
}
export declare function getToolCallDataSchema(historyItemSchema?: z.ZodTypeAny): any;
export declare function generateCheckpointFileName(toolCall: ToolCallRequestInfo): string | null;
export declare function formatCheckpointDisplayList(filenames: string[]): string;
export declare function getTruncatedCheckpointNames(filenames: string[]): string[];
export declare function processRestorableToolCalls<HistoryType>(toolCalls: ToolCallRequestInfo[], gitService: GitService, phillClient: PhillClient, history?: HistoryType): Promise<{
    checkpointsToWrite: Map<string, string>;
    toolCallToCheckpointMap: Map<string, string>;
    errors: string[];
}>;
export interface CheckpointInfo {
    messageId: string;
    checkpoint: string;
}
export declare function getCheckpointInfoList(checkpointFiles: Map<string, string>): CheckpointInfo[];
