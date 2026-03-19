/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import { ScreenshotService } from './screenshotService.js';
import {
  OSAccessibilityService,
  type MonitorInfo,
} from './osAccessibilityService.js';
import { BrowserService } from './browserService.js';
import { InputSimulationService } from './inputSimulationService.js';
import {
  VisionProcessor,
  type AccessibilityNode,
} from '../vision/visionProcessor.js';
import { debugLogger } from '../utils/debugLogger.js';
import * as fs from 'node:fs/promises';

export interface ComputerUseState {
  lastScreenshotPath?: string;
  lastScreenshotHash?: string;
  lastTreeHash?: string;
  screenDimensions: { width: number; height: number };
  context: 'os' | 'browser';
}

export interface ComputerUseActionParams {
  x?: number;
  y?: number;
  text?: string;
  url?: string;
  keys?: string;
  clear_before_typing?: boolean;
  press_enter?: boolean;
}

export class ComputerUseService {
  private static instance: ComputerUseService;
  private state: ComputerUseState = {
    screenDimensions: { width: 1440, height: 900 },
    context: 'os',
  };

  private constructor(private readonly config: Config) {}

  static getInstance(config: Config): ComputerUseService {
    if (!ComputerUseService.instance) {
      ComputerUseService.instance = new ComputerUseService(config);
    }
    return ComputerUseService.instance;
  }

  setContext(context: 'os' | 'browser') {
    this.state.context = context;
  }

  getContext() {
    return this.state.context;
  }

  /**
   * Captures the current state and returns visual + semantic data.
   * Optimizes for token usage by tracking deltas.
   */
  async captureState(forceScreenshot: boolean = false): Promise<{
    screenshot?: Buffer;
    accessibilityTree?: string;
    url?: string;
    dimensions: { width: number; height: number };
    context: 'os' | 'browser';
  }> {
    const osService = OSAccessibilityService.getInstance(this.config);
    const browserService = BrowserService.getInstance(this.config);
    const screenshotService = ScreenshotService.getInstance(this.config);
    const visionProcessor = VisionProcessor.getInstance();

    // 0. Update dimensions and decide source
    let rawTree: unknown = [];
    let screenshot: Buffer | undefined;
    let url = 'file://local/desktop';

    if (this.state.context === 'browser' && browserService.isBrowserOpen()) {
      const viewport = this.config.getBrowserViewport();
      if (viewport) {
        this.state.screenDimensions = {
          width: viewport.width,
          height: viewport.height,
        };
      }
      rawTree = (await browserService.getAccessibilityTree()) || [];
      url = browserService.getCurrentUrl() || 'about:blank';
    } else {
      try {
        const layout: MonitorInfo[] = await osService.getMonitorLayout();
        const primary =
          layout.find((m: MonitorInfo) => m.isPrimary) || layout[0];
        if (primary) {
          this.state.screenDimensions = {
            width: primary.bounds.width,
            height: primary.bounds.height,
          };
        }
      } catch (_e) {
        debugLogger.warn(
          `[ComputerUse] Failed to detect monitor dimensions: ${_e}`,
        );
      }
      rawTree = (await osService.getNativeAccessibilityTree()) || [];
    }

    // 1. Efficient grounding
    const treeStr = JSON.stringify(rawTree);
    const treeHash = this.hashString(treeStr);
    const treeChanged = treeHash !== this.state.lastTreeHash;
    this.state.lastTreeHash = treeHash;

    // 2. Capture screenshot if needed
    if (forceScreenshot || treeChanged || !this.state.lastScreenshotPath) {
      if (this.state.context === 'browser' && browserService.isBrowserOpen()) {
        screenshot = (await browserService.getScreenshot()) || undefined;
      } else {
        const path = await screenshotService.captureDesktop();
        this.state.lastScreenshotPath = path;
        screenshot = await fs.readFile(path);
      }
    }

    const elements = visionProcessor.flattenTree(
      rawTree as AccessibilityNode | AccessibilityNode[],
    );
    const semanticSummary = visionProcessor.generateSemanticSummary(elements);

    return {
      screenshot,
      accessibilityTree: semanticSummary,
      url,
      dimensions: this.state.screenDimensions,
      context: this.state.context,
    };
  }

  /**
   * Unified Execution: Routes actions to the correct service (OS or Browser).
   */
  async executeAction(
    action: 'click' | 'type' | 'key' | 'navigate',
    params: ComputerUseActionParams,
  ) {
    const input = InputSimulationService.getInstance(this.config);
    const browser = BrowserService.getInstance(this.config);

    if (this.state.context === 'browser' && browser.isBrowserOpen()) {
      switch (action) {
        case 'click': {
          await browser.cursorMove(params.x ?? 0, params.y ?? 0);
          await browser.cursorClick();
          break;
        }
        case 'type': {
          // For browser, we might need to focus first or use CDP typing
          await browser.cursorMove(params.x ?? 0, params.y ?? 0);
          await browser.cursorClick();
          // We use evaluate for deep typing or the page.keyboard
          const page = browser.getPage();
          if (page) {
            if (params.clear_before_typing) {
              await page.keyboard.press('Control+A');
              await page.keyboard.press('Backspace');
            }
            await page.keyboard.type(params.text ?? '');
            if (params.press_enter) await page.keyboard.press('Enter');
          }
          break;
        }
        case 'navigate': {
          await browser.navigate(params.url ?? 'about:blank');
          break;
        }
        case 'key': {
          const pg = browser.getPage();
          if (pg) {
            let key = params.keys || '';
            // Playwright is case-sensitive for Enter, Tab, Escape, etc.
            const keyMap: Record<string, string> = {
              enter: 'Enter',
              tab: 'Tab',
              escape: 'Escape',
              backspace: 'Backspace',
              delete: 'Delete',
            };
            key = keyMap[key.toLowerCase()] || key;
            await pg.keyboard.press(key);
          }
          break;
        }
        default:
          break;
      }
    } else {
      // OS Level
      switch (action) {
        case 'click': {
          await input.click(params.x ?? 0, params.y ?? 0);
          break;
        }
        case 'type': {
          await input.click(params.x ?? 0, params.y ?? 0);
          if (params.clear_before_typing) await input.type('^a{backspace}');
          await input.type(params.text ?? '');
          if (params.press_enter) await input.type('{enter}');
          break;
        }
        case 'navigate': {
          // On OS, navigate can mean opening a browser or a file
          const url = params.url || '';
          if (url.startsWith('http')) {
            await browser.navigate(url);
            this.state.context = 'browser';
          } else {
            await input.launchApp(url);
          }
          break;
        }
        case 'key': {
          const key = (params.keys || '').toLowerCase();
          const osKeyMap: Record<string, string> = {
            enter: '{enter}',
            tab: '{tab}',
            escape: '{esc}',
            backspace: '{backspace}',
            delete: '{delete}',
          };
          await input.type(osKeyMap[key] || params.keys || '');
          break;
        }
        default:
          break;
      }
    }
  }

  /**
   * Converts 0-999 coordinates to pixel coordinates.
   */
  denormalizeCoordinates(x: number, y: number): { pxX: number; pxY: number } {
    const { width, height } = this.state.screenDimensions;
    return {
      pxX: Math.round((x / 1000) * width),
      pxY: Math.round((y / 1000) * height),
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString();
  }

  setDimensions(width: number, height: number) {
    this.state.screenDimensions = { width, height };
  }

  getDimensions() {
    return this.state.screenDimensions;
  }
}
