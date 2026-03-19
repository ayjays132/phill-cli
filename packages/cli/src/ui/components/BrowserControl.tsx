/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useBrowserStatus } from '../hooks/useBrowserStatus.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { theme } from '../semantic-colors.js';
import { BrowserService } from 'phill-cli-core';
import { captureByPID } from '../../browser/windowCapture.js';
import { renderPixels } from '../../browser/terminalGraphics.js';

export const BrowserControl = () => {
  const config = useConfig();
  const { stdout } = useStdout();
  const { isOpen, url, browserPID, isHeaded } = useBrowserStatus(config);
  const [frame, setFrame] = useState<string | null>(null);
  const [status, setStatus] = useState({
    status: 'ready',
    label: 'Ready',
  });
  const frameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Dynamic terminal sizing for high-fidelity rendering
  const terminalWidth = stdout?.columns || 80;
  const terminalHeight = stdout?.rows || 24;
  
  // High-Fidelity Scaling: Use maximum available space while preserving UI integrity
  const imageWidth = Math.max(40, terminalWidth - 4);
  const imageHeight = Math.max(10, terminalHeight - 6);

  // Keyboard forwarding to the active browser page
  useInput(async (input, key) => {
    if (!isOpen) return;
    const browserService = BrowserService.getInstance(config);
    const page = browserService.getActivePage();
    if (!page) return;

    if (key.return) await page.keyboard.press('Enter');
    else if (key.delete) await page.keyboard.press('Delete');
    else if (key.backspace) await page.keyboard.press('Backspace');
    else if (key.escape) await page.keyboard.press('Escape');
    else if (key.tab) await page.keyboard.press('Tab');
    else if (key.upArrow) await page.keyboard.press('ArrowUp');
    else if (key.downArrow) await page.keyboard.press('ArrowDown');
    else if (key.leftArrow) await page.keyboard.press('ArrowLeft');
    else if (key.rightArrow) await page.keyboard.press('ArrowRight');
    else if (input) await page.keyboard.type(input);
  });

  useEffect(() => {
    const browserService = BrowserService.getInstance(config);

    const onStatusUpdate = (payload: { status: string; label: string }) => {
      setStatus(payload);
    };

    const onVisualDelta = (payload: { buffer: Buffer; width: number; height: number }) => {
      void (async () => {
        // High-speed rendering from Playwright screencast
        // Increased width/height for high-fidelity terminal mirror
        const rendered = await renderPixels(payload.buffer, imageWidth, imageHeight);
        setFrame(rendered);
        lastFrameTimeRef.current = Date.now();
      })();
    };

    browserService.on('status-update', onStatusUpdate);
    browserService.on('visual-delta', onVisualDelta);

    return () => {
      browserService.off('status-update', onStatusUpdate);
      browserService.off('visual-delta', onVisualDelta);
    };
  }, [config, imageWidth]);

  useEffect(() => {
    if (isHeaded && isOpen && browserPID) {
      const startLoop = () => {
        frameLoopRef.current = setInterval(() => {
          void (async () => {
            // Intelligent Fallback: Only use OS-level capture if the 
            // primary screencast stream has stalled for > 2 seconds.
            // This prevents "flicker/glitch" from dual-stream collisions.
            const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current;
            if (timeSinceLastFrame < 2000) return;

            const buf = await captureByPID(browserPID);
            if (buf) {
              const rendered = await renderPixels(buf, imageWidth, imageHeight);
              setFrame(rendered);
            }
          })();
        }, 1500); // Watchdog check frequency
      };
      startLoop();
    } else {
      if (frameLoopRef.current) {
        clearInterval(frameLoopRef.current);
        frameLoopRef.current = null;
      }
      setFrame(null);
    }

    return () => {
      if (frameLoopRef.current) {
        clearInterval(frameLoopRef.current);
      }
    };
  }, [isHeaded, isOpen, browserPID, imageWidth]);

  if (!isOpen) {
    return null;
  }

  // Failed/initial capture: Render minimalist status bar
  if (!frame) {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.border.default}
        paddingX={1}
        marginLeft={1}
        flexDirection="row"
        alignItems="center"
      >
        <Box marginRight={1}>
          <Text color={theme.text.accent} bold>🌐 {isHeaded ? 'HEADED' : 'TERMINAL'} BROWSER</Text>
        </Box>
        <Box marginRight={1}>
          <Text color={theme.text.secondary}>|</Text>
        </Box>
        <Box flexGrow={1}>
          <Text italic dimColor={!url}>
            {url || 'Awaiting Connection...'}
          </Text>
        </Box>
        {browserPID && (
          <Box marginLeft={2}>
            <Text color={theme.text.dim} dimColor>
              PID: {browserPID}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  // Headed mode with High-Fidelity Terminal Mirror
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border.default}
      paddingX={1}
      marginLeft={1}
      marginBottom={1}
    >
      <Box marginBottom={0} justifyContent="space-between">
        <Box>
          <Text color={theme.text.accent} bold>🌐 LIVE BROWSER </Text>
          {browserPID && <Text color={theme.text.dim} dimColor> (PID: {browserPID})</Text>}
          <Text color={theme.text.secondary}> | </Text>
          <Text wrap="truncate-end" dimColor={!url}>
            {url || 'Active Session...'}
          </Text>
        </Box>
        {isHeaded && (
          <Box paddingX={1} backgroundColor={theme.status.success}>
            <Text color={theme.background.primary} bold> INTERACTIVE </Text>
          </Box>
        )}
      </Box>

      {/* Actual Pixel Stream Rendering - Optimized for Seamless High-Fidelity */}
      <Box paddingX={0} marginY={0} alignSelf="center">
        <Text wrap="truncate">{frame}</Text>
      </Box>

      {/* Bottom Status Layer */}
      <Box marginTop={0} justifyContent="space-between">
        <Box>
          <Text color={theme.text.secondary} bold>STATUS: </Text>
          <Text
            color={
              status.status === 'acting' ? theme.status.success :
              status.status === 'thinking' ? theme.status.warning :
              theme.text.primary
            }
            bold
          >
            {status.label?.toUpperCase() || status.status.toUpperCase()}
          </Text>
        </Box>
        <Text color={theme.text.dim} dimColor italic>
           HIGH-FIDELITY TERMINAL MIRROR
        </Text>
      </Box>
    </Box>
  );
};
