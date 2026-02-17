const fs = require('fs');
const path = './package.json';
let content = fs.readFileSync(path, 'utf8');

// Purge the corrupted lines injected by PowerShell
content = content.replace(/"start": "npm run dev:hot",`n    "start:legacy": "cross-env NODE_ENV=development node scripts\/start.js",/g, '');
content = content.replace(/"start": "npm run dev:hot",`n    "start:legacy": "cross-env NODE_ENV=development node scripts\/start.js",/g, '');

// Save clean version
fs.writeFileSync(path, content);

// Parse and re-apply correctly
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.scripts.start = 'npm run dev:hot';
pkg.scripts['start:legacy'] = 'cross-env NODE_ENV=development node scripts/start.js';

fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
console.log('Package.json fixed and hot-reload enabled by default.');
