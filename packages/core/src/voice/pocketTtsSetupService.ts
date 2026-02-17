/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { debugLogger } from '../utils/debugLogger.js';

export interface PocketTtsDownloadProgress {
  progress?: number;
  file?: string;
  status?: string;
}

export interface PocketHfTokenStatus {
  token?: string;
  source:
    | 'voice_huggingface_api_key'
    | 'hf_token'
    | 'huggingface_api_key'
    | 'config_huggingface_api_key'
    | 'none';
}

function sanitizeModelId(modelId: string): string {
  return modelId.replace(/[\\/:"*?<>|]+/g, '_');
}

export function getDefaultPocketModelDir(config: Config): string {
  return path.join(config.storage.getProjectTempDir(), 'models', 'pocket-tts');
}

export function resolvePocketModelDir(config: Config): string {
  const configured = config.getVoice().pocketModelDir?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return getDefaultPocketModelDir(config);
}

export function resolvePocketModelId(config: Config): string {
  return config.getVoice().pocketModelId?.trim() || 'kyutai/pocket-tts';
}

export function resolvePocketHfToken(config: Config): PocketHfTokenStatus {
  const voiceHfApiKey = config.getVoice().huggingFaceApiKey?.trim();
  if (voiceHfApiKey) {
    return { token: voiceHfApiKey, source: 'voice_huggingface_api_key' };
  }

  const envHfToken = process.env['HF_TOKEN']?.trim();
  if (envHfToken) {
    return { token: envHfToken, source: 'hf_token' };
  }

  const envHfApiKey = process.env['HUGGINGFACE_API_KEY']?.trim();
  if (envHfApiKey) {
    return { token: envHfApiKey, source: 'huggingface_api_key' };
  }

  const configHfApiKey = config.huggingFace?.apiKey?.trim();
  if (configHfApiKey) {
    return { token: configHfApiKey, source: 'config_huggingface_api_key' };
  }

  return { source: 'none' };
}

function getReadyMarkerPath(modelDir: string, modelId: string): string {
  return path.join(modelDir, `${sanitizeModelId(modelId)}.ready.json`);
}

async function hasReadyMarker(modelDir: string, modelId: string): Promise<boolean> {
  try {
    await fs.access(getReadyMarkerPath(modelDir, modelId));
    return true;
  } catch {
    return false;
  }
}

async function writeReadyMarker(modelDir: string, modelId: string): Promise<void> {
  await fs.mkdir(modelDir, { recursive: true });
  await fs.writeFile(
    getReadyMarkerPath(modelDir, modelId),
    JSON.stringify({ modelId, readyAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );
}

export async function ensurePocketModelReady(
  config: Config,
  onProgress?: (progress: PocketTtsDownloadProgress) => void,
): Promise<{ modelId: string; modelDir: string }> {
  const modelId = resolvePocketModelId(config);
  const modelDir = resolvePocketModelDir(config);

  if (await hasReadyMarker(modelDir, modelId)) {
    return { modelId, modelDir };
  }

  await fs.mkdir(modelDir, { recursive: true });

  const transformers = (await import('@xenova/transformers')) as {
    env: {
      cacheDir?: string;
      localModelPath?: string;
      allowRemoteModels?: boolean;
      allowLocalModels?: boolean;
    };
    pipeline: (
      task: string,
      model: string,
      opts?: Record<string, unknown>,
    ) => Promise<unknown>;
  };

  const hfTokenStatus = resolvePocketHfToken(config);
  if (hfTokenStatus.token) {
    // Bridge existing HF auth into Transformers hub auth variables.
    process.env['HF_TOKEN'] = hfTokenStatus.token;
    process.env['HUGGINGFACE_API_KEY'] = hfTokenStatus.token;
  }

  transformers.env.cacheDir = modelDir;
  transformers.env.localModelPath = modelDir;
  transformers.env.allowRemoteModels = true;
  transformers.env.allowLocalModels = true;

  onProgress?.({ status: 'initializing' });

  const tokenizerModelPath = path.join(modelDir, 'tokenizer.model');
  const tokenizerJsonPath = path.join(modelDir, 'tokenizer.json');

  // Workaround for models that use tokenizer.model instead of tokenizer.json
  if (await fs.access(tokenizerModelPath).then(() => true).catch(() => false)) {
    await fs.copyFile(tokenizerModelPath, tokenizerJsonPath);
    debugLogger.log(`Copied ${tokenizerModelPath} to ${tokenizerJsonPath} as a workaround for @xenova/transformers.`);
  }

  await transformers.pipeline('text-to-speech', modelId, {
    progress_callback: (progress: PocketTtsDownloadProgress) => {
      onProgress?.(progress);
    },
  });
  onProgress?.({ status: 'finalizing' });

  await writeReadyMarker(modelDir, modelId);
  return { modelId, modelDir };
}
