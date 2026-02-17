/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Service for managing hardware-accelerated Test-Time Compute tiers.
 * Prioritizes: BF16 > FP16 > CUDA > AMD (DirectML/ROCm) > CPU
 */
export declare class HardwareTTCService {
    private static instance;
    private constructor();
    static getInstance(): HardwareTTCService;
    /**
     * Resolves the best available hardware tier for a given model load request.
     */
    getBestHardwareTier(options: {
        allowBF16?: boolean;
        allowFP16?: boolean;
        quantization?: 'q4' | 'q8';
    }): Promise<{
        device: string;
        dtype: string;
    }>;
    /**
     * Returns hardware status for vitals inclusion.
     */
    getHardwareStatus(): Promise<string>;
}
