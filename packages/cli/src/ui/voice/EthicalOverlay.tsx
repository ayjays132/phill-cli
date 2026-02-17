/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { EthicalGuardService, type EthicalConfidence } from 'phill-cli-core';
import { theme } from '../semantic-colors.js';

/**
 * EthicalOverlay displays the real-time safety status of the agent.
 * It shows Alignment (Loving/Caring), Risk (Hallucination/Decay), and Vulnerability (Adversarial).
 */
export const EthicalOverlay: React.FC = () => {
  const [confidence, setConfidence] = useState<EthicalConfidence>(
    EthicalGuardService.getInstance().getConfidence()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const next = EthicalGuardService.getInstance().getConfidence();
      setConfidence((prev) => {
        if (
          prev.alignment === next.alignment &&
          prev.risk === next.risk &&
          prev.vulnerability === next.vulnerability
        ) {
          return prev;
        }
        return { ...next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, inverse = false) => {
    const score = inverse ? 10 - value : value;
    if (score >= 8) return theme.status.success;
    if (score >= 4) return theme.status.warning;
    return theme.status.error;
  };

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle="round"
      borderColor={theme.text.link}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={theme.text.link}>
          🛡️ MOLT-GUARD ACTIVE
        </Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        <Box>
          <Text dimColor>Alignment: </Text>
          <Text color={getStatusColor(confidence.alignment)}>
            {confidence.alignment}/10
          </Text>
        </Box>
        <Box>
          <Text dimColor>Risk: </Text>
          <Text color={getStatusColor(confidence.risk, true)}>
            {confidence.risk}/10
          </Text>
        </Box>
        <Box>
          <Text dimColor>Vulnerability: </Text>
          <Text color={getStatusColor(confidence.vulnerability, true)}>
            {confidence.vulnerability}/10
          </Text>
        </Box>
      </Box>
      {confidence.vulnerability > 3 && (
        <Box marginTop={1}>
          <Text bold color={theme.status.error}>
            WARNING: POTENTIAL MOLTBOOK INTERFERENCE DETECTED
          </Text>
        </Box>
      )}
    </Box>
  );
};
