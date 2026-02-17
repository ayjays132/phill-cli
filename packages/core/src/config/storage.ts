/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { PHILL_DIR, homedir } from '../utils/paths.js';

export const GOOGLE_ACCOUNTS_FILENAME = 'google_accounts.json';
export const OAUTH_FILE = 'oauth_creds.json';
const TMP_DIR_NAME = 'tmp';
const BIN_DIR_NAME = 'bin';

export class Storage {
  private readonly targetDir: string;

  constructor(targetDir: string) {
    this.targetDir = targetDir;
  }

  static getGlobalPhillDir(): string {
    const homeDir = homedir();
    if (!homeDir) {
      return path.join(os.tmpdir(), PHILL_DIR);
    }
    return path.join(homeDir, PHILL_DIR);
  }

  static getMcpOAuthTokensPath(): string {
    return path.join(Storage.getGlobalPhillDir(), 'mcp-oauth-tokens.json');
  }

  static getGlobalSettingsPath(): string {
    return path.join(Storage.getGlobalPhillDir(), 'settings.json');
  }

  static getInstallationIdPath(): string {
    return path.join(Storage.getGlobalPhillDir(), 'installation_id');
  }

  static getGoogleAccountsPath(): string {
    return path.join(Storage.getGlobalPhillDir(), GOOGLE_ACCOUNTS_FILENAME);
  }

  static getUserCommandsDir(): string {
    return path.join(Storage.getGlobalPhillDir(), 'commands');
  }

  static getUserSkillsDir(): string {
    return path.join(Storage.getGlobalPhillDir(), 'skills');
  }

  static getGlobalMemoryFilePath(): string {
    return path.join(Storage.getGlobalPhillDir(), 'memory.md');
  }

  static getAgentIdentityFilePath(): string {
    return path.join(Storage.getGlobalPhillDir(), 'PhillSelfIdentity.md');
  }

  static getUserPoliciesDir(): string {
    return path.join(Storage.getGlobalPhillDir(), 'policies');
  }

  static getUserAgentsDir(): string {
    return path.join(Storage.getGlobalPhillDir(), 'agents');
  }

  static getAcknowledgedAgentsPath(): string {
    return path.join(
      Storage.getGlobalPhillDir(),
      'acknowledgments',
      'agents.json',
    );
  }

  private static getSystemConfigDir(): string {
    if (os.platform() === 'darwin') {
      return '/Library/Application Support/PhillCli';
    } else if (os.platform() === 'win32') {
      return 'C:\\ProgramData\\phill-cli';
    } else {
      return '/etc/phill-cli';
    }
  }

  static getSystemSettingsPath(): string {
    if (process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH']) {
      return process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH'];
    }
    return path.join(Storage.getSystemConfigDir(), 'settings.json');
  }

  static getSystemPoliciesDir(): string {
    return path.join(Storage.getSystemConfigDir(), 'policies');
  }

  static getGlobalTempDir(): string {
    return path.join(Storage.getGlobalPhillDir(), TMP_DIR_NAME);
  }

  static getGlobalBinDir(): string {
    return path.join(Storage.getGlobalTempDir(), BIN_DIR_NAME);
  }

  getPhillDir(): string {
    return path.join(this.targetDir, PHILL_DIR);
  }

  getProjectTempDir(): string {
    const hash = this.getFilePathHash(this.getProjectRoot());
    const tempDir = Storage.getGlobalTempDir();
    return path.join(tempDir, hash);
  }

  ensureProjectTempDirExists(): void {
    fs.mkdirSync(this.getProjectTempDir(), { recursive: true });
  }

  static getOAuthCredsPath(): string {
    return path.join(Storage.getGlobalPhillDir(), OAUTH_FILE);
  }

  getProjectRoot(): string {
    return this.targetDir;
  }

  private getFilePathHash(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex');
  }

  getHistoryDir(): string {
    const hash = this.getFilePathHash(this.getProjectRoot());
    const historyDir = path.join(Storage.getGlobalPhillDir(), 'history');
    return path.join(historyDir, hash);
  }

  getWorkspaceSettingsPath(): string {
    return path.join(this.getPhillDir(), 'settings.json');
  }

  getProjectCommandsDir(): string {
    return path.join(this.getPhillDir(), 'commands');
  }

  getProjectSkillsDir(): string {
    return path.join(this.getPhillDir(), 'skills');
  }

  getProjectAgentsDir(): string {
    return path.join(this.getPhillDir(), 'agents');
  }

  getProjectTempCheckpointsDir(): string {
    return path.join(this.getProjectTempDir(), 'checkpoints');
  }

  getProjectTempLogsDir(): string {
    return path.join(this.getProjectTempDir(), 'logs');
  }

  getProjectTempPlansDir(): string {
    return path.join(this.getProjectTempDir(), 'plans');
  }

  getExtensionsDir(): string {
    return path.join(this.getPhillDir(), 'extensions');
  }

  getExtensionsConfigPath(): string {
    return path.join(this.getExtensionsDir(), 'phill-extension.json');
  }

  getHistoryFilePath(): string {
    return path.join(this.getProjectTempDir(), 'shell_history');
  }
}
