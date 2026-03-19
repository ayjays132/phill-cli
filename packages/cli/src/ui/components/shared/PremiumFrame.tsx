/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { BORDER_STYLE } from '../../AppContainer.js';
import { theme } from '../../semantic-colors.js';

interface PremiumFrameProps {
  children: React.ReactNode;
  width: number;
  height?: number;
  title?: string;
  subtitle?: string;
  borderColor?: string;
  accentColor?: string;
  animated?: boolean;
}

function supportsUnicodeBorders(): boolean {
  if (process.env['PHILL_FORCE_ASCII_BORDERS'] === 'true') {
    return false;
  }
  const lang = (process.env['LC_ALL'] || process.env['LANG'] || '').toLowerCase();
  const term = (process.env['TERM'] || '').toLowerCase();
  const hasUtf = lang.includes('utf');
  const isDumb = term === 'dumb';
  return hasUtf && !isDumb;
}

export const PremiumFrame: React.FC<PremiumFrameProps> = ({ 
  children, 
  width, 
  height,
  title,
  subtitle,
  borderColor,
  accentColor,
}) => {
  const frameBorderColor = borderColor || theme.border.strong || theme.border.focused;
  const edgeColor = accentColor || theme.border.accent || theme.text.accent;
  const unicode = supportsUnicodeBorders();
  const borderGlyphs = unicode
    ? BORDER_STYLE
    : {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|',
      };
  const innerRule = unicode ? '─' : '-';
  const innerWidth = Math.max(0, width - 6);
  const edgeRunWidth = Math.max(0, width - 2);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Top Border */}
      <Box flexDirection="row">
        <Text color={edgeColor}>{borderGlyphs.topLeft}</Text>
        <Text color={frameBorderColor}>{borderGlyphs.horizontal.repeat(edgeRunWidth)}</Text>
        <Text color={edgeColor}>{borderGlyphs.topRight}</Text>
      </Box>

      {/* Content with Side Borders */}
      <Box flexDirection="row" flexGrow={1}>
        <Text color={frameBorderColor}>{borderGlyphs.vertical}</Text>
        <Box flexGrow={1} paddingX={1} flexDirection="column">
          {(title || subtitle) && (
            <Box flexDirection="column" marginBottom={1}>
              {title && (
                <Text bold color={edgeColor}>
                  {title}
                </Text>
              )}
              {subtitle && <Text color={theme.text.secondary}>{subtitle}</Text>}
              <Box flexDirection="row">
                <Text color={theme.ui.comment}>{innerRule.repeat(innerWidth)}</Text>
              </Box>
            </Box>
          )}
          {children}
        </Box>
        <Text color={frameBorderColor}>{borderGlyphs.vertical}</Text>
      </Box>

      {/* Bottom Border */}
      <Box flexDirection="row">
        <Text color={edgeColor}>{borderGlyphs.bottomLeft}</Text>
        <Text color={frameBorderColor}>{borderGlyphs.horizontal.repeat(edgeRunWidth)}</Text>
        <Text color={edgeColor}>{borderGlyphs.bottomRight}</Text>
      </Box>
    </Box>
  );
};
