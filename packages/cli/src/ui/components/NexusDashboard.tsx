/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text, Newline } from 'ink';
import { theme } from '../semantic-colors.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { AxiomService } from 'phill-cli-core';

export const NexusDashboard: React.FC = () => {
  const uiState = useUIState();

  // AXIOM Snapshot
  const axiom = AxiomService.getInstance();
  const axiomErrors = axiom.getErrors();
  
  const confidenceColor = uiState.nexusConfidence > 0.92
    ? theme.status.success
    : uiState.nexusConfidence > 0.7
      ? theme.status.warning
      : theme.status.error;

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="double"
      borderColor={theme.text.accent}
      minHeight={20}
      width="100%"
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Text bold color={theme.text.accent}>
          NEXUS NEURAL DASHBOARD v1.2.0-NEXUS
        </Text>
        <Text color={theme.text.secondary}>[ESC to Close]</Text>
      </Box>
      <Box borderStyle="single" borderColor={theme.ui.symbol} marginY={1} />

      {/* Main Stats */}
      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column" flexGrow={1}>
          <Text color={theme.text.secondary}>Active Pipeline:</Text>
          <Text bold color={theme.status.success}>
            {uiState.nexusPipeline.toUpperCase()}
          </Text>
          <Newline />
          
          <Text color={theme.text.secondary}>Neural Confidence:</Text>
          <Box flexDirection="row">
            <Text color={confidenceColor}>
              {(uiState.nexusConfidence * 100).toFixed(1)}% 
            </Text>
            <Text color={theme.text.dim}> [ {uiState.nexusReason || 'Stable alignment'} ]</Text>
          </Box>
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          <Text color={theme.text.secondary}>Workspace Health (AXIOM):</Text>
          <Text color={axiomErrors.length === 0 ? theme.status.success : theme.status.warning}>
            {axiomErrors.length === 0 ? 'CLEAN' : `${axiomErrors.length} ANOMALIES DETECTED`}
          </Text>
          <Newline />
          
          <Text color={theme.text.secondary}>Cognitive State:</Text>
          <Text color={theme.status.success}>{uiState.cognitiveLineState}</Text>
        </Box>
      </Box>

      <Box borderStyle="single" borderColor={theme.ui.symbol} marginY={1} />

      {/* Persistence Log (Placeholder until we can fetch history) */}
      <Box flexDirection="column">
        <Text bold color={theme.text.secondary}>INTELLIGENCE LOGS:</Text>
        <Box flexDirection="column" paddingX={2}>
          <Text color={theme.text.hint}>- Pipeline Handover: {uiState.nexusPipeline} triggered</Text>
          {uiState.nexusReason && (
            <Text color={theme.text.dim}>  ∟ {uiState.nexusReason}</Text>
          )}
          <Text color={theme.text.hint}>- Axiom Sweep: {axiomErrors.length} files scanned</Text>
        </Box>
      </Box>

      {/* Footer Info */}
      <Box marginTop={1}>
        <Text italic color={theme.text.dim}>
          &quot;In the forge of logic, truth is the only survivor.&quot; — P.H.
        </Text>
      </Box>
    </Box>
  );
};
