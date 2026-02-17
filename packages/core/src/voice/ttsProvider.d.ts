/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ProsodyOptions {
    /**
     * Speed of speech. 1.0 is normal, 0.5 is slow, 2.0 is fast.
     */
    rate: number;
    /**
     * Pitch of speech. 1.0 is normal, 0.5 is low, 2.0 is high.
     */
    pitch: number;
    /**
     * Volume of speech. 1.0 is normal, 0.0 is silent.
     */
    volume: number;
    /**
     * Additional style guidance (e.g., "excited", "whispering", "serious").
     */
    style?: string;
}
export interface ITTSProvider {
    /**
     * Generates and plays speech for the given text.
     */
    speak(text: string): Promise<void>;
    /**
     * Stops any ongoing speech playback.
     */
    stop(): void;
    /**
     * Updates the prosody/style of the generated speech.
     */
    updateProsody(options: Partial<ProsodyOptions>): void;
    /**
     * Name of the provider for debugging and display.
     */
    getName(): string;
}
