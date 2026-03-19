/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { useOperatorStatus } from '../hooks/useOperatorStatus.js';
import { useConfig } from '../contexts/ConfigContext.js';

export const OperatorControl = () => {
  const config = useConfig();
  const { isActive } = useOperatorStatus(config);

  if (!isActive) {
    return null;
  }

  return (
    <Box
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      marginLeft={1}
    >
      <Text color="magenta" bold>🤖 Operator: </Text>
      <Text>Active (VLA Syncing)</Text>
    </Box>
  );
};
