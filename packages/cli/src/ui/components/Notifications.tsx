/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { theme } from '../semantic-colors.js';
import { StreamingState } from '../types.js';
import { UpdateNotification } from './UpdateNotification.js';
import { persistentState } from '../../utils/persistentState.js';

import {
  AuthType,
  PHILL_DIR,
  Storage,
  homedir,
  loadApiKey,
} from 'phill-cli-core';

import * as fs from 'node:fs/promises';
import path from 'node:path';

const settingsPath = path.join(homedir(), PHILL_DIR, 'settings.json');

const screenReaderNudgeFilePath = path.join(
  Storage.getGlobalTempDir(),
  'seen_screen_reader_nudge.json',
);

function resolvePocketHfTokenLocal(parsed: {
  ui?: { voice?: { huggingFaceApiKey?: string } };
  voice?: { huggingFaceApiKey?: string };
  huggingFace?: { apiKey?: string };
}): {
  source:
  | 'voice_huggingface_api_key'
  | 'hf_token'
  | 'huggingface_api_key'
  | 'config_huggingface_api_key'
  | 'none';
} {
  const voiceHfApiKey =
    parsed.ui?.voice?.huggingFaceApiKey?.trim() ||
    parsed.voice?.huggingFaceApiKey?.trim();
  if (voiceHfApiKey) return { source: 'voice_huggingface_api_key' };
  const envHfToken = process.env['HF_TOKEN']?.trim();
  if (envHfToken) return { source: 'hf_token' };
  const envHfApiKey = process.env['HUGGINGFACE_API_KEY']?.trim();
  if (envHfApiKey) return { source: 'huggingface_api_key' };
  const configHfApiKey = parsed.huggingFace?.apiKey?.trim();
  if (configHfApiKey) return { source: 'config_huggingface_api_key' };
  return { source: 'none' };
}

