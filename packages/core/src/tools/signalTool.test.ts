/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalLinkTool, SignalSendTool, SignalReceiveTool } from './signalTool.js';
// import type { ToolResult } from './tools.js';
import * as shellUtils from '../utils/shell-utils.js';

// Mock spawnAsync
vi.mock('../utils/shell-utils.js', () => ({
  spawnAsync: vi.fn(),
}));

describe('Signal Tools', () => {
  const mockConfig: any = {
    getTargetDir: () => '/tmp',
    validatePathAccess: () => null,
  };
  const mockMessageBus: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SignalLinkTool', () => {
    it('should generate link URI', async () => {
      const tool = new SignalLinkTool(mockConfig, mockMessageBus);
      const invocation = tool.build({ name: 'TestDevice' });
      
      (shellUtils.spawnAsync as any).mockResolvedValue({ stdout: 'tsdevice:/uri\n', stderr: '' });

      const result = await invocation.execute(new AbortController().signal);
      expect(result.llmContent).toContain('tsdevice:/uri');
      expect(shellUtils.spawnAsync).toHaveBeenCalledWith(
        expect.stringContaining('signal-cli'),
        ['link', '-n', 'TestDevice']
      );
    });
  });

  describe('SignalSendTool', () => {
    it('should send message', async () => {
      const tool = new SignalSendTool(mockConfig, mockMessageBus);
      const invocation = tool.build({ recipient: '+1234567890', message: 'Hello' });

      (shellUtils.spawnAsync as any).mockResolvedValue({ stdout: 'Success', stderr: '' });

      const result = await invocation.execute(new AbortController().signal);
      expect(result.llmContent).toContain('Message sent');
      expect(shellUtils.spawnAsync).toHaveBeenCalledWith(
        expect.stringContaining('signal-cli'),
        ['send', '-m', 'Hello', '+1234567890']
      );
    });

    it('should send message with attachment', async () => {
        const tool = new SignalSendTool(mockConfig, mockMessageBus);
        const invocation = tool.build({ recipient: '+1234567890', message: 'Hello', attachment: 'test.jpg' });
  
        (shellUtils.spawnAsync as any).mockResolvedValue({ stdout: 'Success', stderr: '' });
  
        await invocation.execute(new AbortController().signal);
        expect(shellUtils.spawnAsync).toHaveBeenCalledWith(
          expect.stringContaining('signal-cli'),
          ['send', '-m', 'Hello', '--attachment', 'test.jpg', '+1234567890']
        );
      });

    it('should send message with explicit account', async () => {
      const tool = new SignalSendTool(mockConfig, mockMessageBus);
      const invocation = tool.build({
        recipient: '+1234567890',
        message: 'Hello',
        account: '+10987654321',
      });

      (shellUtils.spawnAsync as any).mockResolvedValue({ stdout: 'Success', stderr: '' });

      await invocation.execute(new AbortController().signal);
      expect(shellUtils.spawnAsync).toHaveBeenCalledWith(
        expect.stringContaining('signal-cli'),
        ['--account', '+10987654321', 'send', '-m', 'Hello', '+1234567890']
      );
    });
  });

  describe('SignalReceiveTool', () => {
      it('should receive messages', async () => {
          const tool = new SignalReceiveTool(mockConfig, mockMessageBus);
          const invocation = tool.build({ json: true });

          (shellUtils.spawnAsync as any).mockResolvedValue({ stdout: '[]', stderr: '' });

          await invocation.execute(new AbortController().signal);
          expect(shellUtils.spawnAsync).toHaveBeenCalledWith(
              expect.stringContaining('signal-cli'),
              ['receive', '--json']
          );
      });

      it('should receive messages with explicit account', async () => {
          const tool = new SignalReceiveTool(mockConfig, mockMessageBus);
          const invocation = tool.build({ account: '+10987654321', json: true });

          (shellUtils.spawnAsync as any).mockResolvedValue({ stdout: '[]', stderr: '' });

          await invocation.execute(new AbortController().signal);
          expect(shellUtils.spawnAsync).toHaveBeenCalledWith(
              expect.stringContaining('signal-cli'),
              ['--account', '+10987654321', 'receive', '--json']
          );
      });
  });
});
