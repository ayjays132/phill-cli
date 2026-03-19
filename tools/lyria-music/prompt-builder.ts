/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MusicIntent } from './clarifier.js';

interface WeightedPrompt {
  text: string;
  weight: number;
}

interface MusicGenerationConfig {
  bpm?: number;
  density?: number;
  brightness?: number;
  scale?: string;
  temperature: number;
  musicGenerationMode: 'QUALITY' | 'DIVERSITY';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRESETS_DIR = path.join(__dirname, 'presets');

interface PresetItem {
  text: string;
  weight?: number;
}

function loadPreset(name: string): Record<string, PresetItem> {
  try {
    const raw = fs.readFileSync(
      path.join(PRESETS_DIR, `${name}.json`),
      'utf-8',
    );
    return JSON.parse(raw) as Record<string, PresetItem>;
  } catch {
    console.warn(`Could not load preset ${name}`);
    return {};
  }
}

const MOODS = loadPreset('moods');
const GENRES = loadPreset('genres');

export class PromptBuilder {
  static buildPrompts(intent: MusicIntent): WeightedPrompt[] {
    const prompts: WeightedPrompt[] = [];

    // 1. Process Moods
    if (intent.mood) {
      intent.mood.forEach((m) => {
        const moodPreset = MOODS[m.toLowerCase()];
        if (moodPreset) {
          prompts.push({
            text: moodPreset.text,
            weight: moodPreset.weight || 1.0,
          });
        } else {
          prompts.push({ text: m, weight: 1.0 }); // Fallback
        }
      });
    }

    // 2. Process Genres
    if (intent.genre) {
      intent.genre.forEach((g) => {
        const genrePreset = GENRES[g.toLowerCase()];
        if (genrePreset) {
          prompts.push({
            text: genrePreset.text,
            weight: genrePreset.weight || 1.0,
          });
        } else {
          prompts.push({ text: g, weight: 1.0 });
        }
      });
    }

    // 3. Process Instruments
    if (intent.instruments) {
      intent.instruments.forEach((i) => {
        prompts.push({ text: i, weight: 0.8 });
      });
    }

    // 4. Purpose Boosts
    const purposeLower = intent.purpose.toLowerCase();
    if (purposeLower.includes('film') || purposeLower.includes('video')) {
      prompts.push({ text: 'Cinematic', weight: 0.5 });
    } else if (purposeLower.includes('game')) {
      prompts.push({ text: 'Loop Ready, Video Game Music', weight: 0.3 });
    } else if (purposeLower.includes('meditation')) {
      prompts.push({ text: 'Ambient, Ethereal Ambience', weight: 0.5 });
    } else if (purposeLower.includes('podcast')) {
      prompts.push({ text: 'Subtle Background', weight: 0.5 });
    } else if (purposeLower.includes('study')) {
      prompts.push({ text: 'Non-Distracting, Subdued Melody', weight: 0.5 });
    }

    return prompts;
  }

  static buildConfig(intent: MusicIntent): MusicGenerationConfig {
    // Check use cases for overrides
    if (intent.purpose) {
      // Simple mapping to presets based on key phrases
      // In a real app, this would be more robust
    }

    const musicGenerationMode =
      intent.purpose.includes('film') ||
      intent.purpose.includes('game') ||
      (intent.genre && intent.genre.includes('orchestral'))
        ? 'QUALITY'
        : 'DIVERSITY';

    return {
      bpm: intent.bpm === 'auto' ? undefined : intent.bpm,
      density: intent.density === 'auto' ? undefined : intent.density,
      brightness: intent.brightness === 'auto' ? undefined : intent.brightness,
      scale: intent.scale === 'auto' ? undefined : intent.scale,
      temperature: intent.temperature ?? 1.1,
      musicGenerationMode,
    };
  }
}
