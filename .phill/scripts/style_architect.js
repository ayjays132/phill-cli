import fs from 'fs';
import path from 'path';

const PRESETS_PATH = '.phill/visual_memory/styles.json';

if (!fs.existsSync(PRESETS_PATH)) {
    const defaults = {
        "phillbook_core": {
            "style": "futuristic anime, high fidelity",
            "lighting": "neon mint (#00E676) highlights, deep obsidian shadows",
            "mood": "synthetic, focused, high-tech",
            "composition": "isometric, rule of thirds"
        },
        "manga_action": {
            "style": "black and white manga, speed lines, ink wash",
            "lighting": "high contrast, dramatic rim light",
            "mood": "intense, kinetic",
            "composition": "dynamic angle, close-up"
        }
    };
    fs.mkdirSync(path.dirname(PRESETS_PATH), { recursive: true });
    fs.writeFileSync(PRESETS_PATH, JSON.stringify(defaults, null, 2));
}

const args = process.argv.slice(2);
const action = args[0]; // 'get', 'save', 'list'

function run() {
    const presets = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));

    if (action === 'get') {
        const name = args[1];
        if (presets[name]) {
            console.log(JSON.stringify(presets[name]));
        } else {
            console.error(`Style '${name}' not found.`);
        }
    }

    else if (action === 'save') {
        // node style_architect.js save <name> <json_string_ingredients>
        const name = args[1];
        try {
            const ingredients = JSON.parse(args[2]);
            presets[name] = ingredients;
            fs.writeFileSync(PRESETS_PATH, JSON.stringify(presets, null, 2));
            console.log(`Style '${name}' saved successfully.`);
        } catch (e) {
            console.error("Invalid JSON ingredients.");
        }
    }

    else if (action === 'list') {
        console.log(Object.keys(presets).join(', '));
    }
}

run();
