/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A script to handle versioning and ensure all related changes are in a single, atomic commit.

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function setInternalDependencyVersions(packageJson, workspaceNames, version) {
  for (const dependencyType of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const dependencies = packageJson[dependencyType];
    if (!dependencies) {
      continue;
    }

    for (const workspaceName of workspaceNames) {
      const current = dependencies[workspaceName];
      if (current && !current.startsWith('file:')) {
        dependencies[workspaceName] = version;
      }
    }
  }
}

// 1. Get the version type from the command line arguments.
const versionType = process.argv[2];
if (!versionType) {
  console.error('Error: No version type specified.');
  console.error('Usage: npm run version <patch|minor|major|prerelease>');
  process.exit(1);
}

// 2. Get all workspaces and filter out the one we don't want to version.
const workspacesToExclude = [];
const rootPackageJson = readJson(resolve(process.cwd(), 'package.json'));
const workspacePackages = rootPackageJson.workspaces.flatMap((workspacePattern) => {
  if (!workspacePattern.endsWith('/*')) {
    const workspacePath = resolve(process.cwd(), workspacePattern);
    return [{ path: workspacePath, packageJsonPath: resolve(workspacePath, 'package.json') }];
  }

  const workspaceRoot = resolve(process.cwd(), workspacePattern.slice(0, -2));
  return readdirSync(workspaceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(workspaceRoot, entry.name))
    .map((workspacePath) => ({
      path: workspacePath,
      packageJsonPath: resolve(workspacePath, 'package.json'),
    }))
    .filter(({ packageJsonPath }) => existsSync(packageJsonPath));
});
const workspacePackageJsons = workspacePackages.map((workspace) => ({
  ...workspace,
  packageJson: readJson(workspace.packageJsonPath),
}));
const workspacesToVersion = workspacePackageJsons.filter(
  ({ packageJson }) => !workspacesToExclude.includes(packageJson.name),
);
const workspaceNames = workspacesToVersion.map(({ packageJson }) => packageJson.name);

// 3. Bump the root package and capture the exact version npm resolves for patch/minor/major.
run(`npm version ${versionType} --no-git-tag-version --allow-same-version`);
const rootPackageJsonPath = resolve(process.cwd(), 'package.json');
const newVersion = readJson(rootPackageJsonPath).version;

for (const { packageJsonPath, packageJson } of workspacesToVersion) {
  packageJson.version = newVersion;
  setInternalDependencyVersions(packageJson, workspaceNames, newVersion);
  writeJson(packageJsonPath, packageJson);
  console.log(`Updated ${packageJson.name} to ${newVersion}`);
}

// 4. Update the sandboxImageUri in the root package.json
const updatedRootPackageJson = readJson(rootPackageJsonPath);
setInternalDependencyVersions(updatedRootPackageJson, workspaceNames, newVersion);
if (updatedRootPackageJson.config?.sandboxImageUri) {
  updatedRootPackageJson.config.sandboxImageUri =
    updatedRootPackageJson.config.sandboxImageUri.replace(
      /:.*$/,
      `:${newVersion}`,
    );
  console.log(`Updated sandboxImageUri in root to use version ${newVersion}`);
  writeJson(rootPackageJsonPath, updatedRootPackageJson);
}

// 5. Update the sandboxImageUri in the cli package.json
const cliPackageJsonPath = resolve(process.cwd(), 'packages/cli/package.json');
const cliPackageJson = readJson(cliPackageJsonPath);
if (cliPackageJson.config?.sandboxImageUri) {
  cliPackageJson.config.sandboxImageUri =
    cliPackageJson.config.sandboxImageUri.replace(/:.*$/, `:${newVersion}`);
  console.log(
    `Updated sandboxImageUri in cli package to use version ${newVersion}`,
  );
  writeJson(cliPackageJsonPath, cliPackageJson);
}

// 6. Run `npm install` to update package-lock.json.
run(
  'npm install --workspace packages/cli --workspace packages/core --package-lock-only',
);

console.log(`Successfully bumped versions to v${newVersion}.`);
