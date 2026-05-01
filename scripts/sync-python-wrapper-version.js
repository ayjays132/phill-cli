/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();
const rootPackageJson = JSON.parse(
  readFileSync(resolve(rootDir, 'package.json'), 'utf-8'),
);
const version = rootPackageJson.version;
const checkOnly = process.argv.includes('--check');

const candidates = [
  {
    path: resolve(rootDir, 'python-wrapper', 'pyproject.toml'),
    pattern: /^version\s*=\s*["']([^"']+)["']/m,
    replace: `version = "${version}"`,
  },
  {
    path: resolve(rootDir, 'python-wrapper', 'setup.cfg'),
    pattern: /^version\s*=\s*(.+)$/m,
    replace: `version = ${version}`,
  },
];

let foundMetadata = false;
let hasMismatch = false;

for (const candidate of candidates) {
  if (!existsSync(candidate.path)) {
    continue;
  }

  foundMetadata = true;
  const current = readFileSync(candidate.path, 'utf-8');
  const match = current.match(candidate.pattern);

  if (!match) {
    console.warn(`No version field found in ${candidate.path}`);
    continue;
  }

  if (match[1] === version) {
    continue;
  }

  hasMismatch = true;
  if (checkOnly) {
    console.error(
      `${candidate.path} is ${match[1]}, expected root version ${version}.`,
    );
  } else {
    writeFileSync(
      candidate.path,
      current.replace(candidate.pattern, candidate.replace),
    );
    console.log(`Updated ${candidate.path} to ${version}`);
  }
}

if (!foundMetadata) {
  console.log('No Python wrapper package metadata found; nothing to sync.');
}

if (checkOnly && hasMismatch) {
  process.exit(1);
}
