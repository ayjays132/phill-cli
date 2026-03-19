/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import { debugLogger } from '../../../utils/debugLogger.js';

export interface WindowInfo {
  id: string;
  pid: number;
  title: string;
  bounds: { x: number; y: number; w: number; h: number };
}

export class LinuxWindowControl {

  /**
   * Finds a window by title pattern using wmctrl.
   */
  async findWindow(titlePattern: string): Promise<WindowInfo | null> {
    try {
      const output = execSync(`wmctrl -l -p -G | grep -i "${titlePattern}"`).toString().trim();
      const lines = output.split('\n');
      if (lines.length > 0) {
        // Parse wmctrl output: 0x04000003  0 12345  0 0 1920 1080  machine Title
        const match = lines[0].match(/^(0x[\da-f]+)\s+\d+\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
        if (match) {
          return {
            id: match[1],
            pid: parseInt(match[2]),
            bounds: { x: parseInt(match[3]), y: parseInt(match[4]), w: parseInt(match[5]), h: parseInt(match[6]) },
            title: match[7]
          };
        }
      }
    } catch (e) {
      debugLogger.warn(`[LinuxWindow] Find failed: ${e}`);
    }
    return null;
  }

  async focus(windowId: string) {
    execSync(`wmctrl -ia ${windowId}`);
  }

  async setWindowState(windowId: string, state: 'minimize' | 'maximize' | 'restore') {
      if (state === 'minimize') {
          execSync(`xdotool windowminimize ${windowId}`); 
      } else if (state === 'maximize') {
          execSync(`wmctrl -ir ${windowId} -b add,maximized_vert,maximized_horz`);
      } else {
          execSync(`wmctrl -ir ${windowId} -b remove,maximized_vert,maximized_horz,hidden`);
          execSync(`xdotool windowmap ${windowId}`); // Ensure mapped if hidden
      }
  }

  async close(windowId: string) {
      execSync(`wmctrl -ic ${windowId}`);
  }
}
