/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
export declare class ScreenshotService {
    private static instance;
    private config;
    private constructor();
    static getInstance(config: Config): ScreenshotService;
    /**
     * Captures a screenshot of the entire desktop.
     * Returns the absolute path to the saved image.
     */
    captureDesktop(): Promise<string>;
    private runPowerShell;
    private captureWindows;
    private captureMacOS;
    private captureLinux;
}
