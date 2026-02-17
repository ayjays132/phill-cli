/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from '../utils/debugLogger.js';
import { Config } from '../config/config.js';
import { AuthType } from '../core/contentGenerator.js';
import type { ITTSProvider, ProsodyOptions } from './ttsProvider.js';
import { GeminiLiveTTS } from './geminiLiveTTS.js';
import { OpenAITTS } from './openAiTTS.js';
import { BrowserTTS } from './browserTTS.js';
import { PocketTTS } from './pocketTTS.js';
import { ElevenLabsTTS } from './elevenLabsTTS.js';
import { AudioManager } from './audioManager.js';

export class TTSService {
  private static instance: TTSService;
  private isSpeaking = false;
  private config: Config;
  private provider: ITTSProvider;
  private lastSpokenText: string | null = null;
  private lastSpokenAtMs = 0;
  private readonly duplicateSpeakWindowMs = 4000;
  private speakingSuppressionUntilMs = 0;
  private stickyProviderName: string | null = null;
  private providerFailureUntilMs = new Map<string, number>();
  private readonly providerFailureCooldownMs = 5 * 60 * 1000;
  private readonly providerHardFailureCooldownMs = 60 * 60 * 1000;

  private constructor(config: Config) {
    this.config = config;
    this.provider = this.resolveProvider();
  }

