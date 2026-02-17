/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  PhillEventType as ServerPhillEventType,
  getErrorMessage,
  isNodeError,
  MessageSenderType,
  logUserPrompt,
  GitService,
  UnauthorizedError,
  UserPromptEvent,
  DEFAULT_GEMINI_FLASH_MODEL,
  logConversationFinishedEvent,
  ConversationFinishedEvent,
  ApprovalMode,
  parseAndFormatApiError,
  ToolConfirmationOutcome,
  promptIdContext,
  tokenLimit,
  debugLogger,
  runInDevTraceSpan,
  EDIT_TOOL_NAMES,
  processRestorableToolCalls,
  recordToolCallInteractions,
  ToolErrorType,
  ValidationRequiredError,
  coreEvents,
  CoreEvent,
} from 'phill-cli-core';
import type {
  Config,
  EditorType,
  PhillClient,
  ServerPhillChatCompressedEvent,
  ServerPhillContentEvent as ContentEvent,
  ServerPhillFinishedEvent,
  ServerPhillStreamEvent as PhillEvent,
  ThoughtSummary,
  ToolCallRequestInfo,
  PhillErrorEventValue,
  RetryAttemptPayload,
  ToolCallConfirmationDetails,
} from 'phill-cli-core';
import { type Part, type PartListUnion, FinishReason } from '@google/genai';
import type {
  HistoryItem,
  HistoryItemWithoutId,
  HistoryItemToolGroup,
  IndividualToolCallDisplay,
  SlashCommandProcessorResult,
  HistoryItemModel,
} from '../types.js';
import { StreamingState, MessageType, ToolCallStatus } from '../types.js';
import { isAtCommand, isSlashCommand } from '../utils/commandUtils.js';
import { useShellCommandProcessor } from './shellCommandProcessor.js';
import { handleAtCommand } from './atCommandProcessor.js';
import { findLastSafeSplitPoint } from '../utils/markdownUtilities.js';
import { useStateAndRef } from './useStateAndRef.js';
import type { UseHistoryManagerReturn } from './useHistoryManager.js';
import { useLogger } from './useLogger.js';
import { SHELL_COMMAND_NAME } from '../constants.js';
import { mapToDisplay as mapTrackedToolCallsToDisplay } from './toolMapping.js';
import {
  useToolScheduler,
  type TrackedToolCall,
  type TrackedCompletedToolCall,
  type TrackedCancelledToolCall,
  type TrackedWaitingToolCall,
} from './useToolScheduler.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { useSessionStats } from '../contexts/SessionContext.js';
import { useKeypress } from './useKeypress.js';
import type { LoadedSettings } from '../../config/settings.js';

enum StreamProcessingStatus {
  Completed,
  UserCancelled,
  Error,
}

function showCitations(settings: LoadedSettings): boolean {
  const enabled = settings.merged.ui.showCitations;
  if (enabled !== undefined) {
    return enabled;
  }
  return true;
}

/**
 * Calculates the current streaming state based on tool call status and responding flag.
 */
function calculateStreamingState(
  isResponding: boolean,
  toolCalls: TrackedToolCall[],
): StreamingState {
  if (toolCalls.some((tc) => tc.status === 'awaiting_approval')) {
    return StreamingState.WaitingForConfirmation;
  }

  const isAnyToolActive = toolCalls.some((tc) => {
    // These statuses indicate active processing
    if (
      tc.status === 'executing' ||
      tc.status === 'scheduled' ||
      tc.status === 'validating'
    ) {
      return true;
    }

    // Terminal statuses (success, error, cancelled) still count as "Responding"
    // if the result hasn't been submitted back to Phill yet.
    if (
      tc.status === 'success' ||
      tc.status === 'error' ||
      tc.status === 'cancelled'
    ) {
      return !(tc as TrackedCompletedToolCall | TrackedCancelledToolCall)
        .responseSubmittedToPhill;
    }

    return false;
  });

  if (isResponding || isAnyToolActive) {
    return StreamingState.Responding;
  }

  return StreamingState.Idle;
}

/**
 * Manages the Phill stream, including user input, command processing,
 * API interaction, and tool call lifecycle.
 */
