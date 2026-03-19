/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { Text, Box } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { ShowMoreLines } from '../ShowMoreLines.js';
import { SCREEN_READER_MODEL_PREFIX } from '../../textConstants.js';
import { useUIState } from '../../contexts/UIStateContext.js';
import { useAlternateBuffer } from '../../hooks/useAlternateBuffer.js';
import { ThemedGradient } from '../ThemedGradient.js';

interface PhillMessageProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export const PhillMessage: React.FC<PhillMessageProps> = memo(({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
}) => {
  const { renderMarkdown } = useUIState();
  const prefix = '✦ ';
  const prefixWidth = prefix.length;

  const isAlternateBuffer = useAlternateBuffer();
  return (
    <Box flexDirection="row">
      <Box width={prefixWidth}>
        <ThemedGradient animate={isPending} speed={100}>
          <Text aria-label={SCREEN_READER_MODEL_PREFIX}>{prefix}</Text>
        </ThemedGradient>
      </Box>
      <Box flexGrow={1} flexDirection="column">
        <MarkdownDisplay
          text={text}
          isPending={isPending}
          availableTerminalHeight={
            isAlternateBuffer || availableTerminalHeight === undefined
              ? undefined
              : Math.max(availableTerminalHeight - 1, 1)
          }
          terminalWidth={terminalWidth}
          renderMarkdown={renderMarkdown}
        />
        <Box marginBottom={1}>
          <ShowMoreLines
            constrainHeight={availableTerminalHeight !== undefined}
          />
        </Box>
      </Box>
    </Box>
  );
});

PhillMessage.displayName = 'PhillMessage';
