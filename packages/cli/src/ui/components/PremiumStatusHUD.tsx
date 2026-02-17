/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { themeManager } from '../themes/theme-manager.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { getDisplayString } from 'phill-cli-core';

export const PremiumStatusHUD: React.FC = () => {
  const uiState = useUIState();
  const config = useConfig();
  const activeTheme = themeManager.getActiveTheme();

  const modelDisplay = getDisplayString(uiState.currentModel, config.getPreviewFeatures());
  const themeName = activeTheme.name;

  return (
    <Box flexDirection="row" paddingX={1} gap={2}>
      {/* Session Integrity */}
      <Box flexDirection="row">
        <Text color={theme.ui.symbol}>[ </Text>
        <Text color={theme.status.success}>STATUS: STABLE</Text>
        <Text color={theme.ui.symbol}> ]</Text>
      </Box>

      {/* Model Display */}
      <Box flexDirection="row">
        <Text color={theme.text.secondary}>MODEL </Text>
        <Text color={theme.text.accent} bold>{modelDisplay}</Text>
      </Box>

      {/* Theme Display */}
      <Box flexDirection="row">
        <Text color={theme.text.secondary}>THEME </Text>
        <Text color={theme.text.hint}>{themeName}</Text>
      </Box>

      {/* Connection Indicator */}
      <Box flexDirection="row">
        <Text color={theme.status.success}>● </Text>
        <Text color={theme.text.secondary}>SYNERGY ACTIVE</Text>
      </Box>
    </Box>
  );
};
