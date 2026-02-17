/**
 * Verification script for Project Neural-Link Phase 4
 */
import { Config } from './config/config.js';
import { BrowserService } from './services/browserService.js';
import { BrowserStartTool, BrowserStopTool, BrowserResetTool, BrowserNavigateTool } from './tools/browserTools.js';
import { MessageBus } from './confirmation-bus/message-bus.js';

async function verifyBrowserControl() {
  console.log('--- STARTING BROWSER CONTROL VERIFICATION ---');

  const config = new Config({
    sessionId: 'test-session-p4',
    targetDir: process.cwd(),
    debugMode: true,
    model: 'gemini-1.5-flash',
    cwd: process.cwd(),
    browser: { headed: true }
  });

  const bus = new MessageBus(undefined as any);
  const startTool = new BrowserStartTool(config, bus);
  const stopTool = new BrowserStopTool(config, bus);
  const resetTool = new BrowserResetTool(config, bus);
  const navigateTool = new BrowserNavigateTool(config, bus);

  console.log('\n[1/4] Starting Browser...');
  await startTool.build({}).execute(new AbortController().signal);
  
  const browserService = BrowserService.getInstance(config);
  if (browserService.isBrowserOpen()) {
    console.log('✅ Browser started successfully.');
  } else {
    throw new Error('❌ Browser failed to start.');
  }

  console.log('\n[2/4] Navigating to Google...');
  await navigateTool.build({ url: 'https://www.google.com' }).execute(new AbortController().signal);
  console.log(`Current URL: ${browserService.getCurrentUrl()}`);

  console.log('\n[3/4] Stopping Browser...');
  await stopTool.build({}).execute(new AbortController().signal);
  if (!browserService.isBrowserOpen()) {
    console.log('✅ Browser stopped successfully.');
  } else {
    throw new Error('❌ Browser failed to stop.');
  }

  console.log('\n[4/4] Resetting Browser (Stop + Start)...');
  await resetTool.build({}).execute(new AbortController().signal);
  if (browserService.isBrowserOpen()) {
    console.log('✅ Browser reset successfully.');
  } else {
    throw new Error('❌ Browser failed to reset.');
  }

  await browserService.closeBrowser();
  console.log('\n--- VERIFICATION COMPLETE: BROWSER CONTROL IS FUNCTIONAL ---');
}

verifyBrowserControl().catch((err) => {
  console.error(err);
  process.exit(1);
});
