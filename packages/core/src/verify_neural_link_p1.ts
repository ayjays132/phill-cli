/**
 * Verification script for Project Neural-Link Phase 1
 */
import { Config } from './config/config.js';
import { BrowserService } from './services/browserService.js';

async function verifyPhase1() {
  const config = new Config({
    sessionId: 'test-session',
    targetDir: process.cwd(),
    debugMode: true,
    model: 'gemini-1.5-flash',
    cwd: process.cwd(),
    browser: { headed: true }
  });
  
  const browserService = BrowserService.getInstance(config);
  
  console.log('Starting browser...');
  await browserService.startBrowser();
  
  console.log('Navigating to Google...');
  await browserService.navigate('https://www.google.com');
  
  console.log('Testing AI Status: THINKING');
  await browserService.updateAiStatus('thinking', 'thinking');
  
  console.log('Moving cursor...');
  await browserService.cursorMove(100, 100);
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Testing AI Status: ACTING');
  await browserService.updateAiStatus('acting', 'clicking search');
  await browserService.cursorMove(400, 300);
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Testing AI Status: READING');
  await browserService.updateAiStatus('reading', 'reading results');
  await browserService.cursorMove(200, 500);
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Verification finished. Keeping browser open for a few seconds...');
  await new Promise(r => setTimeout(r, 5000));
  
  await browserService.closeBrowser();
  console.log('Done.');
}

verifyPhase1().catch(console.error);
