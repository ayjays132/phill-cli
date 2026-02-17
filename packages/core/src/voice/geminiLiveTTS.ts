/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import { GoogleGenAI } from '@google/genai';
import { AudioManager } from './audioManager.js';
import { debugLogger } from '../utils/debugLogger.js';
import type { Config } from '../config/config.js';

import { AuthType } from '../core/contentGenerator.js';
import { getOauthClient } from '../code_assist/oauth2.js';

const SUPPORTED_GEMINI_VOICE_NAMES = new Set([
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
]);

const DEFAULT_GEMINI_VOICE_NAME = 'Kore';
const DEFAULT_VOICE_STYLE_BASE =
  'Warm, confident, and precise. Feminine default tone. Blend cinematic empathy and calm intelligence with practical execution. Keep phrasing concise and helpful. Match the user language automatically and preserve names, accents, and technical terms naturally.';
const MULTI_SPEAKER_VOICE_CYCLE = [
  'Kore',
  'Puck',
  'Charon',
  'Aoede',
  'Zephyr',
  'Fenrir',
] as const;

export class GeminiLiveTTS implements ITTSProvider {
  private audioManager: AudioManager;
  private config: Config;
  private prosody: ProsodyOptions = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  constructor(config: Config) {
    this.config = config;
    this.audioManager = new AudioManager();
  }

  getName(): string {
    return 'Gemini GenerateContent TTS';
  }

  stop(): void {
    this.audioManager.stopPlayback();
  }

  updateProsody(options: Partial<ProsodyOptions>): void {
    this.prosody = { ...this.prosody, ...options };
  }

  private resolveVoiceName(
    preferredGender: 'female' | 'male' | 'neutral' | 'auto' | undefined,
    identityVoiceName: string | undefined,
  ): string {
    if (identityVoiceName && SUPPORTED_GEMINI_VOICE_NAMES.has(identityVoiceName)) {
      return identityVoiceName;
    }
    if (identityVoiceName && !SUPPORTED_GEMINI_VOICE_NAMES.has(identityVoiceName)) {
      debugLogger.warn(
        `Unknown Gemini voice "${identityVoiceName}". Falling back to default voice "${DEFAULT_GEMINI_VOICE_NAME}".`,
      );
      return DEFAULT_GEMINI_VOICE_NAME;
    }
    if (preferredGender === 'female') return 'Kore';
    if (preferredGender === 'male') return 'Puck';
    if (preferredGender === 'neutral') return 'Charon';
    const envVoice = process.env['PHILL_TTS_VOICE'];
    if (envVoice && SUPPORTED_GEMINI_VOICE_NAMES.has(envVoice)) {
      return envVoice;
    }
    return DEFAULT_GEMINI_VOICE_NAME;
  }

