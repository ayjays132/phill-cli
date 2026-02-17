import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLE_PATH = path.join(__dirname, '../bundle/phill.js');
const SUCCESS_SIGNAL_PATH = path.join(__dirname, '../.build_success');
let agentProcess = null;
let isRestarting = false;
let lastKnownHash = ''; // Initialize lastKnownHash

function startAgent() {
  if (agentProcess) {
    console.log('\n[SENTINEL] Build Success Detected. Rebooting Phill...');
    agentProcess.kill('SIGTERM');
  } else {
    console.log('[SENTINEL] Initializing Phill Continuity Engine...');
  }

  // Use stdio: inherit to keep the terminal interactive
  // We use the bundle path for execution
  agentProcess = spawn('node', [BUNDLE_PATH], { 
    stdio: 'inherit',
    env: { ...process.env, PHILL_HOT_RELOAD: 'true' }
  });

  agentProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('[SENTINEL] Phill has exited gracefully. Shutting down continuity engine...');
      process.exit(0);
    }
    if (!isRestarting && code !== null) {
      console.log(`[SENTINEL] Agent exited with code ${code}. Waiting for fix...`);
    }
    isRestarting = false;
  });
}

// Watch the .build_success file for changes
// This ensures we only restart when the build is actually successful
let watchTimeout = null;

// Initialize lastKnownHash on startup
if (fs.existsSync(SUCCESS_SIGNAL_PATH)) {
  lastKnownHash = fs.readFileSync(SUCCESS_SIGNAL_PATH, 'utf-8');
} else {
  // Create the file if it doesn't exist, and write an empty string or initial hash
  fs.writeFileSync(SUCCESS_SIGNAL_PATH, ''); 
}


fs.watch(SUCCESS_SIGNAL_PATH, (event) => {
  if (event === 'change' || event === 'rename') {
    if (watchTimeout) clearTimeout(watchTimeout);
    watchTimeout = setTimeout(() => {
      const newHash = fs.readFileSync(SUCCESS_SIGNAL_PATH, 'utf-8');
      if (newHash !== lastKnownHash) {
        lastKnownHash = newHash;
        isRestarting = true;
        startAgent();
      } else {
        console.log('[SENTINEL] Build signal received, but bundle content hash is unchanged. Skipping restart.');
      }
    }, 1000); // Increased debounce for signal file to allow system to settle
  }
});

// Initial start of the agent
startAgent();
