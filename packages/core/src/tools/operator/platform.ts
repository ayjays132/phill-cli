/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../../config/config.js';
import { InputSimulationService } from '../../services/inputSimulationService.js';
import { OSAccessibilityService, type WindowInfo } from '../../services/osAccessibilityService.js';
import { groundOS, type GroundedOSView } from './ground.js';
import { runPreflightCheck, type PreflightReport } from './preflight.js';

export interface PlatformOperator {
  click(x: number, y: number): Promise<void>;
  type(text: string): Promise<void>;
  drag(endX: number, endY: number): Promise<void>;
  findWindow(titlePattern: string): Promise<WindowInfo | null>;
  focusWindow(titlePattern: string): Promise<void>;
  setWindowState(titlePattern: string, state: 'minimize' | 'maximize' | 'restore'): Promise<void>;
  closeWindow(titlePattern: string): Promise<void>;
  launchApp(appNameOrPath: string): Promise<void>;
  groundOS(pid?: number): Promise<GroundedOSView>;
  checkHealth(): PreflightReport;
}

export function getPlatformOperator(config: Config): PlatformOperator {
  const inputService = InputSimulationService.getInstance(config);
  const osService = OSAccessibilityService.getInstance(config);

  return {
    async click(x: number, y: number) {
      await inputService.click(x, y);
    },
    async type(text: string) {
      await inputService.type(text);
    },
    async drag(endX: number, endY: number) {
      await inputService.drag(endX, endY);
    },
    async findWindow(titlePattern: string) {
      return osService.findWindow(titlePattern);
    },
    async focusWindow(titlePattern: string) {
      await inputService.focusWindow(titlePattern);
    },
    async setWindowState(titlePattern: string, state) {
      await inputService.setWindowState(titlePattern, state);
    },
    async closeWindow(titlePattern: string) {
      await inputService.closeWindow(titlePattern);
    },
    async launchApp(appNameOrPath: string) {
      await inputService.launchApp(appNameOrPath);
    },
    async groundOS(pid?: number) {
      return groundOS(config, pid);
    },
    checkHealth() {
      return runPreflightCheck();
    }
  };
}
