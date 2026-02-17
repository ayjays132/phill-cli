/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { BrowserService } from './browserService.js';
import { Buffer } from 'node:buffer';

export interface MultimodalFrame {
  screenshot: Buffer | null;
  audioSinceLastFrame: Buffer;
  timestamp: number;
}

export class AudioVisionSyncService {
  private static instance: AudioVisionSyncService;
  private browserService: BrowserService;
  private audioBuffer: Buffer[] = [];

  private constructor(config: Config) {
    this.browserService = BrowserService.getInstance(config);
    this.browserService.on('audio-chunk', this.handleAudioChunk.bind(this));
  }

  public static getInstance(config: Config): AudioVisionSyncService {
    if (!AudioVisionSyncService.instance) {
      AudioVisionSyncService.instance = new AudioVisionSyncService(config);
    }
    return AudioVisionSyncService.instance;
  }

  private handleAudioChunk(data: { buffer: Buffer; timestamp: number }) {
    this.audioBuffer.push(data.buffer);
    // Keep buffer size reasonable (e.g., last 30 seconds)
    // Assuming 16kHz audio, 100ms chunks ~ 3200 bytes
    // 300 chunks max
    if (this.audioBuffer.length > 300) {
        this.audioBuffer.shift();
    }
  }

  async getMultimodalContext(): Promise<MultimodalFrame> {
    const now = Date.now();
    const screenshot = await this.browserService.getScreenshot();
    
    // Concatenate all audio since last frame (or generic buffer if simple)
    // For true sync, we'd use timestamps, but for now we just flush the buffer
    const audioData = Buffer.concat(this.audioBuffer);
    this.audioBuffer = []; // Clear buffer after reading

    return {
      screenshot,
      audioSinceLastFrame: audioData,
      timestamp: now
    };
  }

  startSync() {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.browserService.startAudioCapture();
  }

  stopSync() {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.browserService.stopAudioCapture();
  }
}
