/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MusicIntent } from './clarifier.js';
interface WeightedPrompt {
    text: string;
    weight: number;
}
interface MusicGenerationConfig {
    bpm?: number;
    density?: number;
    brightness?: number;
    scale?: string;
    temperature: number;
    musicGenerationMode: 'QUALITY' | 'DIVERSITY';
}
export declare class PromptBuilder {
    static buildPrompts(intent: MusicIntent): WeightedPrompt[];
    static buildConfig(intent: MusicIntent): MusicGenerationConfig;
}
export {};
