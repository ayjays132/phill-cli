/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { ThemedGradient } from './ThemedGradient.js';
import { theme } from '../semantic-colors.js';
import type { ReactNode } from 'react';

export function getFormattedBannerContent(
  rawText: string,
  isWarning: boolean,
  subsequentLineColor: string,
): ReactNode {
  if (isWarning) {
    return (
      <Text color={theme.status.warning}>{rawText.replace(/\\n/g, '\n')}</Text>
    );
  }

  const text = rawText.replace(/\\n/g, '\n');
  const lines = text.split('\n');

  return lines.map((line, index) => {
    if (index === 0) {
      return (
        <ThemedGradient key={index} animate speed={120}>
          <Text>{line}</Text>
        </ThemedGradient>
      );
    }

    return (
      <Text key={index} color={subsequentLineColor}>
        {line}
      </Text>
    );
  });
}

interface BannerProps {
  bannerText: string;
  isWarning: boolean;
  width: number;
}

export const Banner = ({ bannerText, isWarning, width }: BannerProps) => {
  const subsequentLineColor = theme.text.primary;

  const formattedBannerContent = getFormattedBannerContent(
    bannerText,
    isWarning,
    subsequentLineColor,
  );

  return (
    <Box
      flexDirection="row"
      borderStyle={isWarning ? 'bold' : 'round'}
      borderColor={isWarning ? theme.status.warning : theme.border.accent}
      width={width}
      paddingX={1}
      paddingY={isWarning ? 1 : 0}
    >
      <Box marginRight={2} flexShrink={0}>
        <Text bold color={isWarning ? theme.status.warning : theme.status.success}>
          {isWarning ? '⚠️' : '✦'}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {formattedBannerContent}
      </Box>
    </Box>
  );
};
