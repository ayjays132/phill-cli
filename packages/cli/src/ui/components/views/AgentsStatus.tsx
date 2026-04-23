/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import type React from 'react';
import { theme } from '../../semantic-colors.js';
import type { AgentDefinitionJson } from '../../types.js';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';

interface AgentsStatusProps {
  agents: AgentDefinitionJson[];
  terminalWidth: number;
}

interface SummaryMetricProps {
  label: string;
  value: string;
  color: string;
}

const SummaryMetric: React.FC<SummaryMetricProps> = ({ label, value, color }) => (
  <Box
    borderStyle="round"
    borderColor={theme.border.subtle}
    paddingX={1}
    marginRight={1}
    flexDirection="column"
  >
    <Text color={theme.text.secondary}>{label}</Text>
    <Text bold color={color}>
      {value}
    </Text>
  </Box>
);

function formatCapabilities(agent: AgentDefinitionJson): string {
  if (!agent.capabilities || agent.capabilities.length === 0) {
    return agent.kind === 'local' ? 'default toolset' : 'remote protocol';
  }
  return agent.capabilities.slice(0, 4).join(', ');
}

function renderAgentCard(
  agent: AgentDefinitionJson,
  terminalWidth: number,
): React.JSX.Element {
  const displayName = agent.displayName || agent.name;
  const badgeColor =
    agent.kind === 'local' ? theme.status.success : theme.text.link;
  const model = agent.model || (agent.kind === 'local' ? 'inherit' : 'remote');
  const toolCountLabel =
    agent.toolCount !== undefined ? String(agent.toolCount) : 'default';
  const turnBudget = agent.maxTurns ? `${agent.maxTurns}` : 'adaptive';

  return (
    <Box
      key={agent.name}
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border.default}
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Box flexDirection="row">
          <Text bold color={theme.text.primary}>
            {displayName}
          </Text>
          {displayName !== agent.name && (
            <Text color={theme.text.dim}> ({agent.name})</Text>
          )}
        </Box>
        <Box flexDirection="row">
          {agent.experimental && (
            <Text color={theme.status.warning}>PREVIEW </Text>
          )}
          <Text color={badgeColor}>
            {agent.kind === 'local' ? 'LOCAL' : 'REMOTE'}
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="row" justifyContent="space-between">
        <Text color={theme.text.secondary}>
          Model: <Text color={theme.text.accent}>{model}</Text>
        </Text>
        <Text color={theme.text.secondary}>
          Turns: <Text color={theme.text.primary}>{turnBudget}</Text>
        </Text>
      </Box>

      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.text.secondary}>
          Tools: <Text color={theme.text.primary}>{toolCountLabel}</Text>
        </Text>
        <Text color={theme.text.secondary}>
          Capabilities: <Text color={theme.text.link}>{formatCapabilities(agent)}</Text>
        </Text>
      </Box>

      {agent.description && (
        <Box marginTop={1}>
          <MarkdownDisplay
            terminalWidth={Math.max(terminalWidth - 6, 20)}
            text={agent.description}
            isPending={false}
          />
        </Box>
      )}
    </Box>
  );
}

export const AgentsStatus: React.FC<AgentsStatusProps> = ({
  agents,
  terminalWidth,
}) => {
  const localAgents = agents.filter((a) => a.kind === 'local');
  const remoteAgents = agents.filter((a) => a.kind === 'remote');
  const experimentalAgents = agents.filter((a) => a.experimental);

  if (agents.length === 0) {
    return (
      <Box
        flexDirection="column"
        marginBottom={1}
        borderStyle="round"
        borderColor={theme.border.default}
        paddingX={1}
      >
        <Text bold color={theme.text.primary}>
          Swarm Status
        </Text>
        <Text color={theme.text.secondary}>No agents available.</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle="double"
      borderColor={theme.border.focused}
      paddingX={1}
      paddingY={0}
    >
      <Text bold color={theme.text.accent}>
        Swarm Status
      </Text>
      <Text color={theme.text.secondary}>
        Active agent-mode registry, themed with semantic status and capability signals.
      </Text>

      <Box marginTop={1} marginBottom={1} flexDirection="row">
        <SummaryMetric
          label="Total"
          value={String(agents.length)}
          color={theme.text.primary}
        />
        <SummaryMetric
          label="Local"
          value={String(localAgents.length)}
          color={theme.status.success}
        />
        <SummaryMetric
          label="Remote"
          value={String(remoteAgents.length)}
          color={theme.text.link}
        />
        <SummaryMetric
          label="Preview"
          value={String(experimentalAgents.length)}
          color={theme.status.warning}
        />
      </Box>

      {localAgents.length > 0 && (
        <Box flexDirection="column" marginBottom={remoteAgents.length > 0 ? 1 : 0}>
          <Text bold color={theme.text.primary}>
            Local Agents
          </Text>
          <Text color={theme.text.dim}>Execution happens inside the local Phill runtime.</Text>
          <Box marginTop={1} flexDirection="column">
            {localAgents.map((agent) => renderAgentCard(agent, terminalWidth))}
          </Box>
        </Box>
      )}

      {remoteAgents.length > 0 && (
        <Box flexDirection="column">
          <Text bold color={theme.text.primary}>
            Remote Agents
          </Text>
          <Text color={theme.text.dim}>Delegation is routed through external agent endpoints.</Text>
          <Box marginTop={1} flexDirection="column">
            {remoteAgents.map((agent) => renderAgentCard(agent, terminalWidth))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
