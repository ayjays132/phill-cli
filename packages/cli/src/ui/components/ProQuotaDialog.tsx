/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import { theme } from '../semantic-colors.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { PremiumFrame } from './shared/PremiumFrame.js';

interface ProQuotaDialogProps {
  failedModel: string;
  fallbackModel: string;
  message: string;
  isTerminalQuotaError: boolean;
  isModelNotFoundError?: boolean;
  onChoice: (
    choice: 'retry_later' | 'retry_once' | 'retry_always' | 'upgrade',
  ) => void;
}

export function ProQuotaDialog({
  failedModel,
  fallbackModel,
  message,
  isTerminalQuotaError,
  isModelNotFoundError,
  onChoice,
}: ProQuotaDialogProps): React.JSX.Element {
  const { terminalWidth } = useUIState();
  let items;
  // Do not provide a fallback option if failed model and fallbackmodel are same.
  if (failedModel === fallbackModel) {
    items = [
      {
        label: '🔁 Keep trying with auto routing',
        value: 'retry_once' as const,
        key: 'retry_once',
      },
      {
        label: '🛑 Stop for now',
        value: 'retry_later' as const,
        key: 'retry_later',
      },
    ];
  } else if (isModelNotFoundError || isTerminalQuotaError) {
    // free users and out of quota users on G1 pro and Cloud Console gets an option to upgrade
    items = [
      {
        label: `⚡ Switch to ${fallbackModel}`,
        value: 'retry_always' as const,
        key: 'retry_always',
      },
      {
        label: '🚀 Upgrade for higher limits',
        value: 'upgrade' as const,
        key: 'upgrade',
      },
      {
        label: `🛑 Stop for now`,
        value: 'retry_later' as const,
        key: 'retry_later',
      },
    ];
  } else {
    // capacity error
    items = [
      {
        label: '🔁 Keep trying with auto routing',
        value: 'retry_once' as const,
        key: 'retry_once',
      },
      {
        label: `⚡ Switch to ${fallbackModel}`,
        value: 'retry_always' as const,
        key: 'retry_always',
      },
      {
        label: '🛑 Stop for now',
        value: 'retry_later' as const,
        key: 'retry_later',
      },
    ];
  }

  const handleSelect = (
    choice: 'retry_later' | 'retry_once' | 'retry_always' | 'upgrade',
  ) => {
    onChoice(choice);
  };

  // Helper to highlight simple slash commands in the message
  const renderMessage = (msg: string) => {
    const parts = msg.split(/(\s+)/);
    return (
      <Text>
        {parts.map((part, index) => {
          if (part.startsWith('/')) {
            return (
              <Text key={index} bold color={theme.text.accent}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <PremiumFrame
      width={Math.max(60, terminalWidth - 2)}
      title="🚦 Rate Limit Recovery"
      subtitle={`Active: ${failedModel}  •  Next route: ${fallbackModel}`}
      borderColor={theme.status.warning}
      accentColor={theme.text.accent}
    >
      <Box marginBottom={1}>{renderMessage(message)}</Box>
      <Box marginBottom={1} flexDirection="column">
        <Text color={theme.text.primary}>
          ✨ Phill can keep the request moving through the auto-mode ladder before
          you manually switch models.
        </Text>
        <Text color={theme.text.secondary}>
          🔁 Keep trying = retry this turn and let availability scoring avoid the
          rate-limited route.
        </Text>
        <Text color={theme.text.secondary}>
          ⚡ Switch = make the next healthy route sticky for future turns.
        </Text>
        <Text color={theme.text.secondary}>
          🧭 You can still tune routing later with /model, /settings, or /auth.
        </Text>
      </Box>
      <Box marginTop={1} marginBottom={1}>
        <RadioButtonSelect items={items} onSelect={handleSelect} />
      </Box>
      <Box>
        <Text color={theme.text.secondary}>
          💡 Tip: preview auto mode now walks the Gemini 3 + 3.1 ladder before
          dropping to stable last-resort models.
        </Text>
      </Box>
    </PremiumFrame>
  );
}
