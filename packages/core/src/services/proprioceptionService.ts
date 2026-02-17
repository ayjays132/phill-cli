/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { 
  getGlobalMemoryFilePath, 
  computeNewContent, 
  VITALS_SECTION_HEADER 
} from '../tools/memoryTool.js';

import { PhysicalPerceptionService } from './physicalPerceptionService.js';
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
  pulse: number; // A calculated health/stress index (0-100)
  physicalVision?: PhysicalVisionData;
}

export class ProprioceptionService {
  private static instance: ProprioceptionService;
  private config: Config | null = null;
  private lastCpuUsage: { user: number, system: number, time: number } | null = null;

  private constructor(config?: Config) {
    this.config = config || null;
  }

  public static getInstance(config?: Config): ProprioceptionService {
    if (!ProprioceptionService.instance) {
      ProprioceptionService.instance = new ProprioceptionService(config);
    }
    return ProprioceptionService.instance;
  }

  /**
   * Calculates a "pulse" index based on current load and resource pressure.
   * 0 = Idle, 100 = Maximum Stress.
   */
  private calculatePulse(cpu: number, mem: number): number {
    // Weight: 60% CPU, 40% Memory pressure
    const pulse = (cpu * 0.6) + (mem * 0.4);
    return Math.min(Math.round(pulse), 100);
  }

  /**
   * Gets current system vitals.
   */
  public async getVitals(): Promise<SystemVitals> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    // CPU usage calculation
    const currentCpu = this.getCpuUsage();
    const cpuUsage = currentCpu;

    const uptime = os.uptime();
    const loadAverage = os.loadavg();
    const platform = os.platform();
    const arch = os.arch();

    let physicalVision: PhysicalVisionData | undefined;
    if (this.config) {
        physicalVision = await PhysicalPerceptionService.getInstance(this.config).getSnapshot();
    }

    return {
      cpuUsage: Math.round(cpuUsage),
      memoryUsage: Math.round(memUsage),
      totalMemory: totalMem,
      freeMemory: freeMem,
      uptime,
      loadAverage,
      platform,
      arch,
      pulse: this.calculatePulse(cpuUsage, memUsage),
      physicalVision
    };
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    let user = 0;
    let system = 0;
    let idle = 0;

    for (const cpu of cpus) {
      user += cpu.times.user;
      system += cpu.times.sys;
      idle += cpu.times.idle;
    }

    const total = user + system + idle;
    
    // Simple point-in-time calculation if no history
    if (!this.lastCpuUsage) {
      this.lastCpuUsage = { user, system, time: total };
      return ((user + system) / total) * 100;
    }

    const diffUser = user - this.lastCpuUsage.user;
    const diffSystem = system - this.lastCpuUsage.system;
    const diffTotal = total - this.lastCpuUsage.time;

    this.lastCpuUsage = { user, system, time: total };

    if (diffTotal === 0) return 0;
    return ((diffUser + diffSystem) / diffTotal) * 100;
  }

  /**
   * Formats vitals for LLM consumption.
   */
  public formatVitals(vitals: SystemVitals): string {
    return [
      `System Status: ${vitals.platform} (${vitals.arch})`,
      `CPU: ${vitals.cpuUsage}% | Memory: ${vitals.memoryUsage}%`,
      `Pulse: ${vitals.pulse}/100 [${this.getPulseDescription(vitals.pulse)}]`,
      `Uptime: ${(vitals.uptime / 3600).toFixed(2)} hours`
    ].join('\n');
  }

  private getPulseDescription(pulse: number): string {
    if (pulse < 20) return 'Relaxed - Deep Cycles Available';
    if (pulse < 50) return 'Steady - Normal Operation';
    if (pulse < 80) return 'Active - Significant Load';
    return 'Hyper-Focused - Maximum Resource Pressure';
  }

  /**
   * Logs current vitals to the PHILL.md memory file.
   */
  public async logCurrentVitals(): Promise<void> {
    try {
      const vitals = await this.getVitals();
      const statusLine = `[${new Date().toISOString()}] Pulse: ${vitals.pulse}/100 | CPU: ${vitals.cpuUsage}% | MEM: ${vitals.memoryUsage}%`;
      
      const memoryPath = getGlobalMemoryFilePath();
      let currentContent = '';
      try {
        currentContent = await fs.readFile(memoryPath, 'utf-8');
      } catch (e) {
        // File might not exist yet
      }

      const newContent = computeNewContent(currentContent, statusLine, VITALS_SECTION_HEADER);
      await fs.writeFile(memoryPath, newContent, 'utf-8');
      
      // console.log('Proprioception: System Vitals logged to memory.');
    } catch (error) {
      console.error('Failed to log vitals to memory:', error);
    }
  }

  /**
   * Starts a background heartbeat that logs vitals periodically.
   * Default is every 5 minutes.
   */
  public startHeartbeat(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    // Initial log
    this.logCurrentVitals().catch(console.error);
    
    // Start physical environment monitoring if config is available
    if (this.config) {
      PhysicalPerceptionService.getInstance(this.config).startMonitoring();
    }

    return setInterval(() => {
      this.logCurrentVitals().catch(console.error);
    }, intervalMs);
  }
}
