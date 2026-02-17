/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
export interface PocketTtsDownloadProgress {
    progress?: number;
    file?: string;
    status?: string;
}
export interface PocketHfTokenStatus {
    token?: string;
    source: 'voice_huggingface_api_key' | 'hf_token' | 'huggingface_api_key' | 'config_huggingface_api_key' | 'none';
}
export declare function getDefaultPocketModelDir(config: Config): string;
export declare function resolvePocketModelDir(config: Config): string;
export declare function resolvePocketModelId(config: Config): string;
export declare function resolvePocketHfToken(config: Config): PocketHfTokenStatus;
export declare function ensurePocketModelReady(config: Config, onProgress?: (progress: PocketTtsDownloadProgress) => void): Promise<{
    modelId: string;
    modelDir: string;
}>;
