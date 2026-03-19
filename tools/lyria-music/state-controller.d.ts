/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import { SessionManager } from './session-manager.js';
export declare class StateController extends EventEmitter {
    private currentState;
    private stateMap;
    private sessionManager;
    private fsWatcher;
    private watchedFile;
    constructor(sessionManager: SessionManager);
    loadStates(states: string[], presetFile?: string): void;
    setCurrentState(state: string): void;
    watch(filePath: string): void;
    stop(): void;
}
