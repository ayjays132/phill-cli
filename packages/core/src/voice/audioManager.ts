/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { DeviceManager } from './deviceManager.js';
import { debugLogger } from '../utils/debugLogger.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

// --- Configuration Constants ---

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export const GEMINI_INPUT_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
};

export const GEMINI_OUTPUT_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channels: 1,
  bitDepth: 16,
};

export interface AudioManagerEvents {
  audioData: (chunk: Buffer) => void;
  voiceActivity: (isActive: boolean) => void;
  error: (error: Error) => void;
  volume: (volume: number) => void;
  outputVolume: (volume: number) => void;
}

// --- Recorder Interface & Types ---

export interface VoiceRecorder extends EventEmitter {
  start(deviceId: string, loopback: boolean, options: any): Promise<void>;
  stop(): void;
  setLoopback(enabled: boolean): void;
  isRecording(): boolean;
}

// --- Native Recorder Implementation ---

class NativeRecorder extends EventEmitter implements VoiceRecorder {
  private recorder: any = null;
  private recording: boolean = false;
  private isLoopback = false;
  private currentDeviceId = 'default';

  constructor() {
    super();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Recorder } = require('native-recorder-nodejs');
      this.recorder = new Recorder();
      debugLogger.log('AudioManager: native-recorder-nodejs loaded successfully');
    } catch (e) {
      debugLogger.warn('AudioManager: native-recorder-nodejs not found or failed to load. Native recording unavailable.');
      this.recorder = null;
    }
  }

  isAvailable(): boolean {
    return !!this.recorder;
  }

  isRecording(): boolean {
    return this.recording;
  }

  async start(deviceId: string, loopback: boolean, _options: any): Promise<void> {
    if (!this.recorder) throw new Error('Native recorder not available');

    this.isLoopback = loopback;
    this.currentDeviceId = deviceId;

    if (this.recording) {
      this.stop();
    }

    try {
      const opts: any = {
        sampleRate: 16000,
        channelCount: 1,
        loopback: this.isLoopback
      };

      // Best-effort device selection
      if (!this.isLoopback && deviceId !== 'default') {
         if (!isNaN(Number(deviceId))) {
             opts.inputDevice = Number(deviceId);
         } else {
             // If we can't map the string ID (like "Analogue 1 + 2") to a native index, 
             // we MUST fail so we fall back to FfmpegRecorder which handles dshow names.
             debugLogger.warn(`NativeRecorder: Cannot map string device ID '${deviceId}' to native index. Failing to trigger fallback.`);
             throw new Error(`Cannot map device ID '${deviceId}' to native index`);
         }
      }

      this.recorder.start(opts);
      this.recording = true;
      
      this.recorder.on('data', (chunk: Buffer) => {
        this.emit('data', chunk);
      });
      
      this.recorder.on('error', (err: any) => {
          this.emit('error', err);
      });

      debugLogger.log(`NativeRecorder started (Loopback: ${this.isLoopback})`);
    } catch (e) {
      debugLogger.error('NativeRecorder failed to start', e);
      throw e;
    }
  }

  stop(): void {
    if (this.recorder && this.recording) {
      this.recorder.stop();
      this.recording = false;
      this.recorder.removeAllListeners('data');
      this.recorder.removeAllListeners('error');
    }
  }

  setLoopback(enabled: boolean): void {
     if (this.isLoopback !== enabled) {
         this.isLoopback = enabled;
         if (this.recording) {
             // eslint-disable-next-line @typescript-eslint/no-floating-promises
             this.start(this.currentDeviceId, enabled, {});
         }
     }
  }
}

// --- FFmpeg Recorder Implementation (Legacy/Fallback) ---

class FfmpegRecorder extends EventEmitter implements VoiceRecorder {
  private command: ffmpeg.FfmpegCommand | null = null;
  private recording: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private deviceManager = DeviceManager.getInstance();

