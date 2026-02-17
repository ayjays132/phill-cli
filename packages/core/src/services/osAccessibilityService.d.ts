/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
export interface MonitorInfo {
    name: string;
    isPrimary: boolean;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface WindowInfo {
    title: string;
    processName: string;
    bounds: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
}
export declare class OSAccessibilityService {
    private config;
    private static instance;
    private constructor();
    static getInstance(config: Config): OSAccessibilityService;
    private runPowerShell;
    /**
     * Detects all monitors and their layout coordinates.
     */
    getMonitorLayout(): Promise<MonitorInfo[]>;
    /**
     * Retrieves a native accessibility tree of top-level windows (Windows only).
     */
    getNativeAccessibilityTree(): Promise<any[]>;
    /**
     * Finds a window by title pattern and returns its location.
     */
    findWindow(titlePattern: string): Promise<WindowInfo | null>;
}
