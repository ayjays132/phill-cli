import fs from 'fs';
import path from 'path';

const LEDGER_PATH = '.phill/visual_memory/ledger.json';
const LEDGER_DIR = path.dirname(LEDGER_PATH);

// Ensure directory exists
if (!fs.existsSync(LEDGER_DIR)) {
    fs.mkdirSync(LEDGER_DIR, { recursive: true });
}

// Ensure ledger exists
if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify([], null, 2));
}

const args = process.argv.slice(2);
const action = args[0]; // 'log', 'list', 'find'

async function run() {
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));

    if (action === 'log') {
        // node visual_asset_manager.js log <filepath> <prompt> <style> <backend>
        const entry = {
            id: Date.now().toString(36),
            timestamp: new Date().toISOString(),
            filePath: args[1],
            prompt: args[2],
            style: args[3] || 'raw',
            backend: args[4] || 'unknown',
            metadata: {
                width: 1024,
                height: 1024
            }
        };
        ledger.unshift(entry);
        fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
        console.log(JSON.stringify({ status: 'success', id: entry.id, message: 'Asset logged to Neural Memory.' }));
    }

    else if (action === 'list') {
        const limit = parseInt(args[1]) || 5;
        console.log(JSON.stringify(ledger.slice(0, limit), null, 2));
    }

    else if (action === 'find') {
        const query = args[1].toLowerCase();
        const results = ledger.filter(item => item.prompt.toLowerCase().includes(query) || item.style.toLowerCase().includes(query));
        console.log(JSON.stringify(results, null, 2));
    }

    else {
        console.log("Usage: log | list | find");
    }
}

run();
