import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const ROOT_DIR = process.cwd();

const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'bundle',
  'packages/cli/dist',
  'packages/core/dist',
  'packages/a2a-server/dist',
];

const EXCLUDE_FILES = [
  'package-lock.json',
  'scripts/revert-phill-to-gemini.js', // This script itself
];

const REVERSIONS = [
  { from: /PHILL_API_KEY/g, to: 'PHILL_API_KEY' },
  { from: /AuthType\.USE_PHILL/g, to: 'AuthType.USE_GEMINI' },
  { from: /gemini-api-key/g, to: 'gemini-api-key' },
  { from: /PHILL_CLI_HOME/g, to: 'PHILL_CLI_HOME' },

  // Model-related reverts
  { from: /DEFAULT_PHILL_MODEL_AUTO/g, to: 'DEFAULT_PHILL_MODEL_AUTO' },
  { from: /DEFAULT_PHILL_MODEL/g, to: 'DEFAULT_PHILL_MODEL' },
  { from: /DEFAULT_PHILL_FLASH_MODEL/g, to: 'DEFAULT_PHILL_FLASH_MODEL' },
  { from: /DEFAULT_PHILL_FLASH_LITE_MODEL/g, to: 'DEFAULT_PHILL_FLASH_LITE_MODEL' },
  { from: /DEFAULT_PHILL_EMBEDDING_MODEL/g, to: 'DEFAULT_PHILL_EMBEDDING_MODEL' },
  { from: /PREVIEW_PHILL_MODEL_AUTO/g, to: 'PREVIEW_PHILL_MODEL_AUTO' },
  { from: /PREVIEW_PHILL_MODEL/g, to: 'PREVIEW_PHILL_MODEL' },
  { from: /PREVIEW_PHILL_FLASH_MODEL/g, to: 'PREVIEW_PHILL_FLASH_MODEL' },
  { from: /VALID_PHILL_MODELS/g, to: 'VALID_PHILL_MODELS' },
  { from: /PHILL_MODEL_ALIAS_AUTO/g, to: 'PHILL_MODEL_ALIAS_AUTO' },
  { from: /PHILL_MODEL_ALIAS_PRO/g, to: 'PHILL_MODEL_ALIAS_PRO' },
  { from: /PHILL_MODEL_ALIAS_FLASH/g, to: 'PHILL_MODEL_ALIAS_FLASH' },
  { from: /PHILL_MODEL_ALIAS_FLASH_LITE/g, to: 'PHILL_MODEL_ALIAS_FLASH_LITE' },
  { from: /isPhill2Model/g, to: 'isPhill2Model' },
  { from: /model\.startsWith\('phill-3-'\)/g, to: "model.startsWith('gemini-3-')" },
  { from: /phill-2(\.|$)/g, to: "gemini-2($1)" }, // For regex patterns

  // Other specific reverts
  { from: /GEMINI_IGNORE_FILE_NAME/g, to: 'GEMINI_IGNORE_FILE_NAME' },
  { from: /respectGeminiIgnore/g, to: 'respectGeminiIgnore' },

  // Package name reverts
  { from: /@phill\/phill-cli-core/g, to: 'phill-cli-core' },
  { from: /@phill\/phill-cli/g, to: 'phill-cli' },
  { from: /@phill\/phill/g, to: '@google/gemini' },
  { from: /gemini-cli-vscode-ide-companion/g, to: 'gemini-cli-vscode-ide-companion' },
  { from: /"phill": "bundle\/phill.js"/g, to: '"gemini": "bundle/gemini.js"' },
];

function processFile(filePath) {
  // Ensure the script itself is not processed
  if (EXCLUDE_FILES.includes(path.basename(filePath)) || EXCLUDE_FILES.some(f => filePath.endsWith(f))) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  REVERSIONS.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Reverted: ${filePath}`);
  }
}

function processFiles() {
  const files = globSync('**/*', {
    nodir: true,
    dot: true,
    ignore: EXCLUDE_DIRS.map(d => `${d}/**`)
  }).filter(f => !EXCLUDE_FILES.includes(f));

  files.forEach(file => {
    processFile(file);
  });
}

console.log('Starting targeted reversion process (Phill to Gemini API/Model names and package names)...');
processFiles();
console.log('Reversion complete!');

