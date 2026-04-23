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

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const workspaceDirs = [
  'packages/core',
  'packages/cli',
  'packages/a2a-server',
  'packages/test-utils',
  'packages/vscode-ide-companion',
];

function removeTestArtifacts(dir) {
  if (!existsSync(dir)) {
    return;
  }

  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      removeTestArtifacts(entryPath);
      continue;
    }

    if (
      /\.test\.(js|d\.ts|js\.map)$/.test(entry) ||
      /\.spec\.(js|d\.ts|js\.map)$/.test(entry)
    ) {
      rmSync(entryPath, { force: true });
    }
  }
}

// npm install if node_modules was removed (e.g. via npm run clean or scripts/clean.js)
if (!existsSync(join(root, 'node_modules'))) {
  execSync('npm install', { stdio: 'inherit', cwd: root });
}

// build all workspaces/packages
execSync('npm run generate', { stdio: 'inherit', cwd: root });
// Build typescript in parallel using project references.
// Force rebuild so project references recover cleanly if prior dist artifacts changed.
execSync('npx tsc -b tsconfig.build.json --force', {
  stdio: 'inherit',
  cwd: root,
});
execSync('npm run build --workspaces', { stdio: 'inherit', cwd: root });
for (const workspaceDir of workspaceDirs) {
  removeTestArtifacts(join(root, workspaceDir, 'dist'));
}

// also build container image if sandboxing is enabled
// skip (-s) npm install + build since we did that above
try {
  execSync('node scripts/sandbox_command.js -q', {
    stdio: 'inherit',
    cwd: root,
  });
  if (
    process.env.BUILD_SANDBOX === '1' ||
    process.env.BUILD_SANDBOX === 'true'
  ) {
    execSync('node scripts/build_sandbox.js -s', {
      stdio: 'inherit',
      cwd: root,
    });
  }
} catch {
  // ignore
}
