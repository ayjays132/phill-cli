/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore - Optional dependency
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { debugLogger } from '../utils/debugLogger.js';
import type { Tool } from '@google/genai';

export interface GeminiLiveConfig {
  apiKey?: string;
  accessToken?: string;
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
      parts: Array<{ text: string }>;
    };
  };
}

export interface RealtimeInputMessage {
  realtime_input: {
    media_chunks: Array<{
      data: string; // base64 encoded audio
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
          data: string; // base64 encoded audio
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

export class GeminiLiveClient extends EventEmitter {
  private ws: any | null = null;
  private config: GeminiLiveConfig;
  private isConnected = false;
  private resolvedModel: string | null = null;
  private readonly preferredLiveCandidates = [
    'models/gemini-2.5-flash-native-audio-preview-12-2025',
  ];
  private readonly endpoint =
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

  constructor(config: GeminiLiveConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      debugLogger.warn('Already connected to Gemini Live');
      return;
    }

    try {
      const candidates = await this.resolveConnectionModelCandidates();
      if (candidates.length === 0) {
        const error = new Error(
          'No Gemini Live model available for bidiGenerateContent. Configure a supported live model or verify API key/model access.',
        );
        debugLogger.error(error.message);
        this.emit('error', error);
        throw error;
      }
      await this.connectWithCandidates(candidates);

      this.ws.on('message', (data: any) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        debugLogger.error('WebSocket error:', error);
        this.emit('error', error);
      });

      this.ws.on('close', (code: number, reason: unknown) => {
        const normalizedReason =
          typeof reason === 'string'
            ? reason
            : Buffer.isBuffer(reason)
              ? reason.toString('utf8')
              : reason != null
                ? String(reason)
                : '';
        debugLogger.log(
          `Disconnected from Gemini Live (Code: ${code}, Reason: ${normalizedReason || 'none'})`,
        );
        this.isConnected = false;
        this.emit('disconnected', code, normalizedReason);
      });
    } catch (error) {
      debugLogger.error('Failed to connect to Gemini Live:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Gemini Live API
   */
  disconnect(): void {
    if (!this.ws) {
      return;
    }

    this.ws.close();
    this.ws = null;
    this.isConnected = false;
  }

  /**
   * Send setup message to configure the session
   */
  private sendSetup(): boolean {
    if (!this.resolvedModel) {
      const error = new Error(
        'No Gemini Live model available for bidiGenerateContent. Configure a supported live model or verify API key/model access.',
      );
      debugLogger.error(error.message);
      this.emit('error', error);
      return false;
    }

    const responseModalities =
      this.config.responseModalities && this.config.responseModalities.length > 0
        ? this.config.responseModalities
        : ['AUDIO'];
    const includeAudioOutput = responseModalities.includes('AUDIO');
    const setupMessage: SetupMessage = {
      setup: {
        model: this.resolvedModel,
        generation_config: {
          response_modalities: responseModalities,
          ...(includeAudioOutput
            ? {
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: this.config.voiceName || 'Puck',
                    },
                  },
                },
              }
            : {}),
        },
      },
    };

    if (this.config.tools && this.config.tools.length > 0) {
      setupMessage.setup.tools = this.config.tools;
    }

    if (this.config.systemInstruction) {
      setupMessage.setup.system_instruction = {
        parts: [{ text: this.config.systemInstruction }],
      };
    }

    this.send(setupMessage);
    debugLogger.log(`Sent setup message (model: ${setupMessage.setup.model})`);
    return true;
  }

  private async connectWithCandidates(candidates: string[]): Promise<void> {
    let lastError: Error | null = null;
    for (const model of candidates) {
      try {
        await this.connectSingle(model);
        return;
      } catch (error) {
        lastError = error as Error;
        debugLogger.warn(
          `Gemini Live setup failed for model "${model}": ${lastError.message}. Trying next candidate.`,
        );
      }
    }
    const error =
      lastError ??
      new Error(
        'No Gemini Live model available for bidiGenerateContent. Configure a supported live model or verify API key/model access.',
      );
    this.emit('error', error);
    throw error;
  }

  private connectSingle(model: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const envToken = process.env['GOOGLE_CLOUD_ACCESS_TOKEN'];
      // Use API Key if provided, otherwise fallback to Access Token.
      // Do not send both to avoid authentication ambiguity.
      const oauthAccessToken = this.config.apiKey ? undefined : (this.config.accessToken || envToken);
      const hasApiKey = Boolean(this.config.apiKey);
      const hasAccessToken = Boolean(oauthAccessToken);
      const url = hasApiKey
        ? `${this.endpoint}?key=${this.config.apiKey}`
        : this.endpoint;
      const ws = hasAccessToken
        ? new WebSocket(url, {
            headers: {
              Authorization: `Bearer ${oauthAccessToken}`,
            },
          })
        : new WebSocket(url);
      let settled = false;

      const cleanup = () => {
        ws.removeAllListeners('open');
        ws.removeAllListeners('message');
        ws.removeAllListeners('error');
        ws.removeAllListeners('close');
      };

      ws.on('open', () => {
        this.ws = ws;
        this.isConnected = true;
        this.resolvedModel = model;
        this.sendSetup();
      });

      ws.on('message', (data: any) => {
        const text = data.toString();
        if (
          !settled &&
          text.includes('bidiGenerateContent') &&
          text.includes('not found')
        ) {
          settled = true;
          this.isConnected = false;
          cleanup();
          ws.close();
          reject(new Error(text));
          return;
        }

        if (!settled) {
          settled = true;
          debugLogger.log('Connected to Gemini Live');
          this.emit('connected');
          resolve();
        }
        this.handleMessage(data);
      });

      ws.on('error', (error: Error) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
          return;
        }
        debugLogger.error('WebSocket error:', error);
        this.emit('error', error);
      });