  isRecording(): boolean {
      return this.recording;
  }

  async start(deviceId: string, loopback: boolean, options: any): Promise<void> {
      this.stop();

      let inputDeviceName = deviceId;
      // Default device resolution
      if (inputDeviceName === 'default') {
        const devices = await this.deviceManager.getInputDevices();
        const realDevice = devices.find(d => d.id && d.id !== 'default');
        if (realDevice) {
          inputDeviceName = realDevice.id;
        } else if (devices.length > 0) {
          inputDeviceName = devices[0].id;
        }
      }

      const platform = os.platform();
      const ffmpegPath = this.resolveFfmpegPath();
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      debugLogger.log(`[ffmpeg-record] Resolved Path: ${ffmpegPath}`);

      let inputOption = inputDeviceName;
      if (platform === 'win32') {
          // Handle dshow input format for fluent-ffmpeg
          // For dshow, input is typically "audio=DEVICE_NAME"
          // However, fluent-ffmpeg handles raw input strings if we pass strictly.
          // Let's pass the full dshow string: "audio=..."
          inputOption = `audio=${inputDeviceName}`;
      } else if (platform === 'darwin') {
          inputOption = inputDeviceName === 'default' ? ':0' : `:${inputDeviceName}`;
      }
      
      // Initialize command
      this.command = ffmpeg();

      // Input Configuration
      if (platform === 'win32') {
          this.command
              .input(inputOption)
              .inputFormat('dshow')
              .inputOptions(['-rtbufsize 100M']); // Large buffer
      } else if (platform === 'darwin') {
          this.command
              .input(inputOption)
              .inputFormat('avfoundation');
      } else {
          this.command
              .input(inputDeviceName)
              .inputFormat('alsa');
      }

      // Output Configuration with robust resampling
      this.command
          .outputFormat('s16le')
          .audioChannels(1)
          .audioFrequency(16000)
          .outputOptions([
              '-fflags nobuffer',
              '-flags low_delay',
              '-tune zerolatency',
              '-af afftdn=nf=-25,volume=15dB,aresample=16000:async=1', // Noise reduction + Normalization
              '-nostdin'
          ]);

      // Handle Events
      this.command.on('start', (commandLine) => {
          debugLogger.log(`[ffmpeg-record] Spawned Ffmpeg with command: ${commandLine}`);
          this.recording = true;
      });

      this.command.on('error', (err: any, stdout: any, stderr: any) => {
          if (this.recording) { // Only log if we expect to be recording
             debugLogger.error(`[ffmpeg-record] Error: ${err.message}`);
             if (stderr) debugLogger.debug(`[ffmpeg-record] Stderr: ${stderr}`);
             this.emit('error', err);
          }
      });

      this.command.on('end', () => {
          this.recording = false;
          debugLogger.log('[ffmpeg-record] Process finished');
      });

      // Start processing by piping to a PassThrough stream
      const audioStream = new PassThrough();
      
      // Pipe outputs to stream
      this.command.pipe(audioStream, { end: true });

      let firstChunk = true;
      audioStream.on('data', (chunk) => {
          if (firstChunk) {
              debugLogger.log(`[ffmpeg-record] First audio chunk received: ${chunk.length} bytes`);
              firstChunk = false;
          }
          this.emit('data', chunk);
      });
  }

  stop(): void {
    if (this.command) {
       // fluent-ffmpeg kill method
       try {
           this.command.kill('SIGKILL');
       } catch (e) { /* ignore */ }
       this.command = null;
    }
    this.recording = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLoopback(enabled: boolean): void {
      // Loopback change for ffmpeg usually requires restart with different device
  }

  private resolveFfmpegPath(): string {
     const isWin = os.platform() === 'win32';
     const binaryName = 'ffmpeg' + (isWin ? '.exe' : '');
    
    // 1. Try to find it next to the current script (in the bundle directory)
    try {
        const bundleDir = (globalThis as any).__dirname || (typeof __dirname !== 'undefined' ? __dirname : null);
        if (bundleDir) {
           const localPath = path.join(bundleDir, binaryName);
           if (fs.existsSync(localPath)) return localPath;
        }
    } catch (e) {
      // ignore
    }
    
    // 2. Try ffmpeg-static
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpegStatic = require('ffmpeg-static');
        if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
    } catch(e) {
      // ignore
    }

    // 3. Fallback to global
    return 'ffmpeg'; 
  }
}

