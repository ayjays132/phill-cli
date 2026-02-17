/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { useBrowserStatus } from '../hooks/useBrowserStatus.js';
import { useConfig } from '../contexts/ConfigContext.js';

export const BrowserControl = () => {
  const config = useConfig();
  const { isOpen, url } = useBrowserStatus(config);

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      borderStyle="round"
      borderColor="blue"
      paddingX={1}
      marginLeft={1}
    >
      <Text color="blue" bold>🌐 Browser: </Text>
      <Text>{url || 'Ready'}</Text>
    </Box>
  );
};
