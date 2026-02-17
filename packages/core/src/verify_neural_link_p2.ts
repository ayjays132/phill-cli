/**
 * Verification script for Project Neural-Link Phase 2
 */
import { Config } from './config/config.js';
import { BrowserService } from './services/browserService.js';

async function verifyPhase2() {
  const config = new Config({
    sessionId: 'test-session-p2',
    targetDir: process.cwd(),
    debugMode: true,
    model: 'gemini-1.5-flash',
    cwd: process.cwd(),
    browser: { headed: true }
  });
  
  const browserService = BrowserService.getInstance(config);
  
  let deltaCount = 0;
  browserService.on('visual-delta', (data) => {
    deltaCount++;
    console.log(`[Visual Delta #${deltaCount}] Type: ${data.type}, Size: ${data.buffer.length} bytes, Timestamp: ${data.timestamp}`);
  });

  console.log('Starting browser...');
  await browserService.startBrowser();
  
  console.log('Starting screencast...');
  await browserService.startScreencast();
  
  console.log('Navigating to a clock site (dynamic content)...');
  await browserService.navigate('https://www.google.com/search?q=current+time');
  
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Setting ROI on the clock area...');
  await browserService.setROI(100, 200, 400, 100);
  
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Stopping screencast...');
  await browserService.stopScreencast();
  
  console.log(`Total significant visual deltas captured: ${deltaCount}`);
  
  await browserService.closeBrowser();
  console.log('Done.');
}

verifyPhase2().catch(console.error);
