/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import terminalImage from 'terminal-image';

/**
 * Renders a buffer of pixels to the terminal using the best available protocol.
 * This function auto-detects support for:
 * - Kitty Graphics Protocol (high fidelity, chunked transmission)
 * - iTerm2 Inline Images
 * - Sixel Graphics (via the sixel library internally)
 * - ANSI/ASCII Fallback
 */
export async function renderPixels(
  buf: Buffer,
  width?: number,
  height?: number,
): Promise<string> {
  try {
    const safeWidth = typeof width === 'number' && Number.isFinite(width) && width > 0
      ? Math.max(1, Math.floor(width))
      : '100%';
    const safeHeight = typeof height === 'number' && Number.isFinite(height) && height > 0
      ? Math.max(1, Math.floor(height))
      : undefined;

    // terminal-image is the industry standard for terminal graphics in Node.js.
    // It handles complex protocols like Kitty (including chunking for large images),
    // iTerm2, Sixel, and provides high-quality ANSI fallback.
    return await terminalImage.buffer(buf, {
      width: safeWidth,
      height: safeHeight,
      preserveAspectRatio: true,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Terminal graphics rendering failed:', e);
    return `[Browser Frame Capture Failed: ${e instanceof Error ? e.message : String(e)}]`;
  }
}
