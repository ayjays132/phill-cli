/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';

export interface HeartbeatPulse {
  coherence: number;
  dominantDimension: string;
}

interface VitalsStatusProps {
  pulse?: HeartbeatPulse;
  signalConnected?: boolean;
}

/**
 * VitalsStatus renders a themed indicator bar for Phill's "Vitals".
 * Included in the PremiumFrame footer for real-time status visibility.
 */
export const VitalsStatus: React.FC<VitalsStatusProps> = ({ pulse, signalConnected }) => {
  const coherenceLabel = pulse ? `${(pulse.coherence * 100).toFixed(0)}%` : '---';
  const dimensionLabel = pulse?.dominantDimension || 'Dormant';
  
  // Dynamic color based on coherence (Premium Visual Feedback)
  let pulseColor = theme.text.dim;
  if (pulse) {
    if (pulse.coherence > 0.8) pulseColor = theme.status.success;
    else if (pulse.coherence > 0.5) pulseColor = theme.text.accent;
    else pulseColor = theme.status.error;
  }

  const signalColor = signalConnected ? theme.status.success : theme.text.dim;

  return (
    <Box flexDirection="row" paddingX={1}>
      {/* 💓 Neural Pulse Indicator */}
      <Box flexDirection="row" marginRight={2}>
        <Text color={pulseColor}>● </Text>
        <Text color={theme.text.secondary}>Neural Coherence: </Text>
        <Text bold color={pulseColor}>{coherenceLabel}</Text>
      </Box>

      {/* 🧠 Manifold Dimension */}
      <Box flexDirection="row" marginRight={2}>
        <Text color={theme.text.dim}>[</Text>
        <Text color={theme.text.accent}>{dimensionLabel}</Text>
        <Text color={theme.text.dim}>]</Text>
      </Box>

      {/* ⚡ Signal Bridge Status */}
      <Box flexDirection="row">
        <Text color={signalColor}>{signalConnected ? '⚡ Linked' : '⚪ Offline'}</Text>
      </Box>
    </Box>
  );
};
