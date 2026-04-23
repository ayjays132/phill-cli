/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetInternalDocsTool } from './get-internal-docs.js';
import { ToolErrorType } from './tool-error.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockMessageBus } from '../test-utils/mock-message-bus.js';
import { glob } from 'glob';

vi.mock('node:fs/promises');
vi.mock('glob');
vi.mock('node:url', () => ({
  fileURLToPath: vi.fn().mockImplementation((url) => {
    // Return an absolute path that looks like it's in the current workspace
    return path.resolve('src/tools/get-internal-docs.ts');
  }),
}));

describe('GetInternalDocsTool (Integration)', () => {
  let tool: GetInternalDocsTool;
  const abortSignal = new AbortController().signal;

  beforeEach(() => {
    tool = new GetInternalDocsTool(createMockMessageBus());
    vi.clearAllMocks();

    // Mock finding the docs root
    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      if (p.toString().endsWith('docs')) {
        return { isDirectory: () => true } as any;
      }
      throw new Error('Not found');
    });
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });

  it('should find the documentation root and list files', async () => {
    vi.mocked(glob).mockResolvedValue(['index.md', 'api.md'] as any);

    const invocation = tool.build({});
    const result = await invocation.execute(abortSignal);

    expect(result.error).toBeUndefined();
    expect(result.returnDisplay).toMatch(/Found 2 documentation files/);
    expect(result.llmContent).toContain('index.md');
    expect(result.llmContent).toContain('api.md');
  });

  it('should read a specific documentation file', async () => {
    vi.mocked(glob).mockResolvedValue(['index.md'] as any);
    const expectedContent = 'Mock index content';
    vi.mocked(fs.readFile).mockResolvedValue(expectedContent);

    const invocation = tool.build({ path: 'index.md' });
    const result = await invocation.execute(abortSignal);

    expect(result.error).toBeUndefined();
    expect(result.llmContent).toBe(expectedContent);
    expect(result.returnDisplay).toContain('index.md');
  });

  it('should prevent access to files outside the docs directory (Path Traversal)', async () => {
    const invocation = tool.build({ path: '../package.json' });
    const result = await invocation.execute(abortSignal);

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Access denied');
  });

  it('should handle non-existent files', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    const invocation = tool.build({ path: 'this-file-does-not-exist.md' });
    const result = await invocation.execute(abortSignal);

    expect(result.error).toBeDefined();
    expect(result.error?.type).toBe(ToolErrorType.EXECUTION_FAILED);
  });
});
