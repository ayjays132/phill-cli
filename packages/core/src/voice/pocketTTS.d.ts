/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import type { Config } from '../config/config.js';
export declare class PocketTTS implements ITTSProvider {
    private readonly config;
    private prosody;
    constructor(config: Config);
    getName(): string;
    stop(): void;
    updateProsody(options: Partial<ProsodyOptions>): void;
    private run;
    private fileExists;
    private resolveReferenceAudioPath;
    private floatToInt16;
    private createWavBuffer;
    private playAudioFile;
    private synthesizeWithTransformers;
    speak(text: string): Promise<void>;
}
