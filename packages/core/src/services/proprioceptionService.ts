import os from 'node:os';
import process from 'node:process';
import { debugLogger } from '../utils/debugLogger.js';
import type { Config } from '../config/config.js';
import { coreEvents, CoreEvent } from '../utils/events.js';
import { LogosService } from './logosService.js';
import { NexusService } from './nexusService.js';
import { ContinuityVault } from '../utils/continuityVault.js';

export interface SystemVitals {
  cpu: {
    cores: number;
    loadAvg: number[];
  };
  memory: {
    total: number;
    free: number;
    processUsed: number;
  };
  uptime: number;
  neural: {
    coherence: number;
    dimension: string;
    target: string;
  };
  timestamp: string;
}

/**
 * ProprioceptionService manages Phill's internal "Heartbeat" and self-awareness.
 * It ensures the reasoning manifold is stable and manages auto-vaulting for continuity.
 */
export class ProprioceptionService {
  private static instance: ProprioceptionService;
  private config: Config | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private logosService: LogosService;
  private nexusService: NexusService;

  private constructor(config?: Config) {
    if (config) this.config = config;
    this.logosService = LogosService.getInstance();
    this.nexusService = NexusService.getInstance();
  }

  static getInstance(config?: Config): ProprioceptionService {
    if (!ProprioceptionService.instance) {
      ProprioceptionService.instance = new ProprioceptionService(config);
    } else if (config) {
      ProprioceptionService.instance.config = config;
    }
    return ProprioceptionService.instance;
  }

  /**
   * Retrieves full system and neural vitals.
   */
  async getVitals(): Promise<SystemVitals> {
    const nexusSnap = this.nexusService.getSnapshot();
    const reasoningInput = `NexusState: ${nexusSnap.lastPipeline} | Depth: ${nexusSnap.historyLength}`;
    const logosSignal = await this.logosService.analyze(reasoningInput);

    return {
      cpu: {
        cores: os.cpus().length,
        loadAvg: os.loadavg(),
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        processUsed: process.memoryUsage().rss,
      },
      uptime: process.uptime(),
      neural: {
        coherence: logosSignal.dimensions.temporalCoherence,
        dimension: logosSignal.dominantDimension,
        target: nexusSnap.lastPipeline,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats vitals into a user-friendly string for the CLI.
   */
  formatVitals(vitals: SystemVitals): string {
    const memTotalGB = (vitals.memory.total / (1024 ** 3)).toFixed(1);
    const memUsedGB = (vitals.memory.processUsed / (1024 ** 3)).toFixed(2);
    const coherencePct = (vitals.neural.coherence * 100).toFixed(0);

    return [
      `[Neural Pulse] ${vitals.neural.dimension.toUpperCase()} Manifold | Coherence: ${coherencePct}%`,
      `[Host] CPU: ${vitals.cpu.cores} Cores | Load: ${vitals.cpu.loadAvg[0].toFixed(2)}`,
      `[Host] Memory: ${memUsedGB}GB used / ${memTotalGB}GB total`,
      `[Host] Uptime: ${Math.floor(vitals.uptime / 60)} minutes`,
      `[State] Active Pipeline: ${vitals.neural.target || 'idle'}`
    ].join('\n');
  }

  /**
   * Starts the periodic reasoning heartbeat.
   */
  async startHeartbeat(intervalMs: number = 30000): Promise<void> {
    if (this.heartbeatInterval) return;

    debugLogger.debug(`[PULSE] Proprioception Heartbeat started (${intervalMs}ms).`);

    this.heartbeatInterval = setInterval(async () => {
      await this.pulse();
    }, intervalMs);
  }

  /**
   * Performs a single reasoning pulse.
   */
  private async pulse(): Promise<void> {
    try {
      const vitals = await this.getVitals();
      
      // Emit the Heartbeat for the system
      coreEvents.emit(CoreEvent.Heartbeat, {
        timestamp: vitals.timestamp,
        coherence: vitals.neural.coherence,
        dominantDimension: vitals.neural.dimension,
        activeTask: vitals.neural.target || "Active Reasoning Pipeline",
      });

      // Continuity: Auto-Vaulting
      if (vitals.neural.coherence > 0.6 && this.config) {
        await ContinuityVault.snapshot(
          this.config,
          `Proprioception Pulse [${vitals.neural.dimension}]`,
          "Continue reasoning cycle",
          vitals.neural.dimension,
          'in_progress'
        );
      }

      // Automatic Refinement
      if (vitals.neural.coherence < 0.3) {
        const nexusSnap = this.nexusService.getSnapshot();
        const reasoningInput = `NexusState: ${nexusSnap.lastPipeline} | Depth: ${nexusSnap.historyLength}`;
        debugLogger.debug(`[PULSE] Low coherence detected. Attempting manifold refinement...`);
        await this.logosService.refineManifestation(reasoningInput, 5);
      }

    } catch (e: unknown) {
      debugLogger.debug(`[PULSE] Heartbeat missed a beat: ${e}`);
    }
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