// --- Main Audio Manager ---

export class AudioManager extends EventEmitter {
  private static activePlaybackCount = 0;
  private activeRecorder: VoiceRecorder;
  private ffmpegRecorder: FfmpegRecorder;
  private nativeRecorder: NativeRecorder;
  
  // State
  private selectedInputDevice = 'default';
  private selectedOutputDevice = 'default';
  private captureOutputLoopback = false;
  
  // VAD / Volume
  private currentVolume = 0;
  
  // Playback
  private playbackProcess: ChildProcess | null = null;
  private isPlaying = false;
  private currentOutputVolume = 0;

  // Options
  private noiseSuppressionEnabled = true;
  private noiseSuppressionLevel: 'light' | 'standard' | 'aggressive' = 'standard';
  private voiceIsolationMode: 'off' | 'standard' | 'aggressive' = 'standard';
  private highpassFilterEnabled = true;
  private autoGainControlEnabled = true;

  // Device Manager
  private recordingRestartAttempts = 0;
  private recordingRestartTimer: NodeJS.Timeout | null = null;
  private maxRecordingRestartAttempts = 5;
  private shouldRecord = false;

  constructor() {
    super();
    
    this.ffmpegRecorder = new FfmpegRecorder();
    this.nativeRecorder = new NativeRecorder();
    
    // Prefer native if available, else ffmpeg
    if (this.nativeRecorder.isAvailable()) {
        this.activeRecorder = this.nativeRecorder;
        debugLogger.log('AudioManager initialized with NativeRecorder');
    } else {
        this.activeRecorder = this.ffmpegRecorder;
        debugLogger.log('AudioManager initialized with FfmpegRecorder');
    }
 
    this.setupRecorderEvents(this.activeRecorder);
  }

  // --- Static Methods ---

  public static getIsAnyPlaybackActive(): boolean {
    return AudioManager.activePlaybackCount > 0;
  }

  public static forceStopAllPlayback(): void {
    debugLogger.log('Force stopping all audio playback and resetting global count.');
    AudioManager.activePlaybackCount = 0;
  }

  private setupRecorderEvents(recorder: VoiceRecorder) {
      // Remove old listeners to avoid duplicates if switching
      recorder.removeAllListeners('data');
      recorder.removeAllListeners('error');

      recorder.on('data', (chunk: Buffer) => {
          this.processAudioVolume(chunk);
          this.emit('audioData', chunk);
      });
      recorder.on('error', (err) => {
          debugLogger.error('Recorder error:', err);
          this.emit('error', err);
      });
  }

