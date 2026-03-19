/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shim for ffplay-static.
 *
 * Attempts to resolve the real ffplay-static binary path at runtime.
 * If the package is not installed, returns null gracefully so callers
 * can fall back to a system-installed ffplay.
 */

let ffplayPath = null;
try {
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  ffplayPath = req('ffplay-static');
} catch (_) {
  // ffplay-static not installed — callers should fall back to system ffplay
}

export default ffplayPath;
