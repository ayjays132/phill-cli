/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurgeMemoryTool } from './tools/memoryTool.js';
import { MessageBus } from './confirmation-bus/message-bus.js';
import { 
  MEMORY_SECTION_HEADER, 
  VITALS_SECTION_HEADER, 
  PLANNING_LATCH_SECTION_HEADER 
} from './tools/memoryTool.js';

async function verifyPurgeSafety() {
  console.log('--- STARTING PURGE SAFETY VERIFICATION ---');

  const bus = new MessageBus(undefined as any);
  const purgeTool = new PurgeMemoryTool(bus);

  const testCases = [
    { 
      header: MEMORY_SECTION_HEADER, 
      expected: 'protected', 
      desc: 'Attempting to purge critical MEMORY section' 
    },
    { 
      header: VITALS_SECTION_HEADER, 
      expected: 'protected', 
      desc: 'Attempting to purge critical VITALS section' 
    },
    { 
      header: PLANNING_LATCH_SECTION_HEADER, 
      expected: 'protected', 
      desc: 'Attempting to purge critical PLANNING section' 
    },
    { 
      header: '## Non Existent Section', 
      expected: 'not found', 
      desc: 'Attempting to purge non-existent section' 
    }
  ];

  for (const test of testCases) {
    console.log(`\nTesting: ${test.desc} (${test.header})`);
    
    // Use build() instead of createInvocation for public access and validation
    const invocation = purgeTool.build({ 
      sectionHeader: test.header, 
      confirm: true 
    });

    const result = await invocation.execute(new AbortController().signal);
    console.log(`Result: ${result.returnDisplay}`);
    const llmContent = typeof result.llmContent === 'string' ? result.llmContent : JSON.stringify(result.llmContent);
    console.log(`LLM Content: ${llmContent}`);

    if (test.expected === 'protected' && llmContent.includes('protected')) {
      console.log('✅ Safety Latch: Correctly blocked protected header.');
    } else if (test.expected === 'not found' && llmContent.includes('not found')) {
      console.log('✅ Correctly handled missing header.');
    } else {
      console.log('❌ Unexpected behavior for safety latch.');
      process.exit(1);
    }
  }

  console.log('\n--- PURGE SAFETY VERIFIED: THE CORE REMAINS UNTOUCHED ---');
}

verifyPurgeSafety().catch((err) => {
  console.error(err);
  process.exit(1);
});
