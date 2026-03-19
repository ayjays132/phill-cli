/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { getDisplayString } from 'phill-cli-core';
import { themeManager } from '../themes/theme-manager.js';
import { BORDER_STYLE } from '../AppContainer.js';

export const PremiumStatusHUD = () => {
  const uiState = useUIState();
  const config = useConfig();
  const activeTheme = themeManager.getActiveTheme();

  const modelDisplay = getDisplayString(uiState.currentModel, config);
  const themeName = activeTheme.name;
  
  // React state might not catch every internal skill activation instantly,
  // but it will re-render frequently enough during chat streaming to show up quickly.
  const activeSkills = config.getSkillManager().getActiveSkills();

  const Delimiter = () => (
    <Text color={theme.ui.comment}> {BORDER_STYLE.vertical} </Text>
  );

  return (
    <Box flexDirection="row" paddingX={1} alignItems="center">
      {/* Session Integrity */}
      <Box flexDirection="row">
        <Text color={theme.status.success} bold>STABLE</Text>
      </Box>

      <Delimiter />

      {/* Model Display */}
      <Box flexDirection="row">
        <Text color={theme.text.secondary}>MODEL </Text>
        <Text color={theme.text.accent} bold>{modelDisplay.toUpperCase()}</Text>
      </Box>

      <Delimiter />

      {/* Theme Display */}
      <Box flexDirection="row">
        <Text color={theme.text.secondary}>THEME </Text>
        <Text color={theme.text.hint}>{themeName.toUpperCase()}</Text>
      </Box>

      {activeSkills.length > 0 && (
        <>
          <Delimiter />
          {/* Active Skills Display */}
          <Box flexDirection="row">
            <Text color={theme.text.secondary}>SKILLS </Text>
            <Text color={theme.ui.gradient?.[0] || theme.text.accent} bold>
              {activeSkills.join(', ').toUpperCase()}
            </Text>
          </Box>
        </>
      )}

      <Delimiter />

      {/* Connection Indicator */}
      <Box flexDirection="row">
        <Text color={theme.status.success}>● </Text>
        <Text color={theme.text.secondary} bold>SYNERGY</Text>
      </Box>
    </Box>
  );
};
