/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../test-utils/render.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProQuotaDialog } from './ProQuotaDialog.js';

import {
  PREVIEW_PHILL_MODEL,
  DEFAULT_PHILL_FLASH_MODEL,
} from 'phill-cli-core';

vi.mock('../contexts/UIStateContext.js', () => ({
  useUIState: () => ({ terminalWidth: 120 }),
}));

vi.mock('../contexts/KeypressContext.js', () => ({
  useKeypressContext: () => ({
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

describe('ProQuotaDialog', () => {
  const mockOnChoice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders retry and stop options when the fallback is the failed model', () => {
    const { lastFrame } = render(
      <ProQuotaDialog
        failedModel={DEFAULT_PHILL_FLASH_MODEL}
        fallbackModel={DEFAULT_PHILL_FLASH_MODEL}
        message="flash error"
        isTerminalQuotaError={true}
        onChoice={mockOnChoice}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('Rate Limit Recovery');
    expect(frame).toContain('Keep trying with auto routing');
    expect(frame).toContain('Stop for now');
  });

  it('renders switch, upgrade, and stop options for terminal quota errors', () => {
    const { lastFrame } = render(
      <ProQuotaDialog
        failedModel="gemini-2.5-pro"
        fallbackModel="gemini-2.5-flash"
        message="paid tier quota error"
        isTerminalQuotaError={true}
        isModelNotFoundError={false}
        onChoice={mockOnChoice}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('Switch to gemini-2.5-flash');
    expect(frame).toContain('Upgrade for higher limits');
    expect(frame).toContain('Stop for now');
  });

  it('renders keep trying, switch, and stop options for capacity errors', () => {
    const { lastFrame } = render(
      <ProQuotaDialog
        failedModel={PREVIEW_PHILL_MODEL}
        fallbackModel="gemini-2.5-flash"
        message="capacity error"
        isTerminalQuotaError={false}
        isModelNotFoundError={false}
        onChoice={mockOnChoice}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('Keep trying with auto routing');
    expect(frame).toContain('Switch to gemini-2.5-flash');
    expect(frame).toContain('Stop for now');
  });
});
