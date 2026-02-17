/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import type { Config } from '../config/config.js';
export declare class OpenAITTS implements ITTSProvider {
    private audioManager;
    private config;
    private prosody;
    constructor(config: Config);
    getName(): string;
    stop(): void;
    updateProsody(options: Partial<ProsodyOptions>): void;
    speak(text: string): Promise<void>;
}