  public static getInstance(config: Config): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService(config);
    }
    return TTSService.instance;
  }

  public stop(): void {
    if (!this.getIsSpeaking()) {
      return;
    }
    debugLogger.log('Stopping TTS playback.');
    this.isSpeaking = false;
    this.speakingSuppressionUntilMs = 0;
    
    // 1. Stop the current provider's specific playback instance
    try {
      this.provider.stop();
    } catch (error) {
      debugLogger.warn('Error calling provider.stop():', error);
    }

    // 2. Force reset the global static count in AudioManager to prevent blocking STT/Barge-in
    AudioManager.forceStopAllPlayback();
  }

  private resolveProvider(): ITTSProvider {
    const authType = this.config.getAuthType();
    const genConfig = this.config.getContentGeneratorConfig();
    const voice = this.config.getVoice();
    const explicitProvider = voice.ttsProvider ?? 'auto';
    const preferAuthTtsProvider = voice.preferAuthTtsProvider !== false;
    const hasGeminiApiKey = Boolean(
      voice.geminiApiKey?.trim() ||
      genConfig?.apiKey ||
        process.env['PHILL_API_KEY'] ||
        process.env['GEMINI_API_KEY'] ||
        process.env['GOOGLE_API_KEY'],
    );
    const canUseGeminiWithOauth =
      authType === AuthType.LOGIN_WITH_GOOGLE ||
      authType === AuthType.COMPUTE_ADC;
    const canUseGeminiProvider = hasGeminiApiKey || canUseGeminiWithOauth;

    const resolveAuthDefaultProvider = (): ITTSProvider => {
      switch (authType) {
        case AuthType.USE_GEMINI:
        case AuthType.USE_VERTEX_AI:
          if (canUseGeminiProvider) {
            debugLogger.log('TTS Routing: Selecting Gemini Live TTS');
            return new GeminiLiveTTS(this.config);
          }
          debugLogger.log(
            'TTS Routing: Gemini auth detected without API key, using Pocket TTS fallback',
          );
          return new PocketTTS(this.config);
        case AuthType.LOGIN_WITH_GOOGLE:
          debugLogger.log(
            'TTS Routing: Login with Google detected, preferring Gemini TTS (with fallback chain).',
          );
          return new GeminiLiveTTS(this.config);
        case AuthType.OPENAI:
        case AuthType.OPENAI_BROWSER:
          debugLogger.log('TTS Routing: Selecting OpenAI TTS');
          return new OpenAITTS(this.config);
        case AuthType.GROQ:
          debugLogger.log('TTS Routing: Groq active, checking for OpenAI TTS availability for speech...');
          if (Boolean(voice.openAiApiKey?.trim() || this.config.openAI?.apiKey || process.env['OPENAI_API_KEY'])) {
            return new OpenAITTS(this.config);
          }
          return new PocketTTS(this.config);
        default:
          debugLogger.log('TTS Routing: Selecting Pocket TTS (Fallback)');
          return new PocketTTS(this.config);
      }
    };

    if (
      explicitProvider === 'pocket' &&
      preferAuthTtsProvider &&
      (authType === AuthType.USE_GEMINI ||
        authType === AuthType.USE_VERTEX_AI ||
        authType === AuthType.LOGIN_WITH_GOOGLE ||
        authType === AuthType.OPENAI ||
        authType === AuthType.OPENAI_BROWSER)
    ) {
      debugLogger.log(
        'TTS Routing: Pocket selected, but Prefer Auth Provider is enabled. Using auth-priority provider with Pocket fallback.',
      );
      return resolveAuthDefaultProvider();
    }

    if (explicitProvider === 'pocket') {
      debugLogger.log('TTS Routing: Selecting Pocket TTS (explicit)');
      return new PocketTTS(this.config);
    }
    if (explicitProvider === 'system') {
      debugLogger.log('TTS Routing: Selecting Browser Native TTS (explicit)');
      return new BrowserTTS(this.config);
    }
    if (explicitProvider === 'openai') {
      debugLogger.log('TTS Routing: Selecting OpenAI TTS (explicit)');
      return new OpenAITTS(this.config);
    }
    if (explicitProvider === 'elevenlabs') {
      debugLogger.log('TTS Routing: Selecting ElevenLabs TTS (explicit)');
      return new ElevenLabsTTS(this.config);
    }
    if (explicitProvider === 'gemini') {
      if (canUseGeminiProvider) {
        debugLogger.log('TTS Routing: Selecting Gemini TTS (explicit)');
        return new GeminiLiveTTS(this.config);
      }
      debugLogger.log(
        'TTS Routing: Gemini selected but no API key or OAuth auth, falling back to Pocket TTS',
      );
      return new PocketTTS(this.config);
    }
    
    return resolveAuthDefaultProvider();
  }

  public getIsSpeaking(): boolean {
    return (
      this.isSpeaking ||
      AudioManager.getIsAnyPlaybackActive() ||
      Date.now() < this.speakingSuppressionUntilMs
    );
  }

  public getLastSpokenText(): string | null {
    return this.lastSpokenText;
  }

  public updateProsody(options: Partial<ProsodyOptions>): void {
    this.provider.updateProsody(options);
    debugLogger.log('TTS Prosody updated:', options);
  }

  public wasRecentlySpoken(text: string, withinMs: number = 15000): boolean {
    const normalized = text.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!normalized || !this.lastSpokenText) {
      return false;
    }
    if (Date.now() - this.lastSpokenAtMs > withinMs) {
      return false;
    }
    return normalized === this.lastSpokenText;
  }

  private estimatePlaybackMs(cleanText: string): number {
    const words = cleanText.trim().split(/\s+/).filter(Boolean).length;
    // Rough 170-180 WPM speech, bounded to avoid over-blocking.
    return Math.max(1500, Math.min(12000, Math.round((words / 2.9) * 1000)));
  }

  private shouldAttemptProvider(provider: ITTSProvider): boolean {
    const voice = this.config.getVoice();
    const genConfig = this.config.getContentGeneratorConfig();
    const authType = this.config.getAuthType();

    if (provider instanceof GeminiLiveTTS) {
      const hasGeminiApiKey = Boolean(
        voice.geminiApiKey?.trim() ||
          genConfig?.apiKey ||
          process.env['PHILL_API_KEY'] ||
          process.env['GEMINI_API_KEY'] ||
          process.env['GOOGLE_API_KEY'],
      );
      const hasOauth =
        authType === AuthType.LOGIN_WITH_GOOGLE ||
        authType === AuthType.COMPUTE_ADC;
      return hasGeminiApiKey || hasOauth;
    }

    if (provider instanceof OpenAITTS) {
      return Boolean(
        voice.openAiApiKey?.trim() ||
          this.config.openAI?.apiKey ||
          this.config.groq?.apiKey || // Allow using Groq key if endpoint is overridden for Groq TTS
          process.env['OPENAI_API_KEY'] ||
          process.env['GROQ_API_KEY']
      );
    }

    if (provider instanceof ElevenLabsTTS) {
      return Boolean(
        voice.elevenLabsApiKey?.trim() || process.env['ELEVENLABS_API_KEY'],
      );
    }

    return true;
  }

  private getFailureCooldownMs(error: unknown): number {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (
      message.includes('billing_not_active') ||
      message.includes('account is not active') ||
      message.includes('missing elevenlabs_api_key') ||
      message.includes('api key missing') ||
      message.includes('could not locate file') ||
      message.includes('gated') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      return this.providerHardFailureCooldownMs;
    }
    return this.providerFailureCooldownMs;
  }

  private async tryProvider(
    provider: ITTSProvider,
    cleanText: string,
  ): Promise<boolean> {
    const providerName = provider.getName();
    if (!this.shouldAttemptProvider(provider)) {
      debugLogger.debug(
        `TTS provider ${providerName} is not configured/available; skipping.`,
      );
      return false;
    }
    const blockedUntil = this.providerFailureUntilMs.get(providerName) ?? 0;
    if (Date.now() < blockedUntil) {
      debugLogger.debug(
        `TTS provider ${providerName} is in cooldown; skipping for now.`,
      );
      return false;
    }

    try {
      await provider.speak(cleanText);
      this.providerFailureUntilMs.delete(providerName);
      this.stickyProviderName = providerName;
      return true;
    } catch (error) {
      const isCritical = this.getFailureCooldownMs(error) === this.providerHardFailureCooldownMs;
      if (isCritical) {
        debugLogger.warn(
          `TTS provider ${providerName} reported a critical configuration or billing error. Switching to fallback chain.`,
        );
      } else {
        debugLogger.error(
          `TTS execution failed (${providerName}):`,
          error,
        );
      }
      this.providerFailureUntilMs.set(
        providerName,
        Date.now() + this.getFailureCooldownMs(error),
      );
      return false;
    }
  }

  async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // Remove code blocks and extensive formatting for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/[^\w\s.,?!'-]/g, ' '); // remove special chars
    const normalized = cleanText.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!normalized) {
      return;
    }

    const now = Date.now();
    if (
      this.lastSpokenText === normalized &&
      now - this.lastSpokenAtMs < this.duplicateSpeakWindowMs
    ) {
      debugLogger.debug('Skipping duplicate TTS utterance inside dedupe window.');
      return;
    }

    if (this.isSpeaking) {
      debugLogger.debug('Skipping TTS request while another utterance is active.');
      return;
    }

    try {
      // Re-evaluate provider each call so auth/settings changes are reflected.
      this.provider = this.resolveProvider();
      this.isSpeaking = true;
      const attempts: ITTSProvider[] = [this.provider];
      const pushUnique = (p: ITTSProvider) => {
        if (attempts.some((a) => a.constructor === p.constructor)) {
          return;
        }
        attempts.push(p);
      };

      // Unified fallback chain across all providers:
      // chosen provider -> Gemini -> OpenAI -> ElevenLabs -> Pocket -> Browser
      pushUnique(new GeminiLiveTTS(this.config));
      pushUnique(new OpenAITTS(this.config));
      pushUnique(new ElevenLabsTTS(this.config));
      pushUnique(new PocketTTS(this.config));
      pushUnique(new BrowserTTS(this.config));

      if (this.stickyProviderName) {
        const stickyIndex = attempts.findIndex(
          (a) => a.getName() === this.stickyProviderName,
        );
        if (stickyIndex > 0) {
          const [sticky] = attempts.splice(stickyIndex, 1);
          attempts.unshift(sticky);
        }
      }

      for (const attempt of attempts) {
        const ok = await this.tryProvider(attempt, cleanText);
        if (ok) {
          this.lastSpokenText = normalized;
          this.lastSpokenAtMs = Date.now();
          this.speakingSuppressionUntilMs =
            Date.now() + this.estimatePlaybackMs(cleanText);
          if (attempt.constructor !== this.provider.constructor) {
            debugLogger.log(
              `TTS fallback succeeded with ${attempt.getName()}.`,
            );
          }
          return;
        }
      }
    } finally {
      this.isSpeaking = false;
    }
  }
}
