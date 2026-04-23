/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import {
  shortenPath,
  tildeifyPath,
  getDisplayString,
} from 'phill-cli-core';
import { ConsoleSummaryDisplay } from './ConsoleSummaryDisplay.js';
import { ThemedGradient } from './ThemedGradient.js';
import { MemoryUsageDisplay } from './MemoryUsageDisplay.js';
import { ContextUsageDisplay } from './ContextUsageDisplay.js';
import { DebugProfiler } from './DebugProfiler.js';
import { isDevelopment } from '../../utils/installationInfo.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useVimMode } from '../contexts/VimModeContext.js';
import { PremiumStatusHUD } from './PremiumStatusHUD.js';
import { BORDER_STYLE, AGI_THEME } from '../AppContainer.js';

const HoleifyPath = (path: string) => path.replace(/\\/g, ' • ');

export interface FooterProps {
  compact?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ compact = false }) => {
  const uiState = useUIState();
  const config = useConfig();
  const settings = useSettings();
  const { vimEnabled, vimMode } = useVimMode();

  const {
    model,
    targetDir,
    debugMode,
    branchName,
    debugMessage,
    corgiMode,
    errorCount,
    showErrorDetails,
    promptTokenCount,
    nightly,
    terminalWidth,
  } = {
    model: uiState.currentModel,
    targetDir: config.getTargetDir(),
    debugMode: config.getDebugMode(),
    branchName: uiState.branchName,
    debugMessage: uiState.debugMessage,
    corgiMode: uiState.corgiMode,
    errorCount: uiState.errorCount,
    showErrorDetails: uiState.showErrorDetails,
    promptTokenCount: uiState.sessionStats.lastPromptTokenCount,
    nightly: uiState.nightly,
    terminalWidth: uiState.terminalWidth,
  };

  const showMemoryUsage =
    config.getDebugMode() || settings.merged.ui.showMemoryUsage;
  const hideCWD = settings.merged.ui.footer.hideCWD;
  const hideSandboxStatus = settings.merged.ui.footer.hideSandboxStatus;
  const hideModelInfo = settings.merged.ui.footer.hideModelInfo;
  const hideContextPercentage = settings.merged.ui.footer.hideContextPercentage;

  const pathLength = Math.max(20, Math.floor(terminalWidth * 0.25));
  const displayPath = shortenPath(tildeifyPath(targetDir), pathLength);
  const displayVimMode = vimEnabled ? vimMode : undefined;
  const showDebugProfiler = debugMode || isDevelopment;
  const justifyContent = hideCWD && hideModelInfo ? 'center' : 'space-between';

  const content = (
    <>
      {(showDebugProfiler || displayVimMode || !hideCWD) && (
        <Box flexDirection="row" alignItems="center">
          {showDebugProfiler && <DebugProfiler />}
          {displayVimMode && (
            <Text color={theme.text.secondary}>
              [{displayVimMode.toUpperCase()}]{' '}
            </Text>
          )}
          {!hideCWD &&
            (nightly ? (
              <ThemedGradient>
                {HoleifyPath(displayPath)}
                {branchName && <Text> ({branchName.toUpperCase()}*)</Text>}
              </ThemedGradient>
            ) : (
              <Text color={theme.text.link}>
                {HoleifyPath(displayPath)}
                {branchName && (
                  <Text color={theme.text.secondary}>
                    {' '}
                    ({branchName.toUpperCase()}*)
                  </Text>
                )}
              </Text>
            ))}
          {debugMode && (
            <Text color={theme.status.error}>
              {' '}
              {(debugMessage || '--debug').toUpperCase()}
            </Text>
          )}
        </Box>
      )}

      {!hideSandboxStatus && (
        <Box flexGrow={1} alignItems="center" justifyContent="center">
          <PremiumStatusHUD />
        </Box>
      )}

      {!hideModelInfo && (
        <Box alignItems="center" justifyContent="flex-end" flexDirection="row">
          <Box alignItems="center" flexDirection="row">
            <Text color={theme.text.accent} bold>
              {getDisplayString(model, config).toUpperCase()}
            </Text>
            <Text color={theme.text.secondary}> /MODE</Text>
            {!hideContextPercentage && (
              <>
                {' '}
                <ContextUsageDisplay
                  promptTokenCount={promptTokenCount}
                  model={model}
                  terminalWidth={terminalWidth}
                />
              </>
            )}
            {showMemoryUsage && <MemoryUsageDisplay />}
          </Box>
          <Box alignItems="center">
            {corgiMode && (
              <Box paddingLeft={1} flexDirection="row">
                <Text>
                  <Text color={theme.ui.symbol}>| </Text>
                  <Text color={theme.status.error}>▼</Text>
                  <Text color={theme.text.primary}>(´</Text>
                  <Text color={theme.status.error}>ᴥ</Text>
                  <Text color={theme.text.primary}>`)</Text>
                  <Text color={theme.status.error}>▼</Text>
                </Text>
              </Box>
            )}
            {!showErrorDetails && errorCount > 0 && (
              <Box paddingLeft={1} flexDirection="row">
                <Text color={theme.ui.comment}>| </Text>
                <ConsoleSummaryDisplay errorCount={errorCount} />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </>
  );

  if (compact) {
    return (
      <Box
        width={terminalWidth}
        flexDirection="row"
        alignItems="center"
        justifyContent={justifyContent}
        paddingX={0}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={terminalWidth} marginY={0}>
      <Box flexDirection="row" width={terminalWidth}>
        <Text color={AGI_THEME.accent}>{BORDER_STYLE.topLeft}</Text>
        <Text color={AGI_THEME.muted}>
          {BORDER_STYLE.horizontal.repeat(Math.max(0, terminalWidth - 2))}
        </Text>
        <Text color={AGI_THEME.accent}>{BORDER_STYLE.topRight}</Text>
      </Box>

      <Box
        justifyContent={justifyContent}
        width={terminalWidth}
        flexDirection="row"
        alignItems="center"
        paddingX={1}
      >
        <Text color={AGI_THEME.muted}>{BORDER_STYLE.vertical}</Text>
        <Box
          flexGrow={1}
          flexDirection="row"
          alignItems="center"
          justifyContent={justifyContent}
          paddingX={1}
        >
          {content}
        </Box>
        <Text color={AGI_THEME.muted}>{BORDER_STYLE.vertical}</Text>
      </Box>

      <Box flexDirection="row" width={terminalWidth}>
        <Text color={AGI_THEME.accent}>{BORDER_STYLE.bottomLeft}</Text>
        <Text color={AGI_THEME.muted}>
          {BORDER_STYLE.horizontal.repeat(Math.max(0, terminalWidth - 2))}
        </Text>
        <Text color={AGI_THEME.accent}>{BORDER_STYLE.bottomRight}</Text>
      </Box>
    </Box>
  );
};
