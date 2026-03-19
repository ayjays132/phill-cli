/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LyriaService — Lyria RealTime music generation via @google/genai.
 *
 * Uses the official `client.live.music.connect()` API (v1alpha endpoint).
 * Audio is streamed as 16-bit PCM stereo @ 44.1 kHz and written to the
 * system speaker via the optional `speaker` native package.
 *
 * NOTE: This service is intentionally decoupled from Config so it can be
 * constructed with just an API key (sourced from env or config externally).
 */

/** Weighted prompt entry passed to setWeightedPrompts(). */
export interface LyriaPrompt {
  text: string;
  /** 0.0–1.0 weight, defaults to 1.0 */
  weight?: number;
}

/** Music generation parameters forwarded to setMusicGenerationConfig(). */
export interface LyriaGenerationConfig {
  bpm?: number;
  temperature?: number;
  /** Hz — must match the speaker sample rate. Default: 44100 */
  sampleRateHz?: number;
}

export type LyriaStatus =
  | 'idle'
  | 'connecting'
  | 'playing'
  | 'paused'
  | 'error'
  | 'closed';

export class LyriaService {
  private static instance: LyriaService | null = null;

  /** Active session returned by client.live.music.connect() */
  private session: unknown = null;
  /** Speaker instance (dynamically imported) */
  private speaker: unknown = null;

  private _status: LyriaStatus = 'idle';
  private _lastError: string | null = null;

  private constructor(private readonly apiKey: string) {}

  /**
   * Returns / creates the singleton LyriaService.
   * @param apiKey Gemini API key — pass `process.env.GEMINI_API_KEY ?? ''` from the call site.
   */
  static getInstance(apiKey: string): LyriaService {
    if (!LyriaService.instance) {
      LyriaService.instance = new LyriaService(apiKey);
    }
    return LyriaService.instance;
  }

  get status(): LyriaStatus {
    return this._status;
  }
  get lastError(): string | null {
    return this._lastError;
  }

  // ─── Session lifecycle ─────────────────────────────────────────────────────

  /**
   * Connect to a new Lyria RealTime session.
   * If a session is already active it is closed first.
   */
  async connect(
    prompts: LyriaPrompt[],
    genConfig: LyriaGenerationConfig = {},
  ): Promise<void> {
    await this.stop();

    this._status = 'connecting';
    this._lastError = null;

    try {
      const { GoogleGenAI } = await import('@google/genai');

      const genAI = new GoogleGenAI({
        apiKey: this.apiKey,
        // Lyria RealTime lives on the v1alpha endpoint
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apiVersion: 'v1alpha' as any,
      });

      // Open speaker before connecting so it's ready when audio arrives
      this.speaker = await this._openSpeaker(genConfig.sampleRateHz ?? 44100);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = genAI as any;
      this.session = await client.live.music.connect({
        model: 'models/lyria-realtime-exp',
        callbacks: {
          onmessage: (message: Record<string, unknown>) => {
            this._handleMessage(message);
          },
          onerror: (error: unknown) => {
            this._lastError = String(error);
            this._status = 'error';
            // eslint-disable-next-line no-console
            console.error('[Lyria] Session error:', error);
          },
          onclose: () => {
            this._status = 'closed';
            // eslint-disable-next-line no-console
            console.log('[Lyria] Session closed.');
            this._closeSpeaker();
          },
        },
      });

      // Configure prompts & music generation parameters
      const sess = this.session as Record<
        string,
        (...a: unknown[]) => Promise<void>
      >;

      await sess['setWeightedPrompts']({
        weightedPrompts: prompts.map((p) => ({
          text: p.text,
          weight: p.weight ?? 1.0,
        })),
      });

      await sess['setMusicGenerationConfig']({
        musicGenerationConfig: {
          bpm: genConfig.bpm ?? 120,
          temperature: genConfig.temperature ?? 1.0,
          audioFormat: 'pcm16',
          sampleRateHz: genConfig.sampleRateHz ?? 44100,
        },
      });

      // Start playback
      await sess['play']();
      this._status = 'playing';
      // eslint-disable-next-line no-console
      console.log('[Lyria] Playback started.');
    } catch (err) {
      this._status = 'error';
      this._lastError = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[Lyria] Failed to connect:', err);
      throw err;
    }
  }

  /** Update the weighted prompts on the active session (hot-swap during playback). */
  async setPrompts(prompts: LyriaPrompt[]): Promise<void> {
    if (!this.session) throw new Error('No active Lyria session.');
    const sess = this.session as Record<
      string,
      (...a: unknown[]) => Promise<void>
    >;
    await sess['setWeightedPrompts']({
      weightedPrompts: prompts.map((p) => ({
        text: p.text,
        weight: p.weight ?? 1.0,
      })),
    });
  }

  /** Pause playback (Lyria RealTime supports pause). */
  async pause(): Promise<void> {
    if (!this.session || this._status !== 'playing') return;
    const sess = this.session as Record<
      string,
      (...a: unknown[]) => Promise<void>
    >;
    await sess['pause']();
    this._status = 'paused';
  }

  /** Resume playback. */
  async resume(): Promise<void> {
    if (!this.session || this._status !== 'paused') return;
    const sess = this.session as Record<
      string,
      (...a: unknown[]) => Promise<void>
    >;
    await sess['play']();
    this._status = 'playing';
  }

  /** Stop playback and close the session. */
  async stop(): Promise<void> {
    if (!this.session) return;
    try {
      const sess = this.session as Record<
        string,
        (...a: unknown[]) => Promise<void>
      >;
      await sess['close']?.();
    } catch (_e) {
      // best-effort close
    } finally {
      this.session = null;
      this._status = 'idle';
      this._closeSpeaker();
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private _handleMessage(message: Record<string, unknown>): void {
    const serverContent = message['serverContent'] as
      | Record<string, unknown>
      | undefined;
    if (!serverContent) return;

    const chunks = serverContent['audioChunks'] as
      | Array<{ data: string }>
      | undefined;
    if (!chunks?.length) return;

    const speaker = this.speaker as { write(buf: Buffer): void } | null;
    if (!speaker) return;

    for (const chunk of chunks) {
      try {
        const buf = Buffer.from(chunk.data, 'base64');
        speaker.write(buf);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Lyria] Failed to write audio chunk:', err);
      }
    }
  }

  private async _openSpeaker(sampleRateHz: number): Promise<unknown> {
    try {
      // `speaker` is an optional native peer dependency
      const SpeakerModule = await import('speaker');
      const SpeakerCtor =
        (SpeakerModule as { default?: unknown }).default ?? SpeakerModule;
      return new (SpeakerCtor as new (opts: Record<string, number>) => unknown)(
        {
          channels: 2,
          bitDepth: 16,
          sampleRate: sampleRateHz,
        },
      );
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        '[Lyria] `speaker` package not available — audio will be silently dropped.',
      );
      return null;
    }
  }

  private _closeSpeaker(): void {
    if (this.speaker) {
      try {
        (this.speaker as { end?(): void }).end?.();
      } catch (_e) {
        // ignore
      }
      this.speaker = null;
    }
  }
}
