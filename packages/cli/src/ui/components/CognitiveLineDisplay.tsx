/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useUIState } from '../contexts/UIStateContext.js';
import { CognitiveLineState } from 'phill-cli-core';

interface CognitiveLineDisplayProps {
  state: CognitiveLineState;
  terminalWidth: number;
  suggestion?: string;
}

export const CognitiveLineDisplay: React.FC<CognitiveLineDisplayProps> = ({
  state,
  terminalWidth,
  suggestion,
}) => {
  const { theme } = useUIState();

  // "SOTA" Visuals
  // Dormant: Subtle, thin line.
  // Suggesting: Active, accent-colored text with line context.
  // Dreaming: Organic, wavy line indicating latent processing.

  // Latent Grounding Indicator
  const { groundingState } = useUIState();
  let indicatorText = '';
  let indicatorColor = theme.primary;

  if (groundingState === 'synced') {
    indicatorText = ' LOCKED ';
    indicatorColor = theme.success;
  } else if (groundingState === 'syncing') {
    indicatorText = ' SYNCING ';
    indicatorColor = theme.accent;
  }

  const indicatorWidth = indicatorText.length;
  const lineContextWidth = Math.max(0, terminalWidth - indicatorWidth);

  // REDEFINE CONTENT WITH ADJUSTED WIDTH
  let adjustedContent: React.ReactNode;
  if (state === CognitiveLineState.SUGGESTING) {
    const text = ` ${suggestion || 'Processing...'} `;
    const textLen = text.length;
    const availableWidth = Math.max(0, lineContextWidth - textLen);
    const leftWidth = Math.floor(availableWidth / 2);
    const rightWidth = availableWidth - leftWidth;

    adjustedContent = (
      <Text>
        <Text color={theme.success}>{'─'.repeat(leftWidth)}</Text>
        <Text color={theme.accent} bold>{text}</Text>
        <Text color={theme.success}>{'─'.repeat(rightWidth)}</Text>
      </Text>
    );
  } else if (state === CognitiveLineState.DREAMING) {
    const pattern = "─ ~ ";
    const repeats = Math.ceil(lineContextWidth / pattern.length);
    const line = pattern.repeat(repeats).slice(0, lineContextWidth);
    adjustedContent = <Text color={theme.accent}>{line}</Text>;
  } else {
    adjustedContent = <Text color={theme.primary} dimColor>{'─'.repeat(lineContextWidth)}</Text>;
  }

  return (
    <Box width={terminalWidth} height={1} overflow="hidden" flexDirection="row">
      <Box flexGrow={1}>
        {adjustedContent}
      </Box>
      {indicatorText && (
        <Box>
          <Text color={indicatorColor} bold>
            [{indicatorText}]
          </Text>
        </Box>
      )}
    </Box>
  );
};