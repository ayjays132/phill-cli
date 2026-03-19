/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shim for ffmpeg-static.
 *
 * Attempts to resolve the real ffmpeg-static binary path at runtime.
 * If the package is not installed, returns null gracefully so callers
 * can fall back to a system-installed ffmpeg.
 */

let ffmpegPath = null;
try {
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  ffmpegPath = req('ffmpeg-static');
} catch (_) {
  // ffmpeg-static not installed — callers should fall back to system ffmpeg
}

export default ffmpegPath;