export const Notifications = () => {
  const { startupWarnings } = useAppContext();
  const { initError, streamingState, updateInfo } = useUIState();

  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const showStartupWarnings = startupWarnings.length > 0;
  const showInitError =
    initError && streamingState !== StreamingState.Responding;

  const [hasSeenScreenReaderNudge, setHasSeenScreenReaderNudge] = useState(() =>
    persistentState.get('hasSeenScreenReaderNudge'),
  );
  const [showIdentityOnboarding, setShowIdentityOnboarding] = useState(false);
  const [showPocketTtsOnboarding, setShowPocketTtsOnboarding] = useState(false);
  const [showPocketTtsHfAccessOnboarding, setShowPocketTtsHfAccessOnboarding] =
    useState(false);
  const [showGoogleTtsApiKeyOnboarding, setShowGoogleTtsApiKeyOnboarding] =
    useState(false);

  useEffect(() => {
    const checkLegacyScreenReaderNudge = async () => {
      if (hasSeenScreenReaderNudge !== undefined) return;

      try {
        await fs.access(screenReaderNudgeFilePath);
        persistentState.set('hasSeenScreenReaderNudge', true);
        setHasSeenScreenReaderNudge(true);
        // Best effort cleanup of legacy file
        await fs.unlink(screenReaderNudgeFilePath).catch(() => { });
      } catch {
        setHasSeenScreenReaderNudge(false);
      }
    };

    if (isScreenReaderEnabled) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      checkLegacyScreenReaderNudge();
    }
  }, [isScreenReaderEnabled, hasSeenScreenReaderNudge]);

  const showScreenReaderNudge =
    isScreenReaderEnabled && hasSeenScreenReaderNudge === false;

  useEffect(() => {
    if (showScreenReaderNudge) {
      persistentState.set('hasSeenScreenReaderNudge', true);
    }
  }, [showScreenReaderNudge]);

  useEffect(() => {
    const seen = persistentState.get('hasSeenAgentIdentityOnboarding');
    if (seen === true) {
      return;
    }
    const check = async () => {
      const identityPath = Storage.getAgentIdentityFilePath();
      try {
        const content = await fs.readFile(identityPath, 'utf-8');
        const hasName = content
          .split('\n')
          .some((line) => line.trim().startsWith('name:') && line.trim() !== 'name:');

        if (!hasName || seen === false) {
          setShowIdentityOnboarding(true);
        } else if (seen === undefined) {
          // Only auto-complete if the user hasn't explicitly reset the onboarding box
          persistentState.set('hasSeenAgentIdentityOnboarding', true);
        }
      } catch {
        setShowIdentityOnboarding(true);
      }
    };
    void check();
  }, []);

  useEffect(() => {
    const seen = persistentState.get('hasSeenPocketTtsOnboarding');
    if (!seen) {
      setShowPocketTtsOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const seen = persistentState.get('hasSeenPocketTtsHfAccessOnboarding');
    if (seen) {
      return;
    }

    const check = async () => {
      try {
        const raw = await fs.readFile(settingsPath, 'utf-8');
        const parsed = JSON.parse(raw) as {
          ui?: { voice?: { ttsProvider?: string } };
          voice?: { ttsProvider?: string };
          huggingFace?: { apiKey?: string };
          security?: { auth?: { selectedType?: string } };
        };
        const provider =
          parsed.ui?.voice?.ttsProvider ?? parsed.voice?.ttsProvider ?? '';
        if (provider !== 'pocket') {
          return;
        }

        const tokenStatus = resolvePocketHfTokenLocal({
          huggingFace: parsed.huggingFace,
        });

        if (tokenStatus.source !== 'none') {
          persistentState.set('hasSeenPocketTtsHfAccessOnboarding', true);
          return;
        }

        setShowPocketTtsHfAccessOnboarding(true);
      } catch {
        // ignore parse/read failures
      }
    };

    void check();
  }, []);

  useEffect(() => {
    const seen = persistentState.get('hasSeenGoogleTtsApiKeyOnboarding');
    if (seen) {
      return;
    }

    const check = async () => {
      try {
        const raw = await fs.readFile(settingsPath, 'utf-8');
        const parsed = JSON.parse(raw) as {
          security?: { auth?: { selectedType?: string } };
        };
        const authType = parsed.security?.auth?.selectedType;
        if (authType !== AuthType.LOGIN_WITH_GOOGLE) {
          return;
        }
      } catch {
        return;
      }

      const envKey =
        process.env['PHILL_API_KEY'] ||
        process.env['GEMINI_API_KEY'] ||
        process.env['GOOGLE_API_KEY'];
      const storedKey = await loadApiKey().catch(() => undefined);
      if (envKey || storedKey) {
        persistentState.set('hasSeenGoogleTtsApiKeyOnboarding', true);
        return;
      }

      setShowGoogleTtsApiKeyOnboarding(true);
    };

    void check();
  }, []);

  if (
    !showStartupWarnings &&
    !showInitError &&
    !updateInfo &&
    !showScreenReaderNudge &&
    !showIdentityOnboarding &&
    !showPocketTtsOnboarding &&
    !showPocketTtsHfAccessOnboarding &&
    !showGoogleTtsApiKeyOnboarding
  ) {
    return null;
  }

  return (
    <>
      {showScreenReaderNudge && (
        <Text>
          You are currently in screen reader-friendly view. To switch out, open{' '}
          {settingsPath} and remove the entry for {'"screenReader"'}. This will
          disappear on next run.
        </Text>
      )}
      {updateInfo && <UpdateNotification message={updateInfo.message} />}
      {showIdentityOnboarding && (
        <Box
          borderStyle="round"
          borderColor={theme.text.link}
          paddingX={1}
          marginY={1}
          flexDirection="column"
        >
          <Text color={theme.text.primary}>
            👤 One-time setup: personalize your agent identity.
          </Text>
          <Text color={theme.text.secondary}>
            Run: /identity setup &lt;name&gt; | &lt;voiceName&gt; | &lt;speechStyle&gt;
          </Text>
          <Text color={theme.text.secondary}>
            This is stored separately in PhillSelfIdentity.md and resets on /memory reset or /memory wipe.
          </Text>
        </Box>
      )}
      {showPocketTtsOnboarding && (
        <Box
          borderStyle="round"
          borderColor={theme.text.link}
          paddingX={1}
          marginY={1}
          flexDirection="column"
        >
          <Text color={theme.text.primary}>
            🎙️ One-time setup: local Pocket TTS model download.
          </Text>
          <Text color={theme.text.secondary}>
            Run: /voice setup
          </Text>
          <Text color={theme.text.secondary}>
            Skip now: /voice skip | Later setup from Voice settings with /voice setup
          </Text>
          <Text color={theme.text.secondary}>
            Optional: set model path first with /voice path &lt;directory&gt;
          </Text>
        </Box>
      )}
      {showPocketTtsHfAccessOnboarding && (
        <Box
          borderStyle="round"
          borderColor={theme.text.link}
          paddingX={1}
          marginY={1}
          flexDirection="column"
        >
          <Text color={theme.text.primary}>
            🎧 Pocket TTS access setup required (one-time).
          </Text>
          <Text color={theme.text.secondary}>
            Request model access: https://huggingface.co/kyutai/pocket-tts
          </Text>
          <Text color={theme.text.secondary}>
            Then set token (HF_TOKEN or HUGGINGFACE_API_KEY) and run: /voice setup
          </Text>
          <Text color={theme.text.secondary}>
            Existing Hugging Face auth token is auto-reused if available.
          </Text>
          <Text color={theme.text.secondary}>
            Skip reminder: /voice skip-pocket-hf-access
          </Text>
        </Box>
      )}
      {showGoogleTtsApiKeyOnboarding && (
        <Box
          borderStyle="round"
          borderColor={theme.text.link}
          paddingX={1}
          marginY={1}
          flexDirection="column"
        >
          <Text color={theme.text.primary}>
            🔑 Optional TTS backup: add a Gemini API key for voice reliability.
          </Text>
          <Text color={theme.text.secondary}>
            You are signed in with Google. If Gemini TTS is unavailable, adding a Gemini API key provides a backup path.
          </Text>
          <Text color={theme.text.secondary}>
            Setup: /auth (choose API key) | env: PHILL_API_KEY / GEMINI_API_KEY / GOOGLE_API_KEY
          </Text>
          <Text color={theme.text.secondary}>
            Skip reminder: /voice skip-google-tts-key
          </Text>
        </Box>
      )}
      {showStartupWarnings && (
        <Box
          borderStyle="round"
          borderColor={theme.status.warning}
          paddingX={1}
          marginY={1}
          flexDirection="column"
        >
          {startupWarnings.map((warning, index) => (
            <Text key={index} color={theme.status.warning}>
              ⚠️ {warning}
            </Text>
          ))}
        </Box>
      )}
      {showInitError && (
        <Box
          borderStyle="round"
          borderColor={theme.status.error}
          paddingX={1}
          marginBottom={1}
        >
          <Text color={theme.status.error}>
            ❌ Initialization Error: {initError}
          </Text>
          <Text color={theme.status.error}>
            {' '}
            Please check API key and configuration.
          </Text>
        </Box>
      )}
    </>
  );
};
