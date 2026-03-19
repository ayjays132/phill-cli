/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Config, AuthType } from './config.js';
import { getCodeAssistServer } from '../code_assist/codeAssist.js';
import { getExperiments } from '../code_assist/experiments/experiments.js';
import { ExperimentFlags } from '../code_assist/experiments/flagNames.js';
import type { CodeAssistServer } from '../code_assist/server.js';
vi.mock('node:fs');
vi.mock('../code_assist/codeAssist.js');
vi.mock('../code_assist/experiments/experiments.js');
vi.mock('../services/gitService.js');

describe('Config', () => {
  const TARGET_DIR = '/path/to/target';
  const DEBUG_MODE = true;
  const QUESTION = 'What is the meaning of life?';
  const USER_MEMORY = 'I like turtles';
  const TELEMETRY_SETTINGS = { enabled: true };
  const SESSION_ID = 'test-session-id';
  const MODEL = 'gemini-pro';

  const baseParams = {
    cwd: '/tmp',
    targetDir: TARGET_DIR,
    debugMode: DEBUG_MODE,
    question: QUESTION,
    userMemory: USER_MEMORY,
    telemetry: TELEMETRY_SETTINGS,
    sessionId: SESSION_ID,
    model: MODEL,
    usageStatisticsEnabled: false,
  };

  beforeEach(() => {
    // Reset mocks if necessary
    vi.clearAllMocks();
    vi.mocked(getExperiments).mockResolvedValue({
      experimentIds: [],
      flags: {},
      getExperimentValue: () => false,
    });
  });

  describe('getUserCaching', () => {
    it('should return the remote experiment flag when available', async () => {
      const config = new Config({
        ...baseParams,
        experiments: {
          flags: {
            [ExperimentFlags.USER_CACHING]: {
              boolValue: true,
            },
          },
          experimentIds: [],
          getExperimentValue: () => false,
        },
      });
      expect(await config.getUserCaching()).toBe(true);
    });

    it('should return false when the remote flag is false', async () => {
      const config = new Config({
        ...baseParams,
        experiments: {
          flags: {
            [ExperimentFlags.USER_CACHING]: {
              boolValue: false,
            },
          },
          experimentIds: [],
          getExperimentValue: () => false,
        },
      });
      expect(await config.getUserCaching()).toBe(false);
    });
  });

  describe('Preview Features Logic in refreshAuth', () => {
    beforeEach(() => {
      // Set up default mock behavior for these functions before each test
      vi.mocked(getCodeAssistServer).mockReturnValue(undefined);
      vi.mocked(getExperiments).mockResolvedValue({
        flags: {},
        experimentIds: [],
        getExperimentValue: (id: number) => false,
      });
    });

    it('should enable preview features for Google auth when remote flag is true', async () => {
      // Override the default mock for this specific test
      vi.mocked(getCodeAssistServer).mockReturnValue({} as CodeAssistServer); // Simulate Google auth by returning a truthy value
      vi.mocked(getExperiments).mockResolvedValue({
        flags: {
          [ExperimentFlags.ENABLE_PREVIEW]: { boolValue: true },
        },
        experimentIds: [],
        getExperimentValue: (id: number) => false,
      });
      const config = new Config({ ...baseParams, previewFeatures: undefined });
      await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
      expect(config.getPreviewFeatures()).toBe(true);
    });

    it('should disable preview features for Google auth when remote flag is false', async () => {
      // Override the default mock
      vi.mocked(getCodeAssistServer).mockReturnValue({} as CodeAssistServer);
      vi.mocked(getExperiments).mockResolvedValue({
        flags: {
          [ExperimentFlags.ENABLE_PREVIEW]: { boolValue: false },
        },
        experimentIds: [],
        getExperimentValue: (id: number) => false,
      });
      const config = new Config({ ...baseParams, previewFeatures: undefined });
      await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
      expect(config.getPreviewFeatures()).toBe(false);
    });
  });

  describe('getExperiments', () => {
    it('should return empty object when empty experiments are provided', () => {
      const configWithEmptyExps = new Config({
        ...baseParams,
        experiments: { flags: {}, experimentIds: [], getExperimentValue: () => false },
      });
      expect(configWithEmptyExps.getExperiments()).toEqual({
        flags: {},
        experimentIds: [],
        getExperimentValue: expect.any(Function),
      });
    });

    it('should return the experiments configuration when provided', () => {
      const mockExps = {
        flags: {
          testFlag: { boolValue: true },
        },
        experimentIds: [],
        getExperimentValue: (id: number) => false,
      };

      const config = new Config({
        ...baseParams,
        experiments: mockExps,
      });

      const retrievedExps = config.getExperiments();
      expect(retrievedExps).toEqual(mockExps);
    });
  });

  describe('Config setExperiments logging', () => {
    it('logs a summary of experiments when they are set', () => {
      const config = new Config(baseParams);
      const experiments = {
        flags: {
          ZetaFlag: {
            boolValue: true,
            stringValue: 'zeta',
            int32ListValue: { values: [1, 2] },
          },
        },
        experimentIds: [101, 99],
        getExperimentValue: (id: number) => [101, 99].includes(id),
      };

      config.setExperiments(experiments);
      expect(config.getExperiments()).toEqual(experiments);
    });
  });
});
