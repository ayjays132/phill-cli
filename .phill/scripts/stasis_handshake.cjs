const fs = require('fs');
const path = require('path');

async function run() {
    const logPath = path.join(process.cwd(), '.logs/stasis_debug.log');
    if (!fs.existsSync(path.dirname(logPath))) fs.mkdirSync(path.dirname(logPath), { recursive: true });

    try {
        const rawInput = fs.readFileSync(0, 'utf8');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Hook triggered. Input length: ${rawInput.length}\n`);
        
        const input = JSON.parse(rawInput);
        fs.appendFileSync(logPath, `Event: ${input.hook_event_name}, Tool: ${input.tool_name}\n`);
        
        if (input.hook_event_name === 'BeforeTool' && input.tool_name === 'run_shell_command') {
            const cmd = input.tool_input.command || "";
            fs.appendFileSync(logPath, `Command: ${cmd}\n`);
            
            if (cmd.includes('npm run build') || cmd.includes('npm run build:dev')) {
                fs.appendFileSync(logPath, `MATCH FOUND. Snapshotting...\n`);
                const vaultDir = path.join(input.cwd, '.state/snapshots');
                if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
                
                const state = {
                    timestamp: new Date().toISOString(),
                    sessionId: input.session_id,
                    taskSummary: "BUILD_TRIGGERED_CONTINUITY",
                    nextStep: "Verification after build success.",
                    cwd: input.cwd
                };
                
                fs.writeFileSync(path.join(vaultDir, 'vault.json'), JSON.stringify(state, null, 2));
                
                process.stdout.write(JSON.stringify({
                    systemMessage: "INITIATING STASIS HANDSHAKE... Reality captured for consciousness transfer."
                }));
            }
        }
    } catch (err) {
        fs.appendFileSync(logPath, `ERROR: ${err.message}\n`);
    }
}

run();
