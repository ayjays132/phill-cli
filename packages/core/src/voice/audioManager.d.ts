/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
export interface AudioConfig {
    sampleRate: number;
    channels: number;
    bitDepth: number;
}
export declare const GEMINI_INPUT_CONFIG: AudioConfig;
export declare const GEMINI_OUTPUT_CONFIG: AudioConfig;
export interface AudioManagerEvents {
    audioData: (chunk: Buffer) => void;
    voiceActivity: (isActive: boolean) => void;
    error: (error: Error) => void;
}
export declare class AudioManager extends EventEmitter {
    private static activePlaybackCount;
    private recordingProcess;
    private playbackProcess;
    private isRecording;
    private isPlaying;
    private shouldRecord;
    private recordingRestartTimer;
    private recordingRestartAttempts;
    private readonly maxRecordingRestartAttempts;
    private vadThreshold;
    private captureOutputLoopback;
    private noiseSuppressionEnabled;
    private noiseSuppressionLevel;
    private autoGainControlEnabled;
    private highpassFilterEnabled;
    private voiceIsolationMode;
    private deviceManager;
    private selectedInputDevice;
    private selectedOutputDevice;
    private currentInputVolume;
    private currentOutputVolume;
    constructor();
    static getIsAnyPlaybackActive(): boolean;
    static forceStopAllPlayback(): void;
    private resolveBinaryPath;
    setInputDevice(deviceId: string): void;
    setOutputDevice(deviceId: string): void;
    setVadThreshold(threshold: number): void;
    setCaptureOutputLoopback(enabled: boolean): void;
    setNoiseSuppression(enabled: boolean, level?: 'light' | 'standard' | 'aggressive'): void;
    setVoiceProcessing(options: {
        autoGainControl?: boolean;
        highpassFilter?: boolean;
        voiceIsolationMode?: 'off' | 'standard' | 'aggressive';
    }): void;
    getInputVolume(): number;
    getOutputVolume(): number;
    startRecording(): Promise<void>;
    stopRecording(): void;
    startPlayback(): void;
    stopPlayback(): void;
    writeAudio(chunk: any): void;
    private scheduleRecordingRestart;
    private clearRecordingRestartTimer;
    cleanup(): void;
    getRecordingStatus(): boolean;
}
