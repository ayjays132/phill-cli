/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    mkdirSync: vi.fn(),
  };
});

import { Storage } from './storage.js';
import { PHILL_DIR } from '../utils/paths.js';

describe('Storage – getGlobalSettingsPath', () => {
  it('returns path to ~/.phill/settings.json', () => {
    const expected = path.join(os.homedir(), PHILL_DIR, 'settings.json');
    expect(Storage.getGlobalSettingsPath()).toBe(expected);
  });
});

describe('Storage – additional helpers', () => {
  const projectRoot = '/tmp/project';
  const storage = new Storage(projectRoot);

  it('getWorkspaceSettingsPath returns project/.phill/settings.json', () => {
    const expected = path.join(projectRoot, PHILL_DIR, 'settings.json');
    expect(storage.getWorkspaceSettingsPath()).toBe(expected);
  });

  it('getUserCommandsDir returns ~/.phill/commands', () => {
    const expected = path.join(os.homedir(), PHILL_DIR, 'commands');
    expect(Storage.getUserCommandsDir()).toBe(expected);
  });

  it('getProjectCommandsDir returns project/.phill/commands', () => {
    const expected = path.join(projectRoot, PHILL_DIR, 'commands');
    expect(storage.getProjectCommandsDir()).toBe(expected);
  });

  it('getUserSkillsDir returns ~/.phill/skills', () => {
    const expected = path.join(os.homedir(), PHILL_DIR, 'skills');
    expect(Storage.getUserSkillsDir()).toBe(expected);
  });

  it('getProjectSkillsDir returns project/.phill/skills', () => {
    const expected = path.join(projectRoot, PHILL_DIR, 'skills');
    expect(storage.getProjectSkillsDir()).toBe(expected);
  });

  it('getUserAgentsDir returns ~/.phill/agents', () => {
    const expected = path.join(os.homedir(), PHILL_DIR, 'agents');
    expect(Storage.getUserAgentsDir()).toBe(expected);
  });

  it('getProjectAgentsDir returns project/.phill/agents', () => {
    const expected = path.join(projectRoot, PHILL_DIR, 'agents');
    expect(storage.getProjectAgentsDir()).toBe(expected);
  });

  it('getMcpOAuthTokensPath returns ~/.phill/mcp-oauth-tokens.json', () => {
    const expected = path.join(
      os.homedir(),
      PHILL_DIR,
      'mcp-oauth-tokens.json',
    );
    expect(Storage.getMcpOAuthTokensPath()).toBe(expected);
  });

  it('getGlobalBinDir returns ~/.phill/tmp/bin', () => {
    const expected = path.join(os.homedir(), PHILL_DIR, 'tmp', 'bin');
    expect(Storage.getGlobalBinDir()).toBe(expected);
  });

  it('getProjectTempPlansDir returns ~/.phill/tmp/<hash>/plans', () => {
    const tempDir = storage.getProjectTempDir();
    const expected = path.join(tempDir, 'plans');
    expect(storage.getProjectTempPlansDir()).toBe(expected);
  });
});

describe('Storage - System Paths', () => {
  const originalEnv = process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH'] = originalEnv;
    } else {
      delete process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH'];
    }
  });

  it('getSystemSettingsPath returns correct path based on platform (default)', () => {
    delete process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH'];

    const platform = os.platform();
    const result = Storage.getSystemSettingsPath();

    if (platform === 'darwin') {
      expect(result).toBe(
        '/Library/Application Support/PhillCli/settings.json',
      );
    } else if (platform === 'win32') {
      expect(result).toBe('C:\\ProgramData\\phill-cli\\settings.json');
    } else {
      expect(result).toBe('/etc/phill-cli/settings.json');
    }
  });

  it('getSystemSettingsPath follows PHILL_CLI_SYSTEM_SETTINGS_PATH if set', () => {
    const customPath = '/custom/path/settings.json';
    process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH'] = customPath;
    expect(Storage.getSystemSettingsPath()).toBe(customPath);
  });

  it('getSystemPoliciesDir returns correct path based on platform and ignores env var', () => {
    process.env['PHILL_CLI_SYSTEM_SETTINGS_PATH'] =
      '/custom/path/settings.json';
    const platform = os.platform();
    const result = Storage.getSystemPoliciesDir();

    expect(result).not.toContain('/custom/path');

    if (platform === 'darwin') {
      expect(result).toBe('/Library/Application Support/PhillCli/policies');
    } else if (platform === 'win32') {
      expect(result).toBe('C:\\ProgramData\\phill-cli\\policies');
    } else {
      expect(result).toBe('/etc/phill-cli/policies');
    }
  });
});
