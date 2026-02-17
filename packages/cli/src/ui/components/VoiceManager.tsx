/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from 'ink';
import { useConfig } from '../contexts/ConfigContext.js';
import { useVoiceManager } from '../hooks/useVoiceManager.js';
import { VoiceOverlay } from '../voice/VoiceOverlay.js';
import { EthicalOverlay } from '../voice/EthicalOverlay.js';
import { useVoice } from '../contexts/VoiceContext.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { StreamingState } from '../types.js';
import { TTSService } from 'phill-cli-core';
import type { Tool } from '@google/genai';

const FILLER_TOKEN_REGEX =
  /^(?:u+h+|u+m+|u+m+m+|h+m+|h+m+m+|h+u+h+|e+r+|a+h+|m+m+|uh-huh|uh huh|mm-hmm|mm hmm)$/i;

function tokenizeSpeech(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function isFillerOnlyUtterance(text: string): boolean {
  const tokens = tokenizeSpeech(text);
  return tokens.length > 0 && tokens.every((t) => FILLER_TOKEN_REGEX.test(t));
}

function hasTrailingFiller(text: string): boolean {
  const tokens = tokenizeSpeech(text);
  if (tokens.length === 0) return false;
  const tail = tokens.slice(-2);
  return tail.some((t) => FILLER_TOKEN_REGEX.test(t));
}

function shouldDeferAsIncomplete(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return true;
  const tokens = tokenizeSpeech(normalized);
  if (tokens.length === 0) return true;

  // Relaxed: allow short utterances if they don't look like leading conjunctions
  if (tokens.length === 1) {
    const word = tokens[0].toLowerCase();
    const leadingConjunctions = ['and', 'or', 'but', 'so', 'if', 'when', 'while', 'because'];
    if (leadingConjunctions.includes(word) && !/[.!?]$/.test(normalized)) {
      return true;
    }
    return false;
  }
  return false;
}

export function VoiceManager() {
  const config = useConfig();
  const { voiceState, setWaiterState } = useVoice();
  const { handleVoiceSubmit, cancelOngoingRequest } = useUIActions();
  const { streamingState } = useUIState();
  const voiceConfig = config.getVoice() as Record<string, unknown>;
  const pendingTranscriptsRef = useRef<string[]>([]);
  const pendingWaitReasonRef = useRef<string | null>(null);
  const externalWaitRef = useRef<{
    active: boolean;
    source: string;
    reason: string;
    untilMs: number;
  }>({
    active: false,
    source: 'voice',
    reason: '',
    untilMs: 0,
  });
  const deferredTranscriptRef = useRef<string | null>(null);
  const bufferedTurnPartsRef = useRef<string[]>([]);
  const lastSubmittedTranscriptRef = useRef<{
    text: string;
    at: number;
  } | null>(null);
  const submitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bufferedTurnStartedAtRef = useRef<number | null>(null);
  const waiterResolversRef = useRef<Array<(transcript: string | null) => void>>(
    [],
  );
  const responseDelayMs = Math.max(
    0,
    Number(voiceConfig['responseDelayMs'] ?? 120),
  );
  const voiceTurnHoldMs = Math.max(
    500,
    Number(voiceConfig['voiceTurnHoldMs'] ?? 700),
  );
  const continuationHoldMs = Math.max(
    200,
    Number(voiceConfig['voiceContinuationHoldMs'] ?? 400),
  );
  const maxIncompleteHoldMs = Math.max(
    continuationHoldMs,
    Number(voiceConfig['voiceMaxIncompleteHoldMs'] ?? 4500),
  );
  const voiceCooldownMs = Math.max(
    350,
    Number(voiceConfig['voiceCooldownMs'] ?? 800),
  );
  const duplicateWindowMs = Math.max(
    voiceCooldownMs,
    Number(voiceConfig['voiceDuplicateWindowMs'] ?? 2800),
  );
  const waiterEnabled = voiceConfig['waiterEnabled'] !== false;
  const realtimeConversation = voiceConfig['realtimeConversation'] !== false;
  const isBusy =
    streamingState === StreamingState.Responding ||
    streamingState === StreamingState.WaitingForConfirmation;

  const tools: Tool[] = useMemo(() => {
    if (!voiceState.isEnabled || !waiterEnabled) {
      return [];
    }
    return [
      {
        functionDeclarations: [
          {
            name: 'voice_wait',
            description:
              'Voice session waiter for realtime conversation. Lets the model wait for user speech, poll transcript readiness, or defer a reply until user finishes speaking.',
            parametersJsonSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: [
                    'wait_for_user_speech',
                    'yield_until_transcript',
                    'continue_or_pause',
                    'set_wait_hint',
                    'clear_wait_hint',
                    'get_wait_state',
                  ],
                },
                timeoutMs: {
                  type: 'number',
                  minimum: 100,
                  maximum: 120000,
                },
                reason: { type: 'string' },
                waitSource: { type: 'string' },
              },
              required: ['action'],
              additionalProperties: false,
            },
          },
        ],
      },
    ];
  }, [voiceState.isEnabled, waiterEnabled]);

  useEffect(() => {
    if (!voiceState.isEnabled || !waiterEnabled) {
      setWaiterState('off');
      return;
    }
    if (voiceState.waiterState === 'off') {
      setWaiterState('listening');
    }
  }, [voiceState.isEnabled, voiceState.waiterState, waiterEnabled, setWaiterState]);

  const handleToolCall = useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      if (name !== 'voice_wait') {
        return { ok: false, error: `Unsupported voice tool "${name}".` };
      }
      const action = String(args['action'] ?? 'wait_for_user_speech');

      if (action === 'wait_for_user_speech') {
        setWaiterState('waiting');
        pendingWaitReasonRef.current = String(args['reason'] ?? '').trim() || null;
        return {
          ok: true,
          status: voiceState.status,
          listening: voiceState.status === 'listening',
          transcriptQueued: pendingTranscriptsRef.current.length > 0,
          advice: 'Wait for transcript, then call yield_until_transcript.',
          timestamp: Date.now(),
        };
      }

      if (action === 'continue_or_pause') {
        const shouldPause =
          streamingState === StreamingState.Responding ||
          streamingState === StreamingState.WaitingForConfirmation ||
          (externalWaitRef.current.active &&
            Date.now() < externalWaitRef.current.untilMs);
        return {
          ok: true,
          actionTaken: shouldPause ? 'pause' : 'continue',
          status: voiceState.status,
          timestamp: Date.now(),
        };
      }

      if (action === 'yield_until_transcript') {
        setWaiterState('waiting');
        if (pendingTranscriptsRef.current.length > 0) {
          const transcript = pendingTranscriptsRef.current.shift() ?? '';
          setWaiterState('ready');
          return {
            ok: true,
            status: 'ready',
            transcript,
            timestamp: Date.now(),
          };
        }

        const timeoutMs = Math.max(
          100,
          Math.min(120000, Number(args['timeoutMs'] ?? 15000)),
        );

        const transcript = await new Promise<string | null>((resolve) => {
          waiterResolversRef.current.push(resolve);
          setTimeout(() => {
            const idx = waiterResolversRef.current.indexOf(resolve);
            if (idx >= 0) {
              waiterResolversRef.current.splice(idx, 1);
              resolve(null);
            }
          }, timeoutMs);
        });

        if (!transcript) {
          setWaiterState('listening');
          return { ok: true, status: 'timeout', timestamp: Date.now() };
        }

        setWaiterState('ready');
        return {
          ok: true,
          status: 'ready',
          transcript,
          reason: pendingWaitReasonRef.current,
          timestamp: Date.now(),
        };
      }

      if (action === 'set_wait_hint') {
        const timeoutMs = Math.max(
          500,
          Math.min(180000, Number(args['timeoutMs'] ?? 15000)),
        );
        const reason =
          String(args['reason'] ?? '').trim() || 'external-wait';
        const source =
          String(args['waitSource'] ?? '').trim() || 'external';
        externalWaitRef.current = {
          active: true,
          source,
          reason,
          untilMs: Date.now() + timeoutMs,
        };
        pendingWaitReasonRef.current = reason;
        setWaiterState('waiting');
        return {
          ok: true,
          status: 'waiting',
          source,
          reason,
          timeoutMs,
          timestamp: Date.now(),
        };
      }

      if (action === 'clear_wait_hint') {
        externalWaitRef.current = {
          active: false,
          source: 'voice',
          reason: '',
          untilMs: 0,
        };
        pendingWaitReasonRef.current = null;
        setWaiterState('listening');
        return {
          ok: true,
          status: 'listening',
          timestamp: Date.now(),
        };
      }

      if (action === 'get_wait_state') {
        const now = Date.now();
        const ext = externalWaitRef.current;
        const externalActive = ext.active && now < ext.untilMs;
        return {
          ok: true,
          waiterState: voiceState.waiterState,
          voiceStatus: voiceState.status,
          pendingTranscriptCount: pendingTranscriptsRef.current.length,
          bufferedTurnParts: bufferedTurnPartsRef.current.length,
          deferredTranscript: Boolean(deferredTranscriptRef.current),
          externalWait: externalActive
            ? {
              active: true,
              source: ext.source,
              reason: ext.reason,
              remainingMs: Math.max(0, ext.untilMs - now),
            }
            : { active: false },
          timestamp: now,
        };
      }

      return { ok: false, error: `Unknown voice_wait action "${action}".` };
    },
    [streamingState, voiceState.status, voiceState.waiterState, setWaiterState],
  );

  const handleTranscriptFinal = useCallback(
    (transcript: string) => {
      const normalized = transcript.trim();
      if (!normalized) return;
      const now = Date.now();
      const last = lastSubmittedTranscriptRef.current;
      if (
        last &&
        now - last.at <= duplicateWindowMs &&
        last.text.toLowerCase() === normalized.toLowerCase()
      ) {
        return;
      }

      if (waiterResolversRef.current.length > 0) {
        const resolver = waiterResolversRef.current.shift();
        resolver?.(normalized);
      } else {
        pendingTranscriptsRef.current.push(normalized);
      }
      setWaiterState('ready');

      if (!realtimeConversation) {
        const ext = externalWaitRef.current;
        if (ext.active && Date.now() < ext.untilMs) {
          setWaiterState('waiting');
          deferredTranscriptRef.current = deferredTranscriptRef.current
            ? `${deferredTranscriptRef.current} ${normalized}`.trim()
            : normalized;
          return;
        }
        if (isBusy) {
          deferredTranscriptRef.current = deferredTranscriptRef.current
            ? `${deferredTranscriptRef.current} ${normalized}`.trim()
            : normalized;
          return;
        }
        handleVoiceSubmit(normalized);
        lastSubmittedTranscriptRef.current = { text: normalized, at: Date.now() };
        setWaiterState('listening');
        return;
      }

      if (realtimeConversation) {
        if (!bufferedTurnStartedAtRef.current) {
          bufferedTurnStartedAtRef.current = Date.now();
        }
        bufferedTurnPartsRef.current.push(normalized);
        if (submitTimerRef.current) {
          clearTimeout(submitTimerRef.current);
          submitTimerRef.current = null;
        }
        setWaiterState('waiting');
        const submitWhenReady = () => {
          const ext = externalWaitRef.current;
          if (ext.active && Date.now() < ext.untilMs) {
            setWaiterState('waiting');
            submitTimerRef.current = setTimeout(
              submitWhenReady,
              Math.min(1000, Math.max(250, ext.untilMs - Date.now())),
            );
            return;
          }
          const combined = bufferedTurnPartsRef.current.join(' ').trim();
          const incompleteHoldElapsedMs = bufferedTurnStartedAtRef.current
            ? Date.now() - bufferedTurnStartedAtRef.current
            : 0;
          if (
            shouldDeferAsIncomplete(combined) &&
            incompleteHoldElapsedMs < maxIncompleteHoldMs
          ) {
            submitTimerRef.current = setTimeout(
              submitWhenReady,
              continuationHoldMs,
            );
            return;
          }
          if (isFillerOnlyUtterance(combined)) {
            submitTimerRef.current = setTimeout(
              submitWhenReady,
              continuationHoldMs + 900,
            );
            return;
          }
          const looksIncomplete =
            !/[.!?]\s*$/.test(combined) &&
            /(?:\b(and|or|but|so|because|then|if|when|while|that|which|who|to)\s*)$/i.test(
              combined,
            );
          if (looksIncomplete || hasTrailingFiller(combined)) {
            submitTimerRef.current = setTimeout(
              submitWhenReady,
              continuationHoldMs,
            );
            return;
          }
          bufferedTurnPartsRef.current = [];
          bufferedTurnStartedAtRef.current = null;
          if (!combined) {
            setWaiterState('listening');
            return;
          }
          if (isBusy) {
            // While model/IDE is busy, hold the current full spoken turn.
            deferredTranscriptRef.current = deferredTranscriptRef.current
              ? `${deferredTranscriptRef.current} ${combined}`.trim()
              : combined;
            return;
          }
          handleVoiceSubmit(combined);
          lastSubmittedTranscriptRef.current = { text: combined, at: Date.now() };
          setWaiterState('listening');
        };
        submitTimerRef.current = setTimeout(
          submitWhenReady,
          responseDelayMs + voiceTurnHoldMs,
        );
      }
    },
    [
      duplicateWindowMs,
      handleVoiceSubmit,
      isBusy,
      maxIncompleteHoldMs,
      responseDelayMs,
      realtimeConversation,
      setWaiterState,
      voiceTurnHoldMs,
      continuationHoldMs,
    ],
  );

  useEffect(() => {
    if (!realtimeConversation || isBusy) {
      return;
    }
    const ext = externalWaitRef.current;
    if (ext.active && Date.now() < ext.untilMs) {
      setWaiterState('waiting');
      return;
    }
    const deferred = deferredTranscriptRef.current;
    if (!deferred) {
      return;
    }
    const now = Date.now();
    const last = lastSubmittedTranscriptRef.current;
    if (last && now - last.at < voiceCooldownMs) {
      return;
    }
    deferredTranscriptRef.current = null;
    handleVoiceSubmit(deferred);
    lastSubmittedTranscriptRef.current = { text: deferred, at: Date.now() };
    setWaiterState('listening');
  }, [
    handleVoiceSubmit,
    isBusy,
    realtimeConversation,
    setWaiterState,
    voiceCooldownMs,
  ]);

  useEffect(
    () => () => {
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
      bufferedTurnPartsRef.current = [];
      bufferedTurnStartedAtRef.current = null;
    },
    [],
  );

  const handleVoiceActivityStart = useCallback(() => {
    const tts = TTSService.getInstance(config);
    if (tts.getIsSpeaking()) {
      tts.stop();
    }
    if (
      streamingState === StreamingState.Responding ||
      streamingState === StreamingState.WaitingForConfirmation
    ) {
      cancelOngoingRequest?.();
    }
  }, [config, streamingState, cancelOngoingRequest]);

  /* eslint-disable @typescript-eslint/no-unused-vars */
  useVoiceManager({
    config,
    tools,
    onTranscriptFinal: handleTranscriptFinal,
    onVoiceActivityStart: handleVoiceActivityStart,
    onToolCall: handleToolCall,
    isBusy,
  });

  return (
    <Box flexDirection="column">
      <VoiceOverlay />
      <Box marginTop={1}>
        <EthicalOverlay />
      </Box>
    </Box>
  );
}
