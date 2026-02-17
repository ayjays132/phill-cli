/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { BaseLlmClient } from '../core/baseLlmClient.js';
import type { PhillChat } from '../core/phillChat.js';
export interface NextSpeakerResponse {
    reasoning: string;
    next_speaker: 'user' | 'model';
}
export declare function checkNextSpeaker(chat: PhillChat, baseLlmClient: BaseLlmClient, abortSignal: AbortSignal, promptId: string): Promise<NextSpeakerResponse | null>;
