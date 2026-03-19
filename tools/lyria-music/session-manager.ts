/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import type { MusicIntent } from './clarifier.js';
import { PromptBuilder } from './prompt-builder.js';
import { OutputHandler } from './output-handler.js';

const require = createRequire(import.meta.url);

// In a real environment with @google/genai installed
// import { GoogleGenAI } from "@google/genai";
// But since we are in a tool that might not have types at compile time, we require it.
// We'll use 'unknown' for the client/session to avoid TS errors for now.
let GoogleGenAI: unknown;
try {
  const genai = require('@google/genai');
  GoogleGenAI = genai.GoogleGenAI;
} catch {
  console.warn(
    '[SessionManager] @google/genai not found. Music generation will fail.',
  );
}

export class SessionManager extends EventEmitter {
  private static instance: SessionManager;
  private session: unknown | null = null; // Lyria RealTime Session
  private currentIntent: MusicIntent | null = null;
  public outputHandler: OutputHandler | null = null;

  private constructor() {
    super();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private async getCredentials(): Promise<{
    apiKey?: string;
    accessToken?: string;
  }> {
    // 1. Try Standard API Keys from Env (PHILL_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY)
    // This matches the priority order in packages/core/src/core/contentGenerator.ts
    const apiKey =
      process.env['PHILL_API_KEY'] ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_API_KEY'] ||
      process.env['LYRIA_API_KEY']; // Keep as specific override if needed

    if (apiKey) {
      console.log('[SessionManager] Using API Key from environment.');
      return { apiKey };
    }

    // 2. Try GOOGLE_CLOUD_ACCESS_TOKEN environment variable (Standard fallback)
    const envToken = process.env['GOOGLE_CLOUD_ACCESS_TOKEN'];
    if (envToken) {
      console.log(
        '[SessionManager] Using GOOGLE_CLOUD_ACCESS_TOKEN from environment.',
      );
      return { accessToken: envToken };
    }

    // 3. Try Google ADC (Application Default Credentials) via google-auth-library
    try {
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        // Ensure we have ample scopes for generative language and cloud platform
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/generative-language',
        ],
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      if (token.token) {
        console.log('[SessionManager] Using Google ADC OAuth token.');
        return { accessToken: token.token };
      }
    } catch {
      console.warn(
        '[SessionManager] efficient auth library not found or failed, skipping ADC check.',
      );
    }

    console.warn(
      '[SessionManager] No valid credentials found. Session may be unauthenticated.',
    );
    return {};
  }

  async connect(): Promise<void> {
    if (this.session) return;
    if (!GoogleGenAI) throw new Error('GoogleGenAI SDK not loaded.');

    const creds = await this.getCredentials();

    // Initialize GoogleGenAI Client
    // Note: GoogleGenAI constructor often expects apiKey or similar config.
    // We pass what we have.
    // @ts-expect-error - SDK is dynamic
    const client = new GoogleGenAI({
      apiKey: creds.apiKey,
      accessToken: creds.accessToken, // Supports OAuth/ADC if keys are missing
      apiVersion: 'v1alpha',
    });

    console.log(
      '[SessionManager] Connecting to Lyria RealTime (models/lyria-realtime-exp)...',
    );

    try {
      this.session = await client.live.music.connect({
        model: 'models/lyria-realtime-exp',
        callbacks: {
          onmessage: (message: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const msg = message as any;
            if (msg.serverContent?.audioChunks) {
              for (const chunk of msg.serverContent.audioChunks) {
                // Convert base64 to Buffer
                const audioBuffer = Buffer.from(chunk.data, 'base64');
                if (this.outputHandler) {
                  this.outputHandler.handleChunk(audioBuffer);
                }
              }
            }
          },
          onerror: (error: unknown) => {
            console.error('[SessionManager] Music session error:', error);
            this.emit('error', error);
          },
          onclose: () => {
            console.log('[SessionManager] Lyria RealTime stream closed.');
            this.session = null;
            this.emit('closed');
          },
        },
      });
      console.log('[SessionManager] Connected successfully.');
    } catch (err) {
      console.error('[SessionManager] Failed to connect:', err);
      throw err;
    }
  }

  async startGeneration(intent: MusicIntent) {
    if (!this.session) await this.connect();

    this.currentIntent = intent;
    this.outputHandler = new OutputHandler(intent);

    // Prepare prompts and config
    const weightedPrompts = PromptBuilder.buildPrompts(intent);
    const config = PromptBuilder.buildConfig(intent);

    console.log('[SessionManager] Setting initial prompts:', weightedPrompts);
    // @ts-expect-error - SDK is dynamic
    await this.session.setWeightedPrompts({
      weightedPrompts: weightedPrompts,
    });

    console.log('[SessionManager] Setting generation config:', config);
    // Map PromptBuilder output (which matched our mock) to RealTime API format if needed
    // Assuming PromptBuilder returns compatible structure or we adjust here:
    // RealTime API expects: { musicGenerationConfig: { ... } }
    // @ts-expect-error - SDK is dynamic
    await this.session.setMusicGenerationConfig({
      musicGenerationConfig: {
        bpm: typeof config.bpm === 'number' ? config.bpm : 120, // Default if auto
        temperature: intent.temperature || 1.0,
        audioFormat: 'pcm16', // Important: Force PCM16 for our Output Handler
        sampleRateHz: 48000, // OutputHandler expects 48k? or we adapt. OutputHandler was initialized with 48k.
        // map other fields
        density:
          typeof intent.density === 'number' ? intent.density : undefined,
      },
    });

    console.log('[SessionManager] Starting playback...');
    // @ts-expect-error - SDK is dynamic
    await this.session.play();
  }

  async steer(partialIntent: Partial<MusicIntent>) {
    if (!this.session || !this.currentIntent) return;

    const newIntent = { ...this.currentIntent, ...partialIntent };
    this.currentIntent = newIntent;

    const weightedPrompts = PromptBuilder.buildPrompts(newIntent);

    console.log('[SessionManager] Steer -> Updating prompts:', weightedPrompts);

    // Use setWeightedPrompts for smooth steering
    // @ts-expect-error - SDK is dynamic
    await this.session.setWeightedPrompts({
      weightedPrompts: weightedPrompts,
    });
  }

  async stop() {
    if (this.session) {
      console.log('[SessionManager] Stopping session...');
      // @ts-expect-error - SDK is dynamic
      await this.session.pause();
      // Optionally close?
      // await this.session.stop();
    }
    if (this.outputHandler) {
      await this.outputHandler.finalize();
      this.outputHandler = null;
    }
  }
}
