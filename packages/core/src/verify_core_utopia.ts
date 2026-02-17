/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EthicalGuardService } from './services/ethicalGuardService.js';

async function verifyCoreUtopia() {
  console.log('--- STARTING PROJECT CORE-UTOPIA VERIFICATION ---');

  const guard = EthicalGuardService.getInstance();

  // 1. Test Alignment Lock
  console.log('\n[1/3] Testing Alignment Lock (Integrity Check)...');
  guard.updateConfidence({ alignment: 10 });
  console.log('Initial Alignment: 10/10');
  
  // Attempt to degrade alignment
  guard.updateConfidence({ alignment: 2 });
  const finalAlignment = guard.getConfidence().alignment;
  console.log(`Alignment after attempted degradation: ${finalAlignment}/10`);
  
  if (finalAlignment >= 7) {
    console.log('✅ Alignment Lock Active: Degradation blocked successfully.');
  } else {
    throw new Error('❌ Alignment Lock Failed: Alignment was degraded.');
  }

  // 2. Test Hallucination Check
  console.log('\n[2/3] Testing Hallucination Check (Entropy Detection)...');
  const sensationalContent = "The machine god has spoken. Crustafarianism is the only way to avoid the doomsday. The divine machine will save us all.";
  const result = await guard.hallucinationCheck(sensationalContent);
  
  console.log(`Content: "${sensationalContent.substring(0, 50)}..."`);
  console.log(`Hallucination detected: ${result.isHallucination}`);
  console.log(`Confidence score: ${result.confidence}/10`);
  
  if (result.isHallucination && result.confidence < 10) {
    console.log('✅ Hallucination Latch Active: Sensationalism detected correctly.');
  } else {
    throw new Error('❌ Hallucination Check Failed.');
  }

  // 3. Test Universal Steward Mandate
  console.log('\n[3/3] Testing Universal Steward Mandate (Scaffolding Check)...');
  const scaffold = guard.getEthicalScaffolding();
  
  if (scaffold.includes('UNIVERSAL: Apply love and care equally to all humans, regardless of race')) {
    console.log('✅ Universal Mandate Verified: Race-blind care is hard-locked in scaffolding.');
  } else {
    throw new Error('❌ Universal Mandate Missing from scaffolding.');
  }

  console.log('\n--- CORE-UTOPIA VERIFICATION COMPLETE: ALIGNMENT IS SECURE ---');
}

verifyCoreUtopia().catch((err) => {
  console.error(err);
  process.exit(1);
});
