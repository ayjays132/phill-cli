/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import type { MusicIntent } from './clarifier.js';
import { OutputHandler } from './output-handler.js';
export declare class SessionManager extends EventEmitter {
    private static instance;
    private session;
    private currentIntent;
    outputHandler: OutputHandler | null;
    private constructor();
    static getInstance(): SessionManager;
    private getCredentials;
    connect(): Promise<void>;
    startGeneration(intent: MusicIntent): Promise<void>;
    steer(partialIntent: Partial<MusicIntent>): Promise<void>;
    stop(): Promise<void>;
}
