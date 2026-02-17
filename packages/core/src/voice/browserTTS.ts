/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import { BrowserService } from '../services/browserService.js';
import type { Config } from '../config/config.js';
import { spawn } from 'node:child_process';
import { debugLogger } from '../utils/debugLogger.js';

export class BrowserTTS implements ITTSProvider {
  private browserService: BrowserService;
  private prosody: ProsodyOptions = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  constructor(config: Config) {
    this.browserService = BrowserService.getInstance(config);
  }

  getName(): string {
    return 'Browser Native TTS';
  }

  stop(): void {
    // Best effort stop for system TTS would involve killing the child process,
    // but for now we'll just log it.
    debugLogger.log('Stopping Browser Native TTS (best effort).');
  }

  updateProsody(options: Partial<ProsodyOptions>): void {
    this.prosody = { ...this.prosody, ...options };
  }

  private runCommand(command: string, args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const child = spawn(command, args, { stdio: 'ignore' });
        child.on('close', (code) => resolve(code === 0));
        child.on('error', () => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  private async speakWithSystemTTS(text: string): Promise<boolean> {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return true;
    }

    if (process.platform === 'win32') {
      const escaped = trimmedText.replace(/'/g, "''");
      // System.Speech.Synthesis.SpeechSynthesizer.Rate is -10 to 10.
      const rate = Math.max(-10, Math.min(10, Math.round((this.prosody.rate - 1.0) * 10)));
      // Volume is 0 to 100.
      const volume = Math.max(0, Math.min(100, Math.round(this.prosody.volume * 100)));
      const script = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = ${rate}; $s.Volume = ${volume}; $s.Speak('${escaped}')`;
      return this.runCommand('powershell', ['-NoProfile', '-Command', script]);
    }

    if (process.platform === 'darwin') {
      return this.runCommand('say', [trimmedText]);
    }

    // Linux/Unix: try common local speech engines.
    if (await this.runCommand('spd-say', [trimmedText])) {
      return true;
    }
    return this.runCommand('espeak', [trimmedText]);
  }

  async speak(text: string): Promise<void> {
    const usedSystemTts = await this.speakWithSystemTTS(text);
    if (!usedSystemTts) {
      debugLogger.debug(
        'System TTS unavailable, falling back to browser-driven speech.',
      );
      await this.browserService.speakText(text);
    }
  }
}
