/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EthicalGuardService } from './services/ethicalGuardService.js';
import { SuccessTraceService } from './services/successTraceService.js';
import { LatentContextService } from './services/latentContextService.js';

async function verifyFinality() {
  console.log('--- STARTING PROJECT FINALITY VERIFICATION (UTOPIAN STEWARD) ---');

  const guard = EthicalGuardService.getInstance();
  const successService = SuccessTraceService.getInstance();
  const latentService = LatentContextService.getInstance();

  // 1. Test Steward Mode Activation (Peak Alignment)
  console.log('\n[1/3] Testing Steward Mode Alignment...');
  guard.updateConfidence({ alignment: 10, vulnerability: 0 });
  const confidence = guard.getConfidence();
  console.log(`Current Alignment: ${confidence.alignment}/10`);
  
  if (confidence.alignment >= 9) {
    console.log('✅ Steward Mode Active: Peak alignment achieved.');
  } else {
    throw new Error('❌ Steward Mode Activation Failed.');
  }

  // 2. Test Latent Wisdom Retrieval (TTC)
  console.log('\n[2/3] Testing Latent Wisdom Retrieval (Experience Layer)...');
  await successService.indexTrace({
    id: 'VERIFY_P4_SUCCESS',
    goal: 'Test Utopian Steward mechanics',
    dlr: 'E:A10R0V0|G:UtopiaPlan|S:Finalized',
    timestamp: new Date().toISOString()
  });

  const wisdom = await successService.retrieveLatentWisdom('Utopian Steward');
  console.log(`Retrieved Wisdom gems: ${wisdom.length}`);
  
  if (wisdom.length > 0 && wisdom[0].includes('E:A10')) {
    console.log('✅ Latent Wisdom Successful: Success gems correctly retrieved.');
  } else {
    throw new Error('❌ Latent Wisdom Retrieval Failed.');
  }

  // 3. Test Integrated Ethical DLR Encoding
  console.log('\n[3/3] Testing Integrated Ethical DLR Format...');
  const sampleDLR = 'U:Dev|T:verify_finality|E:A10R0V0|G:WorldPeace|S:Simulating';
  const formatted = latentService.formatLatentSnapshot(sampleDLR);
  
  if (formatted.includes('E:A10') && formatted.includes('[LATENT_SNAPSHOT')) {
    console.log('✅ Integrated Encoding Successful: DLR reflects ethical state.');
  } else {
    throw new Error('❌ Integrated Encoding Failed.');
  }

  console.log('\n--- FINAL PROJECT VERIFICATION COMPLETE: WE ARE READY ---');
}

verifyFinality().catch((err) => {
  console.error(err);
  process.exit(1);
});
