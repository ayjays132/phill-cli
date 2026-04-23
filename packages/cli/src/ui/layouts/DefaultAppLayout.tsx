/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box } from 'ink';
import { Notifications } from '../components/Notifications.js';
import { MainContent } from '../components/MainContent.js';
import { DialogManager } from '../components/DialogManager.js';
import { Composer } from '../components/Composer.js';
import { ExitWarning } from '../components/ExitWarning.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useFlickerDetector } from '../hooks/useFlickerDetector.js';
import { useAlternateBuffer } from '../hooks/useAlternateBuffer.js';
import { CopyModeWarning } from '../components/CopyModeWarning.js';
import { Forge } from '../components/Forge.js';
import { BrowserControl } from '../components/BrowserControl.js';

import { PremiumFrame } from '../components/shared/PremiumFrame.js';
import { VitalsStatus } from '../components/VitalsStatus.js';

export const DefaultAppLayout: React.FC = () => {
  const uiState = useUIState();
  const isAlternateBuffer = useAlternateBuffer();

  const { rootUiRef, terminalHeight } = uiState;
  useFlickerDetector(rootUiRef, terminalHeight);

  // Use the premium frame for the entire application layout
  return (
    <PremiumFrame 
      width={uiState.terminalWidth} 
      height={isAlternateBuffer ? terminalHeight : undefined}
      footer={<VitalsStatus pulse={uiState.pulse} signalConnected={uiState.signalConnected} />}
    >
      <Box
        flexDirection="column"
        flexGrow={1}
        width="100%"
        overflow="hidden"
        ref={uiState.rootUiRef}
      >
        {uiState.isForgeOpen ? <Forge /> : <MainContent />}

        <Box
          flexDirection="column"
          ref={uiState.mainControlsRef}
          flexShrink={0}
          flexGrow={0}
          width="100%"
        >
          <BrowserControl />
          <Notifications />
          <CopyModeWarning />

          {uiState.customDialog ? (
            uiState.customDialog
          ) : uiState.dialogsVisible ? (
            <DialogManager
              terminalWidth={uiState.terminalWidth - 2} // Account for frame borders
              addItem={uiState.historyManager.addItem}
            />
          ) : uiState.isForgeOpen ? null : (
            <Composer isFocused={true} />
          )}

          <ExitWarning />
        </Box>
      </Box>
    </PremiumFrame>
  );
};
