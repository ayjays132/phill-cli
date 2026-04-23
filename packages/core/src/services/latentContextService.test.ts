/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import type { Content } from '@google/genai';
import { buildHeuristicDLRFromHistory } from './latentContextService.js';

describe('LatentContextService heuristic DLR', () => {
  it('captures user, goal, constraint, tool, and visual hints in the local fallback', () => {
    const history: Content[] = [
      {
        role: 'user',
        parts: [
          {
            text: 'Goal: harden the swarm agents. We must avoid recursion and fix the build.',
          },
        ],
      },
      {
        role: 'model',
        parts: [{ text: 'Success: subagent delegation completed' }],
      },
    ];

    const dlr = buildHeuristicDLRFromHistory(history, 'V:GRID42');

    expect(dlr).toContain('H:U[');
    expect(dlr).toContain('|T[1]');
    expect(dlr).toContain('|G[');
    expect(dlr).toContain('|C[');
    expect(dlr).toContain('|V[V:GRID42]');
  });
});
