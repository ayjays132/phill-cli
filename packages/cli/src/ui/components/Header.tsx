/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { ThemedGradient } from './ThemedGradient.js';
import {
  shortAsciiLogo,
  longAsciiLogo,
  tinyAsciiLogo,
  shortAsciiLogoIde,
  longAsciiLogoIde,
  tinyAsciiLogoIde,
} from './AsciiArt.js';
import { theme } from '../semantic-colors.js';
import { getAsciiArtWidth } from '../utils/textUtils.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { getTerminalProgram } from '../utils/terminalSetup.js';
import { useSnowfall } from '../hooks/useSnowfall.js';

interface HeaderProps {
  customAsciiArt?: string; // For user-defined ASCII art
  version: string;
  nightly: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  customAsciiArt,
  version,
  nightly,
}) => {
  const { columns: terminalWidth } = useTerminalSize();
  const isIde = getTerminalProgram();
  let displayTitle;
  const widthOfLongLogo = getAsciiArtWidth(longAsciiLogo);
  const widthOfShortLogo = getAsciiArtWidth(shortAsciiLogo);

  if (customAsciiArt) {
    displayTitle = customAsciiArt;
  } else if (terminalWidth >= widthOfLongLogo) {
    displayTitle = isIde ? longAsciiLogoIde : longAsciiLogo;
  } else if (terminalWidth >= widthOfShortLogo) {
    displayTitle = isIde ? shortAsciiLogoIde : shortAsciiLogo;
  } else {
    displayTitle = isIde ? tinyAsciiLogoIde : tinyAsciiLogo;
  }

  const title = useSnowfall(displayTitle);

  return (
    <Box
      alignItems="center" /* Center align */
      width={terminalWidth} /* Full width */
      flexDirection="column"
      paddingTop={1}
      paddingBottom={1}
    >
      <Box
        borderStyle="bold"
        borderColor={theme.border.focused}
        paddingX={3}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
      >
        <ThemedGradient animate speed={150}>{title}</ThemedGradient>
        <Box marginTop={1} alignItems="center">
          <Text color={theme.text.accent} bold> ❖ PHILL AGI </Text>
          <Text color={theme.text.dim}> — </Text>
          <Text color={theme.text.secondary} italic>Metropolis Core v{version}</Text>
        </Box>
      </Box>

      <Box width="100%" justifyContent="center" marginTop={1}>
        <Text color={theme.text.dim}>
          ─────────────────────────────────────────────────
        </Text>
      </Box>

      {nightly && (
        <Box width="100%" flexDirection="row" justifyContent="center" paddingY={0}>
          <Text color={theme.status.warning} bold inverse> NIGHTLY BUILD </Text>
        </Box>
      )}

    </Box>
  );
};
