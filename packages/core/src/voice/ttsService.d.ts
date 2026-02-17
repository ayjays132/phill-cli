/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
import type { ProsodyOptions } from './ttsProvider.js';
export declare class TTSService {
    private static instance;
    private isSpeaking;
    private config;
    private provider;
    private lastSpokenText;
    private lastSpokenAtMs;
    private readonly duplicateSpeakWindowMs;
    private speakingSuppressionUntilMs;
    private stickyProviderName;
    private providerFailureUntilMs;
    private readonly providerFailureCooldownMs;
    private readonly providerHardFailureCooldownMs;
    private constructor();
    static getInstance(config: Config): TTSService;
    stop(): void;
    private resolveProvider;
    getIsSpeaking(): boolean;
    getLastSpokenText(): string | null;
    updateProsody(options: Partial<ProsodyOptions>): void;
    wasRecentlySpoken(text: string, withinMs?: number): boolean;
    private estimatePlaybackMs;
    private shouldAttemptProvider;
    private getFailureCooldownMs;
    private tryProvider;
    speak(text: string): Promise<void>;
}
