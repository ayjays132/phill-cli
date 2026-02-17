/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import { AudioManager } from './audioManager.js';
import { debugLogger } from '../utils/debugLogger.js';
import type { Config } from '../config/config.js';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_ELEVENLABS_MODEL = 'eleven_turbo_v2';
const DEFAULT_OUTPUT_FORMAT = 'pcm_24000';

export class ElevenLabsTTS implements ITTSProvider {
  private readonly audioManager: AudioManager;
  private prosody: ProsodyOptions = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  constructor(private readonly config: Config) {
    this.audioManager = new AudioManager();
  }

  getName(): string {
    return 'ElevenLabs TTS';
  }

  stop(): void {
    this.audioManager.stopPlayback();
  }

  updateProsody(options: Partial<ProsodyOptions>): void {
    this.prosody = { ...this.prosody, ...options };
  }

  async listVoices(): Promise<Array<{ voice_id: string; name: string; category?: string }>> {
    const apiKey =
      this.config.getVoice().elevenLabsApiKey?.trim() ||
      process.env['ELEVENLABS_API_KEY'];
    if (!apiKey) {
      throw new Error('Missing ELEVENLABS_API_KEY');
    }

    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(
        `ElevenLabs voices error: ${response.status} ${response.statusText}`,
      );
    }
    const json = (await response.json()) as {
      voices?: Array<{ voice_id: string; name: string; category?: string }>;
    };
    return json.voices ?? [];
  }

  async speak(text: string): Promise<void> {
    if (!text.trim()) return;

    const voice = this.config.getVoice();
    const apiKey =
      voice.elevenLabsApiKey?.trim() ||
      process.env['ELEVENLABS_API_KEY'];
    if (!apiKey) {
      throw new Error('Missing ELEVENLABS_API_KEY for ElevenLabs TTS');
    }

    const voiceId =
      voice.elevenLabsVoiceId ||
      process.env['ELEVENLABS_VOICE_ID'] ||
      DEFAULT_ELEVENLABS_VOICE_ID;
    const modelId =
      voice.elevenLabsModelId ||
      process.env['ELEVENLABS_MODEL_ID'] ||
      DEFAULT_ELEVENLABS_MODEL;
    const outputFormat =
      voice.elevenLabsOutputFormat ||
      process.env['ELEVENLABS_OUTPUT_FORMAT'] ||
      DEFAULT_OUTPUT_FORMAT;
    const body = {
      text,
      model_id: modelId,
      output_format: outputFormat,
      voice_settings: {
        stability: clamp01(voice.elevenLabsStability ?? 0.45),
        similarity_boost: clamp01(voice.elevenLabsSimilarityBoost ?? 0.75),
        style: clamp01(this.prosody.style ? 0.5 : (voice.elevenLabsStyle ?? 0.2)),
        use_speaker_boost: voice.elevenLabsUseSpeakerBoost !== false,
      },
    };

    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/octet-stream',
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `ElevenLabs TTS error: ${response.status} ${response.statusText} ${errorText}`.trim(),
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBufferRaw = Buffer.from(new Uint8Array(arrayBuffer));
    let audioBuffer = stripWavHeaderIfPresent(audioBufferRaw);

    this.audioManager.startPlayback();
    this.audioManager.writeAudio(audioBuffer);
    debugLogger.log(
      `ElevenLabs TTS playback started (voiceId=${voiceId}, model=${modelId}).`,
    );
  }
}

function stripWavHeaderIfPresent(buffer: Buffer): Buffer {
  if (
    buffer.length > 44 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return buffer.subarray(44);
  }
  return buffer;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
