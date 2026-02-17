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
  'scripts/rename-to-phill.js',
];

// Patterns that should NOT be touched (API-specific, Google-specific URLs, etc.)
// We use original phill strings here because we want to preserve them if they appear.
const PRESERVE_PATTERNS = [
  /phill-\d+(\.\d+)?-(pro|flash|lite|pro-preview|flash-preview|flash-lite|base|exp|latest|001|super-duper)/g,
  /phill-(pro|flash|ultra|embedding|live|test-model|custom|standard|ignored|auth|report|evals|agent|conversation)/g,
  /https?:\/\/[^\s]*google[^\s]*phill[^\s]*/gi,
  /https?:\/\/ai\.google\.dev[^\s]*/gi,
  /https?:\/\/goo\.gle[^\s]*/gi,
  /generativelanguage\.googleapis\.com/g,
  /us-docker\.pkg\.dev\/phill-code-dev/g,
  /google\.gemini-cli-vscode-ide-companion/g,
  /gemini-diff/g,
  /phill\.diff/g,
  /google-phill\/phill-cli/g,
];

const REPLACEMENTS = [
  { from: /Phill CLI/g, to: 'Phill CLI' },
  { from: /Phill/g, to: 'Phill' },
  { from: /PHILL/g, to: 'PHILL' },
  { from: /phill-cli/g, to: 'phill-cli' },
  { from: /phill/g, to: 'phill' },
  { from: /@google\/phill-cli-core/g, to: 'phill-cli-core' },
  { from: /@google\/phill-cli/g, to: 'phill-cli' },
  { from: /@google\/phill/g, to: '@google/gemini' },
];

function processFile(filePath) {
  if (EXCLUDE_FILES.includes(filePath) || EXCLUDE_FILES.some(f => filePath.endsWith(f))) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Use placeholders for preserved strings
  const placeholders = [];
  let index = 0;
  
  PRESERVE_PATTERNS.forEach(regex => {
    content = content.replace(regex, (match) => {
      const placeholder = `__PRESERVE_${index}__`;
      placeholders.push({ placeholder, match });
      index++;
      return placeholder;
    });
  });

  // Perform replacements
  REPLACEMENTS.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });

  // Restore preserved strings
  placeholders.reverse().forEach(({ placeholder, match }) => {
    content = content.replace(new RegExp(placeholder, 'g'), match);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function renameFiles() {
  const files = globSync('**/*', { 
    nodir: true, 
    dot: true,
    ignore: EXCLUDE_DIRS.map(d => `${d}/**`) 
  }).filter(f => !EXCLUDE_FILES.includes(f));

  files.forEach(file => {
    const fileName = path.basename(file);
    let newFileName = fileName;

    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('phill')) {
      newFileName = fileName.replace(/phill/gi, (match) => {
        if (match === 'PHILL') return 'PHILL';
        if (match[0] === 'G') return 'Phill';
        return 'phill';
      });
    }

    if (newFileName !== fileName) {
      const newFilePath = path.join(path.dirname(file), newFileName);
      if (!fs.existsSync(newFilePath)) {
        fs.renameSync(file, newFilePath);
        console.log(`Renamed file: ${file} -> ${newFilePath}`);
        processFile(newFilePath);
      }
    } else {
      processFile(file);
    }
  });
}

function renameDirs() {
  const dirs = globSync('**/*/', { 
    dot: true,
    ignore: EXCLUDE_DIRS.map(d => `${d}/**`) 
  }).sort((a, b) => b.length - a.length);

  dirs.forEach(dir => {
    const dirName = path.basename(dir);
    if (dirName.toLowerCase().includes('phill')) {
      const newDirName = dirName.replace(/phill/gi, (match) => {
        if (match === '.phill') return '.phill';
        if (match === 'phill') return 'phill';
        if (match === 'PHILL') return 'PHILL';
        if (match[0] === 'G') return 'Phill';
        return 'phill';
      });
      const newDirPath = path.join(path.dirname(dir), newDirName);
      if (!fs.existsSync(newDirPath)) {
        fs.renameSync(dir, newDirPath);
        console.log(`Renamed directory: ${dir} -> ${newDirPath}`);
      }
    }
  });
}

console.log('Starting renaming process (Run 3)...');
renameFiles();
renameDirs();
console.log('Renaming complete!');
