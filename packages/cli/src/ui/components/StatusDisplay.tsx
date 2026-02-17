/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { StreamingState } from '../types.js';
import { ContextSummaryDisplay } from './ContextSummaryDisplay.js';
import { HookStatusDisplay } from './HookStatusDisplay.js';
import { CognitiveLineState } from 'phill-cli-core';

interface StatusDisplayProps {
  hideContextSummary: boolean;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  hideContextSummary,
}) => {
  const uiState = useUIState();
  const settings = useSettings();
  const config = useConfig();

  if (process.env['PHILL_SYSTEM_MD']) {
    return <Text color={theme.status.error}>|⌐■_■|</Text>;
  }

  if (uiState.ctrlCPressedOnce) {
    return (
      <Text color={theme.status.warning}>⚠️ Press Ctrl+C again to exit.</Text>
    );
  }

  if (uiState.warningMessage) {
    return <Text color={theme.status.warning}>{uiState.warningMessage}</Text>;
  }

  if (uiState.ctrlDPressedOnce) {
    return (
      <Text color={theme.status.warning}>⚠️ Press Ctrl+D again to exit.</Text>
    );
  }

  if (uiState.showEscapePrompt) {
    const isPromptEmpty = uiState.buffer.text.length === 0;
    const hasHistory = uiState.history.length > 0;

    if (isPromptEmpty && !hasHistory) {
      return null;
    }

    return (
      <Text color={theme.text.secondary}>
        Press Esc again to {isPromptEmpty ? 'rewind' : 'clear prompt'}.
      </Text>
    );
  }

  if (uiState.queueErrorMessage) {
    return (
      <Text color={theme.status.error}>❌ {uiState.queueErrorMessage}</Text>
    );
  }

  if (
    uiState.activeHooks.length > 0 &&
    settings.merged.hooksConfig.notifications
  ) {
    return <HookStatusDisplay activeHooks={uiState.activeHooks} />;
  }

  if (!settings.merged.ui.hideContextSummary && !hideContextSummary) {
    return (
      <ContextSummaryDisplay
        ideContext={uiState.ideContextState}
        phillMdFileCount={uiState.phillMdFileCount}
        contextFileNames={uiState.contextFileNames}
        mcpServers={config.getMcpClientManager()?.getMcpServers() ?? {}}
        blockedMcpServers={
          config.getMcpClientManager()?.getBlockedMcpServers() ?? []
        }
        skillCount={config.getSkillManager().getDisplayableSkills().length}
      />
    );
  }

  const mainStatus = (() => {
    if (uiState.streamingState === StreamingState.WaitingForConfirmation) {
      return <Text color={theme.status.warning}>🟡 Action Required</Text>;
    }

    if (uiState.streamingState === StreamingState.Responding) {
      return <Text color={theme.text.accent}>⚙️ Responding</Text>;
    }

    if (uiState.streamingState === StreamingState.Idle) {
      if (uiState.groundingState === 'synced') {
        return <Text color={theme.status.success}>🔒 Grounded (OS/Browser)</Text>;
      }
      if (uiState.cognitiveLineState === CognitiveLineState.DREAMING) {
        return <Text color={theme.text.accent}>🧠 Latent Synthesis</Text>;
      }
      if (uiState.cognitiveLineState === CognitiveLineState.SUGGESTING) {
        return <Text color={theme.status.success}>💡 Intuition Spike</Text>;
      }
      return <Text color={theme.text.secondary}>💤 Idle</Text>;
    }
    return null;
  })();

  const activePersona = config.getVoice()?.activePersona;
  const personaIndicator = activePersona ? (
    <Text color={theme.text.accent}> 🎙️ {activePersona.name}</Text>
  ) : null;

  if (mainStatus || personaIndicator) {
    return (
      <Text>
        {mainStatus}
        {personaIndicator}
      </Text>
    );
  }

  return null;
};