export const usePhillStream = (
  phillClient: PhillClient,
  history: HistoryItem[],
  addItem: UseHistoryManagerReturn['addItem'],
  config: Config,
  settings: LoadedSettings,
  onDebugMessage: (message: string) => void,
  handleSlashCommand: (
    cmd: PartListUnion,
  ) => Promise<SlashCommandProcessorResult | false>,
  shellModeActive: boolean,
  getPreferredEditor: () => EditorType | undefined,
  onAuthError: (error: string) => void,
  performMemoryRefresh: () => Promise<void>,
  modelSwitchedFromQuotaError: boolean,
  setModelSwitchedFromQuotaError: React.Dispatch<React.SetStateAction<boolean>>,
  onCancelSubmit: (shouldRestorePrompt?: boolean) => void,
  setShellInputFocused: (value: boolean) => void,
  terminalWidth: number,
  terminalHeight: number,
  isShellFocused?: boolean,
) => {
  const [initError, setInitError] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<RetryAttemptPayload | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const turnCancelledRef = useRef(false);
  const activeQueryIdRef = useRef<string | null>(null);
  const [isResponding, setIsResponding] = useState<boolean>(false);
  const [thought, setThought] = useState<ThoughtSummary | null>(null);
  const [pendingHistoryItem, pendingHistoryItemRef, setPendingHistoryItem] =
    useStateAndRef<HistoryItemWithoutId | null>(null);
  const [lastPhillActivityTime, setLastPhillActivityTime] =
    useState<number>(0);
  const [pushedToolCallIds, pushedToolCallIdsRef, setPushedToolCallIds] =
    useStateAndRef<Set<string>>(new Set());
  const [_isFirstToolInGroup, isFirstToolInGroupRef, setIsFirstToolInGroup] =
    useStateAndRef<boolean>(true);
  const processedMemoryToolsRef = useRef<Set<string>>(new Set());
  const { startNewPrompt, getPromptCount } = useSessionStats();
  const storage = config.storage;
  const logger = useLogger(storage);
  const gitService = useMemo(() => {
    if (!config.getProjectRoot()) {
      return;
    }
    return new GitService(config.getProjectRoot(), storage);
  }, [config, storage]);

  useEffect(() => {
    const handleRetryAttempt = (payload: RetryAttemptPayload) => {
      setRetryStatus(payload);
    };
    coreEvents.on(CoreEvent.RetryAttempt, handleRetryAttempt);
    return () => {
      coreEvents.off(CoreEvent.RetryAttempt, handleRetryAttempt);
    };
  }, []);

  const [
    toolCalls,
    scheduleToolCalls,
    markToolsAsSubmitted,
    setToolCallsForDisplay,
    cancelAllToolCalls,
    lastToolOutputTime,
  ] = useToolScheduler(
    async (completedToolCallsFromScheduler) => {
      // This onComplete is called when ALL scheduled tools for a given batch are done.
      if (completedToolCallsFromScheduler.length > 0) {
        // Add only the tools that haven't been pushed to history yet.
        const toolsToPush = completedToolCallsFromScheduler.filter(
          (tc) => !pushedToolCallIdsRef.current.has(tc.request.callId),
        );
        if (toolsToPush.length > 0) {
          addItem(
            mapTrackedToolCallsToDisplay(toolsToPush as TrackedToolCall[], {
              borderTop: isFirstToolInGroupRef.current,
              borderBottom: true,
            }),
          );
        }

        // Clear the live-updating display now that the final state is in history.
        setToolCallsForDisplay([]);

        // Record tool calls with full metadata before sending responses.
        try {
          const currentModel =
            config.getPhillClient().getCurrentSequenceModel() ??
            config.getModel();
          config
            .getPhillClient()
            .getChat()
            .recordCompletedToolCalls(
              currentModel,
              completedToolCallsFromScheduler,
            );

          await recordToolCallInteractions(
            config,
            completedToolCallsFromScheduler,
          );
        } catch (error) {
          debugLogger.warn(
            `Error recording completed tool call information: ${error}`,
          );
        }

        // Handle tool response submission immediately when tools complete
        await handleCompletedTools(
          completedToolCallsFromScheduler as TrackedToolCall[],
        );
      }
    },
    config,
    getPreferredEditor,
  );

  const streamingState = useMemo(
    () => calculateStreamingState(isResponding, toolCalls),
    [isResponding, toolCalls],
  );

  // Reset tracking when a new batch of tools starts
  useEffect(() => {
    if (toolCalls.length > 0) {
      const isNewBatch = !toolCalls.some((tc) =>
        pushedToolCallIdsRef.current.has(tc.request.callId),
      );
      if (isNewBatch) {
        setPushedToolCallIds(new Set());
        setIsFirstToolInGroup(true);
      }
    } else if (streamingState === StreamingState.Idle) {
      // Clear when idle to be ready for next turn
      setPushedToolCallIds(new Set());
      setIsFirstToolInGroup(true);
    }
  }, [
    toolCalls,
    pushedToolCallIdsRef,
    setPushedToolCallIds,
    setIsFirstToolInGroup,
    streamingState,
  ]);

  // Push completed tools to history as they finish
  useEffect(() => {
    const toolsToPush: TrackedToolCall[] = [];
    for (const tc of toolCalls) {
      if (pushedToolCallIdsRef.current.has(tc.request.callId)) continue;

      if (
        tc.status === 'success' ||
        tc.status === 'error' ||
        tc.status === 'cancelled'
      ) {
        toolsToPush.push(tc);
      } else {
        // Stop at first non-terminal tool to preserve order
        break;
      }
    }

    if (toolsToPush.length > 0) {
      const newPushed = new Set(pushedToolCallIdsRef.current);
      let isFirst = isFirstToolInGroupRef.current;

      for (const tc of toolsToPush) {
        newPushed.add(tc.request.callId);
        const isLastInBatch = tc === toolCalls[toolCalls.length - 1];

        const historyItem = mapTrackedToolCallsToDisplay(tc, {
          borderTop: isFirst,
          borderBottom: isLastInBatch,
        });
        addItem(historyItem);
        isFirst = false;
      }

      setPushedToolCallIds(newPushed);
      setIsFirstToolInGroup(false);
    }
  }, [
    toolCalls,
    pushedToolCallIdsRef,
    isFirstToolInGroupRef,
    setPushedToolCallIds,
    setIsFirstToolInGroup,
    addItem,
  ]);

  const pendingToolGroupItems = useMemo((): HistoryItemWithoutId[] => {
    const remainingTools = toolCalls.filter(
      (tc) => !pushedToolCallIds.has(tc.request.callId),
    );

    const items: HistoryItemWithoutId[] = [];

    if (remainingTools.length > 0) {
      items.push(
        mapTrackedToolCallsToDisplay(remainingTools, {
          borderTop: pushedToolCallIds.size === 0,
          borderBottom: false, // Stay open to connect with the slice below
        }),
      );
    }

    // Always show a bottom border slice if we have ANY tools in the batch
    // and we haven't finished pushing the whole batch to history yet.
    // Once all tools are terminal and pushed, the last history item handles the closing border.
    const allTerminal =
      toolCalls.length > 0 &&
      toolCalls.every(
        (tc) =>
          tc.status === 'success' ||
          tc.status === 'error' ||
          tc.status === 'cancelled',
      );

    const allPushed =
      toolCalls.length > 0 &&
      toolCalls.every((tc) => pushedToolCallIds.has(tc.request.callId));

    const isEventDriven = config.isEventDrivenSchedulerEnabled();
    const anyVisibleInHistory = pushedToolCallIds.size > 0;
    const anyVisibleInPending = remainingTools.some((tc) => {
      if (!isEventDriven) return true;
      return (
        tc.status !== 'scheduled' &&
        tc.status !== 'validating' &&
        tc.status !== 'awaiting_approval'
      );
    });

    if (
      toolCalls.length > 0 &&
      !(allTerminal && allPushed) &&
      (anyVisibleInHistory || anyVisibleInPending)
    ) {
      items.push({
        type: 'tool_group' as const,
        tools: [] as IndividualToolCallDisplay[],
        borderTop: false,
        borderBottom: true,
      });
    }

    return items;
  }, [toolCalls, pushedToolCallIds, config]);

  const activeToolPtyId = useMemo(() => {
    const executingShellTool = toolCalls?.find(
      (tc) =>
        tc.status === 'executing' && tc.request.name === 'run_shell_command',
    );
    if (executingShellTool) {
      return (executingShellTool as { pid?: number }).pid;
    }
    return undefined;
  }, [toolCalls]);

  const lastQueryRef = useRef<PartListUnion | null>(null);
  const lastPromptIdRef = useRef<string | null>(null);
  const loopDetectedRef = useRef(false);
  const [
    loopDetectionConfirmationRequest,
    setLoopDetectionConfirmationRequest,
  ] = useState<{
    onComplete: (result: { userSelection: 'disable' | 'keep' }) => void;
  } | null>(null);

  const onExec = useCallback(async (done: Promise<void>) => {
    setIsResponding(true);
    await done;
    setIsResponding(false);
  }, []);
  const { handleShellCommand, activeShellPtyId, lastShellOutputTime } =
    useShellCommandProcessor(
      addItem,
      setPendingHistoryItem,
      onExec,
      onDebugMessage,
      config,
      phillClient,
      setShellInputFocused,
      terminalWidth,
      terminalHeight,
    );

  const activePtyId = activeShellPtyId || activeToolPtyId;

  useEffect(() => {
    if (!activePtyId) {
      setShellInputFocused(false);
    }
  }, [activePtyId, setShellInputFocused]);

  const prevActiveShellPtyIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      turnCancelledRef.current &&
      prevActiveShellPtyIdRef.current !== null &&
      activeShellPtyId === null
    ) {
      addItem({ type: MessageType.INFO, text: 'Request cancelled.' });
      setIsResponding(false);
    }
    prevActiveShellPtyIdRef.current = activeShellPtyId;
  }, [activeShellPtyId, addItem]);

  useEffect(() => {
    if (
      config.getApprovalMode() === ApprovalMode.YOLO &&
      streamingState === StreamingState.Idle
    ) {
      const lastUserMessageIndex = history.findLastIndex(
        (item: HistoryItem) => item.type === MessageType.USER,
      );

      const turnCount =
        lastUserMessageIndex === -1 ? 0 : history.length - lastUserMessageIndex;

      if (turnCount > 0) {
        logConversationFinishedEvent(
          config,
          new ConversationFinishedEvent(config.getApprovalMode(), turnCount),
        );
      }
    }
  }, [streamingState, config, history]);

  useEffect(() => {
    if (!isResponding) {
      setRetryStatus(null);
    }
  }, [isResponding]);

  const cancelOngoingRequest = useCallback(() => {
    if (
      streamingState !== StreamingState.Responding &&
      streamingState !== StreamingState.WaitingForConfirmation
    ) {
      return;
    }
    if (turnCancelledRef.current) {
      return;
    }
    turnCancelledRef.current = true;

    // A full cancellation means no tools have produced a final result yet.
    // This determines if we show a generic "Request cancelled" message.
    const isFullCancellation = !toolCalls.some(
      (tc) => tc.status === 'success' || tc.status === 'error',
    );

    // Ensure we have an abort controller, creating one if it doesn't exist.
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }

    // The order is important here.
    // 1. Fire the signal to interrupt any active async operations.
    abortControllerRef.current.abort();
    // 2. Call the imperative cancel to clear the queue of pending tools.
    cancelAllToolCalls(abortControllerRef.current.signal);

    if (pendingHistoryItemRef.current) {
      const isShellCommand =
        pendingHistoryItemRef.current.type === 'tool_group' &&
        pendingHistoryItemRef.current.tools.some(
          (t) => t.name === SHELL_COMMAND_NAME,
        );

      // If it is a shell command, we update the status to Canceled and clear the output
      // to avoid artifacts, then add it to history immediately.
      if (isShellCommand) {
        const toolGroup = pendingHistoryItemRef.current as HistoryItemToolGroup;
        const updatedTools = toolGroup.tools.map((tool) => {
          if (tool.name === SHELL_COMMAND_NAME) {
            return {
              ...tool,
              status: ToolCallStatus.Canceled,
              resultDisplay: tool.resultDisplay,
            };
          }
          return tool;
        });
        addItem({ ...toolGroup, tools: updatedTools } as HistoryItemWithoutId);
      } else {
        addItem(pendingHistoryItemRef.current);
      }
    }
    setPendingHistoryItem(null);

    // If it was a full cancellation, add the info message now.
    // Otherwise, we let handleCompletedTools figure out the next step,
    // which might involve sending partial results back to the model.
    if (isFullCancellation) {
      // If shell is active, we delay this message to ensure correct ordering
      // (Shell item first, then Info message).
      if (!activeShellPtyId) {
        addItem({
          type: MessageType.INFO,
          text: 'Request cancelled.',
        });
        setIsResponding(false);
      }
    }

    onCancelSubmit(false);
    setShellInputFocused(false);
  }, [
    streamingState,
    addItem,
    setPendingHistoryItem,
    onCancelSubmit,
    pendingHistoryItemRef,
    setShellInputFocused,
    cancelAllToolCalls,
    toolCalls,
    activeShellPtyId,
  ]);

  useKeypress(
    (key) => {
      if (key.name === 'escape' && !isShellFocused) {
        cancelOngoingRequest();
      }
    },
    {
      isActive:
        streamingState === StreamingState.Responding ||
        streamingState === StreamingState.WaitingForConfirmation,
    },
  );

  const prepareQueryForPhill = useCallback(
    async (
      query: PartListUnion,
      userMessageTimestamp: number,
      abortSignal: AbortSignal,
      prompt_id: string,
    ): Promise<{
      queryToSend: PartListUnion | null;
      shouldProceed: boolean;
    }> => {
      if (turnCancelledRef.current) {
        return { queryToSend: null, shouldProceed: false };
      }
      if (typeof query === 'string' && query.trim().length === 0) {
        return { queryToSend: null, shouldProceed: false };
      }

      let localQueryToSendToPhill: PartListUnion | null = null;

      if (typeof query === 'string') {
        const trimmedQuery = query.trim();
        await logger?.logMessage(MessageSenderType.USER, trimmedQuery);

        if (!shellModeActive) {
          // Handle UI-only commands first
          const slashCommandResult = isSlashCommand(trimmedQuery)
            ? await handleSlashCommand(trimmedQuery)
            : false;

          if (slashCommandResult) {
            switch (slashCommandResult.type) {
              case 'schedule_tool': {
                const { toolName, toolArgs } = slashCommandResult;
                const toolCallRequest: ToolCallRequestInfo = {
                  callId: `${toolName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  name: toolName,
                  args: toolArgs,
                  isClientInitiated: true,
                  prompt_id,
                };
                await scheduleToolCalls([toolCallRequest], abortSignal);
                return { queryToSend: null, shouldProceed: false };
              }
              case 'submit_prompt': {
                localQueryToSendToPhill = slashCommandResult.content;

                return {
                  queryToSend: localQueryToSendToPhill,
                  shouldProceed: true,
                };
              }
              case 'handled': {
                return { queryToSend: null, shouldProceed: false };
              }
              default: {
                const unreachable: never = slashCommandResult;
                throw new Error(
                  `Unhandled slash command result type: ${unreachable}`,
                );
              }
            }
          }
        }

        if (shellModeActive && handleShellCommand(trimmedQuery, abortSignal)) {
          return { queryToSend: null, shouldProceed: false };
        }

        // Handle @-commands (which might involve tool calls)
        if (isAtCommand(trimmedQuery)) {
          // Add user's turn before @ command processing for correct UI ordering.
          addItem(
            { type: MessageType.USER, text: trimmedQuery },
            userMessageTimestamp,
          );

          const atCommandResult = await handleAtCommand({
            query: trimmedQuery,
            config,
            addItem,
            onDebugMessage,
            messageId: userMessageTimestamp,
            signal: abortSignal,
          });

          if (atCommandResult.error) {
            onDebugMessage(atCommandResult.error);
            return { queryToSend: null, shouldProceed: false };
          }
          localQueryToSendToPhill = atCommandResult.processedQuery;
        } else {
          // Normal query for Phill
          addItem(
            { type: MessageType.USER, text: trimmedQuery },
            userMessageTimestamp,
          );
          localQueryToSendToPhill = trimmedQuery;
        }
      } else {
        // It's a function response (PartListUnion that isn't a string)
        localQueryToSendToPhill = query;
      }

      if (localQueryToSendToPhill === null) {
        onDebugMessage(
          'Query processing resulted in null, not sending to Phill.',
        );
        return { queryToSend: null, shouldProceed: false };
      }
      return { queryToSend: localQueryToSendToPhill, shouldProceed: true };
    },
    [
      config,
      addItem,
      onDebugMessage,
      handleShellCommand,
      handleSlashCommand,
      logger,
      shellModeActive,
      scheduleToolCalls,
    ],
  );

  // --- Stream Event Handlers ---

  const handleContentEvent = useCallback(
    (
      eventValue: ContentEvent['value'],
      currentPhillMessageBuffer: string,
      userMessageTimestamp: number,
    ): string => {
      setRetryStatus(null);
      if (turnCancelledRef.current) {
        // Prevents additional output after a user initiated cancel.
        return '';
      }
      let newPhillMessageBuffer = currentPhillMessageBuffer + eventValue;
      if (
        pendingHistoryItemRef.current?.type !== 'phill' &&
        pendingHistoryItemRef.current?.type !== 'phill_content'
      ) {
        if (pendingHistoryItemRef.current) {
          addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        }
        setPendingHistoryItem({ type: 'phill', text: '' });
        newPhillMessageBuffer = eventValue;
      }
      // Split large messages for better rendering performance. Ideally,
      // we should maximize the amount of output sent to <Static />.
      const splitPoint = findLastSafeSplitPoint(newPhillMessageBuffer);
      if (splitPoint === newPhillMessageBuffer.length) {
        // Update the existing message with accumulated content
        setPendingHistoryItem((item) => ({
          type: item?.type as 'phill' | 'phill_content',
          text: newPhillMessageBuffer,
        }));
      } else {
        // This indicates that we need to split up this Phill Message.
        // Splitting a message is primarily a performance consideration. There is a
        // <Static> component at the root of App.tsx which takes care of rendering
        // content statically or dynamically. Everything but the last message is
        // treated as static in order to prevent re-rendering an entire message history
        // multiple times per-second (as streaming occurs). Prior to this change you'd
        // see heavy flickering of the terminal. This ensures that larger messages get
        // broken up so that there are more "statically" rendered.
        const beforeText = newPhillMessageBuffer.substring(0, splitPoint);
        const afterText = newPhillMessageBuffer.substring(splitPoint);
        addItem(
          {
            type: pendingHistoryItemRef.current?.type as
              | 'phill'
              | 'phill_content',
            text: beforeText,
          },
          userMessageTimestamp,
        );
        setPendingHistoryItem({ type: 'phill_content', text: afterText });
        newPhillMessageBuffer = afterText;
      }
      return newPhillMessageBuffer;
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem],
  );

  const handleUserCancelledEvent = useCallback(
    (userMessageTimestamp: number) => {
      if (turnCancelledRef.current) {
        return;
      }
      if (pendingHistoryItemRef.current) {
        if (pendingHistoryItemRef.current.type === 'tool_group') {
          const updatedTools = pendingHistoryItemRef.current.tools.map(
            (tool) =>
              tool.status === ToolCallStatus.Pending ||
              tool.status === ToolCallStatus.Confirming ||
              tool.status === ToolCallStatus.Executing
                ? { ...tool, status: ToolCallStatus.Canceled }
                : tool,
          );
          const pendingItem: HistoryItemToolGroup = {
            ...pendingHistoryItemRef.current,
            tools: updatedTools,
          };
          addItem(pendingItem, userMessageTimestamp);
        } else {
          addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        }
        setPendingHistoryItem(null);
      }
      addItem(
        { type: MessageType.INFO, text: 'User cancelled the request.' },
        userMessageTimestamp,
      );
      setIsResponding(false);
      setThought(null); // Reset thought when user cancels
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, setThought],
  );

  const handleErrorEvent = useCallback(
    (eventValue: PhillErrorEventValue, userMessageTimestamp: number) => {
      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem(
        {
          type: MessageType.ERROR,
          text: parseAndFormatApiError(
            eventValue.error,
            config.getContentGeneratorConfig()?.authType,
            undefined,
            config.getModel(),
            DEFAULT_GEMINI_FLASH_MODEL,
          ),
        },
        userMessageTimestamp,
      );
      setThought(null); // Reset thought when there's an error
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, config, setThought],
  );

  const handleCitationEvent = useCallback(
    (text: string, userMessageTimestamp: number) => {
      if (!showCitations(settings)) {
        return;
      }

      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem({ type: MessageType.INFO, text }, userMessageTimestamp);
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, settings],
  );

  const handleFinishedEvent = useCallback(
    (event: ServerPhillFinishedEvent, userMessageTimestamp: number) => {
      const finishReason = event.value.reason;
      if (!finishReason) {
        return;
      }

      const finishReasonMessages: Record<FinishReason, string | undefined> = {
        [FinishReason.FINISH_REASON_UNSPECIFIED]: undefined,
        [FinishReason.STOP]: undefined,
        [FinishReason.MAX_TOKENS]: 'Response truncated due to token limits.',
        [FinishReason.SAFETY]: 'Response stopped due to safety reasons.',
        [FinishReason.RECITATION]: 'Response stopped due to recitation policy.',
        [FinishReason.LANGUAGE]:
          'Response stopped due to unsupported language.',
        [FinishReason.BLOCKLIST]: 'Response stopped due to forbidden terms.',
        [FinishReason.PROHIBITED_CONTENT]:
          'Response stopped due to prohibited content.',
        [FinishReason.SPII]:
          'Response stopped due to sensitive personally identifiable information.',
        [FinishReason.OTHER]: 'Response stopped for other reasons.',
        [FinishReason.MALFORMED_FUNCTION_CALL]:
          'Response stopped due to malformed function call.',
        [FinishReason.IMAGE_SAFETY]:
          'Response stopped due to image safety violations.',
        [FinishReason.UNEXPECTED_TOOL_CALL]:
          'Response stopped due to unexpected tool call.',
        [FinishReason.IMAGE_PROHIBITED_CONTENT]:
          'Response stopped due to prohibited image content.',
        [FinishReason.NO_IMAGE]:
          'Response stopped because no image was generated.',
      };

      const message = finishReasonMessages[finishReason];
      if (message) {
        addItem(
          {
            type: 'info',
            text: `⚠️  ${message}`,
          },
          userMessageTimestamp,
        );
      }
    },
    [addItem],
  );

  const handleChatCompressionEvent = useCallback(
    (
      eventValue: ServerPhillChatCompressedEvent['value'],
      userMessageTimestamp: number,
    ) => {
      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      return addItem({
        type: 'info',
        text:
          `IMPORTANT: This conversation exceeded the compress threshold. ` +
          `A compressed context will be sent for future messages (compressed from: ` +
          `${eventValue?.originalTokenCount ?? 'unknown'} to ` +
          `${eventValue?.newTokenCount ?? 'unknown'} tokens).`,
      });
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem],
  );

  const handleMaxSessionTurnsEvent = useCallback(
    () =>
      addItem({
        type: 'info',
        text:
          `The session has reached the maximum number of turns: ${config.getMaxSessionTurns()}. ` +
          `Please update this limit in your setting.json file.`,
      }),
    [addItem, config],
  );

  const handleContextWindowWillOverflowEvent = useCallback(
    (estimatedRequestTokenCount: number, remainingTokenCount: number) => {
      onCancelSubmit(true);

      const limit = tokenLimit(config.getModel());

      const isLessThan75Percent =
        limit > 0 && remainingTokenCount < limit * 0.75;

      let text = `Sending this message (${estimatedRequestTokenCount} tokens) might exceed the remaining context window limit (${remainingTokenCount} tokens).`;

      if (isLessThan75Percent) {
        text +=
          ' Please try reducing the size of your message or use the `/compress` command to compress the chat history.';
      }

      addItem({
        type: 'info',
        text,
      });
    },
    [addItem, onCancelSubmit, config],
  );

  const handleChatModelEvent = useCallback(
    (eventValue: string, userMessageTimestamp: number) => {
      if (!settings.merged.ui.showModelInfoInChat) {
        return;
      }
      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem(
        {
          type: 'model',
          model: eventValue,
        } as HistoryItemModel,
        userMessageTimestamp,
      );
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, settings],
  );

  const handleAgentExecutionStoppedEvent = useCallback(
    (
      reason: string,
      userMessageTimestamp: number,
      systemMessage?: string,
      contextCleared?: boolean,
    ) => {
      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem(
        {
          type: MessageType.INFO,
          text: `Agent execution stopped: ${systemMessage?.trim() || reason}`,
        },
        userMessageTimestamp,
      );
      if (contextCleared) {
        addItem(
          {
            type: MessageType.INFO,
            text: 'Conversation context has been cleared.',
          },
          userMessageTimestamp,
        );
      }
      setIsResponding(false);
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, setIsResponding],
  );

  const handleAgentExecutionBlockedEvent = useCallback(
    (
      reason: string,
      userMessageTimestamp: number,
      systemMessage?: string,
      contextCleared?: boolean,
    ) => {
      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem(
        {
          type: MessageType.WARNING,
          text: `Agent execution blocked: ${systemMessage?.trim() || reason}`,
        },
        userMessageTimestamp,
      );
      if (contextCleared) {
        addItem(
          {
            type: MessageType.INFO,
            text: 'Conversation context has been cleared.',
          },
          userMessageTimestamp,
        );
      }
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem],
  );

  const processPhillStreamEvents = useCallback(
    async (
      stream: AsyncIterable<PhillEvent>,
      userMessageTimestamp: number,
      signal: AbortSignal,
    ): Promise<StreamProcessingStatus> => {
      let phillMessageBuffer = '';
      const toolCallRequests: ToolCallRequestInfo[] = [];
      for await (const event of stream) {
        switch (event.type) {
          case ServerPhillEventType.Thought:
            setLastPhillActivityTime(Date.now());
            setThought(event.value);
            break;
          case ServerPhillEventType.Content:
            setLastPhillActivityTime(Date.now());
            phillMessageBuffer = handleContentEvent(
              event.value,
              phillMessageBuffer,
              userMessageTimestamp,
            );
            break;
          case ServerPhillEventType.ToolCallRequest:
            toolCallRequests.push(event.value);
            break;
          case ServerPhillEventType.UserCancelled:
            handleUserCancelledEvent(userMessageTimestamp);
            break;
          case ServerPhillEventType.Error:
            handleErrorEvent(event.value, userMessageTimestamp);
            break;
          case ServerPhillEventType.AgentExecutionStopped:
            handleAgentExecutionStoppedEvent(
              event.value.reason,
              userMessageTimestamp,
              event.value.systemMessage,
              event.value.contextCleared,
            );
            break;
          case ServerPhillEventType.AgentExecutionBlocked:
            handleAgentExecutionBlockedEvent(
              event.value.reason,
              userMessageTimestamp,
              event.value.systemMessage,
              event.value.contextCleared,
            );
            break;
          case ServerPhillEventType.ChatCompressed:
            handleChatCompressionEvent(event.value, userMessageTimestamp);
            break;
          case ServerPhillEventType.ToolCallConfirmation:
          case ServerPhillEventType.ToolCallResponse:
            // do nothing
            break;
          case ServerPhillEventType.MaxSessionTurns:
            handleMaxSessionTurnsEvent();
            break;
          case ServerPhillEventType.ContextWindowWillOverflow:
            handleContextWindowWillOverflowEvent(
              event.value.estimatedRequestTokenCount,
              event.value.remainingTokenCount,
            );
            break;
          case ServerPhillEventType.Finished:
            handleFinishedEvent(event, userMessageTimestamp);
            break;
          case ServerPhillEventType.Citation:
            handleCitationEvent(event.value, userMessageTimestamp);
            break;
          case ServerPhillEventType.ModelInfo:
            handleChatModelEvent(event.value, userMessageTimestamp);
            break;
          case ServerPhillEventType.LoopDetected:
            // handle later because we want to move pending history to history
            // before we add loop detected message to history
            loopDetectedRef.current = true;
            break;
          case ServerPhillEventType.Retry:
          case ServerPhillEventType.InvalidStream:
            // Will add the missing logic later
            break;
          default: {
            // enforces exhaustive switch-case
            const unreachable: never = event;
            return unreachable;
          }
        }
      }
      if (toolCallRequests.length > 0) {
        if (pendingHistoryItemRef.current) {
          addItem(pendingHistoryItemRef.current, userMessageTimestamp);
          setPendingHistoryItem(null);
        }
        await scheduleToolCalls(toolCallRequests, signal);
      }
      return StreamProcessingStatus.Completed;
    },
    [
      handleContentEvent,
      handleUserCancelledEvent,
      handleErrorEvent,
      scheduleToolCalls,
      handleChatCompressionEvent,
      handleFinishedEvent,
      handleMaxSessionTurnsEvent,
      handleContextWindowWillOverflowEvent,
      handleCitationEvent,
      handleChatModelEvent,
      handleAgentExecutionStoppedEvent,
      handleAgentExecutionBlockedEvent,
      addItem,
      pendingHistoryItemRef,
      setPendingHistoryItem,
    ],
  );
  const submitQuery = useCallback(
    async (
      query: PartListUnion,
      options?: { isContinuation: boolean },
      prompt_id?: string,
    ) =>
      runInDevTraceSpan(
        { name: 'submitQuery' },
        async ({ metadata: spanMetadata }) => {
          spanMetadata.input = query;

          const queryId = `${Date.now()}-${Math.random()}`;
          activeQueryIdRef.current = queryId;
          if (
            (streamingState === StreamingState.Responding ||
              streamingState === StreamingState.WaitingForConfirmation) &&
            !options?.isContinuation
          )
            return;

          const userMessageTimestamp = Date.now();

          // Reset quota error flag when starting a new query (not a continuation)
          if (!options?.isContinuation) {
            setModelSwitchedFromQuotaError(false);
            config.setQuotaErrorOccurred(false);
          }

          abortControllerRef.current = new AbortController();
          const abortSignal = abortControllerRef.current.signal;
          turnCancelledRef.current = false;

          if (!prompt_id) {
            prompt_id = config.getSessionId() + '########' + getPromptCount();
          }
          return promptIdContext.run(prompt_id, async () => {
            const { queryToSend, shouldProceed } = await prepareQueryForPhill(
              query,
              userMessageTimestamp,
              abortSignal,
              prompt_id!,
            );

            if (!shouldProceed || queryToSend === null) {
              return;
            }

            if (!options?.isContinuation) {
              if (typeof queryToSend === 'string') {
                // logging the text prompts only for now
                const promptText = queryToSend;
                logUserPrompt(
                  config,
                  new UserPromptEvent(
                    promptText.length,
                    prompt_id!,
                    config.getContentGeneratorConfig()?.authType,
                    promptText,
                  ),
                );
              }
              startNewPrompt();
              setThought(null); // Reset thought when starting a new prompt
            }

            setIsResponding(true);
            setInitError(null);

            // Store query and prompt_id for potential retry on loop detection
            lastQueryRef.current = queryToSend;
            lastPromptIdRef.current = prompt_id!;

            try {
              const stream = phillClient.sendMessageStream(
                queryToSend,
                abortSignal,
                prompt_id!,
              );
              const processingStatus = await processPhillStreamEvents(
                stream,
                userMessageTimestamp,
                abortSignal,
              );

              if (processingStatus === StreamProcessingStatus.UserCancelled) {
                return;
              }

              if (pendingHistoryItemRef.current) {
                addItem(pendingHistoryItemRef.current, userMessageTimestamp);
                setPendingHistoryItem(null);
              }
              if (loopDetectedRef.current) {
                loopDetectedRef.current = false;
                // Show the confirmation dialog to choose whether to disable loop detection
                setLoopDetectionConfirmationRequest({
                  onComplete: (result: {
                    userSelection: 'disable' | 'keep';
                  }) => {
                    setLoopDetectionConfirmationRequest(null);

                    if (result.userSelection === 'disable') {
                      config
                        .getPhillClient()
                        .getLoopDetectionService()
                        .disableForSession();
                      addItem({
                        type: 'info',
                        text: `Loop detection has been disabled for this session. Retrying request...`,
                      });

                      if (lastQueryRef.current && lastPromptIdRef.current) {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        submitQuery(
                          lastQueryRef.current,
                          { isContinuation: true },
                          lastPromptIdRef.current,
                        );
                      }
                    } else {
                      addItem({
                        type: 'info',
                        text: `A potential loop was detected. This can happen due to repetitive tool calls or other model behavior. The request has been halted.`,
                      });
                    }
                  },
                });
              }
            } catch (error: unknown) {
              spanMetadata.error = error;
              if (error instanceof UnauthorizedError) {
                onAuthError('Session expired or is unauthorized.');
              } else if (
                // Suppress ValidationRequiredError if it was marked as handled (e.g. user clicked change_auth or cancelled)
                error instanceof ValidationRequiredError &&
                error.userHandled
              ) {
                // Error was handled by validation dialog, don't display again
              } else if (!isNodeError(error) || error.name !== 'AbortError') {
                addItem(
                  {
                    type: MessageType.ERROR,
                    text: parseAndFormatApiError(
                      getErrorMessage(error) || 'Unknown error',
                      config.getContentGeneratorConfig()?.authType,
                      undefined,
                      config.getModel(),
                      DEFAULT_GEMINI_FLASH_MODEL,
                    ),
                  },
                  userMessageTimestamp,
                );
              }
            } finally {
              if (activeQueryIdRef.current === queryId) {
                setIsResponding(false);
              }
            }
          });
        },
      ),
    [
      streamingState,
      setModelSwitchedFromQuotaError,
      prepareQueryForPhill,
      processPhillStreamEvents,
      pendingHistoryItemRef,
      addItem,
      setPendingHistoryItem,
      setInitError,
      phillClient,
      onAuthError,
      config,
      startNewPrompt,
      getPromptCount,
    ],
  );

  const handleApprovalModeChange = useCallback(
    async (newApprovalMode: ApprovalMode) => {
      // Auto-approve pending tool calls when switching to auto-approval modes
      if (
        newApprovalMode === ApprovalMode.YOLO ||
        newApprovalMode === ApprovalMode.AUTO_EDIT
      ) {
        let awaitingApprovalCalls = toolCalls.filter(
          (call): call is TrackedWaitingToolCall =>
            call.status === 'awaiting_approval',
        );

        // For AUTO_EDIT mode, only approve edit tools (replace, write_file)
        if (newApprovalMode === ApprovalMode.AUTO_EDIT) {
          awaitingApprovalCalls = awaitingApprovalCalls.filter((call) =>
            EDIT_TOOL_NAMES.has(call.request.name),
          );
        }

        // Process pending tool calls sequentially to reduce UI chaos
        for (const call of awaitingApprovalCalls) {
          if (
            (call.confirmationDetails as ToolCallConfirmationDetails)?.onConfirm
          ) {
            try {
              await (
                call.confirmationDetails as ToolCallConfirmationDetails
              ).onConfirm(ToolConfirmationOutcome.ProceedOnce);
            } catch (error) {
              debugLogger.warn(
                `Failed to auto-approve tool call ${call.request.callId}:`,
                error,
              );
            }
          }
        }
      }
    },
    [toolCalls],
  );

  const handleCompletedTools = useCallback(
    async (completedToolCallsFromScheduler: TrackedToolCall[]) => {
      const completedAndReadyToSubmitTools =
        completedToolCallsFromScheduler.filter(
          (
            tc: TrackedToolCall,
          ): tc is TrackedCompletedToolCall | TrackedCancelledToolCall => {
            const isTerminalState =
              tc.status === 'success' ||
              tc.status === 'error' ||
              tc.status === 'cancelled';

            if (isTerminalState) {
              const completedOrCancelledCall = tc as
                | TrackedCompletedToolCall
                | TrackedCancelledToolCall;
              return (
                completedOrCancelledCall.response?.responseParts !== undefined
              );
            }
            return false;
          },
        );

      // Finalize any client-initiated tools as soon as they are done.
      const clientTools = completedAndReadyToSubmitTools.filter(
        (t) => t.request.isClientInitiated,
      );
      if (clientTools.length > 0) {
        markToolsAsSubmitted(clientTools.map((t) => t.request.callId));
      }

      // Identify new, successful save_memory calls that we haven't processed yet.
      const newSuccessfulMemorySaves = completedAndReadyToSubmitTools.filter(
        (t) =>
          t.request.name === 'save_memory' &&
          t.status === 'success' &&
          !processedMemoryToolsRef.current.has(t.request.callId),
      );

      if (newSuccessfulMemorySaves.length > 0) {
        // Perform the refresh only if there are new ones.
        void performMemoryRefresh();
        // Mark them as processed so we don't do this again on the next render.
        newSuccessfulMemorySaves.forEach((t) =>
          processedMemoryToolsRef.current.add(t.request.callId),
        );
      }

      const phillTools = completedAndReadyToSubmitTools.filter(
        (t) => !t.request.isClientInitiated,
      );

      if (phillTools.length === 0) {
        return;
      }

      // Check if any tool requested to stop execution immediately
      const stopExecutionTool = phillTools.find(
        (tc) => tc.response.errorType === ToolErrorType.STOP_EXECUTION,
      );

      if (stopExecutionTool && stopExecutionTool.response.error) {
        addItem({
          type: MessageType.INFO,
          text: `Agent execution stopped: ${stopExecutionTool.response.error.message}`,
        });
        setIsResponding(false);

        const callIdsToMarkAsSubmitted = phillTools.map(
          (toolCall) => toolCall.request.callId,
        );
        markToolsAsSubmitted(callIdsToMarkAsSubmitted);
        return;
      }

      // If all the tools were cancelled, don't submit a response to Phill.
      const allToolsCancelled = phillTools.every(
        (tc) => tc.status === 'cancelled',
      );

      if (allToolsCancelled) {
        // If the turn was cancelled via the imperative escape key flow,
        // the cancellation message is added there. We check the ref to avoid duplication.
        if (!turnCancelledRef.current) {
          addItem({
            type: MessageType.INFO,
            text: 'Request cancelled.',
          });
        }
        setIsResponding(false);

        if (phillClient) {
          // We need to manually add the function responses to the history
          // so the model knows the tools were cancelled.
          const combinedParts = phillTools.flatMap(
            (toolCall) => toolCall.response.responseParts,
          );
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          phillClient.addHistory({
            role: 'user',
            parts: combinedParts,
          });
        }

        const callIdsToMarkAsSubmitted = phillTools.map(
          (toolCall) => toolCall.request.callId,
        );
        markToolsAsSubmitted(callIdsToMarkAsSubmitted);
        return;
      }

      const responsesToSend: Part[] = phillTools.flatMap(
        (toolCall) => toolCall.response.responseParts,
      );
      const callIdsToMarkAsSubmitted = phillTools.map(
        (toolCall) => toolCall.request.callId,
      );

      const prompt_ids = phillTools.map(
        (toolCall) => toolCall.request.prompt_id,
      );

      markToolsAsSubmitted(callIdsToMarkAsSubmitted);

      // Don't continue if model was switched due to quota error
      if (modelSwitchedFromQuotaError) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      submitQuery(
        responsesToSend,
        {
          isContinuation: true,
        },
        prompt_ids[0],
      );
    },
    [
      submitQuery,
      markToolsAsSubmitted,
      phillClient,
      performMemoryRefresh,
      modelSwitchedFromQuotaError,
      addItem,
    ],
  );

  const pendingHistoryItems = useMemo(
    () =>
      [pendingHistoryItem, ...pendingToolGroupItems].filter(
        (i): i is HistoryItemWithoutId => i !== undefined && i !== null,
      ),
    [pendingHistoryItem, pendingToolGroupItems],
  );

  useEffect(() => {
    const saveRestorableToolCalls = async () => {
      if (!config.getCheckpointingEnabled()) {
        return;
      }
      const restorableToolCalls = toolCalls.filter(
        (toolCall) =>
          EDIT_TOOL_NAMES.has(toolCall.request.name) &&
          toolCall.status === 'awaiting_approval',
      );

      if (restorableToolCalls.length > 0) {
        if (!gitService) {
          onDebugMessage(
            'Checkpointing is enabled but Git service is not available. Failed to create snapshot. Ensure Git is installed and working properly.',
          );
          return;
        }

        const { checkpointsToWrite, errors } = await processRestorableToolCalls<
          HistoryItem[]
        >(
          restorableToolCalls.map((call) => call.request),
          gitService,
          phillClient,
          history,
        );

        if (errors.length > 0) {
          errors.forEach(onDebugMessage);
        }

        if (checkpointsToWrite.size > 0) {
          const checkpointDir = storage.getProjectTempCheckpointsDir();
          try {
            await fs.mkdir(checkpointDir, { recursive: true });
            for (const [fileName, content] of checkpointsToWrite) {
              const filePath = path.join(checkpointDir, fileName);
              await fs.writeFile(filePath, content);
            }
          } catch (error) {
            onDebugMessage(
              `Failed to write checkpoint file: ${getErrorMessage(error)}`,
            );
          }
        }
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    saveRestorableToolCalls();
  }, [
    toolCalls,
    config,
    onDebugMessage,
    gitService,
    history,
    phillClient,
    storage,
  ]);

  const lastOutputTime = Math.max(
    lastToolOutputTime,
    lastShellOutputTime,
    lastPhillActivityTime,
  );
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const heartbeatConfig = useMemo(() => {
    const heartbeat = settings.merged.general.heartbeat;
    const enabled = heartbeat?.enabled === true;
    const intervalSeconds = Math.max(
      10,
      Math.floor(heartbeat?.intervalSeconds ?? 300),
    );
    const prompt = (heartbeat?.prompt ?? 'continue').trim() || 'continue';
    return { enabled, intervalSeconds, prompt };
  }, [settings.merged.general.heartbeat]);

  useEffect(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (!heartbeatConfig.enabled) {
      return;
    }

    const scheduleNext = () => {
      heartbeatTimerRef.current = setTimeout(() => {
        const isBusy =
          streamingState !== StreamingState.Idle ||
          isResponding ||
          pendingHistoryItemRef.current !== null ||
          toolCalls.length > 0;
        const hasConversation = history.length > 0;

        if (!isBusy && hasConversation) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          submitQuery(heartbeatConfig.prompt, { isContinuation: true }).catch(
            (error) => {
              debugLogger.warn('Heartbeat submit failed:', error);
            },
          );
        }

        scheduleNext();
      }, heartbeatConfig.intervalSeconds * 1000);
    };

    scheduleNext();

    return () => {
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [
    heartbeatConfig.enabled,
    heartbeatConfig.intervalSeconds,
    heartbeatConfig.prompt,
    streamingState,
    isResponding,
    history.length,
    submitQuery,
    pendingHistoryItemRef,
    toolCalls.length,
  ]);

  return {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems,
    thought,
    cancelOngoingRequest,
    pendingToolCalls: toolCalls,
    handleApprovalModeChange,
    activePtyId,
    loopDetectionConfirmationRequest,
    lastOutputTime,
    retryStatus,
  };
};
