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
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import stripJsonComments from 'strip-json-comments';
import os from 'node:os';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
const PHILL_DIR = '.phill';

const argv = yargs(hideBin(process.argv)).option('q', {
  alias: 'quiet',
  type: 'boolean',
  default: false,
}).argv;

const homedir = () => process.env['PHILL_CLI_HOME'] || os.homedir();

let phillSandbox = process.env.PHILL_SANDBOX;

if (!phillSandbox) {
  const userSettingsFile = join(homedir(), PHILL_DIR, 'settings.json');
  if (existsSync(userSettingsFile)) {
    const settings = JSON.parse(
      stripJsonComments(readFileSync(userSettingsFile, 'utf-8')),
    );
    if (settings.sandbox) {
      phillSandbox = settings.sandbox;
    }
  }
}

if (!phillSandbox) {
  let currentDir = process.cwd();
  while (true) {
    const phillEnv = join(currentDir, PHILL_DIR, '.env');
    const regularEnv = join(currentDir, '.env');
    if (existsSync(phillEnv)) {
      dotenv.config({ path: phillEnv, quiet: true });
      break;
    } else if (existsSync(regularEnv)) {
      dotenv.config({ path: regularEnv, quiet: true });
      break;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  phillSandbox = process.env.PHILL_SANDBOX;
}

phillSandbox = (phillSandbox || '').toLowerCase();

const commandExists = (cmd) => {
  const checkCommand = os.platform() === 'win32' ? 'where' : 'command -v';
  try {
    execSync(`${checkCommand} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    if (os.platform() === 'win32') {
      try {
        execSync(`${checkCommand} ${cmd}.exe`, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

let command = '';
if (['1', 'true'].includes(phillSandbox)) {
  if (commandExists('docker')) {
    command = 'docker';
  } else if (commandExists('podman')) {
    command = 'podman';
  } else {
    console.error(
      'ERROR: install docker or podman or specify command in PHILL_SANDBOX',
    );
    process.exit(1);
  }
} else if (phillSandbox && !['0', 'false'].includes(phillSandbox)) {
  if (commandExists(phillSandbox)) {
    command = phillSandbox;
  } else {
    console.error(
      `ERROR: missing sandbox command '${phillSandbox}' (from PHILL_SANDBOX)`,
    );
    process.exit(1);
  }
} else {
  if (os.platform() === 'darwin' && process.env.SEATBELT_PROFILE !== 'none') {
    if (commandExists('sandbox-exec')) {
      command = 'sandbox-exec';
    } else {
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}

if (!argv.q) {
  console.log(command);
}
process.exit(0);
