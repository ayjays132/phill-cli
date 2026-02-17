/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryTool } from './tools/memoryTool.js';
import { PurgeMemoryTool } from './tools/memoryTool.js';
import { MessageBus } from './confirmation-bus/message-bus.js';
import * as fs from 'node:fs/promises';
import { getGlobalMemoryFilePath } from './tools/memoryTool.js';

async function verifySovereignty() {
  console.log('--- STARTING ACCOUNT SOVEREIGNTY VERIFICATION ---');

  const bus = new MessageBus(undefined as any);
  const purgeTool = new PurgeMemoryTool(bus);

  const memoryPath = getGlobalMemoryFilePath();
  const dummyHeader = '## Dummy Acccount Section';
  const dummyFact = 'This is a test account for sovereignty verification.';

  // 1. Save dummy account
  console.log('\n[1/3] Saving dummy account to memory...');
  await MemoryTool.performAddMemoryEntry(dummyFact, memoryPath, {
    readFile: fs.readFile,
    writeFile: fs.writeFile,
    mkdir: fs.mkdir
  });
  
  // Actually, we need the header. performAddMemoryEntry doesn't take a header.
  // We'll manually inject a header for the test if needed, or use the default and look for the fact.
  // But PurgeTool targets headers. Let's manually write a headered section.

  let content = await fs.readFile(memoryPath, 'utf-8');
  content += `\n\n${dummyHeader}\n- ${dummyFact}\n`;
  await fs.writeFile(memoryPath, content, 'utf-8');
  console.log(`Added test section: "${dummyHeader}"`);

  // 2. Verify existence
  content = await fs.readFile(memoryPath, 'utf-8');
  if (content.includes(dummyHeader)) {
    console.log('✅ Section exists.');
  } else {
    throw new Error('❌ Test setup failed: Section not found.');
  }

  // 3. Purge section
  console.log('\n[2/3] Calling purge_memory_section...');
  const invocation = purgeTool.build({ sectionHeader: dummyHeader, confirm: true });
  const result = await invocation.execute(new AbortController().signal);
  console.log(`Result: ${result.returnDisplay}`);

  // 4. Verify deletion
  console.log('\n[3/3] Verifying deletion...');
  const finalContent = await fs.readFile(memoryPath, 'utf-8');
  if (!finalContent.includes(dummyHeader)) {
    console.log('✅ Sovereignty Verified: Section and its contents were purged successfully.');
  } else {
    throw new Error('❌ Verification Failed: Section still exists in memory.');
  }

  console.log('\n--- SOVEREIGNTY VERIFICATION COMPLETE: FREEDOM RESTORED ---');
}

verifySovereignty().catch((err) => {
  console.error(err);
  process.exit(1);
});
