/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'events';
import type { Tool } from '@google/genai';
export interface GeminiLiveConfig {
    apiKey: string;
    model?: string;
    tools?: Tool[];
    responseModalities?: Array<'AUDIO' | 'TEXT'>;
    voiceName?: string;
    systemInstruction?: string;
}
export interface SetupMessage {
    setup: {
        model: string;
        generation_config?: {
            response_modalities?: string[];
            speech_config?: {
                voice_config?: {
                    prebuilt_voice_config?: {
                        voice_name?: string;
                    };
                };
            };
        };
        tools?: Tool[];
        system_instruction?: {
            parts: Array<{
                text: string;
            }>;
        };
    };
}
export interface RealtimeInputMessage {
    realtime_input: {
        media_chunks: Array<{
            data: string;
            mime_type: string;
        }>;
    };
}
export interface ServerContentMessage {
    server_content: {
        model_turn?: {
            parts: Array<{
                text?: string;
                inline_data?: {
                    mime_type: string;
                    data: string;
                };
            }>;
        };
        turn_complete?: boolean;
    };
}
export interface ToolCallMessage {
    tool_call: {
        function_calls: Array<{
            name: string;
            args: Record<string, unknown>;
            id: string;
        }>;
    };
}
export interface ToolResponseMessage {
    tool_response: {
        function_responses: Array<{
            id: string;
            name: string;
            response: Record<string, unknown>;
        }>;
    };
}
export interface GeminiLiveClientEvents {
    connected: () => void;
    disconnected: (code: number, reason: string) => void;
    audioData: (data: Buffer) => void;
    textData: (text: string) => void;
    toolCall: (call: ToolCallMessage['tool_call']) => void;
    turnComplete: () => void;
    error: (error: Error) => void;
}
export declare class GeminiLiveClient extends EventEmitter {
    private ws;
    private config;
    private isConnected;
    private resolvedModel;
    private readonly preferredLiveCandidates;
    private readonly endpoint;
    constructor(config: GeminiLiveConfig);
    /**
     * Connect to Gemini Live API
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Gemini Live API
     */
    disconnect(): void;
    /**
     * Send setup message to configure the session
     */
    private sendSetup;
    private connectWithCandidates;
    private connectSingle;
    private resolveConnectionModelCandidates;
    private resolveSupportedBidiModel;
    /**
     * Send audio data to Gemini
     */
    sendAudio(audioChunk: Buffer): void;
    /**
     * Send tool response back to Gemini
     */
    sendToolResponse(id: string, name: string, response: Record<string, unknown>): void;
    /**
     * Handle incoming messages from Gemini
     */
    private handleMessage;
    /**
     * Send a message to Gemini
     */
    private send;
    /**
     * Check if connected
     */
    getConnectionStatus(): boolean;
    /**
     * Cleanup resources
     */
    cleanup(): void;
}
