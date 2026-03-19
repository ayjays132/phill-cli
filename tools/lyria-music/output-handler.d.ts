/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MusicIntent } from './clarifier.js';
export declare class OutputHandler {
    private speaker;
    private buffer;
    private intent;
    private totalBytes;
    constructor(intent: MusicIntent);
    private initSpeaker;
    handleChunk(chunk: Buffer): void;
    finalize(): Promise<string | null>;
    private convertToFormat;
}
