
import { Config } from './config/config.js';
import { UserIdentityTool } from './tools/userIdentityTool.js';
import { getGlobalMemoryFilePath } from './tools/memoryTool.js';
import * as fs from 'fs';

async function verifyIdentity() {
  console.log('--- Verifying User Identity Tool ---');

  const configParams = {
      sessionId: 'test-identity-' + Date.now(),
      targetDir: process.cwd(),
      debugMode: true,
      cwd: process.cwd(),
      model: 'models/gemini-2.0-flash-exp',
  };

  // @ts-ignore
  const config = new Config(configParams);
  await config.initialize();

  // @ts-ignore
  const toolRegistry = config.getToolRegistry();
  const identityTool = new UserIdentityTool(toolRegistry.getMessageBus());

  // 1. Store a test identity fact
  const testFact = `I am a test user created at ${Date.now()}`;
  const testCategory = 'identity';
  
  console.log(`Storing fact: "${testFact}"`);

  try {
      // @ts-ignore
      const result = await identityTool.validateBuildAndExecute({
          fact: testFact,
          category: testCategory
      }, new AbortController().signal);
      console.log('Tool Result:', result);
  } catch (e) {
      console.error('Tool execution failed:', e);
      process.exit(1);
  }

  // 2. Verify it's in the file
  const memoryPath = getGlobalMemoryFilePath();
  console.log(`Checking memory file at: ${memoryPath}`);
  
  if (!fs.existsSync(memoryPath)) {
      console.error('Memory file does not exist!');
      process.exit(1);
  }

  const content = fs.readFileSync(memoryPath, 'utf-8');
  const expectedEntry = `[IDENTITY] ${testFact}`;

  if (content.includes('## User Identity & Life Goals') && content.includes(expectedEntry)) {
      console.log('✅ SUCCESS: User identity fact found in memory file under correct header.');
  } else {
      console.error('❌ FAILURE: Fact or header not found in memory file.');
      console.log('File Content Preview:\n', content.substring(0, 500));
      process.exit(1);
  }

  // Cleanup: Remove the test line to keep file clean (optional, keeping it simple for now)
  // Actually, let's remove it to avoid pollution
  const newContent = content.replace(`- ${expectedEntry}\n`, '').replace(`- ${expectedEntry}`, '');
  fs.writeFileSync(memoryPath, newContent, 'utf-8');
  console.log('Cleaned up test entry.');
}

verifyIdentity().catch(console.error);
