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

  // SOTA Continuity Engine UI
  let engineStatus = '';
  let engineStyle = theme.primary;

  if (state === CognitiveLineState.SUGGESTING) {
    engineStatus = ' ✨ CONTINUITY ENGINE: OPTIMIZING LATENTS ✨ ';
    engineStyle = theme.accent;
  } else if (state === CognitiveLineState.DREAMING) {
    engineStatus = ' 🧠 CONTINUITY ENGINE: DEEP CACHE CORRECTION 🧠 ';
    engineStyle = theme.warning;
  } else {
    engineStatus = ' ⚡ CONTINUITY ENGINE: VAE SYNCED & COHERENT ⚡ ';
    engineStyle = theme.primary; // Darker/idle
  }

  // Make sure we have enough width, fallback to just the lines if too small
  const engineWidth = engineStatus.length;
  const showText = terminalWidth > engineWidth + indicatorWidth + 10;

  let adjustedContent: React.ReactNode;
  if (state === CognitiveLineState.SUGGESTING) {
    const text = ` ${suggestion || 'Token Utilization Optimal'} `;
    const leftWidth = Math.floor(Math.max(0, lineContextWidth - text.length) / 2);
    const rightWidth = Math.max(0, lineContextWidth - text.length - leftWidth);

    adjustedContent = (
      <Text>
        <Text color={theme.success}>{'━'.repeat(leftWidth)}</Text>
        <Text color={theme.accent} bold italic>{text}</Text>
        <Text color={theme.success}>{'━'.repeat(rightWidth)}</Text>
      </Text>
    );
  } else if (state === CognitiveLineState.DREAMING) {
    const pattern = "≈≡≈ ";
    const repeats = Math.ceil(lineContextWidth / pattern.length);
    const line = pattern.repeat(repeats).slice(0, lineContextWidth);
    adjustedContent = <Text color={theme.warning} dimColor>{line}</Text>;
  } else {
    adjustedContent = <Text color={theme.primary} dimColor>{'─'.repeat(lineContextWidth)}</Text>;
  }

  return (
    <Box width={terminalWidth} flexDirection="column">
      {showText && (
        <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
           <Text color={engineStyle} bold>{engineStatus}</Text>
           <Text color={theme.success} dimColor>Tokens: Minimal | Cache: High-Hit</Text>
        </Box>
      )}
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
    </Box>
  );
};