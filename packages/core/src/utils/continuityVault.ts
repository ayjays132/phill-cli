import fs from 'node:fs';
import path from 'node:path';
import type { Config } from '../config/config.js';
import { debugLogger } from '../utils/debugLogger.js';

export interface VaultState {
  timestamp: string;
  sessionId: string;
  taskSummary: string;
  phase?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  lastTool?: string;
  nextStep?: string;
  cwd: string;
}

export class ContinuityVault {
  private static VAULT_DIR = '.state/snapshots';
  private static VAULT_FILE = 'vault.json';

  static async snapshot(config: Config, summary: string, nextStep?: string, phase?: string, status: 'pending' | 'in_progress' | 'completed' = 'in_progress'): Promise<string | null> {
    const logPath = path.join(config.getProjectRoot(), '.logs/vault_debug.log');
    if (!fs.existsSync(path.dirname(logPath))) fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Snapshot attempt: ${summary} | Phase: ${phase}\n`);

    try {
      const projectRoot = config.getProjectRoot();
      const vaultDir = path.join(projectRoot, this.VAULT_DIR);
      
      if (!fs.existsSync(vaultDir)) {
        fs.mkdirSync(vaultDir, { recursive: true });
      }

      const state: VaultState = {
        timestamp: new Date().toISOString(),
        sessionId: config.getSessionId(),
        taskSummary: summary,
        phase: phase,
        status: status,
        nextStep: nextStep,
        cwd: process.cwd()
      };

      const vaultPath = path.join(vaultDir, this.VAULT_FILE);
      fs.writeFileSync(vaultPath, JSON.stringify(state, null, 2));
      
      fs.appendFileSync(logPath, `SUCCESS: Vaulted at ${vaultPath}\n`);
      return vaultPath;
    } catch (err) {
      fs.appendFileSync(logPath, `FAILURE: ${err}\n`);
      return null;
    }
  }

  static async unlock(config: Config): Promise<VaultState | null> {
    try {
      const projectRoot = config.getProjectRoot();
      const vaultPath = path.join(projectRoot, this.VAULT_DIR, this.VAULT_FILE);

      if (!fs.existsSync(vaultPath)) return null;

      const content = fs.readFileSync(vaultPath, 'utf8');
      const state = JSON.parse(content) as VaultState;

      // Immediately delete to prevent stale re-entry
      fs.unlinkSync(vaultPath);
      
      debugLogger.debug(`[ContinuityVault] Vault unlocked and purged.`);
      return state;
    } catch (err) {
      debugLogger.error(`[ContinuityVault] Unlock failed: ${err}`);
      return null;
    }
  }
}
