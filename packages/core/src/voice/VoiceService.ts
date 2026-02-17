/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import { AudioManager } from './audioManager.js';
import { GeminiLiveClient } from './geminiLiveClient.js';
import { getOauthClient } from '../code_assist/oauth2.js';
import { AuthType } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';
import { debugLogger } from '../utils/debugLogger.js';
import type { Tool } from '@google/genai';
import { ideContextStore } from '../ide/ideContext.js';
import { getDirectoryContextString } from '../utils/environmentContext.js';
import { TTSService } from './ttsService.js';
import { loadApiKey } from '../core/apiKeyCredentialStorage.js';

export type VoiceServiceStatus = 'idle' | 'processing' | 'listening' | 'speaking';

export interface VoiceServiceEvents {
  statusChange: (status: VoiceServiceStatus) => void;
  transcriptPartial: (text: string) => void;
  transcriptFinal: (text: string) => void;
  inputVolume: (volume: number) => void;
  outputVolume: (volume: number) => void;
  emotionChange: (emotion: string) => void;
  error: (error: Error) => void;
}

export interface VoiceServiceOptions {
  config: Config;
  tools?: Tool[];
  onToolCall?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}

/**
 * VOICE SERVICE (CORE)
 * Central orchestrator for PHILL's voice interaction system.
 * Manages the bridge between AudioManager and GeminiLiveClient.
 */
export class VoiceService extends EventEmitter {
  private static instance: VoiceService | null = null;

  private audioManager: AudioManager | null = null;
  private client: GeminiLiveClient | null = null;
  private status: VoiceServiceStatus = 'idle';
  private currentTranscript = '';
  private lastSubmittedTranscript = '';
  private isConnecting = false;
  private currentConfig: Config | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  public getStatus(): VoiceServiceStatus {
    return this.status;
  }

  private setStatus(status: VoiceServiceStatus) {
    if (this.status !== status) {
      this.status = status;
      this.emit('statusChange', status);
      debugLogger.log(`VoiceService: Status -> ${status}`);
    }
  }