  setInputDevice(deviceId: string) {
    this.selectedInputDevice = deviceId;
    if (this.activeRecorder.isRecording()) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.restartRecording();
    }
  }

  setOutputDevice(deviceId: string) {
      this.selectedOutputDevice = deviceId;
  }

  setCaptureOutputLoopback(enabled: boolean) {
      if (this.captureOutputLoopback === enabled) return;
      this.captureOutputLoopback = enabled;
      this.activeRecorder.setLoopback(enabled);
      if (this.activeRecorder.isRecording()) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.restartRecording();
      }
  }

  setVadThreshold(threshold: number) {
      debugLogger.debug(`setVadThreshold(${threshold}) called - handled by volume emission`);
  }

  setNoiseSuppression(
    enabled: boolean,
    level: 'light' | 'standard' | 'aggressive' = 'standard',
  ) {
    if (this.noiseSuppressionEnabled === enabled && this.noiseSuppressionLevel === level) return;
    this.noiseSuppressionEnabled = enabled;
    this.noiseSuppressionLevel = level;
    if (this.activeRecorder.isRecording()) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.restartRecording();
    }
  }

  setVoiceProcessing(options: {
    autoGainControl?: boolean;
    highpassFilter?: boolean;
    voiceIsolationMode?: 'off' | 'standard' | 'aggressive';
  }) {
    let changed = false;
    if (typeof options.autoGainControl === 'boolean' && this.autoGainControlEnabled !== options.autoGainControl) {
      this.autoGainControlEnabled = options.autoGainControl;
      changed = true;
    }
    if (typeof options.highpassFilter === 'boolean' && this.highpassFilterEnabled !== options.highpassFilter) {
      this.highpassFilterEnabled = options.highpassFilter;
      changed = true;
    }
    if (options.voiceIsolationMode && this.voiceIsolationMode !== options.voiceIsolationMode) {
      this.voiceIsolationMode = options.voiceIsolationMode;
      changed = true;
    }
    if (changed && this.activeRecorder.isRecording()) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.restartRecording();
    }
  }
  
  // API Compatibility methods
  getInputVolume(): number { return this.currentVolume; }
  getOutputVolume(): number { return this.currentOutputVolume; }
  getRecordingStatus(): boolean { return this.activeRecorder.isRecording(); }
  
  async startRecording() {
      if (this.activeRecorder.isRecording()) return;
      this.shouldRecord = true;
      this.clearRecordingRestartTimer();

      const options = {
          highpass: this.getHighpassFilterString(),
          noiseSuppression: this.getNoiseSuppressionFilterString(),
          autoGain: this.autoGainControlEnabled,
          voiceIsolationMode: this.voiceIsolationMode
      };
      
      try {
          await this.activeRecorder.start(this.selectedInputDevice, this.captureOutputLoopback, options);
          this.recordingRestartAttempts = 0;
      } catch (e) {
          debugLogger.error('Failed to start recording', e);
          if (this.activeRecorder === this.nativeRecorder && this.ffmpegRecorder) {
              debugLogger.warn('Switching to FFmpeg recorder due to native failure');
              this.activeRecorder = this.ffmpegRecorder;
              this.setupRecorderEvents(this.activeRecorder);
              try {
                  await this.activeRecorder.start(this.selectedInputDevice, this.captureOutputLoopback, options);
                  this.recordingRestartAttempts = 0;
              } catch (ffmpegErr) {
                   debugLogger.error('FFmpeg fallback failed', ffmpegErr);
                   this.scheduleRecordingRestart();
              }
          } else {
              this.scheduleRecordingRestart();
          }
      }
  }

  stopRecording() {
      this.shouldRecord = false;
      this.clearRecordingRestartTimer();
      this.activeRecorder.stop();
      this.currentVolume = 0;
  }
  
  private async restartRecording() {
      if (this.activeRecorder.isRecording()) {
          this.activeRecorder.stop();
          await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (this.shouldRecord) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.startRecording();
      }
  }

  private scheduleRecordingRestart() {
      if (!this.shouldRecord || this.activeRecorder.isRecording() || this.recordingRestartTimer) return;
      if (this.recordingRestartAttempts >= this.maxRecordingRestartAttempts) {
           debugLogger.error('Max recording restart attempts reached.');
           return;
      }
      this.recordingRestartAttempts++;
      const delay = Math.min(1000 * this.recordingRestartAttempts, 5000);
      this.recordingRestartTimer = setTimeout(() => {
          this.recordingRestartTimer = null;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.startRecording();
      }, delay);
  }

  private clearRecordingRestartTimer() {
      if (this.recordingRestartTimer) {
          clearTimeout(this.recordingRestartTimer);
          this.recordingRestartTimer = null;
      }
  }

  private processAudioVolume(chunk: Buffer) {
      // 1. Calculate RMS for the volume meter
      let sum = 0;
      for (let i = 0; i + 1 < chunk.length; i += 2) {
          const int16 = chunk.readInt16LE(i);
          sum += int16 * int16;
      }
      const rms = Math.sqrt(sum / (chunk.length / 2));
      this.currentVolume = Math.min(100, (rms / 32768) * 400); 

      // 2. Simple Threshold VAD (Fallback)
      const isActive = this.currentVolume > 20;
      this.emit('voiceActivity', isActive);
      this.emit('volume', this.currentVolume);
  }

  writeAudio(chunk: any) {
    if (!this.playbackProcess || this.playbackProcess.killed) {
        this.startPlayback();
    }

    if (this.playbackProcess?.stdin) {
      try {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        let sum = 0;
        for (let i = 0; i + 1 < buffer.length; i += 2) {
           sum += Math.pow(buffer.readInt16LE(i), 2);
        }
        this.currentOutputVolume = Math.sqrt(sum / (buffer.length/2)) / 32768 * 100;
        this.emit('outputVolume', this.currentOutputVolume);
        this.playbackProcess.stdin.write(buffer);
      } catch (e) {
        debugLogger.error('Error writing to playback', e);
      }
    }
  }
  
  public startPlayback() {
     const env = { ...process.env }; 
     if (this.selectedOutputDevice !== 'default') {
         env['SDL_AUDIO_DEVICE_NAME'] = this.selectedOutputDevice;
     }

     const args = [
      '-f', 's16le',
      '-ar', '24000', 
      '-ac', '1',
      '-i', 'pipe:0',
      '-nodisp',
      '-autoexit',
     ];
     
     const ffplayPath = this.resolveBinaryPath('ffplay', 'ffplay');
     this.playbackProcess = spawn(ffplayPath, args, { env });
     this.isPlaying = true;
     AudioManager.activePlaybackCount += 1;
     
     this.playbackProcess.on('close', () => {
         const wasPlaying = this.isPlaying;
         this.isPlaying = false;
         this.playbackProcess = null;
         if (wasPlaying) {
             AudioManager.activePlaybackCount = Math.max(0, AudioManager.activePlaybackCount - 1);
         }
     });
  }
  
  stopPlayback() {
      const wasPlaying = this.isPlaying;
      if (this.playbackProcess) {
          this.playbackProcess.kill();
          this.playbackProcess = null;
      }
      this.isPlaying = false;
      if (wasPlaying) {
          AudioManager.activePlaybackCount = Math.max(0, AudioManager.activePlaybackCount - 1);
      }
  }
  
  cleanup() {
      this.stopRecording();
      this.stopPlayback();
      this.removeAllListeners();
  }

  private resolveBinaryPath(value: unknown, label: 'ffmpeg' | 'ffplay'): string {
    const isWin = os.platform() === 'win32';
    const binaryName = label + (isWin ? '.exe' : '');
    try {
      const bundleDir = (globalThis as any).__dirname || (typeof __dirname !== 'undefined' ? __dirname : null);
      if (bundleDir) {
        const localPath = path.join(bundleDir, binaryName);
        if (fs.existsSync(localPath)) return localPath;
      }
    } catch (e) { /* ignore */ }

    if (typeof value === 'string' && value.trim()) return value;
    return label;
  }

  private getHighpassFilterString(): string | undefined {
       if (!this.highpassFilterEnabled) return undefined;
       const freq = this.voiceIsolationMode === 'aggressive' ? 140 : (this.voiceIsolationMode === 'standard' ? 120 : 90);
       return `highpass=f=${freq}`;
  }
  
  private getNoiseSuppressionFilterString(): string | undefined {
      if (!this.noiseSuppressionEnabled) return undefined;
      return 'afftdn=nf=-25'; 
  }
}