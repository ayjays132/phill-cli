/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


import { Box, Text } from 'ink';
import { useVoice } from '../contexts/VoiceContext.js';
import { EthicalGuardService } from 'phill-cli-core';
import { theme } from '../semantic-colors.js';

export function VoiceOverlay() {
  const { voiceState } = useVoice();
  const alignment = EthicalGuardService.getInstance().getConfidence().alignment;
  const isStewardMode = alignment >= 9;

  if (!voiceState.isEnabled) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.text.link}
      paddingX={1}
      width="100%"
    >
      {/* Header Line */}
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={theme.text.link}>
            PHILL
          </Text>
          <Text color={theme.text.secondary}> Voice</Text>
          {isStewardMode && (
            <Text color={theme.status.success} bold> [STEWARD MODE]</Text>
          )}
        </Box>
        <Text color={theme.text.secondary}>
          CTRL+T /voice | CTRL+G /tts
        </Text>
      </Box>

      {/* Status & Waiter Line */}
      <Box marginTop={0} marginBottom={0}>
        <Box marginRight={2}>
          <Text color={theme.text.secondary}>Status: </Text>
          <Text color={getStatusColor(voiceState.status)}>
            {getStatusGlyph(voiceState.status)} {getStatusText(voiceState.status)}
          </Text>
          {voiceState.currentTool && (
            <Text color={theme.text.secondary}>
              {' - '}{truncate(voiceState.currentTool, 16)}
            </Text>
          )}
        </Box>
        {voiceState.waiterState !== 'off' && (
          <Box>
            <Text color={theme.text.secondary}>Waiter: </Text>
            <Text color={getWaiterColor(voiceState.waiterState)} bold>
              [{voiceState.waiterState.toUpperCase()}]
            </Text>
          </Box>
        )}
      </Box>

      {/* Unified Meters Section */}
      <Box flexDirection="row" marginTop={0} marginBottom={0}>
        <Box flexGrow={1} marginRight={2}>
          <Text color={theme.text.secondary}>In: </Text>
          <Text color={theme.text.secondary}>({truncate(voiceState.selectedInputDevice, 12)}) </Text>
          <Text color={theme.status.success}>{renderVolumeBar(voiceState.inputVolume, 12)}</Text>
        </Box>
        <Box flexGrow={1}>
          <Text color={theme.text.secondary}>Out: </Text>
          <Text color={theme.text.secondary}>({truncate(voiceState.selectedOutputDevice, 12)}) </Text>
          <Text color={theme.text.accent}>{renderVolumeBar(voiceState.outputVolume, 12)}</Text>
        </Box>
      </Box>

      {/* Transcript & Emotion */}
      {(voiceState.transcript || voiceState.emotion !== 'Neutral') && (
        <Box marginTop={0} flexDirection="column">
          {voiceState.emotion !== 'Neutral' && (
            <Text color={getEmotionColor(voiceState.emotion)} bold>
              [{voiceState.emotion.toUpperCase()}]
            </Text>
          )}
          {voiceState.transcript && (
            <Text color={theme.text.secondary} dimColor italic>
              Heard: {truncate(voiceState.transcript.replace(/\s+/g, ' ').trim(), 80)}
            </Text>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={0}>
        <Text color={theme.text.secondary} dimColor>
          SOTA Browser STT (npm) & Local {voiceState.ttsEnabled ? '(TTS On)' : '(TTS Off)'}
        </Text>
      </Box>
    </Box>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'listening':
      return theme.status.success;
    case 'processing':
      return theme.text.accent;
    case 'speaking':
      return theme.text.link;
    default:
      return theme.text.secondary;
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'listening':
      return 'Listening';
    case 'processing':
      return 'Processing';
    case 'speaking':
      return 'Speaking';
    default:
      return 'Idle';
  }
}

function getStatusGlyph(status: string): string {
  switch (status) {
    case 'listening':
      return '🎤';
    case 'processing':
      return '⚙️';
    case 'speaking':
      return '🔊';
    default:
      return '⏸️';
  }
}

function getEmotionColor(emotion: string): string {
  switch (emotion) {
    case 'Happy':
      return theme.status.success;
    case 'Determined':
      return theme.text.link;
    case 'Frustrated':
      return theme.status.error;
    case 'Confused':
      return theme.text.accent;
    default:
      return theme.text.secondary;
  }
}

function truncate(str: string, max: number = 20): string {
  if (!str) return 'Default';
  if (str === 'default') return 'Default';
  return str.length > max ? str.substring(0, max - 3) + '...' : str;
}

function renderVolumeBar(volume: number, maxBars: number = 20): string {
  // RMS usually 0-32768. 5000 is a decent "normal speaking" level baseline?
  // Let's use log scale for better visualization
  // volume = 0 -> 0
  // volume = 100 -> ~1 bar
  // volume = 5000 -> half bars
  // volume = 20000 -> full bars

  if (volume < 10) return '░'.repeat(maxBars); // Noise floor

  const normalized = Math.min(Math.log10(volume) / Math.log10(20000), 1);
  const filledBars = Math.floor(Math.max(normalized, 0) * maxBars);
  const emptyBars = maxBars - filledBars;

  return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}

function getWaiterColor(state: 'off' | 'listening' | 'waiting' | 'ready'): string {
  switch (state) {
    case 'ready':
      return theme.status.success;
    case 'waiting':
      return theme.text.accent;
    case 'listening':
      return theme.text.link;
    default:
      return theme.text.secondary;
  }
}
