/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { Config } from '../config/config.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { VisualDiffEngine } from '../vision/visualDiffEngine.js';
import { VisualLatentService } from './visualLatentService.js';
import { VLACompressor } from './vlaCompressor.js';
import type { CDPSession } from 'playwright';

const GHOST_CURSOR_CSS = `
#ghost-cursor-container {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2147483647;
  pointer-events: none;
  transition: transform 0.15s cubic-bezier(0.23, 1, 0.32, 1);
  display: flex;
  align-items: center;
  gap: 8px;
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
  background-color: #888; /* Default Gray */
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

#ai-status-indicator.thinking {
  background-color: #3b82f6; /* Blue */
  box-shadow: 0 0 10px #3b82f6;
}

#ai-status-indicator.acting {
  background-color: #10b981; /* Green */
  box-shadow: 0 0 10px #10b981;
}

#ai-status-indicator.reading {
  background-color: #f59e0b; /* Orange/Yellow */
  box-shadow: 0 0 10px #f59e0b;
}

#ai-status-text {
  color: white;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 10px;
  font-weight: bold;
  text-shadow: 1px 1px 2px black;
  background: rgba(0,0,0,0.4);
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0.8;
}
`;

const GHOST_CURSOR_JS = `(() => {
  if (document.getElementById('ghost-cursor-container')) {
    return;
  }

  const container = document.createElement('div');
  container.id = 'ghost-cursor-container';
  
  const cursor = document.createElement('div');
  cursor.id = 'ghost-cursor';
  
  const indicator = document.createElement('div');
  indicator.id = 'ai-status-indicator';
  
  const statusText = document.createElement('div');
  statusText.id = 'ai-status-text';
  statusText.textContent = 'READY';

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
  private cdpSession: CDPSession | null = null;
  private diffEngine: VisualDiffEngine;
  private visualLatentService: VisualLatentService;
  private vlaCompressor: VLACompressor;
  private vlaStreamInterval: NodeJS.Timeout | null = null;
  private static instance: BrowserService;
  private config: Config;

  private constructor(config: Config) {
    super();
    this.config = config;
    this.diffEngine = new VisualDiffEngine();
    this.visualLatentService = VisualLatentService.getInstance();
    this.vlaCompressor = VLACompressor.getInstance();
  }

  public static getInstance(config: Config): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService(config);
    }
    return BrowserService.instance;
  }

  async startBrowser() {
    if (this.browser) return;
    
    const headed = this.config.getBrowserHeaded();
    
    try {
      this.browser = await chromium.launch({
        headless: !headed,
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-file-access-from-files',
            '--enable-usermedia-screen-capturing',
            '--auto-select-desktop-capture-source=Entire screen',
            '--display-capture-permissions-policy-allowed',
        ]
      });
      const viewport = this.config.getBrowserViewport();
      
      const tempDir = this.config.storage.getProjectTempDir();
      const videoDir = path.join(tempDir, 'browser_videos');
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }

      this.context = await this.browser.newContext({
        viewport,
        recordVideo: {
          dir: videoDir,
          size: viewport
        }
      });
      
      this.page = await this.context.newPage();
      
      this.emit('browser-started');

      await this.injectGhostCursor(this.page);
      
      this.page.on('load', async (page) => {
         try {
           if (!page.isClosed()) {
             await this.injectGhostCursor(page);
             this.emit('navigation', page.url());
           }
         } catch (e) {
           // Ignore errors during page closure/navigation transitions
         }
      });

    } catch (error) {
      console.error('Failed to start browser:', error);
      throw error;
    }
  }

  async updateAiStatus(status: 'thinking' | 'acting' | 'reading' | 'ready', label?: string) {
    if (!this.page) return;
    await this.page.evaluate(({ status, label }) => {
      // @ts-ignore
      window.__updateAiStatus(status, label);
    }, { status, label });
  }

  async startScreencast() {
    if (!this.page) await this.startBrowser();
    if (this.cdpSession) return;

    this.cdpSession = await this.context!.newCDPSession(this.page!);
    
    this.cdpSession.on('Page.screencastFrame', async (event) => {
      const frameBuffer = Buffer.from(event.data, 'base64');
      const { significant, type } = this.diffEngine.isSignificantChange(frameBuffer);
      
      if (significant) {
        // Project Neural-Link Phase 3: Update Visual Latent
        const latent = await this.visualLatentService.encode(frameBuffer);
        
        // Push to LatentContextService (the new Bridge)
        // We get the instance dynamically to avoid circular dependency issues at import time if any
        // though import is already at top.
        const latentContextService = (await import('./latentContextService.js')).LatentContextService.getInstance();
        latentContextService.setVisualLatent(latent);

        this.emit('visual-delta', { 
            buffer: frameBuffer, 
            timestamp: event.metadata.timestamp,
            type 
        });
      }

      await this.cdpSession?.send('Page.screencastFrameAck', { sessionId: event.sessionId });
    });

    await this.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 5 // Capture every 5th frame to save CPU/bandwidth
    });
  }

  async stopScreencast() {
    if (this.cdpSession) {
      await this.cdpSession.send('Page.stopScreencast');
      this.cdpSession = null;
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

    // Then periodically (e.g., every 500ms - high frequency but low bandwidth due to VAE compression)
    this.vlaStreamInterval = setInterval(async () => {
       await this.broadcastVLA();
    }, 500);
  }

  async stopVLAStream() {
    if (this.vlaStreamInterval) {
        clearInterval(this.vlaStreamInterval);
        this.vlaStreamInterval = null;
    }
  }

  private async broadcastVLA() {
      try {
          const axTree = await this.getAccessibilityTree();
          // Optional: Add a cheap visual hash if we have a screenshot buffered, but keeping it pure AX for speed per request
          const latent = await this.vlaCompressor.encode(axTree);
          
          if (latent) {
              this.emit('vla-update', latent);
          }
      } catch (error) {
          // Silent fail to keep stream resilient
      }
  }

  async setROI(x: number, y: number, width: number, height: number) {
    this.diffEngine.setROI({ x, y, width, height });
    this.updateAiStatus('reading', `focusing on ${width}x${height}`);
  }
  
  private async injectGhostCursor(page: Page) {
    await page.addStyleTag({ content: GHOST_CURSOR_CSS });
    await page.addScriptTag({ content: GHOST_CURSOR_JS });
  }

  async cursorMove(x: number, y: number) {
    if (!this.page) await this.startBrowser();
    await this.page?.evaluate(({ x, y }) => {
      // @ts-ignore
      window.__moveCursor(x, y);
    }, { x, y });
  }

  async cursorClick() {
    if (!this.page) await this.startBrowser();
    await this.page?.evaluate(() => {
      // @ts-ignore
      window.__clickAtCursor();
    });
  }

  async cursorDrag(endX: number, endY: number) {
    if (!this.page) await this.startBrowser();
    await this.page?.evaluate(({ endX, endY }) => {
      // @ts-ignore
      window.__dragCursor(endX, endY);
    }, { endX, endY });
  }
  
  async closeBrowser() {
    if (!this.browser) return;
    
    try {
      if (this.cdpSession) {
        await this.cdpSession.detach().catch(() => {});
        this.cdpSession = null;
      }
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
      await this.browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    } finally {
      this.browser = null;
      this.page = null;
      this.context = null;
      this.cdpSession = null;
      this.emit('browser-closed');
    }
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

  async navigate(url: string) {
    if (!this.page) await this.startBrowser();
    await this.page?.goto(url);
    this.emit('navigation', url);
  }

  async getScreenshot(): Promise<Buffer | null> {
    if (!this.page) return null;
    return await this.page.screenshot();
  }

  /**
   * World-Class VLA Feature: Capture the entire OS desktop via the Browser bridge.
   * This bypasses fragile shell-based screenshot tools.
   */
  async captureDesktopScreenshot(): Promise<Buffer | null> {
    if (!this.page) await this.startBrowser();
    if (!this.page) return null;

    try {
      const dataUrl = await this.page.evaluate(async () => {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'monitor' } as any,
            audio: false
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
        stream.getTracks().forEach(t => t.stop());
        return result;
      });

      return Buffer.from(dataUrl.split(',')[1], 'base64');
    } catch (error) {
       console.error('VLA Desktop Capture failed:', error);
       return null;
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
    } catch (error) {
      console.warn('VLA Bridge: Standard TTS chain failed, falling back to basic browser synthesis.', error);
      if (!this.page) await this.startBrowser();
      if (!this.page) return;

      await this.page.evaluate((msg) => {
          const utterance = new SpeechSynthesisUtterance(msg);
          window.speechSynthesis.speak(utterance);
      }, text);
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

  async scroll(selector: string | undefined, direction: 'up' | 'down' | 'top' | 'bottom', amount?: number) {
    if (!this.page) await this.startBrowser();
    
    if (direction === 'top') {
      await this.page?.evaluate(() => window.scrollTo(0, 0));
    } else if (direction === 'bottom') {
      await this.page?.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else {
      const scrollAmount = amount ?? 500;
      const delta = direction === 'up' ? -scrollAmount : scrollAmount;
      
      if (selector) {
        await this.page?.evaluate(({ selector, delta }) => {
          const element = document.querySelector(selector);
          if (element) {
            element.scrollBy(0, delta);
          }
        }, { selector, delta });
      } else {
        await this.page?.mouse.wheel(0, delta);
      }
    }
  }

  async getContent(format: 'text' | 'markdown' | 'html'): Promise<string> {
    if (!this.page) await this.startBrowser();
    
    if (format === 'html') {
      return await this.page?.content() ?? '';
    }
    
    // Simple text extraction for now
    if (format === 'text') {
       return await this.page?.evaluate(() => document.body.innerText) ?? '';
    }

    // Basic markdown conversion (using Tursodatabase/turndown logic simplified or similar if library not present)
    // For now, let's just return text with a note, or maybe use a simple heuristic
    if (format === 'markdown') {
        // Fallback to text if no library available, or use a basic script
        return await this.page?.evaluate(() => {
            // Very basic HTML to Markdown
            let text = document.body.innerText;
            return text; 
        }) ?? '';
    }

    return '';
  }

  async getAccessibilityTree(): Promise<any> {
    if (!this.page) await this.startBrowser();
    
    // Try standard Playwright accessibility snapshot first
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc = (this.page as any)?.accessibility;
      if (acc) {
        return await acc.snapshot();
      }
    } catch (e) {
      console.warn('Failed to get accessibility snapshot via standard API, trying CDP fallback:', e);
    }

    // Fallback to CDP
    try {
      const session = await this.context?.newCDPSession(this.page!);
      if (session) {
         const { nodes } = await session.send('Accessibility.getFullAXTree');
         return nodes;
      }
    } catch (e) {
      console.error('Failed to get accessibility tree via CDP:', e);
    }
    
    return null;
  }

  async evaluate(script: string): Promise<any> {
    if (!this.page) await this.startBrowser();
    return await this.page?.evaluate(script);
  }

  async getScreenshotDescription(prompt?: string): Promise<string> {
    const screenshot = await this.getScreenshot();
    if (!screenshot) return 'No screenshot available.';
    const visionService = this.config.getVisionService();
    if (!visionService) {
      return 'Vision service is not available (configuration missing or not enabled).';
    }
    return await visionService.describeImage(screenshot, prompt);
  }

  // --- Audio Capture ---

  async startAudioCapture() {
    if (!this.page) await this.startBrowser();
    if (!this.page) return;

    // Expose function to receive audio chunks from browser
    await this.page.exposeFunction('streamAudio', (base64Data: string, timestamp: number) => {
       const buffer = Buffer.from(base64Data, 'base64');
       this.emit('audio-chunk', { buffer, timestamp });
    });

    // Inject script to capture audio
    await this.page.evaluate(() => {
        // @ts-ignore
        if (window.audioRecorder) return;

        navigator.mediaDevices.getDisplayMedia({
            video: true, // Required for getDisplayMedia, but we'll ignore video track
            audio: true
        }).then(stream => {
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                console.error('No audio track found in display media');
                return;
            }

            // Create a MediaStream with just the audio
            const audioStream = new MediaStream([audioTrack]);
            const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
            
            // @ts-ignore
            window.audioRecorder = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        // @ts-ignore
                        window.streamAudio(base64, Date.now());
                    };
                    reader.readAsDataURL(event.data);
                }
            };

            mediaRecorder.start(100); // 100ms chunks
        }).catch(err => {
            console.error('Error starting audio capture:', err);
        });
    });
  }

  async stopAudioCapture() {
      if (!this.page) return;
      
      await this.page.evaluate(() => {
          // @ts-ignore
          const recorder = window.audioRecorder as MediaRecorder;
          if (recorder && recorder.state !== 'inactive') {
              recorder.stop();
              recorder.stream.getTracks().forEach(t => t.stop());
          }
          // @ts-ignore
          window.audioRecorder = null;
      });
  }
}