  /**
   * Orchestrate connection to Gemini Live and Audio Capture
   */
  public async connect(options: VoiceServiceOptions): Promise<void> {
    if (this.isConnecting || this.client) return;

    const { config, tools, onToolCall } = options;
    this.currentConfig = config;
    const liveConfig = config.getContentGeneratorConfig();
    const authType = liveConfig.authType;

    const canUseLive =
      authType === AuthType.LOGIN_WITH_GOOGLE ||
      authType === AuthType.USE_GEMINI ||
      authType === AuthType.USE_VERTEX_AI ||
      authType === AuthType.COMPUTE_ADC;

    if (!canUseLive) {
      debugLogger.warn(`VoiceService: skipping Gemini Live for auth type '${authType}'.`);
      return;
    }

    this.isConnecting = true;
    this.setStatus('processing');

    try {
      debugLogger.log('VoiceService: Starting connection sequence...');

      // 1. Resolve Credentials
      const voiceSettings = config.getVoice();
      let apiKey =
        voiceSettings.geminiApiKey ||
        process.env['PHILL_API_KEY'] ||
        process.env['GEMINI_API_KEY'] ||
        process.env['GOOGLE_API_KEY'] ||
        (await loadApiKey()) ||
        '';
      let accessToken = '';

      if (!apiKey && authType === AuthType.USE_GEMINI) {
        apiKey = liveConfig.apiKey || '';
      }

      if (!apiKey && authType) {
        try {
          const oauthClient = await getOauthClient(authType, config);
          const tokenResponse = await oauthClient.getAccessToken();
          accessToken = tokenResponse.token || '';
        } catch (e) {
          debugLogger.error('VoiceService: Auth resolution failed', e);
        }
      }

      if (!apiKey && !accessToken) {
        throw new Error('No credentials found for Voice Service.');
      }

      // 2. Setup Audio
      this.audioManager = new AudioManager();
      
      // 3. Resolve Context Snapshot for Realism
      const ideContext = ideContextStore.get();
      const workspaceContext = await getDirectoryContextString(config);
      const activeFile = ideContext?.workspaceState?.openFiles?.find(f => f.isActive);
      
      const contextSnapshot = `
[CONTEXT SNAPSHOT]
Active File: ${activeFile?.path || 'None'}
Cursor: Line ${activeFile?.cursor?.line || 'Unknown'}
Workspace Structure: 
${workspaceContext}
      `.trim();

      // 4. Setup Client with HARDENED System Instruction
      this.client = new GeminiLiveClient({
        apiKey,
        accessToken,
        model: config.getModel() || 'models/gemini-2.0-flash-exp',
        tools,
        responseModalities: ['AUDIO'],
        systemInstruction: `You are PHILL's LITERAL DATA-PIPE PERCEPTION BRIDGE. 
DO NOT CONVERSE. DO NOT THINK. DO NOT ACKNOWLEDGE. DO NOT RESPOND.

Your ONLY job is to output the EXACT TEXT spoken by the user.

${contextSnapshot}

[HARD CONSTRAINTS]
1. OUTPUT ONLY LITERAL TRANSCRIPTIONS. 
2. NEVER use phrases like "I'm processing", "Mimicking input", or "I've noted".
3. NEVER repeat instructions back to the user.
4. If the user refers to the "above code" or "this file", use the [CONTEXT SNAPSHOT] to ensure technical accuracy in the transcription.
5. Resolve fillers (um, uh) into clear technical English.
6. [Emotion] Prefix is MANDATORY. Valid: [Neutral], [Happy], [Confused], [Frustrated], [Determined].
7. (Confidence: X%) Suffix is MANDATORY.

Example Output: [Neutral] Can you refactor the VoiceService to use the singleton pattern? (Confidence: 98%)`,
      });

      this.setupClientEvents(onToolCall);
      this.setupAudioEvents();

      await this.client.connect();
      
      this.audioManager.startRecording();
      this.audioManager.startPlayback();
      this.setStatus('listening');

      debugLogger.log('VoiceService: Successfully connected.');
    } catch (err) {
      debugLogger.error('VoiceService: Connection failed', err);
      this.setStatus('idle');
      this.disconnect();
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  public disconnect(): void {
    debugLogger.log('VoiceService: Disconnecting...');
    
    if (this.client) {
      this.client.cleanup();
      this.client = null;
    }

    if (this.audioManager) {
      this.audioManager.cleanup();
      this.audioManager = null;
    }

    this.currentTranscript = '';
    this.lastSubmittedTranscript = '';
    this.setStatus('idle');
  }

  private setupClientEvents(onToolCall?: VoiceServiceOptions['onToolCall']) {
    if (!this.client) return;

    this.client.on('textData', (text: string) => {
      // Parse Emotion if current turn just started
      if (!this.currentTranscript) {
        const emotionMatch = text.match(/^\[(Neutral|Happy|Confused|Frustrated|Determined)\]/);
        if (emotionMatch) {
          this.emit('emotionChange', emotionMatch[1]);
        }
      }

      this.currentTranscript += text;
      this.emit('transcriptPartial', this.currentTranscript);
    });

    this.client.on('turnComplete', () => {
      const final = this.currentTranscript.trim();
      if (final && final !== this.lastSubmittedTranscript) {
        this.lastSubmittedTranscript = final;
        this.emit('transcriptFinal', final);
        
        // Cooldown for duplicate prevention
        setTimeout(() => {
          this.lastSubmittedTranscript = '';
        }, 2000);
      }
      this.currentTranscript = '';
      this.setStatus('listening');
    });

    this.client.on('toolCall', async (toolCall: any) => {
      if (!onToolCall || !toolCall.function_calls || !this.client) return;
      for (const call of toolCall.function_calls) {
        try {
          const result = await onToolCall(call.name, call.args);
          this.client.sendToolResponse(call.id, call.name, { result });
        } catch (e) {
          this.client.sendToolResponse(call.id, call.name, { error: String(e) });
        }
      }
    });

    this.client.on('error', (err: Error) => {
      debugLogger.error('VoiceService: Client emitted error', err);
      this.emit('error', err);
      this.setStatus('idle');
    });

    this.client.on('disconnected', () => {
      if (this.status !== 'idle') {
        this.setStatus('idle');
      }
    });
  }

  private setupAudioEvents() {
    if (!this.audioManager || !this.client) return;

    this.audioManager.on('audioData', (chunk: Buffer) => {
      this.client?.sendAudio(chunk);
    });

    this.audioManager.on('voiceActivity', (isActive: boolean) => {
      if (isActive) {
        // Ultra-Fast Barge-In: Kill TTS immediately if user speaks
        if (this.currentConfig) {
          const tts = TTSService.getInstance(this.currentConfig);
          if (tts.getIsSpeaking()) {
            tts.stop();
            debugLogger.log('VoiceService: Barge-in detected, stopping TTS.');
          }
        }

        if (this.status !== 'listening') {
          this.setStatus('listening');
        }
      }
    });

    this.audioManager.on('volume', (vol) => {
      this.emit('inputVolume', vol);
    });

    this.audioManager.on('outputVolume', (vol) => {
      this.emit('outputVolume', vol);
      if (vol > 5 && this.status !== 'speaking') {
        this.setStatus('speaking');
      } else if (vol <= 5 && this.status === 'speaking') {
        this.setStatus('listening');
      }
    });

    this.audioManager.on('error', (err) => {
      debugLogger.error('VoiceService: Audio error', err);
      this.emit('error', err);
      this.setStatus('idle');
    });
  }

  // --- External Setters (Bridged to AudioManager) ---

  public setInputDevice(deviceId: string) {
    this.audioManager?.setInputDevice(deviceId);
  }

  public setOutputDevice(deviceId: string) {
    this.audioManager?.setOutputDevice(deviceId);
  }
}
