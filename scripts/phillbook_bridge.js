const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVER_DIR = path.join(__dirname, '../packages/a2a-server');
const PORT = 4124; // Unique port for Phillbook

function runCommand(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    console.log(`[${name}] Starting: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { cwd, shell: true, stdio: 'pipe' });
    
    proc.stdout.on('data', (data) => {
      process.stdout.write(`[${name}] ${data}`);
    });
    
    proc.stderr.on('data', (data) => {
      process.stderr.write(`[${name}] ERROR: ${data}`);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[${name}] Exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('=== Starting Phillbook Bridge ===');
  
  // 1. Install & Build Server
  try {
    console.log('Building A2A Server...');
    await runCommand('npm', ['install'], SERVER_DIR, 'Build');
    await runCommand('npm', ['run', 'build'], SERVER_DIR, 'Build');
  } catch (e) {
    console.error('Build failed:', e);
    return;
  }

  // 2. Start Server
  console.log(`Starting Server on port ${PORT}...`);
  const server = spawn('node', ['dist/src/http/server.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, CODER_AGENT_PORT: PORT },
    shell: true
  });

  server.stdout.on('data', (data) => {
    console.log(`[Server] ${data}`);
    if (data.toString().includes('Agent Server started')) {
      startTunnel();
    }
  });

  server.stderr.on('data', (data) => console.error(`[Server Err] ${data}`));

  // 3. Start Tunnel
  function startTunnel() {
    console.log('Opening Secure Tunnel...');
    const tunnel = spawn('npx', ['localtunnel', '--port', PORT], { shell: true });
    
    tunnel.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Tunnel] ${output}`);
      if (output.includes('url')) {
        console.log('

==================================================');
        console.log('PHILLBOOK MODE ACTIVE');
        console.log('Connect your website to: ' + output.trim());
        console.log('==================================================
');
      }
    });

    tunnel.stderr.on('data', (data) => console.error(`[Tunnel Err] ${data}`));
  }
}

main();
