/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PhysicalVisionData } from './physicalPerceptionService.js';
import { Config } from '../config/config.js';
export interface SystemVitals {
    cpuUsage: number;
    memoryUsage: number;
    totalMemory: number;
    freeMemory: number;
    uptime: number;
    loadAverage: number[];
    platform: string;
    arch: string;
    pulse: number;
    physicalVision?: PhysicalVisionData;
}
export declare class ProprioceptionService {
    private static instance;
    private config;
    private lastCpuUsage;
    private constructor();
    static getInstance(config?: Config): ProprioceptionService;
    /**
     * Calculates a "pulse" index based on current load and resource pressure.
     * 0 = Idle, 100 = Maximum Stress.
     */
    private calculatePulse;
    /**
     * Gets current system vitals.
     */
    getVitals(): Promise<SystemVitals>;
    private getCpuUsage;
    /**
     * Formats vitals for LLM consumption.
     */
    formatVitals(vitals: SystemVitals): string;
    private getPulseDescription;
    /**
     * Logs current vitals to the PHILL.md memory file.
     */
    logCurrentVitals(): Promise<void>;
    /**
     * Starts a background heartbeat that logs vitals periodically.
     * Default is every 5 minutes.
     */
    startHeartbeat(intervalMs?: number): NodeJS.Timeout;
}
