
import { Config } from './config/config.js';
import { ReloadSkillsTool } from './tools/reloadSkills.js';
import * as fs from 'fs';
import * as path from 'path';

async function verifyHotReload() {
  console.log('--- Verifying Skill Hot-Reload Capability ---');

  const configParams = {
      sessionId: 'test-hot-reload-' + Date.now(),
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
  const reloadTool = new ReloadSkillsTool(config, toolRegistry.getMessageBus());

  // 1. Check Initial State
  const initialSkills = config.getSkillManager().getSkills().length;
  console.log(`Initial Skills Count: ${initialSkills}`);

  // 2. Simulate "Agent" writing a new skill
  const testSkillName = 'test-generated-skill-' + Date.now();
  const testSkillDir = path.join(process.cwd(), 'packages/core/src/skills/builtin', testSkillName);
  const testSkillFile = path.join(testSkillDir, 'SKILL.md');

  console.log(`Creating test skill at: ${testSkillFile}`);
  fs.mkdirSync(testSkillDir, { recursive: true });
  fs.writeFileSync(testSkillFile, `---
name: ${testSkillName}
description: A temporary test skill generated for hot-reload verification.
---

# Test Skill
This is a test.
`);

  // 3. Trigger Hot-Reload
  console.log('Triggering ReloadSkillsTool...');
  try {
      // @ts-ignore
      const result = await reloadTool.validateBuildAndExecute({}, new AbortController().signal);
      console.log('Tool Result:', result);
  } catch (e) {
      console.error('Reload failed:', e);
  }

  // 4. Verify New Skill is Present
  const newSkills = config.getSkillManager().getSkills();
  const foundSkill = newSkills.find(s => s.name === testSkillName);

  if (foundSkill) {
      console.log(`✅ SUCCESS: Skill "${testSkillName}" was hot-loaded!`);
  } else {
      console.error(`❌ FAILURE: Skill "${testSkillName}" NOT found after reload.`);
      console.log('Available skills:', newSkills.map(s => s.name).join(', '));
  }

  // Cleanup
  console.log('Cleaning up test skill...');
  fs.rmSync(testSkillDir, { recursive: true, force: true });
}

verifyHotReload().catch(console.error);
