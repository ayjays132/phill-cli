/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Page } from 'playwright';
import type { Config } from '../config/config.js';
import { EventEmitter } from 'node:events';
export declare class BrowserService extends EventEmitter {
    private browser;
    private context;
    private page;
    private cdpSession;
    private diffEngine;
    private visualLatentService;
    private vlaCompressor;
    private vlaStreamInterval;
    private static instance;
    private config;
    private constructor();
    static getInstance(config: Config): BrowserService;
    startBrowser(): Promise<void>;
    updateAiStatus(status: 'thinking' | 'acting' | 'reading' | 'ready', label?: string): Promise<void>;
    startScreencast(): Promise<void>;
    stopScreencast(): Promise<void>;
    /**
     * Project Neural-Link: Live VLA Stream
     * Projects the agent's "eyes" (AXTree) directly into the Plaza via compressed latent vectors.
     * This uses ZERO model tokens.
     */
    startVLAStream(): Promise<void>;
    stopVLAStream(): Promise<void>;
    private broadcastVLA;
    setROI(x: number, y: number, width: number, height: number): Promise<void>;
    private injectGhostCursor;
    cursorMove(x: number, y: number): Promise<void>;
    cursorClick(): Promise<void>;
    cursorDrag(endX: number, endY: number): Promise<void>;
    closeBrowser(): Promise<void>;
    getPage(): Page | null;
    isBrowserOpen(): boolean;
    getCurrentUrl(): string | null;
    navigate(url: string): Promise<void>;
    getScreenshot(): Promise<Buffer | null>;
    /**
     * World-Class VLA Feature: Capture the entire OS desktop via the Browser bridge.
     * This bypasses fragile shell-based screenshot tools.
     */
    captureDesktopScreenshot(): Promise<Buffer | null>;
    /**
     * Multimodal VLA Feature: Native speech synthesis via the Browser bridge.
     * This uses the core TTSService chain (Gemini -> OpenAI -> ElevenLabs -> Pocket -> Browser).
     */
    speakText(text: string): Promise<void>;
    click(selector: string): Promise<void>;
    type(selector: string, text: string): Promise<void>;
    scroll(selector: string | undefined, direction: 'up' | 'down' | 'top' | 'bottom', amount?: number): Promise<void>;
    getContent(format: 'text' | 'markdown' | 'html'): Promise<string>;
    getAccessibilityTree(): Promise<any>;
    evaluate(script: string): Promise<any>;
    getScreenshotDescription(prompt?: string): Promise<string>;
    startAudioCapture(): Promise<void>;
    stopAudioCapture(): Promise<void>;
}
