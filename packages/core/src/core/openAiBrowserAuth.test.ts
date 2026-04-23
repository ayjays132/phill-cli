/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeJwt(exp: number): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ exp })}.sig`;
}

describe('getOpenAIBrowserAccessToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('prefers a fresh Codex ChatGPT token before standalone OAuth storage', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const codexToken = makeJwt(futureExp);

    const readFileMock = vi.fn(async (filePath: string) => {
      if (
        filePath.endsWith('\\.codex\\auth.json') ||
        filePath.endsWith('/.codex/auth.json')
      ) {
        return JSON.stringify({
          auth_mode: 'chatgpt',
          tokens: {
            access_token: codexToken,
          },
        });
      }
      throw new Error('not found');
    });

    vi.doMock('node:fs', () => ({
      promises: {
        readFile: readFileMock,
        mkdir: vi.fn(),
        writeFile: vi.fn(),
        chmod: vi.fn(),
      },
    }));

    const { getOpenAIBrowserAccessToken } = await import('./openAiBrowserAuth.js');
    const token = await getOpenAIBrowserAccessToken(false, false);

    expect(token).toBe(codexToken);
  });
});
