import fs from 'fs';
import https from 'https';
import { execSync } from 'child_process';

const args = process.argv.slice(2);

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token.startsWith('--')) {
            const key = token.slice(2);
            const next = argv[i + 1];
            if (next && !next.startsWith('--')) {
                out[key] = next;
                i += 1;
            } else {
                out[key] = true;
            }
        }
    }
    return out;
}

function hasCommand(command) {
    try {
        const probe = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
        execSync(probe, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const cli = parseArgs(args);
const prompt = cli.prompt || args[0] || "A cybernetic cat in a futuristic software base";
const aspectRatio = cli.aspectRatio || args[1] || "1:1";

async function run() {
    console.log(`[NanoBananaSynth] Initiating synthesis for: "${prompt.substring(0, 30)}..."`);

    // --- STRATEGY 1: GEMINI API (API KEY) ---
    const apiKey = process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY'];
    if (apiKey) {
        console.log("> Attempting Strategy 1: Gemini API...");
        const result = await callGeminiAPI(apiKey, prompt, aspectRatio);
        if (result) return finalize(result, 'gemini-api');
    }

    // --- STRATEGY 2: VERTEX AI (GCLOUD AUTH) ---
    if (hasCommand('gcloud')) {
        try {
            console.log("> Attempting Strategy 2: Vertex AI (GCloud)...");
            const projectId = execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
            const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
            if (projectId && token) {
                const result = await callVertexAI(projectId, token, prompt, aspectRatio);
                if (result) return finalize(result, 'vertex-ai');
            }
        } catch (e) {
            console.warn("Strategy 2 Bypassed: GCloud not configured.");
        }
    } else {
        console.warn("Strategy 2 Bypassed: gcloud CLI not installed.");
    }

    // --- STRATEGY 3: BANANA.DEV ---
    const bananaKey = process.env['BANANA_API_KEY'];
    if (bananaKey) {
        console.log("> Attempting Strategy 3: Banana.dev...");
        // Simulation for now
    }

    console.error(
        "CRITICAL: All synthesis strategies exhausted. Use native CLI tools (`phillament` / `image_generation_imagen`) for OAuth-aware routing, or set GOOGLE_API_KEY / GEMINI_API_KEY."
    );
}

async function callGeminiAPI(key, prompt, ratio) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`;
    const payload = JSON.stringify({
        instances: [{ prompt }],
        parameters: { aspectRatio: ratio }
    });
    return postRequest(url, payload, { 'Content-Type': 'application/json' });
}

async function callVertexAI(project, token, prompt, ratio) {
    const location = "us-central1";
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagegeneration@006:predict`;
    const payload = JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: ratio }
    });
    return postRequest(url, payload, { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });
}

function postRequest(url, payload, headers) {
    return new Promise((resolve) => {
        const options = { method: 'POST', headers: { ...headers, 'Content-Length': payload.length } };
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.predictions?.[0]?.bytesBase64Encoded) {
                        resolve(parsed.predictions[0].bytesBase64Encoded);
                    } else {
                        console.error("API Response Error:", data);
                        resolve(null);
                    }
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.write(payload);
        req.end();
    });
}

function finalize(base64, backend) {
    console.log(`SYNTHESIS SUCCESS via ${backend}`);
    fs.writeFileSync('output_synthesis.txt', base64);
    console.log("Result stored in output_synthesis.txt");
}

run();
