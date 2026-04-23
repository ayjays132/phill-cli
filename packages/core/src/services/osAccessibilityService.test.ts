/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  parseWmctrlWindows,
  parseXrandrMonitors,
} from './osAccessibilityService.js';

describe('OSAccessibilityService parsers', () => {
  it('parses xrandr monitor output', () => {
    const monitors = parseXrandrMonitors(`
Monitors: 2
 0: +*eDP-1 1920/344x1200/215+0+0  eDP-1
 1: +HDMI-1 2560/597x1440/336+1920+0  HDMI-1
`);

    expect(monitors).toEqual([
      {
        name: 'eDP-1',
        isPrimary: true,
        bounds: { x: 0, y: 0, width: 1920, height: 1200 },
      },
      {
        name: 'HDMI-1',
        isPrimary: false,
        bounds: { x: 1920, y: 0, width: 2560, height: 1440 },
      },
    ]);
  });

  it('parses wmctrl window output', () => {
    const windows = parseWmctrlWindows(`
0x04e00007  0 0 0 1440 900 host Terminal
0x03c00004  0 1440 40 1200 900 host Google Chrome
`);

    expect(windows).toEqual([
      {
        title: 'Terminal',
        processName: 'host',
        bounds: { left: 0, top: 0, right: 1440, bottom: 900 },
      },
      {
        title: 'Google Chrome',
        processName: 'host',
        bounds: { left: 1440, top: 40, right: 2640, bottom: 940 },
      },
    ]);
  });
});
