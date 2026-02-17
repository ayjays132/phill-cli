/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service for managing hardware-accelerated Test-Time Compute tiers.
 * Prioritizes: BF16 > FP16 > CUDA > AMD (DirectML/ROCm) > CPU
 */
export class HardwareTTCService {
  private static instance: HardwareTTCService;

  private constructor() {}

  public static getInstance(): HardwareTTCService {
    if (!HardwareTTCService.instance) {
      HardwareTTCService.instance = new HardwareTTCService();
    }
    return HardwareTTCService.instance;
  }

  /**
   * Resolves the best available hardware tier for a given model load request.
   */
  async getBestHardwareTier(options: {
    allowBF16?: boolean;
    allowFP16?: boolean;
    quantization?: 'q4' | 'q8';
  }): Promise<{ device: string; dtype: string }> {
    // In a real implementation, we would check for CUDA/WebGPU/DirectML availability here.
    // For now, we simulate the tiering logic based on user priority.
    
    // Priority 1: BF16 (Brain Float 16) - Typically requires latest GPUs (Ampere+)
    if (options.allowBF16) {
      return { device: 'cuda', dtype: 'bfloat16' };
    }

    // Priority 2: FP16 (Half Precision) - Standard for most modern GPUs
    if (options.allowFP16) {
      return { device: 'cuda', dtype: 'float16' };
    }

    // Priority 3 & 4: CUDA & AMD (Auto selection via DirectML/WebGPU in browsers/Node)
    const bestDevice = 'auto'; // Let the runtime decide based on environment

    // Quantization fallback
    const dtype = options.quantization === 'q4' ? 'q4' : (options.quantization === 'q8' ? 'q8' : 'float32');

    return { device: bestDevice, dtype: dtype };
  }

  /**
   * Returns hardware status for vitals inclusion.
   */
  async getHardwareStatus(): Promise<string> {
    return "TTC Tier: Optimized (BF16 prioritized)";
  }
}
