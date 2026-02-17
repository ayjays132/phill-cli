/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import { AudioManager } from './audioManager.js';
import { debugLogger } from '../utils/debugLogger.js';
import type { Config } from '../config/config.js';


const DEFAULT_VOICE_STYLE_BASE =
  'Warm, confident, and precise. Feminine default tone. Blend cinematic empathy and calm intelligence with practical execution. Keep phrasing concise and helpful. Match the user language automatically and preserve names, accents, and technical terms naturally.';

export class OpenAITTS implements ITTSProvider {
  private audioManager: AudioManager;
  private config: Config;
  private prosody: ProsodyOptions = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  constructor(config: Config) {
    this.config = config;
    this.audioManager = new AudioManager();
  }

  getName(): string {
    return 'OpenAI TTS';
  }

  stop(): void {
    this.audioManager.stopPlayback();
  }

  updateProsody(options: Partial<ProsodyOptions>): void {
    this.prosody = { ...this.prosody, ...options };
  }

  async speak(text: string): Promise<void> {
    if (!text) return;

    const openAiConfig = this.config.openAI;
    const voiceSettings = this.config.getVoice();
    const apiKey =
      voiceSettings.openAiApiKey?.trim() ||
      openAiConfig?.apiKey ||
      process.env['OPENAI_API_KEY'];
    
    if (!apiKey) {
      throw new Error('OpenAI API key missing for TTS');
    }

    const endpoint = (openAiConfig?.endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');

    try {
      const identity = await this.config.getAgentIdentityService().getIdentity();
      const model =
        process.env['OPENAI_TTS_MODEL'] ||
        voiceSettings.openAiTtsModel ||
        openAiConfig?.model ||
        'gpt-4o-mini-tts';
      const preferredVoice =
        process.env['OPENAI_TTS_VOICE'] ||
        voiceSettings.openAiVoice ||
        identity.voiceName ||
        (voiceSettings.preferredGender === 'male'
          ? 'onyx'
          : voiceSettings.preferredGender === 'neutral'
            ? 'sage'
            : 'coral');
      let instructions =
        voiceSettings.preferredStyle || identity.speechStyle
          ? `${DEFAULT_VOICE_STYLE_BASE}\nAdditional style guidance: ${voiceSettings.preferredStyle || identity.speechStyle}`
          : DEFAULT_VOICE_STYLE_BASE;

      if (this.prosody.rate !== 1.0) {
        instructions += `\nSpeak at ${this.prosody.rate > 1.0 ? 'fast' : 'slow'} pace (relative speed: ${this.prosody.rate}).`;
      }
      if (this.prosody.pitch !== 1.0) {
        instructions += `\nSpeak with ${this.prosody.pitch > 1.0 ? 'high' : 'low'} pitch (relative pitch: ${this.prosody.pitch}).`;
      }
      if (this.prosody.volume !== 1.0) {
        instructions += `\nSpeak with ${this.prosody.volume > 1.0 ? 'loud' : 'soft'} volume (relative volume: ${this.prosody.volume}).`;
      }
      if (this.prosody.style) {
        instructions += `\nEmotional tone/style: ${this.prosody.style}`;
      }

      const response = await fetch(`${endpoint}/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: text,
          voice: preferredVoice,
          instructions,
          response_format: 'pcm',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        try {
          const errorJson = JSON.parse(errorText);
          const message = errorJson.error?.message || errorJson.message || errorText;
          const code = errorJson.error?.code || errorJson.code;
          throw new Error(`OpenAI TTS Error: ${message}${code ? ` (Code: ${code})` : ''}`);
        } catch {
          throw new Error(`OpenAI TTS Error: ${response.status} ${response.statusText} ${errorText}`.trim());
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));

      // OpenAI pcm format is 24kHz s16le mono, compatible with AudioManager playback.
      this.audioManager.startPlayback();
      this.audioManager.writeAudio(buffer);
    } catch (error) {
      debugLogger.error('OpenAI TTS failed:', error);
      throw error;
    }
  }
}
