
import { AudioVisionSyncService } from './services/audioVisionSyncService.js';
import { Config } from './config/config.js';
import { BrowserService } from './services/browserService.js';

async function verifyAudioSync() {
  console.log('--- Verifying Browser Audio & VLA Sync ---');

  const configParams = {
      sessionId: 'test-session-' + Date.now(),
      targetDir: process.cwd(),
      debugMode: true,
      cwd: process.cwd(),
      model: 'models/gemini-2.0-flash-exp', // Or whatever is default
  };

  // @ts-ignore - Minimal config for testing
  const config = new Config(configParams);
  
  const syncService = AudioVisionSyncService.getInstance(config);
  // BrowserService is also a singleton per config instance usually, or uses getInstance
  const browserService = BrowserService.getInstance(config);

  // Navigate to local test file
  const testFile = `file://${process.cwd()}/test_audio.html`;
  console.log(`1. Navigating to ${testFile}...`);
  await browserService.navigate(testFile);
  
  // Wait for page load
  await new Promise(r => setTimeout(r, 2000));
  
  // Start Sync
  syncService.startSync();
  console.log('   Audio capture started. Triggering tone...');
  
  // Trigger audio
  await browserService.click('button'); 

  // Wait and collect
  console.log('   Listening for 3 seconds...');
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('2. Requesting Multimodal Context...');
  try {
      const frame = await syncService.getMultimodalContext();
      
      console.log(`   Screenshot captured: ${frame.screenshot ? frame.screenshot.length + ' bytes' : 'NO'}`);
      console.log(`   Audio buffer size: ${frame.audioSinceLastFrame.length} bytes`);
      console.log(`   Timestamp: ${frame.timestamp}`);

      if (frame.audioSinceLastFrame.length > 0) {
          console.log('✅ Audio data received successfully.');
      } else {
          console.error('❌ No audio data received. Check if --use-fake-ui-for-media-stream is working.');
      }
  } catch (e) {
      console.error('❌ Error getting multimodal context:', e);
  }

  syncService.stopSync();
  await browserService.closeBrowser();
}

verifyAudioSync().catch(console.error);
