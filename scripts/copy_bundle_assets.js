/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { copyFileSync, existsSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const bundleDir = join(root, 'bundle');

// Create the bundle directory if it doesn't exist
if (!existsSync(bundleDir)) {
  mkdirSync(bundleDir);
}

// 1. Copy Sandbox definitions (.sb)
const sbFiles = glob.sync('packages/**/*.sb', { cwd: root });
for (const file of sbFiles) {
  copyFileSync(join(root, file), join(bundleDir, basename(file)));
}

// 2. Copy Policy definitions (.toml)
const policyDir = join(bundleDir, 'policies');
if (!existsSync(policyDir)) {
  mkdirSync(policyDir);
}

// Locate policy files specifically in the core package
const policyFiles = glob.sync('packages/core/src/policy/policies/*.toml', {
  cwd: root,
});

for (const file of policyFiles) {
  copyFileSync(join(root, file), join(policyDir, basename(file)));
}

console.log(`Copied ${policyFiles.length} policy files to bundle/policies/`);

// 3. Copy Documentation (docs/)
const docsSrc = join(root, 'docs');
const docsDest = join(bundleDir, 'docs');
if (existsSync(docsSrc)) {
  cpSync(docsSrc, docsDest, { recursive: true, dereference: true });
  console.log('Copied docs to bundle/docs/');
}

// 4. Copy Built-in Skills (packages/core/src/skills/builtin)
const builtinSkillsSrc = join(root, 'packages/core/src/skills/builtin');
const builtinSkillsDest = join(bundleDir, 'builtin');
if (existsSync(builtinSkillsSrc)) {
  cpSync(builtinSkillsSrc, builtinSkillsDest, {
    recursive: true,
    dereference: true,
  });
  console.log('Copied built-in skills to bundle/builtin/');
}

// 5. Copy FFmpeg and FFplay binaries
try {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  
  // Resolve ffmpeg-static
  const ffmpegPath = require('ffmpeg-static');
  if (ffmpegPath && existsSync(ffmpegPath)) {
    const dest = join(bundleDir, basename(ffmpegPath));
    copyFileSync(ffmpegPath, dest);
    console.log(`Copied ffmpeg to ${dest}`);
  }

  // Resolve ffplay-static
  const ffplayStatic = require('ffplay-static');
  const ffplayPath = typeof ffplayStatic === 'string' ? ffplayStatic : ffplayStatic.default || ffplayStatic.path;
  if (ffplayPath && existsSync(ffplayPath)) {
    const dest = join(bundleDir, basename(ffplayPath));
    copyFileSync(ffplayPath, dest);
    console.log(`Copied ffplay to ${dest}`);
  }
} catch (error) {
  console.warn('Warning: Could not copy ffmpeg/ffplay binaries:', error.message);
}

console.log('Assets copied to bundle/');
