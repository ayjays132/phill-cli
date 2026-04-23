/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../../config/config.js';
import { ScreenshotService } from '../../services/screenshotService.js';
import { OSAccessibilityService } from '../../services/osAccessibilityService.js';
import { VisionProcessor } from '../../vision/visionProcessor.js';
import type {
  AccessibilityNode,
  UIElement,
} from '../../vision/visionProcessor.js';
import { BrowserService } from '../../services/browserService.js';

export interface GroundedOSView {
  screenshotPath: string;
  elements: UIElement[];
  summary: string;
  source: 'ax' | 'vision' | 'merged';
}

export async function groundOS(
  config: Config,
  _pid?: number,
): Promise<GroundedOSView> {
  const screenshotService = ScreenshotService.getInstance(config);
  const osService = OSAccessibilityService.getInstance(config);
  const browserService = BrowserService.getInstance(config);
  const visionProcessor = VisionProcessor.getInstance();
  const screenshotPath = await screenshotService.captureDesktop();

  // 2. Get AX Trees (Native + Browser)
  let elements: UIElement[] = [];
  try {
    const rawNative = await osService.getNativeAccessibilityTree();
    let rawBrowser: AccessibilityNode[] = [];
    try {
      if (browserService.isBrowserOpen()) {
        rawBrowser =
          ((await browserService.getAccessibilityTree()) as
            | AccessibilityNode[]
            | undefined) ?? [];
      }
    } catch {
      // Browser accessibility is optional.
    }

    const nativeElements = visionProcessor.flattenTree(
      rawNative as AccessibilityNode[],
    );
    const browserElements = visionProcessor.flattenTree(rawBrowser);
    elements = [...nativeElements, ...browserElements];
  } catch (_e) {
    // AX failure is expected on some platforms/configs
  }

  let source: 'ax' | 'vision' | 'merged' = 'merged';
  let summary = '';

  // 3. Fallback logic & Summary
  if (elements.length === 0) {
    source = 'vision';
    summary = `Accessibility tree unavailable. Visual analysis required.\n`;
  } else {
    const layout = await osService.getMonitorLayout();
    const primary = layout.find((m) => m.isPrimary) || layout[0];
    void primary; // primary available but dims not needed by single-arg summary
    summary = visionProcessor.generateSemanticSummary(elements);
  }

  return {
    screenshotPath,
    elements,
    summary,
    source,
  };
}