      ws.on('close', (code: number, reason: unknown) => {
        const normalizedReason =
          typeof reason === 'string'
            ? reason
            : Buffer.isBuffer(reason)
              ? reason.toString('utf8')
              : reason != null
                ? String(reason)
                : '';
        if (!settled) {
          settled = true;
          cleanup();
          let errorMessage = `Disconnected during setup (Code: ${code}, Reason: ${normalizedReason || 'none'})`;
          if (normalizedReason.toLowerCase().includes('insufficient authentication scopes')) {
            errorMessage += '. This means your authentication lacks the "generative-language" scope. To fix this, provide a dedicated Gemini API key in your voice settings (voice.geminiApiKey).';
          }
          reject(new Error(errorMessage));
          return;
        }
        debugLogger.log(
          `Disconnected from Gemini Live (Code: ${code}, Reason: ${normalizedReason || 'none'})`,
        );
        this.isConnected = false;
        this.emit('disconnected', code, normalizedReason);
      });
    });
  }

  private async resolveConnectionModelCandidates(): Promise<string[]> {
    const isAutoAlias = (n: string) => /^models\/auto-/i.test(n) || /^auto-/i.test(n);
    const resolved = await this.resolveSupportedBidiModel();
    const out: string[] = [];
    const pushUnique = (m: string | null | undefined) => {
      if (!m || isAutoAlias(m)) return;
      if (!out.includes(m)) out.push(m);
    };
    pushUnique(resolved);
    if (this.config.model) {
      const configured = this.config.model.startsWith('models/')
        ? this.config.model
        : `models/${this.config.model}`;
      pushUnique(configured);
    }
    for (const candidate of this.preferredLiveCandidates) {
      pushUnique(candidate);
    }
    return out;
  }

  private async resolveSupportedBidiModel(): Promise<string | null> {
    const configured = this.config.model;
    try {
      const envToken = process.env['GOOGLE_CLOUD_ACCESS_TOKEN'];
      // Only use the environment token if no API Key is provided, to avoid sending
      // restricted scopes when using an API Key.
      const oauthAccessToken = this.config.accessToken || (!this.config.apiKey ? envToken : undefined);
      const hasApiKey = Boolean(this.config.apiKey);
      const hasAccessToken = Boolean(oauthAccessToken);
      const url = hasApiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`
        : 'https://generativelanguage.googleapis.com/v1beta/models';
      const response = await fetch(url, {
        headers: hasAccessToken
          ? {
              Authorization: `Bearer ${oauthAccessToken}`,
            }
          : undefined,
      });
      if (!response.ok) {
        return configured ?? null;
      }
      const data = (await response.json()) as {
        models?: Array<{
          name?: string;
          supportedGenerationMethods?: string[];
        }>;
      };
      const bidiModels =
        data.models?.filter((m) =>
          m.supportedGenerationMethods?.includes('BIDI_GENERATE_CONTENT'),
        ) ?? [];

      const normalizeName = (name: string) =>
        name.startsWith('models/') ? name : `models/${name}`;
      const isAutoAlias = (name: string) =>
        /^models\/auto-/i.test(name) || /^auto-/i.test(name);

      if (configured) {
        const configuredNormalized = normalizeName(configured);
        if (isAutoAlias(configuredNormalized)) {
          debugLogger.warn(
            `Configured live model "${configured}" is an alias and cannot be used directly for bidi; selecting a real supported model.`,
          );
        } else {
          const configuredSupported = bidiModels.some(
            (m) => m.name && normalizeName(m.name) === configuredNormalized,
          );
          if (configuredSupported) {
            return configuredNormalized;
          }
        }
        debugLogger.warn(
          `Configured live model "${configured}" is not bidi-capable for v1beta; selecting a supported model dynamically.`,
        );
      }

      const preferredOrder = [
        'models/gemini-2.0-flash-exp',
        'models/gemini-2.0-flash',
        'models/gemini-2.0-flash-live',
      ];
      const available = new Set(
        bidiModels
          .map((m) => (m.name ? normalizeName(m.name) : null))
          .filter((m): m is string => Boolean(m)),
      );
      const preferred = preferredOrder.find((m) => available.has(m));
      if (preferred) {
        debugLogger.log(`Resolved Gemini Live model: ${preferred}`);
        return preferred;
      }

      const bidiModel = bidiModels.find(
        (m) => !!m.name && !isAutoAlias(normalizeName(m.name)),
      );
      if (bidiModel?.name) {
        const resolved = normalizeName(bidiModel.name);
        debugLogger.log(`Resolved Gemini Live model: ${resolved}`);
        return resolved;
      }

      if (configured) {
        const configuredNormalized = normalizeName(configured);
        if (isAutoAlias(configuredNormalized)) {
          debugLogger.warn(
            `No bidi-capable models were returned by ListModels; not falling back to alias model "${configured}".`,
          );
          return null;
        }
        debugLogger.warn(
          `No bidi-capable models were returned by ListModels; falling back to configured model "${configured}".`,
        );
        return configuredNormalized;
      }

      return null;
    } catch (error) {
      debugLogger.debug('Failed to resolve live model list dynamically:', error);
      if (configured) {
        return configured.startsWith('models/')
          ? configured
          : `models/${configured}`;
      }
      return null;
    }
  }

  /**
   * Send audio data to Gemini
   */
  sendAudio(audioChunk: Buffer): void {
    if (!this.isConnected || !this.ws) {
      debugLogger.debug('Cannot send audio: not connected');
      return;
    }

    // Use camelCase structure (standard for modern Bidi WebSocket)
    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            data: audioChunk.toString('base64'),
            mimeType: 'audio/pcm;rate=16000',
          },
        ],
      },
    };

    this.send(message);
  }

  /**
   * Send tool response back to Gemini
   */
  sendToolResponse(
    id: string,
    name: string,
    response: Record<string, unknown>,
  ): void {
    const message = {
      toolResponse: {
        functionResponses: [
          {
            id,
            name,
            response,
          },
        ],
      },
    };

    this.send(message);
    debugLogger.log(`Sent tool response for ${name}`);
  }

  /**
   * Handle incoming messages from Gemini
   */
  private handleMessage(data: any): void {
    try {
      const message = JSON.parse(data.toString());

      // Handle server content (audio/text response) - robust to snake_case or camelCase
      const serverContent = message.serverContent || message.server_content;
      if (serverContent) {
        const modelTurn = serverContent.modelTurn || serverContent.model_turn;
        
        if (modelTurn?.parts) {
          for (const part of modelTurn.parts) {
            // Handle text
            if (part.text) {
              this.emit('textData', part.text);
            }
            
            // Handle audio
            const inlineData = part.inlineData || part.inline_data;
            if (inlineData?.mimeType?.startsWith('audio/') || inlineData?.mime_type?.startsWith('audio/')) {
              const audioBuffer = Buffer.from(inlineData.data, 'base64');
              this.emit('audioData', audioBuffer);
            }
          }
        }

        if (serverContent.turnComplete || serverContent.turn_complete) {
          this.emit('turnComplete');
        }
      }

      // Handle tool calls
      const toolCall = message.toolCall || message.tool_call;
      if (toolCall) {
        const functionCalls = toolCall.functionCalls || toolCall.function_calls;
        if (functionCalls) {
            this.emit('toolCall', { function_calls: functionCalls });
        }
      }
    } catch (error) {
      debugLogger.error('Failed to parse message:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a message to Gemini
   */
  private send(message: unknown): void {
    if (!this.ws || !this.isConnected) {
      debugLogger.warn('Cannot send message: not connected');
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}
