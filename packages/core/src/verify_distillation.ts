/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuccessTraceService } from './services/successTraceService.js';
import { TTCEngine } from './core/ttcEngine.js';
import { HardwareTTCService } from './services/hardwareTtcService.js';
import { Config } from './config/config.js';
import { Storage } from './config/storage.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function verifyDistillation() {
  console.log('--- Verifying Latent Distillation & TTC ---');

  const storage = new Storage(process.cwd());
  // @ts-ignore
  const config = new Config({
    storage,
    targetDir: process.cwd(),
    sessionId: 'test-session',
    model: 'gemini-1.5-flash',
    cwd: process.cwd()
  } as any);
  
  const successTraceService = SuccessTraceService.getInstance();
  const ttcEngine = TTCEngine.getInstance();
  const hardwareTtc = HardwareTTCService.getInstance();

  const testGoal = "Test Browser Navigation Success";
  const testDLR = "T:BrowserStart_S|G:NavGoogle|S:Done";
  const testId = "test-123";

  console.log('1. Testing Success Indexing...');
  await successTraceService.indexTrace({
    id: testId,
    goal: testGoal,
    dlr: testDLR,
    timestamp: new Date().toISOString(),
    latencyMs: 150
  });
  console.log('Γ£à Trace indexed.');

  console.log('2. Testing Latent Wisdom Retrieval...');
  const wisdom = await ttcEngine.getGuidingContext("Help me navigate the browser");
  if (wisdom && wisdom.includes(testDLR)) {
    console.log('Γ£à SUCCESS: Latent wisdom retrieved and correctly formatted.');
  } else {
    console.error('Γ¥î FAILURE: Latent wisdom retrieval failed or DLR missing.');
  }

  console.log('3. Testing Hardware TTC Tiering...');
  const tier = await hardwareTtc.getBestHardwareTier({
    allowBF16: true,
    quantization: 'q8'
  });
  console.log(`Resolved Tier: ${tier.device} / ${tier.dtype}`);
  if (tier.dtype === 'bfloat16' || tier.dtype === 'float16' || tier.dtype === 'q8') {
    console.log('Γ£à SUCCESS: Hardware tiering logic responsive.');
  }

  // Cleanup
  console.log('Cleaning up...');
  const traceFile = path.join(Storage.getGlobalPhillDir(), 'SUCCESS_TRACES.md');
  try {
    const content = await fs.readFile(traceFile, 'utf-8');
    const cleaned = content.replace(new RegExp(`\\n\\[SUCCESS_GEM_${testId}\\][\\s\\S]*?\\[\\/SUCCESS_GEM\\]\\n`, 'g'), '');
    await fs.writeFile(traceFile, cleaned, 'utf-8');
    console.log('Cleanup complete.');
  } catch (e) {
    console.warn('Cleanup skipped or failed.');
  }

  console.log('--- Verification Complete ---');
}

verifyDistillation().catch(console.error);
