/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, CDPSession } from 'playwright';
import type { Config } from '../config/config.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { VisualDiffEngine } from '../vision/visualDiffEngine.js';
import { VisualLatentService } from './visualLatentService.js';
import { VLACompressor } from './vlaCompressor.js';
import { pathToFileURL } from 'node:url';
import { debugLogger } from '../utils/debugLogger.js';
import process from 'node:process';

import { isBrowserInstalled } from '../utils/browser.js';

const GHOST_CURSOR_CSS = `
#ghost-cursor-container {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2147483647;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 8px;
  /* Removed transition to avoid click misses in atomic actions (move+click in one script) */
}

#ghost-cursor {
  width: 24px;
  height: 24px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" stroke="black" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3" stroke-linecap="round"/></svg>');
  background-repeat: no-repeat;
  background-size: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

#ai-status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 6px rgba(0,0,0,0.5);
  background: radial-gradient(circle at 30% 30%, #ff4b2b, #ff416c); /* Premium Red */
  transition: background 0.3s ease, box-shadow 0.3s ease;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 43, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 75, 43, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 43, 0); }
}

#ai-status-indicator.thinking {
  background: radial-gradient(circle at 30% 30%, #3b82f6, #1d4ed8); /* Blue */
  box-shadow: 0 0 10px #3b82f6;
  animation: none;
}

#ai-status-indicator.acting {
  background: radial-gradient(circle at 30% 30%, #10b981, #059669); /* Green */
  box-shadow: 0 0 10px #10b981;
  animation: none;
}

#ai-status-indicator.reading {
  background: radial-gradient(circle at 30% 30%, #f59e0b, #d97706); /* Orange/Yellow */
  box-shadow: 0 0 10px #f59e0b;
  animation: none;
}

#ghost-cursor-text-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

#ai-status-text {
  color: white;
  font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: rgba(15, 15, 15, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

#ai-intention-text {
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
  font-size: 8px;
  font-weight: 500;
  padding: 0 4px;
}
`;

const GHOST_CURSOR_JS = `(() => {
  if (document.getElementById('ghost-cursor-container')) {
    return;
  }

  const container = document.createElement('div');
  container.id = 'ghost-cursor-container';
  container.setAttribute('aria-hidden', 'true');
  container.setAttribute('role', 'none');
  
  const cursor = document.createElement('div');
  cursor.id = 'ghost-cursor';
  cursor.setAttribute('role', 'none');
  
  const indicator = document.createElement('div');
  indicator.id = 'ai-status-indicator';
  indicator.setAttribute('role', 'none');
  
  const statusText = document.createElement('div');
  statusText.id = 'ai-status-text';
  statusText.textContent = 'READY';
  statusText.setAttribute('role', 'none');

  container.appendChild(cursor);
  container.appendChild(indicator);
  container.appendChild(statusText);
  document.body.appendChild(container);

  window.__moveCursor = (x, y) => {
    container.style.transform = \`translate(\${x}px, \${y}px)\`;
  };

  window.__updateAiStatus = (status, label) => {
    indicator.className = status;
    if (label) {
        statusText.textContent = label.toUpperCase();
    }
  };

  window.__clickAtCursor = () => {
    const { x, y } = container.getBoundingClientRect();
    const element = document.elementFromPoint(x + 12, y + 12);
    if (element) {
      element.click();
    }
  };

  window.__dragCursor = (endX, endY) => {
    const { x: startX, y: startY } = container.getBoundingClientRect();
    const startElement = document.elementFromPoint(startX + 12, startY + 12);

    if (startElement) {
      const options = {
        bubbles: true,
        cancelable: true,
        clientX: startX + 12,
        clientY: startY + 12,
      };
      startElement.dispatchEvent(new MouseEvent('mousedown', options));
    }

    window.__moveCursor(endX, endY);
    
    setTimeout(() => {
        const endElement = document.elementFromPoint(endX + 12, endY + 12);
        if (endElement) {
            const options = {
                bubbles: true,
                cancelable: true,
                clientX: endX + 12,
                clientY: endY + 12,
            };
            endElement.dispatchEvent(new MouseEvent('mouseup', options));
        }
    }, 150);
  };
})();`;

