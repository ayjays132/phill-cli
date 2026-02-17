/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
import { Buffer } from 'node:buffer';
export interface MultimodalFrame {
    screenshot: Buffer | null;
    audioSinceLastFrame: Buffer;
    timestamp: number;
}
export declare class AudioVisionSyncService {
    private static instance;
    private browserService;
    private audioBuffer;
    private constructor();
    static getInstance(config: Config): AudioVisionSyncService;
    private handleAudioChunk;
    getMultimodalContext(): Promise<MultimodalFrame>;
    startSync(): void;
    stopSync(): void;
}
