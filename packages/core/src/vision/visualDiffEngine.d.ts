/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ROI {
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare class VisualDiffEngine {
    private lastFoveatedHash;
    private lastFullHash;
    private currentROI;
    /**
     * Sets the Region of Interest for foveated perception.
     */
    setROI(roi: ROI | null): void;
    /**
     * Compares the current frame buffer with the last known state.
     * Returns true if a significant change is detected.
     */
    isSignificantChange(frame: Buffer): {
        significant: boolean;
        type: 'foveated' | 'full' | 'none';
    };
    private calculateHash;
    /**
     * Grid-based hashing for more granular change detection.
     * (Placeholder for Phase 2 refinement)
     */
    calculateGridHashes(frame: Buffer, rows: number, cols: number): string[];
}