export class BrowserService extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private vlaPage: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private diffEngine: VisualDiffEngine;
  private visualLatentService: VisualLatentService;
  private vlaCompressor: VLACompressor;
  private vlaStreamInterval: NodeJS.Timeout | null = null;
  private headlessMirrorInterval: NodeJS.Timeout | null = null;
  private static instance: BrowserService;
  private config: Config;
  private headed = false;

  private constructor(config: Config) {
    super();
    this.config = config;
    this.diffEngine = new VisualDiffEngine();
    this.visualLatentService = VisualLatentService.getInstance();
    this.vlaCompressor = VLACompressor.getInstance();
  }

  static getInstance(config: Config): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService(config);
    }
    return BrowserService.instance;
  }

  async startBrowser(options?: { headed?: boolean; proxy?: string }) {
    if (this.browser) {
      // If we want to "promote" to headed but it's headless, we must restart
      const currentHeaded = this.headed;
      const requestedHeaded = options?.headed ?? this.config.getBrowserHeaded();

      if (!currentHeaded && requestedHeaded) {
        await this.closeBrowser();
      } else {
        // Still emit to refresh state for listeners (e.g. UI re-mounting)
        this.emit('browser-started', {
          url: this.page?.url(),
          pid: this.getBrowserPID(),
          headed: this.isHeaded(),
        });
        return;
      }
    }

    const configHeaded = this.config.getBrowserHeaded();
    const requestedHeaded = options?.headed ?? configHeaded;
    // Terminal-only mode avoids opening a separate GUI browser window unless
    // explicitly requested by the caller (e.g. browser_start headed:true).
    const terminalOnlyMode =
      process.env['PHILL_BROWSER_TERMINAL_ONLY'] !== 'false';
    const headed = terminalOnlyMode
      ? options?.headed === true
      : requestedHeaded;

    this.headed = headed;
    const proxyUrl = options?.proxy ?? this.config.getProxy();

    // Check if chromium is available
    if (!isBrowserInstalled()) {
      throw new Error("Playwright browsers are not installed. Please run '/browser setup' to install them.");
    }

    try {
      this.browser = await chromium.launch({
        headless: !headed,
        proxy: proxyUrl ? { server: proxyUrl } : undefined,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--allow-file-access-from-files',
          '--enable-usermedia-screen-capturing',
          '--auto-select-desktop-capture-source=Entire screen',
          '--display-capture-permissions-policy-allowed',
        ],
      });

      // Verification: Ensure the browser is actually headed if we requested it.
      if (headed) {
        if (
          process.platform !== 'win32' &&
          !process.env['DISPLAY'] &&
          !process.env['WAYLAND_DISPLAY']
        ) {
          const error = new Error(
            'Headed mode requested but no display (DISPLAY/WAYLAND_DISPLAY) found. Enforcing failure to prevent silent headless fallback.',
          );
          debugLogger.error(error.message);
          await this.browser.close().catch(() => {});
          this.browser = null;
          throw error;
        }
      }
      const viewport = this.config.getBrowserViewport();

      const tempDir = this.config.storage.getProjectTempDir();
      const videoDir = path.join(tempDir, 'browser_videos');
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }

      const safeViewport = viewport || { width: 1280, height: 720 };
      this.context = await this.browser.newContext({
        viewport: safeViewport,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36',
        recordVideo: {
          dir: videoDir,
          size: safeViewport,
        },
        proxy: proxyUrl ? { server: proxyUrl } : undefined,
      });

      // Create VLA bridge first so it's not the active tab in headed mode
      this.vlaPage = await this.context.newPage();
      const bridgePath = path.join(tempDir, 'vla-bridge.html');
      if (!fs.existsSync(bridgePath)) {
        fs.writeFileSync(
          bridgePath,
          '<html><head><title>Phill VLA Bridge</title><style>body { font-family: sans-serif; background: #121212; color: #eee; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; } .status { padding: 20px; border: 1px solid #333; border-radius: 8px; background: #1a1a1a; }</style></head><body><div class="status">VLA Bridge Active</div></body></html>',
        );
      }
      const bridgeUrl = pathToFileURL(bridgePath).href;
      await this.vlaPage.goto(bridgeUrl);

      // Create main page second so it takes focus
      this.page = await this.context.newPage();

      if (headed) {
        await this.page.bringToFront();
        // Start screencast for the terminal mirror in visible mode.
        void this.startScreencast().catch(() => {});
      } else {
        // In terminal-only mode, stream periodic screenshots as visual deltas.
        this.startHeadlessMirrorStream();
      }

      this.emit('browser-started', {
        url: this.page.url(),
        pid: this.getBrowserPID(),
        headed: this.headed,
      });

      await this.injectGhostCursor(this.page);

      this.page.on('load', async (page) => {
        try {
          if (!page.isClosed()) {
            await this.injectGhostCursor(page);
            this.emit('navigation', page.url());
          }
        } catch (_e) {
          // Ignore errors during page closure/navigation transitions
        }
      });
    } catch (_error) {
      debugLogger.error('Failed to start browser:', _error);
      throw _error;
    }
  }

  async updateAiStatus(
    status: 'thinking' | 'acting' | 'reading' | 'ready',
    label?: string,
  ) {
    if (!this.page) return;
    this.emit('status-update', { status, label });
    await this.page.evaluate(
      ({ status, label }) => {
        // @ts-expect-error - window.__updateAiStatus is injected at runtime
        window.__updateAiStatus(status, label);
      },
      { status, label },
    );
  }

  async startScreencast() {
    if (!this.page) await this.startBrowser();
    if (this.cdpSession) return;

    this.cdpSession = await this.context!.newCDPSession(this.page!);

    this.cdpSession.on('Page.screencastFrame', async (event) => {
      try {
        const frameBuffer = Buffer.from(event.data, 'base64');
        const { significant, type } =
          this.diffEngine.isSignificantChange(frameBuffer);

        if (significant) {
          // Project Neural-Link Phase 3: Update Visual Latent
          const latent = await this.visualLatentService.encode(frameBuffer);
          const latentContextService = (
            await import('./latentContextService.js')
          ).LatentContextService.getInstance();
          latentContextService.setVisualLatent(latent);

          this.emit('visual-delta', {
            buffer: frameBuffer,
            timestamp: event.metadata.timestamp,
            type,
          });
        }

        await this.cdpSession
          ?.send('Page.screencastFrameAck', { sessionId: event.sessionId })
          .catch(() => {});
      } catch (_e) {
        debugLogger.error('Error handling screencast frame:', _e);
      }
    });

    await this.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 90,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 3, // Increased frame rate for "smoother" experience (approx 20fps at 60fps source)
    });
  }

  async stopScreencast() {
    if (this.cdpSession) {
      await this.cdpSession.send('Page.stopScreencast');
      this.cdpSession = null;
    }
  }

  private startHeadlessMirrorStream() {
    if (this.headlessMirrorInterval) return;
    this.headlessMirrorInterval = setInterval(() => {
      void (async () => {
        if (!this.page || this.page.isClosed()) return;
        try {
          const frameBuffer = await this.page.screenshot({
            type: 'jpeg',
            quality: 72,
            fullPage: false,
          });
          this.emit('visual-delta', {
            buffer: frameBuffer,
            timestamp: Date.now() / 1000,
            type: 'headless-frame',
          });
        } catch (_e) {
          // Ignore transient screenshot errors during navigation/page lifecycle.
        }
      })();
    }, 1200);
  }

  private stopHeadlessMirrorStream() {
    if (this.headlessMirrorInterval) {
      clearInterval(this.headlessMirrorInterval);
      this.headlessMirrorInterval = null;
    }
  }

  /**
   * Project Neural-Link: Live VLA Stream
   * Projects the agent's "eyes" (AXTree) directly into the Plaza via compressed latent vectors.
   * This uses ZERO model tokens.
   */
  async startVLAStream() {
    if (this.vlaStreamInterval) return;
    if (!this.page) await this.startBrowser();

    // Broadcast immediately
    await this.broadcastVLA();

    // Then periodically using a resilient interval pattern
    const stream = async () => {
      if (!this.vlaStreamInterval) return;
      try {
        await this.broadcastVLA();
      } catch (_) {
        /* Ignored */
      }
      this.vlaStreamInterval = setTimeout(stream, 500);
    };
    this.vlaStreamInterval = setTimeout(stream, 500);
  }

  async stopVLAStream() {
    if (this.vlaStreamInterval) {
      clearTimeout(this.vlaStreamInterval);
      this.vlaStreamInterval = null;
    }
  }

  private async broadcastVLA() {
    try {
      const axTree = await this.getAccessibilityTree();
      const latent = await this.vlaCompressor.encode(axTree);

      if (latent) {
        this.emit('vla-update', latent);
      }
    } catch (_error) {
      // Silent fail to keep stream resilient
    }
  }

  async setROI(x: number, y: number, width: number, height: number) {
    this.diffEngine.setROI({ x, y, width, height });
    await this.updateAiStatus('reading', `focusing on ${width}x${height}`);
  }

  private async injectGhostCursor(page: Page) {
    await page.addStyleTag({ content: GHOST_CURSOR_CSS });
    await page.addScriptTag({ content: GHOST_CURSOR_JS });
  }

  async cursorMove(x: number, y: number) {
    if (!this.page) await this.startBrowser();
    await this.page?.evaluate(
      ({ x, y }) => {
        // @ts-expect-error - window.__moveCursor is injected at runtime
        window.__moveCursor(x, y);
      },
      { x, y },
    );
  }

  async cursorClick() {
    if (!this.page) await this.startBrowser();
    await this.page?.evaluate(() => {
      // @ts-expect-error - window.__clickAtCursor is injected at runtime
      window.__clickAtCursor();
    });
  }

  async cursorMoveAndClick(x: number, y: number) {
    if (!this.page) await this.startBrowser();
    await this.cursorMove(x, y);
    await this.cursorClick();
  }

  async cursorDrag(endX: number, endY: number) {
    if (!this.page) await this.startBrowser();
    await this.page?.evaluate(
      ({ endX, endY }) => {
        // @ts-expect-error - window.__dragCursor is injected at runtime
        window.__dragCursor(endX, endY);
      },
      { endX, endY },
    );
  }

  async closeBrowser() {
    if (!this.browser) return;

    try {
      // 1. Stop all background streams and intervals
      void this.stopVLAStream().catch(() => {});
      void this.stopScreencast().catch(() => {});
      this.stopHeadlessMirrorStream();
      void this.stopAudioCapture().catch(() => {});

      if (this.cdpSession) {
        await this.cdpSession.detach().catch(() => {});
        this.cdpSession = null;
      }
      if (this.vlaPage) {
        await this.vlaPage.close().catch(() => {});
        this.vlaPage = null;
      }
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }

      // 2. Close the browser with a timeout to avoid hangs
      const closePromise = this.browser.close();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Browser close timeout')), 5000),
      );

      await Promise.race([closePromise, timeoutPromise]).catch(async (err) => {
        debugLogger.error(
          'Browser close failed or timed out, attempting to kill process:',
          err,
        );
        const pid = this.getBrowserPID();
        if (pid) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch (_e) {
            /* Error killing process */
          }
        }
      });

      // 3. Cleanup temporary files with resilient retry (Handles Windows EBUSY)
      const tempDir = this.config.storage.getProjectTempDir();
      const videoDir = path.join(tempDir, 'browser_videos');
      const bridgePath = path.join(tempDir, 'vla-bridge.html');

      const cleanupAction = async () => {
        try {
          if (fs.existsSync(videoDir)) {
            // A small delay to let OS release locks after browser.close()
            await new Promise((r) => setTimeout(r, 800));
            fs.rmSync(videoDir, {
              recursive: true,
              force: true,
              maxRetries: 10,
              retryDelay: 500,
            });
          }
          if (fs.existsSync(bridgePath)) {
            fs.unlinkSync(bridgePath);
          }
        } catch (e) {
          debugLogger.warn('Resilient cleanup encountered an issue:', e);
        }
      };

      // We don't necessarily need to block the main exit for the very last cleanup attempt,
      // but waiting here ensures we don't spam the console with EBUSY errors.
      await cleanupAction().catch(() => {});
    } catch (_error) {
      debugLogger.error('Error closing browser:', _error);
    } finally {
      this.browser = null;
      this.page = null;
      this.vlaPage = null;
      this.context = null;
      this.cdpSession = null;
      this.headed = false;
      this.emit('browser-stopped');
    }
  }

  isHeaded(): boolean {
    return this.headed && !!this.browser;
  }

  getPage(): Page | null {
    return this.page;
  }

  isBrowserOpen(): boolean {
    return !!this.browser;
  }

  getCurrentUrl(): string | null {
    return this.page?.url() ?? null;
  }

  getBrowserPID(): number | null {
    if (!this.browser) return null;
    try {
      // Playwright Browser might have process() as a function or property depending on version/environment
      // In latest Playwright, process() is the stable way to get the child process.
      // We check for its existence safely without broad 'any' casts to satisfy lint.
      const playwrightBrowser = this.browser as unknown as {
        process?: () => { pid: number } | { pid: number };
      };
      const proc =
        typeof playwrightBrowser.process === 'function'
          ? playwrightBrowser.process()
          : playwrightBrowser.process;
      return proc?.pid ?? null;
    } catch (e) {
      debugLogger.debug('Failed to get browser PID:', e);
      return null;
    }
  }

  getActivePage(): Page | null {
    return this.page;
  }

  async navigate(url: string) {
    if (!this.page) await this.startBrowser();
    await this.page?.goto(url);
    this.emit('navigation', url);
  }

  async getScreenshot(): Promise<Buffer | null> {
    if (!this.page) return null;
    return this.page.screenshot();
  }

  /**
   * World-Class VLA Feature: Capture the entire OS desktop via the Browser bridge.
   * This bypasses fragile shell-based screenshot tools.
   */
  async captureDesktopScreenshot(): Promise<Buffer | null> {
    if (!this.vlaPage) await this.startBrowser();
    const pageToUse = this.vlaPage || this.page;
    if (!pageToUse) return null;

    try {
      const dataUrl = await pageToUse.evaluate(async () => {
        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getDisplayMedia
        ) {
          throw new Error(
            'navigator.mediaDevices.getDisplayMedia is not available. Ensure page is in a secure context.',
          );
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' } as MediaTrackConstraints,
          audio: false,
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        const result = canvas.toDataURL('image/png');

        // Cleanup
        stream.getTracks().forEach((t) => t.stop());
        return result;
      });

      return Buffer.from(dataUrl.split(',')[1], 'base64');
    } catch (_error) {
      debugLogger.error('VLA Desktop Capture failed:', _error);
      return null; // Return null to trigger fallback in ScreenshotService
    }
  }

  /**
   * Multimodal VLA Feature: Native speech synthesis via the Browser bridge.
   * This uses the core TTSService chain (Gemini -> OpenAI -> ElevenLabs -> Pocket -> Browser).
   */
  async speakText(text: string): Promise<void> {
    try {
      const { TTSService } = await import('../voice/ttsService.js');
      await TTSService.getInstance(this.config).speak(text);
    } catch (_error) {
      debugLogger.warn(
        'VLA Bridge: Standard TTS chain failed, falling back to basic browser synthesis.',
        _error,
      );
      if (!this.page) await this.startBrowser();
      if (!this.page) return;

      void this.page
        .evaluate((msg) => {
          const utterance = new SpeechSynthesisUtterance(msg);
          window.speechSynthesis.speak(utterance);
        }, text)
        .catch(() => {});
    }
  }

  async click(selector: string) {
    if (!this.page) await this.startBrowser();
    await this.page?.click(selector);
  }

  async type(selector: string, text: string) {
    if (!this.page) await this.startBrowser();
    await this.page?.fill(selector, text);
  }

  async scroll(
    selector: string | undefined,
    direction: 'up' | 'down' | 'top' | 'bottom',
    amount?: number,
  ) {
    if (!this.page) await this.startBrowser();

    if (direction === 'top') {
      await this.page?.evaluate(() => window.scrollTo(0, 0));
    } else if (direction === 'bottom') {
      await this.page?.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight),
      );
    } else {
      const scrollAmount = amount ?? 500;
      const delta = direction === 'up' ? -scrollAmount : scrollAmount;

      if (selector) {
        await this.page?.evaluate(
          ({ selector, delta }) => {
            const element = document.querySelector(selector);
            if (element) {
              element.scrollBy(0, delta);
            }
          },
          { selector, delta },
        );
      } else {
        await this.page?.mouse.wheel(0, delta);
      }
    }
  }

  async getContent(format: 'text' | 'markdown' | 'html'): Promise<string> {
    if (!this.page) await this.startBrowser();

    if (format === 'html') {
      return this.page?.content() ?? '';
    }

    if (format === 'text') {
      return this.page?.evaluate(() => document.body.innerText) ?? '';
    }

    if (format === 'markdown') {
      return (
        (await this.page?.evaluate(() => {
          const text = document.body.innerText;
          return text;
        })) ?? ''
      );
    }

    return '';
  }

  async getAccessibilityTree(): Promise<unknown> {
    if (!this.page) await this.startBrowser();

    try {
      const playwrightPage = this.page as unknown as {
        accessibility?: { snapshot: () => Promise<unknown> };
      };
      const acc = playwrightPage.accessibility;
      if (acc) {
        return await acc.snapshot();
      }
    } catch (_e) {
      debugLogger.warn(
        'Failed to get accessibility snapshot via standard API, trying CDP fallback:',
        _e,
      );
    }

    try {
      const session = await this.context?.newCDPSession(this.page!);
      if (session) {
        const { nodes } = await session.send('Accessibility.getFullAXTree');
        return nodes;
      }
    } catch (_e) {
      debugLogger.error('Failed to get accessibility tree via CDP:', _e);
    }

    return null;
  }

  async evaluate(script: string): Promise<unknown> {
    if (!this.page) await this.startBrowser();
    return this.page?.evaluate(script);
  }

  async getScreenshotDescription(prompt?: string): Promise<string> {
    const screenshot = await this.getScreenshot();
    if (!screenshot) return 'No screenshot available.';
    const visionService = this.config.getVisionService();
    if (!visionService) {
      return 'Vision service is not available (configuration missing or not enabled).';
    }
    return visionService.describeImage(screenshot, prompt);
  }

  // --- Audio Capture ---

  async startAudioCapture() {
    if (!this.vlaPage) await this.startBrowser();
    const pageToUse = this.vlaPage || this.page;
    if (!pageToUse) return;

    await pageToUse.exposeFunction(
      'streamAudio',
      (base64Data: string, timestamp: number) => {
        const buffer = Buffer.from(base64Data, 'base64');
        this.emit('audio-chunk', { buffer, timestamp });
      },
    );

    await pageToUse.evaluate(() => {
      // @ts-expect-error - window.audioRecorder is used for state tracking
      if (window.audioRecorder) return;

      navigator.mediaDevices
        .getDisplayMedia({
          video: true,
          audio: true,
        })
        .then((stream) => {
          const audioTrack = stream.getAudioTracks()[0];
          if (!audioTrack) {
            // eslint-disable-next-line no-console
            console.error('No audio track found in display media');
            return;
          }

          const audioStream = new MediaStream([audioTrack]);
          const mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm;codecs=opus',
          });

          // @ts-expect-error - window.audioRecorder is used for state tracking
          window.audioRecorder = mediaRecorder;

          mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                // @ts-expect-error - window.streamAudio is injected via exposeFunction
                window.streamAudio(base64, Date.now());
              };
              reader.readAsDataURL(event.data);
            }
          };

          mediaRecorder.start(100);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Error starting audio capture:', err);
        });
    });
  }

  async stopAudioCapture() {
    const pageToUse = this.vlaPage || this.page;
    if (!pageToUse) return;

    await pageToUse.evaluate(() => {
      // @ts-expect-error - window.audioRecorder is used for state tracking
      const recorder = window.audioRecorder as MediaRecorder;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
        recorder.stream.getTracks().forEach((t) => t.stop());
      }
      // @ts-expect-error - window.audioRecorder is used for state tracking
      window.audioRecorder = null;
    });
  }
}
