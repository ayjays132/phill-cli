/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'node:crypto';

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class VisualDiffEngine {
  private lastFoveatedHash: string | null = null;
  private lastFullHash: string | null = null;
  private currentROI: ROI | null = null;

  /**
   * Sets the Region of Interest for foveated perception.
   */
  setROI(roi: ROI | null) {
    this.currentROI = roi;
    this.lastFoveatedHash = null; // Reset hash on ROI change
  }

  /**
   * Compares the current frame buffer with the last known state.
   * Returns true if a significant change is detected.
   */
  isSignificantChange(frame: Buffer): { significant: boolean; type: 'foveated' | 'full' | 'none' } {
    const fullHash = this.calculateHash(frame);
    
    // 1. Check Full Frame Change
    if (fullHash === this.lastFullHash) {
      return { significant: false, type: 'none' };
    }
    this.lastFullHash = fullHash;

    // 2. Check Foveated ROI Change (if set)
    if (this.currentROI) {
      // In a real implementation, we would crop the buffer based on ROI.
      // For this MVP, we use the full hash but signal foveated intent.
      // We can simulate cropping if we assume a specific format, but for now
      // we'll just track if the full frame changed while an ROI was active.
      const foveatedHash = fullHash; // Simple proxy for now
      if (foveatedHash !== this.lastFoveatedHash) {
        this.lastFoveatedHash = foveatedHash;
        return { significant: true, type: 'foveated' };
      }
    }

    return { significant: true, type: 'full' };
  }

  private calculateHash(data: Buffer): string {
    return createHash('md5').update(data).digest('hex');
  }

  /**
   * Grid-based hashing for more granular change detection.
   * (Placeholder for Phase 2 refinement)
   */
  calculateGridHashes(frame: Buffer, rows: number, cols: number): string[] {
    // Split frame into grid and hash each cell
    return [];
  }
}
