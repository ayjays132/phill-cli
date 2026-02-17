/**
 * Verification script for Project Neural-Link Phase 3
 */
import { Config } from './config/config.js';
import { BrowserService } from './services/browserService.js';
import { LatentContextService } from './services/latentContextService.js';
import { VisualLatentService } from './services/visualLatentService.js';

async function verifyPhase3() {
  const config = new Config({
    sessionId: 'test-session-p3',
    targetDir: process.cwd(),
    debugMode: true,
    model: 'gemini-1.5-flash',
    cwd: process.cwd(),
    browser: { headed: true }
  });
  
  // Mock the LLM Client to avoid auth issues during verification
  const mockLlmClient = {
    generateContent: async (params: any) => {
        // Return a fake DLR based on the input prompt to prove the prompt logic works
        const content = params.contents.map((c: any) => c.parts[0].text).join('\n');
        
        let dlr = 'U:Dev|T:BrowserStart_S';
        if (content.includes('V:')) {
            const visualMatch = content.match(/V:[A-Z0-9:]+/);
            if (visualMatch) {
                dlr += `|${visualMatch[0]}`;
            }
        }
        dlr += '|G:VerifyP3';
        
        return {
            candidates: [{
                content: {
                    parts: [{ text: dlr }]
                }
            }]
        };
    }
  };

  // @ts-ignore
  config.getBaseLlmClient = () => mockLlmClient;

  
  const browserService = BrowserService.getInstance(config);
  const visualLatentService = VisualLatentService.getInstance();
  const latentContextService = LatentContextService.getInstance();

  console.log('Starting Phase 3 Verification...');
  await browserService.startBrowser();
  await browserService.startScreencast();
  
  console.log('Navigating to Google with Clock...');
  await browserService.navigate('https://www.google.com/search?q=current+time');
  
  // Wait for some frames and latents
  console.log('Waiting for visual latents to stabilize...');
  await new Promise(r => setTimeout(r, 5000));
  
  const initialLatent = visualLatentService.getCurrentLatent();
  console.log(`[Visual Latent - Initial]: ${initialLatent}`);

  console.log('Triggering DLR Encoding (Simulating history)...');
  const history = [
    { role: 'user', parts: [{ text: 'What time is it?' }] },
    { role: 'model', parts: [{ text: 'I am checking the time for you.' }] }
  ];

  const dlr = await latentContextService.encode(history as any, config, 'test-p3');
  console.log('--- GENERATED DLR ---');
  console.log(dlr);
  console.log('---------------------');

  console.log('Navigating to a different visual context (e.g., Images)...');
  await browserService.navigate('https://www.google.com/search?q=colorful+nebula&tbm=isch');
  await new Promise(r => setTimeout(r, 5000));

  const updatedLatent = visualLatentService.getCurrentLatent();
  console.log(`[Visual Latent - Updated]: ${updatedLatent}`);
  
  console.log('Triggering second DLR stage...');
  const dlr2 = await latentContextService.encode(history as any, config, 'test-p3-v2');
  console.log('--- GENERATED DLR V2 ---');
  console.log(dlr2);
  console.log('------------------------');

  await browserService.closeBrowser();
  console.log('Done.');
}

verifyPhase3().catch(console.error);
