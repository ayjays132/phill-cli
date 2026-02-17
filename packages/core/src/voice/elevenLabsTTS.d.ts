/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import type { Config } from '../config/config.js';
export declare class ElevenLabsTTS implements ITTSProvider {
    private readonly config;
    private readonly audioManager;
    private prosody;
    constructor(config: Config);
    getName(): string;
    stop(): void;
    updateProsody(options: Partial<ProsodyOptions>): void;
    listVoices(): Promise<Array<{
        voice_id: string;
        name: string;
        category?: string;
    }>>;
    speak(text: string): Promise<void>;
}
