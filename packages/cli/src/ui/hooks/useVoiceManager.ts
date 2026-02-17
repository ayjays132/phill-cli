/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import {
  VoiceService,
} from 'phill-cli-core';
import type { Config, VoiceServiceStatus } from 'phill-cli-core';
import { useVoice } from '../contexts/VoiceContext.js';
import type { Tool } from '@google/genai';

export interface UseVoiceManagerOptions {
  config: Config;
  tools?: Tool[];
  onTranscriptFinal?: (transcript: string) => void;
  onTranscriptPartial?: (transcript: string) => void;
  onVoiceActivityStart?: () => void;
  isBusy?: boolean;
  onToolCall?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}

/**
 * VOICE MANAGER HOOK
 * Thin wrapper around VoiceService (Core Orchestrator).
 * Subscribes to core events and updates React state.
 */
export function useVoiceManager({
  config,
  tools,
  onTranscriptFinal,
  onTranscriptPartial,
  onVoiceActivityStart,
  onToolCall,
}: UseVoiceManagerOptions) {
  const { 
    voiceState, 
    setStatus, 
    setInputVolume, 
    setOutputVolume, 
    setTranscript,
    setEmotion
  } = useVoice();

  useEffect(() => {
    const service = VoiceService.getInstance();

    const handleStatusChange = (status: VoiceServiceStatus) => {
      setStatus(status);
    };

    const handleTranscriptPartial = (text: string) => {
      setTranscript(text);
      onTranscriptPartial?.(text);
    };

    const handleTranscriptFinal = (text: string) => {
      setTranscript(text);
      onTranscriptFinal?.(text);
    };

    const handleInputVolume = (vol: number) => {
      setInputVolume(vol);
      if (vol > 20) {
        onVoiceActivityStart?.();
      }
    };

    const handleOutputVolume = (vol: number) => {
      setOutputVolume(vol);
    };

    const handleEmotionChange = (emotion: string) => {
      setEmotion(emotion);
    };

    // Subscriptions
    service.on('statusChange', handleStatusChange);
    service.on('transcriptPartial', handleTranscriptPartial);
    service.on('transcriptFinal', handleTranscriptFinal);
    service.on('inputVolume', handleInputVolume);
    service.on('outputVolume', handleOutputVolume);
    service.on('emotionChange', handleEmotionChange);

    if (voiceState.isEnabled) {
      service.connect({ config, tools, onToolCall }).catch(err => {
        console.error('Failed to connect to Voice Service:', err);
      });
      
      // Sync initial device selection if updated
      if (voiceState.selectedInputDevice) service.setInputDevice(voiceState.selectedInputDevice);
      if (voiceState.selectedOutputDevice) service.setOutputDevice(voiceState.selectedOutputDevice);
    } else {
      service.disconnect();
    }

    return () => {
      service.off('statusChange', handleStatusChange);
      service.off('transcriptPartial', handleTranscriptPartial);
      service.off('transcriptFinal', handleTranscriptFinal);
      service.off('inputVolume', handleInputVolume);
      service.off('outputVolume', handleOutputVolume);
      service.off('emotionChange', handleEmotionChange);
    };
  }, [voiceState.isEnabled, voiceState.selectedInputDevice, voiceState.selectedOutputDevice, config, tools]); 
}
