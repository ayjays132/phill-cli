/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CognitiveLineState,
  EngineMessageType,
  type EngineMessage,
  type UpdateUIStateMessage,
  type RequestEncodeMessage,
} from './engine-types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('engine-process integration', () => {
  const tempDirs: string[] = [];
  const children: ChildProcess[] = [];

  afterEach(async () => {
    for (const child of children.splice(0)) {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
      await new Promise<void>((resolve) => {
        child.once('exit', () => resolve());
        setTimeout(resolve, 1_000);
      });
    }

    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('persists vault memories and responds across the full child-process cycle', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-process-'));
    tempDirs.push(homeDir);

    const child = fork(
      path.join(__dirname, 'engine-process.ts'),
      [],
      {
        cwd: path.resolve(__dirname, '../../..'),
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        execArgv: ['--import', 'tsx'],
        env: {
          ...process.env,
          HOME: homeDir,
          USERPROFILE: homeDir,
        },
      },
    );
    children.push(child);

    const initialUpdate = await waitForMessage(
      child,
      (message): message is UpdateUIStateMessage =>
        message.type === EngineMessageType.UPDATE_UI_STATE &&
        message.cognitiveLineState === CognitiveLineState.DORMANT,
    );
    expect(initialUpdate.type).toBe(EngineMessageType.UPDATE_UI_STATE);

    child.send({
      type: EngineMessageType.USER_INPUT,
      input: 'Please preserve browser automation context in the semantic vault.',
    });

    child.send({
      type: EngineMessageType.TOOL_OUTPUT,
      toolName: 'browser_navigate',
      output: 'Opened the dashboard tab and clicked the submit button.',
    });

    child.send({ type: EngineMessageType.TRIGGER_DREAM });

    const dreamingUpdate = await waitForMessage(
      child,
      (message): message is UpdateUIStateMessage =>
        message.type === EngineMessageType.UPDATE_UI_STATE &&
        message.cognitiveLineState === CognitiveLineState.DREAMING,
    );
    expect(dreamingUpdate.cognitiveLineState).toBe(CognitiveLineState.DREAMING);

    const encodeRequest = await waitForMessage(
      child,
      (message): message is RequestEncodeMessage =>
        message.type === EngineMessageType.REQUEST_ENCODE,
    );
    expect(encodeRequest.type).toBe(EngineMessageType.REQUEST_ENCODE);

    child.send({
      type: EngineMessageType.ENCODE_RESPONSE,
      dlr: 'Semantic summary: browser workflow succeeded and should stay retrievable.',
    });

    const postEncodeUpdate = await waitForMessage(
      child,
      (message): message is UpdateUIStateMessage =>
        message.type === EngineMessageType.UPDATE_UI_STATE &&
        message.cognitiveLineState === CognitiveLineState.DORMANT,
    );
    expect(postEncodeUpdate.cognitiveLineState).toBe(
      CognitiveLineState.DORMANT,
    );

    child.send({ type: EngineMessageType.GET_INSIGHTS });

    const insightsUpdate = await waitForMessage(
      child,
      (message): message is UpdateUIStateMessage =>
        message.type === EngineMessageType.UPDATE_UI_STATE &&
        typeof message.cognitiveLineSuggestion === 'string' &&
        message.cognitiveLineSuggestion.includes('tool-output') &&
        message.cognitiveLineSuggestion.includes('dream-state'),
    );
    expect(insightsUpdate.cognitiveLineSuggestion).toContain('Patterns:');

    const vaultPath = path.join(homeDir, '.phill', 'state', 'cognitive-memory.json');
    expect(fs.existsSync(vaultPath)).toBe(true);

    const persisted = JSON.parse(fs.readFileSync(vaultPath, 'utf8')) as {
      memories: Array<{ dlr: string; tags: string[]; embedding?: number[] }>;
    };
    expect(
      persisted.memories.some((memory) => memory.tags.includes('tool-output')),
    ).toBe(true);
    expect(
      persisted.memories.some((memory) => memory.tags.includes('dream-state')),
    ).toBe(true);
    expect(
      persisted.memories.every(
        (memory) => Array.isArray(memory.embedding) && memory.embedding.length > 0,
      ),
    ).toBe(true);
  });
});

function waitForMessage<T extends EngineMessage>(
  child: ChildProcess,
  predicate: (message: EngineMessage) => message is T,
  timeoutMs?: number,
): Promise<T>;
function waitForMessage(
  child: ChildProcess,
  predicate: (message: EngineMessage) => boolean,
  timeoutMs?: number,
): Promise<EngineMessage>;
function waitForMessage(
  child: ChildProcess,
  predicate: (message: EngineMessage) => boolean,
  timeoutMs: number = 10_000,
): Promise<EngineMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off('message', onMessage);
      reject(new Error(`Timed out waiting for engine message after ${timeoutMs}ms.`));
    }, timeoutMs);

    const onMessage = (message: unknown) => {
      if (!isEngineMessage(message) || !predicate(message)) {
        return;
      }
      clearTimeout(timer);
      child.off('message', onMessage);
      resolve(message);
    };

    child.on('message', onMessage);
  });
}

function isEngineMessage(message: unknown): message is EngineMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as { type?: unknown }).type === 'string'
  );
}