  private extractDialogSpeakers(text: string): string[] {
    const lines = text.split(/\r?\n/);
    const speakerRegex = /^\s*([A-Za-z][A-Za-z0-9 .'\-]{0,40}):\s+\S+/;
    const speakers: string[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const match = line.match(speakerRegex);
      if (!match) continue;
      const speaker = match[1].trim();
      const key = speaker.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        speakers.push(speaker);
      }
    }

    return speakers;
  }

  async speak(text: string): Promise<void> {
    if (!text) return;

    try {
      const genConfig = this.config.getContentGeneratorConfig();
      const voiceSettings = this.config.getVoice();
      const apiKey =
        voiceSettings.geminiApiKey?.trim() ||
        genConfig?.apiKey ||
        process.env['PHILL_API_KEY'] ||
        process.env['GEMINI_API_KEY'] ||
        process.env['GOOGLE_API_KEY'];

      const authType = this.config.getAuthType();
      const shouldPreferOauth =
        authType === AuthType.LOGIN_WITH_GOOGLE ||
        authType === AuthType.COMPUTE_ADC;
      const identity = await this.config.getAgentIdentityService().getIdentity();
      const voiceName = this.resolveVoiceName(
        voiceSettings.preferredGender,
        voiceSettings.geminiVoiceName || identity.voiceName,
      );
      const speechStyleExtension =
        voiceSettings.preferredStyle || identity.speechStyle || '';
      let speechStyle = speechStyleExtension
        ? `${DEFAULT_VOICE_STYLE_BASE}\nAdditional style guidance: ${speechStyleExtension}`
        : DEFAULT_VOICE_STYLE_BASE;

      if (this.prosody.rate !== 1.0) {
        speechStyle += `\nSpeak at ${this.prosody.rate > 1.0 ? 'fast' : 'slow'} pace (relative speed: ${this.prosody.rate}).`;
      }
      if (this.prosody.pitch !== 1.0) {
        speechStyle += `\nSpeak with ${this.prosody.pitch > 1.0 ? 'high' : 'low'} pitch (relative pitch: ${this.prosody.pitch}).`;
      }
      if (this.prosody.volume !== 1.0) {
        speechStyle += `\nSpeak with ${this.prosody.volume > 1.0 ? 'loud' : 'soft'} volume (relative volume: ${this.prosody.volume}).`;
      }
      if (this.prosody.style) {
        speechStyle += `\nEmotional tone/style: ${this.prosody.style}`;
      }

      const identityName = identity.name ? `You are ${identity.name}. ` : '';
      const styledText = speechStyle
        ? `${identityName}Speak in this style: ${speechStyle}\n\n${text}`
        : `${identityName}${text}`;
      const dialogSpeakers = this.extractDialogSpeakers(text);
      const useMultiSpeaker = dialogSpeakers.length >= 2;
      const speakerVoiceConfigs = useMultiSpeaker
        ? dialogSpeakers.slice(0, MULTI_SPEAKER_VOICE_CYCLE.length).map((speaker, index) => ({
            speaker,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: MULTI_SPEAKER_VOICE_CYCLE[index],
              },
            },
          }))
        : [];

      const ttsModels = [
        voiceSettings.geminiTtsModel,
        process.env['PHILL_TTS_MODEL'],
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite-preview-02-05',
        'gemini-2.5-pro-preview-tts',
        'gemini-2.5-flash-preview-tts',
      ].filter((m): m is string => Boolean(m && m.trim()));
      const dedupedTtsModels = Array.from(new Set(ttsModels));

      type TtsResponse = {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { data?: string | Uint8Array };
              inline_data?: { data?: string | Uint8Array };
            }>;
          };
        }>;
      };
      let response: TtsResponse | null = null;
      let lastError: unknown = null;
      const authAttempts: Array<'oauth' | 'apiKey'> = shouldPreferOauth
        ? ['oauth', 'apiKey']
        : ['apiKey', 'oauth'];
      const getOauthAccessToken = async (): Promise<string | undefined> => {
        if (
          authType !== AuthType.LOGIN_WITH_GOOGLE &&
          authType !== AuthType.COMPUTE_ADC
        ) {
          return undefined;
        }
        const oauthClient = await getOauthClient(authType, this.config);
        const tokenResponse = await oauthClient.getAccessToken();
        return typeof tokenResponse === 'string'
          ? tokenResponse
          : tokenResponse?.token || undefined;
      };

      const runWithApiKey = async (model: string): Promise<TtsResponse> => {
        if (!apiKey) {
          throw new Error('No Gemini API key available.');
        }
        const client = new GoogleGenAI({ apiKey });
        return (await client.models.generateContent({
          model,
          contents: styledText,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: useMultiSpeaker
              ? {
                  multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs,
                  },
                }
              : {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName,
                    },
                  },
                },
          },
        })) as unknown as TtsResponse;
      };

      const runWithOauth = async (model: string): Promise<TtsResponse> => {
        const oauthAccessToken = await getOauthAccessToken();
        if (!oauthAccessToken) {
          throw new Error('No OAuth access token available for Gemini TTS.');
        }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${oauthAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: styledText }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: useMultiSpeaker
                  ? {
                      multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs,
                      },
                    }
                  : {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName,
                        },
                      },
                    },
              },
            }),
          },
        );
        if (!res.ok) {
          throw new Error(
            `Gemini OAuth TTS Error: ${res.status} ${res.statusText} ${await res.text().catch(() => '')}`.trim(),
          );
        }
        return (await res.json()) as TtsResponse;
      };

      for (const model of dedupedTtsModels) {
        for (const authAttempt of authAttempts) {
          try {
            response =
              authAttempt === 'oauth'
                ? await runWithOauth(model)
                : await runWithApiKey(model);
            debugLogger.debug(
              `Gemini TTS model "${model}" succeeded via ${authAttempt}.`,
            );
            if (useMultiSpeaker) {
              debugLogger.log(
                `Gemini TTS multi-speaker enabled (${speakerVoiceConfigs.length} speakers).`,
              );
            }
            break;
          } catch (error) {
            lastError = error;
            debugLogger.warn(
              `Gemini TTS ${authAttempt} path failed for model "${model}", trying next auth/model fallback.`,
            );
          }
        }
        if (response) {
          break;
        }
        const message = lastError instanceof Error ? lastError.message.toLowerCase() : '';
        if (
          model.includes('2.5-pro-preview-tts') &&
          (message.includes('quota') || message.includes('429'))
        ) {
          debugLogger.warn(
            'Gemini Pro Preview TTS quota exhausted; auto-switching to Flash Preview TTS.',
          );
        }
        debugLogger.warn(`Gemini TTS model "${model}" failed, trying next.`);
      }

      if (!response) {
        throw (lastError ?? new Error('No Gemini TTS model succeeded.'));
      }

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const audioData = part?.inlineData?.data ?? part?.inline_data?.data;
      if (!audioData) {
        throw new Error('Gemini TTS response did not include audio data');
      }

      const pcmBuffer = Buffer.isBuffer(audioData)
        ? audioData
        : typeof audioData === 'string'
          ? Buffer.from(audioData, 'base64')
          : Buffer.from(audioData as Uint8Array);
      const audioBuffer = stripWavHeaderIfPresent(pcmBuffer);

      this.audioManager.startPlayback();
      this.audioManager.writeAudio(audioBuffer);
    } catch (error) {
      debugLogger.error('Gemini TTS failed:', error);
      throw error;
    }
  }
}

function stripWavHeaderIfPresent(buffer: Buffer): Buffer {
  if (
    buffer.length > 44 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return buffer.subarray(44);
  }
  return buffer;
}
