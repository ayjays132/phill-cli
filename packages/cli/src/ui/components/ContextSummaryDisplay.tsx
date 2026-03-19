/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { type IdeContext, type MCPServerConfig } from 'phill-cli-core';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useBrowserStatus } from '../hooks/useBrowserStatus.js';

interface ContextSummaryDisplayProps {
  phillMdFileCount: number;
  contextFileNames: string[];
  mcpServers?: Record<string, MCPServerConfig>;
  blockedMcpServers?: Array<{ name: string; extensionName: string }>;
  ideContext?: IdeContext;
  skillCount: number;
}

export const ContextSummaryDisplay: React.FC<ContextSummaryDisplayProps> = ({
  phillMdFileCount,
  contextFileNames,
  mcpServers,
  blockedMcpServers,
  ideContext,
  skillCount,
}) => {
  const { columns: terminalWidth } = useTerminalSize();
  const config = useConfig();
  const { isOpen: browserOpen, url: browserUrl, isHeaded, browserPID } = useBrowserStatus(config);
  
  const isNarrow = isNarrowWidth(terminalWidth);
  const mcpServerCount = Object.keys(mcpServers || {}).length;
  const blockedMcpServerCount = blockedMcpServers?.length || 0;
  const openFileCount = ideContext?.workspaceState?.openFiles?.length ?? 0;

  if (
    phillMdFileCount === 0 &&
    mcpServerCount === 0 &&
    blockedMcpServerCount === 0 &&
    openFileCount === 0 &&
    skillCount === 0 &&
    !browserOpen
  ) {
    return <Text> </Text>; // Render an empty space to reserve height
  }

  const items: React.ReactNode[] = [];

  if (openFileCount > 0) {
    items.push(
      <Box key="open-files">
        <Text color={theme.text.accent}>📂 {openFileCount} </Text>
        <Text color={theme.text.secondary}>File{openFileCount > 1 ? 's' : ''}</Text>
      </Box>
    );
  }

  if (phillMdFileCount > 0) {
    const allNamesTheSame = new Set(contextFileNames).size < 2;
    const name = (allNamesTheSame ? contextFileNames[0] : 'context').toUpperCase();
    items.push(
      <Box key="phill-md">
        <Text color={theme.text.accent}>📄 {phillMdFileCount} </Text>
        <Text color={theme.text.secondary}>{name}</Text>
      </Box>
    );
  }

  if (skillCount > 0) {
    items.push(
      <Box key="skills">
        <Text color={theme.text.accent}>🧠 {skillCount} </Text>
        <Text color={theme.text.secondary}>Skill{skillCount > 1 ? 's' : ''}</Text>
      </Box>
    );
  }

  if (mcpServerCount > 0) {
    items.push(
      <Box key="mcp">
        <Text color={theme.status.success}>🌐 {mcpServerCount} </Text>
        <Text color={theme.text.secondary}>MCP</Text>
      </Box>
    );
  }

  if (blockedMcpServerCount > 0) {
    items.push(
      <Box key="blocked">
        <Text color={theme.status.error}>🚫 {blockedMcpServerCount} </Text>
        <Text color={theme.text.secondary}>Blocked</Text>
      </Box>
    );
  }

  if (browserOpen) {
    items.push(
      <Box key="browser">
        <Text color={theme.status.success}>🌐 Browser </Text>
        <Text color={theme.text.secondary}>({isHeaded ? 'Headed' : 'Headless'}): </Text>
        <Text color={theme.text.accent} wrap="truncate-end">{browserUrl || 'Open'}</Text>
        {browserPID && <Text color={theme.text.dim} dimColor> [PID: {browserPID}]</Text>}
      </Box>
    );
  }

  // Latent Density Indicator (VAE focus)
  items.push(
    <Box key="latent">
      <Text color={theme.text.accent}>🧬 DLR </Text>
      <Text color={theme.text.secondary}>Active</Text>
    </Box>
  );

  if (isNarrow) {
    return (
      <Box flexDirection="column" paddingX={1} marginBottom={1}>
        {items.map((item, idx) => (
          <Box key={idx}>{item}</Box>
        ))}
      </Box>
    );
  }

  return (
    <Box paddingX={1} flexDirection="row">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <Text color={theme.text.dim}>  •  </Text>}
          {item}
        </React.Fragment>
      ))}
    </Box>
  );
};
