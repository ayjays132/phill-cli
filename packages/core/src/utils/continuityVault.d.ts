import type { Config } from '../config/config.js';
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
export declare class ContinuityVault {
    private static VAULT_DIR;
    private static VAULT_FILE;
    static snapshot(config: Config, summary: string, nextStep?: string, phase?: string, status?: 'pending' | 'in_progress' | 'completed'): Promise<string | null>;
    static unlock(config: Config): Promise<VaultState | null>;
}
