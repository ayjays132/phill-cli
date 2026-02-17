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
        borderStyle="round"
        borderColor={theme.input.border_active}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
      >
        <ThemedGradient>{title}</ThemedGradient>
        <Box marginTop={1}>
          <Text color={theme.text.accent} bold>PHILL</Text>
          <Text color={theme.text.secondary}> | </Text>
          <Text color={theme.text.secondary}>Powered by Gemini & Local Models</Text>
        </Box>
      </Box>

      {nightly && (
        <Box width="100%" flexDirection="row" justifyContent="flex-end" paddingRight={2}>
          <Text color="yellow">v{version}-nightly</Text>
        </Box>
      )}
    </Box>
  );
};
