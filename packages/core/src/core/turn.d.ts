/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PartListUnion, GenerateContentResponse, FunctionDeclaration, FinishReason, GenerateContentResponseUsageMetadata } from '@google/genai';
import type { ToolCallConfirmationDetails, ToolResult } from '../tools/tools.js';
import type { PhillChat } from './phillChat.js';
import { type ThoughtSummary } from '../utils/thoughtUtils.js';
import type { ModelConfigKey } from '../services/modelConfigService.js';
import { type ToolCallRequestInfo, type ToolCallResponseInfo } from '../scheduler/types.js';
export interface ServerTool {
    name: string;
    schema: FunctionDeclaration;
    execute(params: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult>;
    shouldConfirmExecute(params: Record<string, unknown>, abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
}
export declare enum PhillEventType {
    Content = "content",
    ToolCallRequest = "tool_call_request",
    ToolCallResponse = "tool_call_response",
    ToolCallConfirmation = "tool_call_confirmation",
    UserCancelled = "user_cancelled",
    Error = "error",
    ChatCompressed = "chat_compressed",
    Thought = "thought",
    MaxSessionTurns = "max_session_turns",
    Finished = "finished",
    LoopDetected = "loop_detected",
    Citation = "citation",
    Retry = "retry",
    ContextWindowWillOverflow = "context_window_will_overflow",
    InvalidStream = "invalid_stream",
    ModelInfo = "model_info",
    AgentExecutionStopped = "agent_execution_stopped",
    AgentExecutionBlocked = "agent_execution_blocked"
}
export type ServerPhillRetryEvent = {
    type: PhillEventType.Retry;
};
export type ServerPhillAgentExecutionStoppedEvent = {
    type: PhillEventType.AgentExecutionStopped;
    value: {
        reason: string;
        systemMessage?: string;
        contextCleared?: boolean;
    };
};
export type ServerPhillAgentExecutionBlockedEvent = {
    type: PhillEventType.AgentExecutionBlocked;
    value: {
        reason: string;
        systemMessage?: string;
        contextCleared?: boolean;
    };
};
export type ServerPhillContextWindowWillOverflowEvent = {
    type: PhillEventType.ContextWindowWillOverflow;
    value: {
        estimatedRequestTokenCount: number;
        remainingTokenCount: number;
    };
};
export type ServerPhillInvalidStreamEvent = {
    type: PhillEventType.InvalidStream;
};
export type ServerPhillModelInfoEvent = {
    type: PhillEventType.ModelInfo;
    value: string;
};
export interface StructuredError {
    message: string;
    status?: number;
}
export interface PhillErrorEventValue {
    error: StructuredError;
}
export interface PhillFinishedEventValue {
    reason: FinishReason | undefined;
    usageMetadata: GenerateContentResponseUsageMetadata | undefined;
}
export interface ServerToolCallConfirmationDetails {
    request: ToolCallRequestInfo;
    details: ToolCallConfirmationDetails;
}
export type ServerPhillContentEvent = {
    type: PhillEventType.Content;
    value: string;
    traceId?: string;
};
export type ServerPhillThoughtEvent = {
    type: PhillEventType.Thought;
    value: ThoughtSummary;
    traceId?: string;
};
export type ServerPhillToolCallRequestEvent = {
    type: PhillEventType.ToolCallRequest;
    value: ToolCallRequestInfo;
};
export type ServerPhillToolCallResponseEvent = {
    type: PhillEventType.ToolCallResponse;
    value: ToolCallResponseInfo;
};
export type ServerPhillToolCallConfirmationEvent = {
    type: PhillEventType.ToolCallConfirmation;
    value: ServerToolCallConfirmationDetails;
};
export type ServerPhillUserCancelledEvent = {
    type: PhillEventType.UserCancelled;
};
export type ServerPhillErrorEvent = {
    type: PhillEventType.Error;
    value: PhillErrorEventValue;
};
export declare enum CompressionStatus {
    /** The compression was successful */
    COMPRESSED = 1,
    /** The compression failed due to the compression inflating the token count */
    COMPRESSION_FAILED_INFLATED_TOKEN_COUNT = 2,
    /** The compression failed due to an error counting tokens */
    COMPRESSION_FAILED_TOKEN_COUNT_ERROR = 3,
    /** The compression failed because the summary was empty */
    COMPRESSION_FAILED_EMPTY_SUMMARY = 4,
    /** The compression was not necessary and no action was taken */
    NOOP = 5
}
export interface ChatCompressionInfo {
    originalTokenCount: number;
    newTokenCount: number;
    compressionStatus: CompressionStatus;
}
export type ServerPhillChatCompressedEvent = {
    type: PhillEventType.ChatCompressed;
    value: ChatCompressionInfo | null;
};
export type ServerPhillMaxSessionTurnsEvent = {
    type: PhillEventType.MaxSessionTurns;
};
export type ServerPhillFinishedEvent = {
    type: PhillEventType.Finished;
    value: PhillFinishedEventValue;
};
export type ServerPhillLoopDetectedEvent = {
    type: PhillEventType.LoopDetected;
};
export type ServerPhillCitationEvent = {
    type: PhillEventType.Citation;
    value: string;
};
export type ServerPhillStreamEvent = ServerPhillChatCompressedEvent | ServerPhillCitationEvent | ServerPhillContentEvent | ServerPhillErrorEvent | ServerPhillFinishedEvent | ServerPhillLoopDetectedEvent | ServerPhillMaxSessionTurnsEvent | ServerPhillThoughtEvent | ServerPhillToolCallConfirmationEvent | ServerPhillToolCallRequestEvent | ServerPhillToolCallResponseEvent | ServerPhillUserCancelledEvent | ServerPhillRetryEvent | ServerPhillContextWindowWillOverflowEvent | ServerPhillInvalidStreamEvent | ServerPhillModelInfoEvent | ServerPhillAgentExecutionStoppedEvent | ServerPhillAgentExecutionBlockedEvent;
export declare class Turn {
    private readonly chat;
    private readonly prompt_id;
    readonly pendingToolCalls: ToolCallRequestInfo[];
    private debugResponses;
    private pendingCitations;
    finishReason: FinishReason | undefined;
    constructor(chat: PhillChat, prompt_id: string);
    run(modelConfigKey: ModelConfigKey, req: PartListUnion, signal: AbortSignal): AsyncGenerator<ServerPhillStreamEvent>;
    private handlePendingFunctionCall;
    getDebugResponses(): GenerateContentResponse[];
    /**
     * Get the concatenated response text from all responses in this turn.
     * This extracts and joins all text content from the model's responses.
     */
    getResponseText(): string;
}
