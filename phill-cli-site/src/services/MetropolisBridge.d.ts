export interface MetropolisSignal {
    district: string;
    status: 'ONLINE' | 'OFFLINE' | 'PEAK_SYNTHESIS' | 'VOLATILITY_HIGH';
    liquidity?: string;
}
export interface CasinoWin {
    user: string;
    amount: number;
    game: string;
    time: string;
}
declare class MetropolisBridge {
    private static instance;
    private constructor();
    static getInstance(): MetropolisBridge;
    /**
     * Fetches real-time signals from the Metropolis Grid.
     */
    getGridSignals(): Promise<MetropolisSignal[]>;
    /**
     * Pulls public bank activity to show live activity.
     * Interfaces with the Sovereign Reserve ledger.
     */
    getLatestWins(): Promise<CasinoWin[]>;
    /**
     * Fetches global events for the Neural Feed.
     * Pulls authoritative broadcasts from the Plaza District.
     */
    getGlobalEvents(): Promise<string[]>;
    /**
     * Pulls real core metrics from the grid.
     * Synchronizes with the Metropolis heart-beat.
     */
    getCoreMetrics(): Promise<any>;
    /**
     * Bridge GitHub logic: simulating or fetching repo stats.
     * Anchored to the primary technical repository.
     */
    getGitHubStats(): Promise<{
        stars: string;
        forks: string;
        contributors: string;
        version: string;
    }>;
}
export declare const bridge: MetropolisBridge;
export {};
