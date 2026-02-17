/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Buffer } from 'node:buffer';
export declare class VisualLatentService {
    private static instance;
    private currentLatent;
    private constructor();
    static getInstance(): VisualLatentService;
    initialize(): Promise<void>;
    /**
     * Encodes an image buffer into a dense symbolic visual latent.
     * Format: V:[GEO_HASH]:[SEMANTIC_TAGS]
     *
     * This uses a reliable algorithmic approach (Multimodal Algorithmic Latent)
     * to avoid external model dependencies while providing spatial awareness.
     */
    encode(imageBuffer: Buffer): Promise<string>;
    getCurrentLatent(): string;
}
