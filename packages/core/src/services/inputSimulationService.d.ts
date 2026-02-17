/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
export declare class InputSimulationService {
    private config;
    private static instance;
    private constructor();
    static getInstance(config: Config): InputSimulationService;
    private logAction;
    private runPowerShell;
    moveCursor(x: number, y: number): Promise<void>;
    click(x?: number, y?: number): Promise<void>;
    type(text: string): Promise<void>;
    drag(endX: number, endY: number): Promise<void>;
    /**
     * Focuses a window matching the title pattern.
     */
    focusWindow(titlePattern: string): Promise<void>;
    /**
     * Sets the window state (minimize, maximize, restore).
     */
    setWindowState(titlePattern: string, state: 'minimize' | 'maximize' | 'restore'): Promise<void>;
    /**
     * Closes a window matching the title pattern.
     */
    closeWindow(titlePattern: string): Promise<void>;
    /**
     * Launches an application.
     */
    launchApp(appNameOrPath: string): Promise<void>;
}
