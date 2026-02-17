/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
export interface LatentSnapshot {
    dlr: string;
    timestamp: string;
    coherencyHash?: string;
}
/**
 * Service for managing "Latent Context" - high-density semantic snapshots
 * that act as a VAE-style bottleneck for long-term chat memory.
 */
export declare class LatentContextService {
    private static instance;
    private constructor();
    static getInstance(): LatentContextService;
    /**
     * Updates the current visual latent.
     * Called by BrowserService when the visual state changes.
     */
    setVisualLatent(latent: string): void;
    /**
     * Encodes a history of content into a Dense Latent Representation (DLR).
     * This uses a specialized prompt to force the model into "lossy but deep" compression.
     */
    encode(history: Content[], config: Config, promptId: string, abortSignal?: AbortSignal): Promise<string>;
    /**
     * Formats a DLR for insertion into the prompt or PHILL.md.
     */
    formatLatentSnapshot(dlr: string): string;
}
