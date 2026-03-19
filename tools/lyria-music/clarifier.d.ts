/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface MusicIntent {
    purpose: string;
    mood: string[];
    genre: string[];
    instruments: string[];
    bpm?: number | 'auto';
    duration: number | 'loop';
    brightness?: number | 'auto';
    density?: number | 'auto';
    scale?: string | 'auto';
    outputFormat: 'wav' | 'mp3' | 'ogg' | 'stream' | 'loop';
    looping: boolean;
    adaptive: boolean;
    adaptiveStates: string[];
    temperature: number;
    exportPath: string | null;
    previewFirst: boolean;
}
export declare class Clarifier {
    private static instance;
    private constructor();
    static getInstance(): Clarifier;
    clarify(rawRequest: string): Promise<MusicIntent>;
}
