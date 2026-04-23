/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test-utils/render.js';
import { AgentsStatus } from './AgentsStatus.js';

describe('AgentsStatus', () => {
  it('renders a themed swarm summary with agent metadata', () => {
    const { lastFrame, unmount } = renderWithProviders(
      <AgentsStatus
        terminalWidth={100}
        agents={[
          {
            name: 'local_agent',
            displayName: 'Local Agent',
            description: 'Handles codebase work.',
            kind: 'local',
            model: 'gemini-3.1-pro-preview',
            maxTurns: 12,
            toolCount: 3,
            capabilities: ['read_file', 'grep_search', 'edit_file'],
          },
          {
            name: 'remote_agent',
            description: 'Delegates to a remote endpoint.',
            kind: 'remote',
            model: 'remote',
            capabilities: ['a2a'],
            experimental: true,
          },
        ]}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('Swarm Status');
    expect(output).toContain('Local Agents');
    expect(output).toContain('Remote Agents');
    expect(output).toContain('gemini-3.1-pro-preview');
    expect(output).toContain('read_file, grep_search, edit_file');
    expect(output).toContain('PREVIEW');

    unmount();
  });

  it('renders an empty swarm state', () => {
    const { lastFrame, unmount } = renderWithProviders(
      <AgentsStatus terminalWidth={80} agents={[]} />,
    );

    expect(lastFrame()).toContain('No agents available.');

    unmount();
  });
});
