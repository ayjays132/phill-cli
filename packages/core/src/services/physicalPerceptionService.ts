/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { debugLogger } from '../utils/debugLogger.js';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { VisionService } from './visionService.js';
import { ScreenshotService } from './screenshotService.js';
import { VisualLatentService } from './visualLatentService.js';
import * as fs from 'node:fs/promises';

export interface PhysicalVisionData {
  visionAvailable: boolean;
  sceneDescription: string;
  cameraStatus: 'connected' | 'disconnected' | 'error';
  cameraId?: string;
  peopleCount?: number;
  objectCount?: number;
  sceneAge?: number; // ms since last update
  lastChange?: number; // timestamp of last significant motion
  motionIntensity?: number; // 0-100
}

/**
 * PhysicalPerceptionService provides real-time awareness of the physical environment.
 * It integrates local camera capture with lightweight motion detection and LLM-backed scene analysis.
 */
export class PhysicalPerceptionService {
  private static instance: PhysicalPerceptionService;
  private config: Config;
  private lastFrame: Buffer | null = null;
  private currentData: PhysicalVisionData;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private lastUpdateTimestamp = Date.now();
  private lastSignificantMotionTimestamp = Date.now();

  private constructor(config: Config) {
    this.config = config;
    this.currentData = {
      visionAvailable: false,
      sceneDescription: 'Environment monitoring is offline.',
      cameraStatus: 'disconnected',
    };
  }

  public static getInstance(config: Config): PhysicalPerceptionService {
    if (!PhysicalPerceptionService.instance) {
      PhysicalPerceptionService.instance = new PhysicalPerceptionService(config);
    }
    return PhysicalPerceptionService.instance;
  }

  public async startMonitoring(intervalMs: number = 30000) {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    debugLogger.log(`[PhysicalPerception] Starting physical environment monitoring (${intervalMs}ms interval)`);
    
    // Initial probe
    await this.updateSceneInfo();

    this.monitorInterval = setInterval(async () => {
      await this.updateSceneInfo();
    }, intervalMs);
  }

  public stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  public async getSnapshot(): Promise<PhysicalVisionData> {
    const age = Date.now() - this.lastUpdateTimestamp;
    return {
      ...this.currentData,
      sceneAge: age,
    };
  }

  /**
   * Captures a frame and updates the internal state.
   */
  public async updateSceneInfo(): Promise<void> {
    try {
      let frame = await this.captureFrame();
      let source: 'camera' | 'desktop' = 'camera';

      if (!frame) {
        // Fallback to VLA/Desktop capture if physical camera is offline
        try {
          const screenshotService = ScreenshotService.getInstance(this.config);
          const screenshotPath = await screenshotService.captureDesktop();
          const buffer = await fs.readFile(screenshotPath);
          if (buffer && buffer.length > 0) {
            frame = buffer;
            source = 'desktop';
            // Cleanup temp file
            await fs.unlink(screenshotPath).catch(() => {});
          }
        } catch (vlaErr) {
          debugLogger.warn(`[PhysicalPerception] VLA fallback failed: ${vlaErr}`);
        }
      }

      if (!frame) {
        this.currentData.cameraStatus = 'disconnected';
        this.currentData.visionAvailable = false;
        this.currentData.sceneDescription = 'Environment monitoring is offline (No Camera/VLA detected).';
        return;
      }

      const motion = this.detectMotion(this.lastFrame, frame);
      this.lastFrame = frame;

      if (motion > 15 || source === 'desktop') { // 15% threshold for "significant change", or always for desktop fallback
        this.lastSignificantMotionTimestamp = Date.now();
        this.currentData.lastChange = this.lastSignificantMotionTimestamp;
        this.currentData.motionIntensity = Math.round(motion);
        
        // Update the Visual Latent (VLA System) with the fresh frame
        const visualLatentService = VisualLatentService.getInstance();
        await visualLatentService.encode(frame);

        // If movement is high, use VisionService to freshen the description
        const vision = VisionService.getInstance(this.config);
        const prompt = source === 'camera' 
          ? 'A person is interacting with an AI agent. Describe the physical room, any people visible, and their activities.' 
          : 'Describe the current computer screen, focusing on active windows, content being viewed, and any visible people or avatars.';
        
        const description = await vision.describeImage(frame, prompt);
        
        if (description !== 'GEMINI_NATIVE') {
          this.currentData.sceneDescription = description;
          // Heuristic counts from description if possible
          this.currentData.peopleCount = (description.match(/person|man|woman|child|avatar|face/gi) || []).length;
          this.currentData.objectCount = (description.match(/monitor|laptop|desk|phone|keyboard|window|button|icon/gi) || []).length;
        } else {
            this.currentData.sceneDescription = source === 'camera' 
              ? 'Physical environment captured and ready for multimodal analysis.'
              : 'Desktop environment (VLA) captured and ready for multimodal analysis.';
        }
      }

      this.currentData.cameraStatus = source === 'camera' ? 'connected' : 'disconnected';
      this.currentData.visionAvailable = true;
      this.lastUpdateTimestamp = Date.now();

    } catch (err) {
      debugLogger.warn(`[PhysicalPerception] Update failed: ${err}`);
      this.currentData.cameraStatus = 'error';
    }
  }

  /**
   * Uses ffmpeg (static) to capture a single frame from the default webcam.
   */
  private async captureFrame(): Promise<Buffer | null> {
    return new Promise((resolve) => {
      // For Windows, using dshow. For macOS/Linux, would use avfoundation/v4l2.
      // Default to video0 or typical webcam names.
      const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
      
      // Attempting to capture 1 frame from the first video device
      // Note: Device names on Windows vary. 'video=integrated camera' or similar.
      // We'll try the common video capture interface.
      const args = [
        '-f', 'dshow',
        '-i', 'video=USB Video Device', // Common placeholder, a real impl would probe first
        '-frames:v', '1',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-'
      ];

      // Fallback for different OS or if specific device fails
      const child = spawn(ffmpegPath, args);
      const chunks: Buffer[] = [];

      child.stdout.on('data', (chunk) => chunks.push(chunk));
      child.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          // If the specific device fails, we don't want to spam errors
          resolve(null);
        }
      });
      
      child.on('error', () => resolve(null));
      
      // Auto-kill if hung
      setTimeout(() => child.kill(), 5000);
    });
  }

  /**
   * Extremely simple pixel-change motion detection.
   * Compares buffers and returns percentage change.
   */
  private detectMotion(prev: Buffer | null, curr: Buffer): number {
    if (!prev) return 100;
    if (prev.length !== curr.length) return 100;

    let diff = 0;
    const step = 20; // Sample every 20th pixel for speed
    for (let i = 0; i < curr.length; i += step) {
      if (Math.abs(curr[i] - prev[i]) > 30) {
        diff++;
      }
    }
    
    const sampleSize = curr.length / step;
    return (diff / sampleSize) * 100;
  }
}
