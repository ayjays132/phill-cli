/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// import { SessionManager } from './session-manager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const require = createRequire(import.meta.url);
export class StateController extends EventEmitter {
  currentState = 'default';
  stateMap = {};
  sessionManager;
  fsWatcher = null;
  watchedFile = null;
  constructor(sessionManager) {
    super();
    this.sessionManager = sessionManager;
  }
  loadStates(states, presetFile = 'game-states.json') {
    const presetsPath = path.join(__dirname, 'presets', presetFile);
    let presetData = {};
    try {
      presetData = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
    } catch {
      console.warn(`Could not load preset ${presetFile}`);
    }
    states.forEach((state) => {
      if (presetData[state]) {
        // Convert partial preset into full MusicIntent-like object
        // In reality, we'd need to run Clarifier for each state or have smart defaults
        this.stateMap[state] = {
          ...presetData[state],
          purpose: 'game', // Default context
          adaptive: true,
        };
      } else {
        console.warn(`State '${state}' not found in presets.`);
      }
    });
  }
  setCurrentState(state) {
    if (this.currentState === state) return;
    console.log(
      `[StateController] Transitioning: ${this.currentState} -> ${state}`,
    );
    this.currentState = state;
    const intent = this.stateMap[state];
    if (intent) {
      this.sessionManager.steer(intent);
      this.emit('transition', { from: this.currentState, to: state });
    } else {
      console.warn(`[StateController] Unknown state: ${state}`);
    }
  }
  watch(filePath) {
    this.watchedFile = filePath;
    if (this.fsWatcher) this.fsWatcher.close();
    console.log(
      `[StateController] Watching for state changes in ${this.watchedFile}`,
    );
    this.fsWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (data.state && data.state !== this.currentState) {
            this.setCurrentState(data.state);
          }
        } catch {
          // likely incomplete write, ignore
        }
      }
    });
  }
  stop() {
    if (this.fsWatcher) this.fsWatcher.close();
  }
}
//# sourceMappingURL=state-controller.js.map
