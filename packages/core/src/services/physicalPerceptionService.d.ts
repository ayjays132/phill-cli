/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
export interface PhysicalVisionData {
    visionAvailable: boolean;
    sceneDescription: string;
    cameraStatus: 'connected' | 'disconnected' | 'error';
    cameraId?: string;
    peopleCount?: number;
    objectCount?: number;
    sceneAge?: number;
    lastChange?: number;
    motionIntensity?: number;
}
/**
 * PhysicalPerceptionService provides real-time awareness of the physical environment.
 * It integrates local camera capture with lightweight motion detection and LLM-backed scene analysis.
 */
export declare class PhysicalPerceptionService {
    private static instance;
    private config;
    private lastFrame;
    private currentData;
    private isMonitoring;
    private monitorInterval;
    private lastUpdateTimestamp;
    private lastSignificantMotionTimestamp;
    private constructor();
    static getInstance(config: Config): PhysicalPerceptionService;
    startMonitoring(intervalMs?: number): Promise<void>;
    stopMonitoring(): void;
    getSnapshot(): Promise<PhysicalVisionData>;
    /**
     * Captures a frame and updates the internal state.
     */
    updateSceneInfo(): Promise<void>;
    /**
     * Uses ffmpeg (static) to capture a single frame from the default webcam.
     */
    private captureFrame;
    /**
     * Extremely simple pixel-change motion detection.
     * Compares buffers and returns percentage change.
     */
    private detectMotion;
}
