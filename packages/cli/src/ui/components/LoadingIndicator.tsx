/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ThoughtSummary } from 'phill-cli-core';
import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { useStreamingContext } from '../contexts/StreamingContext.js';
import { StreamingState } from '../types.js';
import { PhillRespondingSpinner } from './PhillRespondingSpinner.js';
import { formatDuration } from '../utils/formatters.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';
import { INTERACTIVE_SHELL_WAITING_PHRASE } from '../hooks/usePhraseCycler.js';
import { ThemedGradient } from './ThemedGradient.js';

interface LoadingIndicatorProps {
  currentLoadingPhrase?: string;
  elapsedTime: number;
  rightContent?: React.ReactNode;
  thought?: ThoughtSummary | null;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  currentLoadingPhrase,
  elapsedTime,
  rightContent,
  thought,
}) => {
  const streamingState = useStreamingContext();
  const { columns: terminalWidth } = useTerminalSize();
  const isNarrow = isNarrowWidth(terminalWidth);

  if (streamingState === StreamingState.Idle) {
    return null;
  }

  // Prioritize the interactive shell waiting phrase over the thought subject
  // because it conveys an actionable state for the user (waiting for input).
  const primaryText =
    currentLoadingPhrase === INTERACTIVE_SHELL_WAITING_PHRASE
      ? currentLoadingPhrase
      : thought?.subject || currentLoadingPhrase;
  const stateEmoji =
    streamingState === StreamingState.WaitingForConfirmation ? '⚡' : '⚙️';

  const cancelAndTimerContent =
    streamingState !== StreamingState.WaitingForConfirmation
      ? `[ esc to cancel | ${elapsedTime < 60 ? `${elapsedTime}s` : formatDuration(elapsedTime * 1000)} ]`
      : null;

  return (
    <Box paddingLeft={1} flexDirection="column" marginY={0}>
      {/* Main loading line */}
      <Box
        width="100%"
        flexDirection={isNarrow ? 'column' : 'row'}
        alignItems={isNarrow ? 'flex-start' : 'center'}
      >
        <Box alignItems="center">
          <Box marginRight={1}>
            <PhillRespondingSpinner
              nonRespondingDisplay={
                streamingState === StreamingState.WaitingForConfirmation
                  ? '⠏'
                  : ''
              }
            />
          </Box>
          {primaryText && (
            <ThemedGradient animate={streamingState !== StreamingState.WaitingForConfirmation} speed={150}>
              <Text bold wrap="truncate-end">
                {stateEmoji} {primaryText.toUpperCase()}
              </Text>
            </ThemedGradient>
          )}
          {!isNarrow && cancelAndTimerContent && (
            <>
              <Box flexShrink={0} width={2} />
              <Text color={theme.text.secondary} dimColor italic>{cancelAndTimerContent}</Text>
            </>
          )}
        </Box>
        {!isNarrow && <Box flexGrow={1}>{/* Spacer */}</Box>}
        {!isNarrow && rightContent && <Box>{rightContent}</Box>}
      </Box>
      {isNarrow && cancelAndTimerContent && (
        <Box paddingLeft={3}>
          <Text color={theme.text.secondary} dimColor italic>{cancelAndTimerContent}</Text>
        </Box>
      )}
      {isNarrow && rightContent && <Box>{rightContent}</Box>}
    </Box>
  );
};
