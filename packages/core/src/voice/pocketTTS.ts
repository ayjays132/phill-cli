/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import type { Config } from '../config/config.js';
import { debugLogger } from '../utils/debugLogger.js';
import { promises as fs } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  ensurePocketModelReady,
  resolvePocketHfToken,
  resolvePocketModelId,
} from './pocketTtsSetupService.js';

interface TtsResult {
  audio?: Float32Array | number[] | Int16Array | Uint8Array;
  sampling_rate?: number;
}

export class PocketTTS implements ITTSProvider {
  private prosody: ProsodyOptions = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  constructor(private readonly config: Config) {}

  getName(): string {
    return 'Pocket TTS';
  }

  stop(): void {
    // Best effort stop for system command based playback.
    debugLogger.log('Stopping Pocket TTS (best effort).');
  }

  updateProsody(options: Partial<ProsodyOptions>): void {
    this.prosody = { ...this.prosody, ...options };
  }

  private run(command: string, args: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'ignore',
        shell: false,
      });
      child.on('error', reject);
      child.on('close', (code) => resolve(code ?? 1));
    });
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private resolveReferenceAudioPath(explicitPath: string | undefined): string {
    const candidates = [
      explicitPath,
      path.join(process.cwd(), 'Voices', 'voice_preview_aria.mp3'),
      path.join(process.cwd(), 'voice_preview_aria.mp3'),
      path.join(homedir(), '.phill', 'voice_preview_aria.mp3'),
    ].filter((v): v is string => Boolean(v && v.trim()));
    return candidates[0]!;
  }

  private floatToInt16(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i] ?? 0));
      output[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return output;
  }

  private createWavBuffer(
    samples: Int16Array,
    sampleRate: number,
    channels: number = 1,
  ): Buffer {
    const blockAlign = channels * 2;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < samples.length; i++) {
      buffer.writeInt16LE(samples[i] ?? 0, 44 + i * 2);
    }
    return buffer;
  }

  private async playAudioFile(filePath: string): Promise<void> {
    if (process.platform === 'win32') {
      const script = [
        'Add-Type -AssemblyName presentationCore;',
        `$player = New-Object System.Windows.Media.MediaPlayer;`,
        `$player.Open([Uri]'${filePath.replace(/'/g, "''")}');`,
        '$player.Volume = 1.0;',
        '$player.Play();',
        'while($player.NaturalDuration.HasTimeSpan -eq $false){ Start-Sleep -Milliseconds 50 }',
        'Start-Sleep -Milliseconds ([Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalMilliseconds));',
        '$player.Close();',
      ].join(' ');
      const code = await this.run('powershell', ['-NoProfile', '-Command', script]);
      if (code !== 0) throw new Error('Failed to play Pocket audio on Windows.');
      return;
    }
    if (process.platform === 'darwin') {
      const code = await this.run('afplay', [filePath]);
      if (code !== 0) throw new Error('Failed to play Pocket audio on macOS.');
      return;
    }
    const aplayCode = await this.run('aplay', [filePath]).catch(() => 1);
    if (aplayCode === 0) return;
    const paplayCode = await this.run('paplay', [filePath]).catch(() => 1);
    if (paplayCode === 0) return;
    throw new Error('Failed to play Pocket audio on Linux.');
  }

  private async synthesizeWithTransformers(text: string): Promise<string> {
    const modelId = resolvePocketModelId(this.config);
    const voice = this.config.getVoice();
    const preset = voice.pocketVoicePreset?.trim() || 'alba';
    const referenceCandidate = this.resolveReferenceAudioPath(
      voice.pocketReferenceAudio,
    );
    const referenceAudioPath = (await this.fileExists(referenceCandidate))
      ? referenceCandidate
      : undefined;

    const hfTokenStatus = resolvePocketHfToken(this.config);
    if (hfTokenStatus.token) {
      debugLogger.log(
        `Pocket TTS auth: found Hugging Face token source "${hfTokenStatus.source}".`,
      );
      process.env['HF_TOKEN'] = hfTokenStatus.token;
      process.env['HUGGINGFACE_API_KEY'] = hfTokenStatus.token;
    } else {
      debugLogger.warn(
        'Pocket TTS auth: no Hugging Face token found. If model is gated, request access at https://huggingface.co/kyutai/pocket-tts and set HF_TOKEN or HUGGINGFACE_API_KEY.',
      );
    }

    await ensurePocketModelReady(this.config, (progress) => {
      if (typeof progress.progress === 'number') {
        const pct = Math.round(progress.progress * 100);
        if (pct % 10 === 0) {
          debugLogger.log(`Pocket TTS download progress: ${pct}%`);
        }
      }
    });

    const transformers = (await import('@xenova/transformers')) as {
      pipeline: (
        task: string,
        model: string,
        opts?: Record<string, unknown>,
      ) => Promise<(input: string, opts?: Record<string, unknown>) => Promise<TtsResult>>;
    };

    const synthesizer = await transformers.pipeline('text-to-speech', modelId);
    const result = await synthesizer(text, {
      voice: preset,
      speaker: preset,
      speaker_audio: referenceAudioPath,
      reference_audio: referenceAudioPath,
    });

    if (!result?.audio) {
      throw new Error('Pocket TTS synthesis returned no audio.');
    }

    const sampleRate = result.sampling_rate ?? 24000;
    const float =
      result.audio instanceof Float32Array
        ? result.audio
        : Float32Array.from(result.audio as number[]);
    const int16 = this.floatToInt16(float);
    const wav = this.createWavBuffer(int16, sampleRate);

    const outDir = await fs.mkdtemp(path.join(tmpdir(), 'pocket-tts-'));
    const outPath = path.join(outDir, 'pocket_tts.wav');
    await fs.writeFile(outPath, wav);
    return outPath;
  }

  async speak(text: string): Promise<void> {
    if (!text.trim()) return;
    const wavPath = await this.synthesizeWithTransformers(text);
    debugLogger.log('Pocket TTS synthesized speech with Transformers.js.');
    await this.playAudioFile(wavPath);
  }
}
