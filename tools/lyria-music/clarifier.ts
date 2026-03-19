/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] || '' });

export interface MusicIntent {
  purpose: string;
  mood: string[];
  genre: string[];
  instruments: string[];
  bpm?: number | 'auto';
  duration: number | 'loop';
  brightness?: number | 'auto';
  density?: number | 'auto';
  scale?: string | 'auto';
  outputFormat: 'wav' | 'mp3' | 'ogg' | 'stream' | 'loop';
  looping: boolean;
  adaptive: boolean;
  adaptiveStates: string[];
  temperature: number;
  exportPath: string | null;
  previewFirst: boolean;
}

export class Clarifier {
  private static instance: Clarifier;

  private constructor() {}

  public static getInstance(): Clarifier {
    if (!Clarifier.instance) {
      Clarifier.instance = new Clarifier();
    }
    return Clarifier.instance;
  }

  async clarify(rawRequest: string): Promise<MusicIntent> {
    console.log(`[Clarifier] Processing request: "${rawRequest}"`);

    // Step 1: LLM-based intent extraction and clarification loop simulation
    const prompt = `
      You are an expert music producer agent. Analyze this request: "${rawRequest}"
      
      Extract the following JSON structure (MusicIntent). 
      If 'purpose' is missing, infer it from context or set to "general listening".
      If 'mood' is missing, infer from purpose/genre.
      Set defaults where reasonable.
      
      JSON Scheme:
      {
        purpose: string,
        mood: string[],
        genre: string[],
        instruments: string[],
        bpm: number | 'auto',
        duration: number (seconds) or 'loop',
        brightness: number (0.0-1.0) or 'auto',
        density: number (0.0-1.0) or 'auto',
        scale: string or 'auto',
        outputFormat: 'wav'|'mp3'|'ogg'|'stream'|'loop',
        looping: boolean,
        adaptive: boolean,
        adaptiveStates: string[],
        temperature: number (default 1.1),
        exportPath: string | null,
        previewFirst: boolean
      }
      
      IMPORTANT: Return ONLY the JSON object, no markdown.
    `;

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-1.5-pro-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      let text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean up markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const intent = JSON.parse(text) as MusicIntent;
      
      // Basic validation/defaults
      if (!intent.mood) intent.mood = ['neutral'];
      if (!intent.duration) intent.duration = 60;
      
      console.log(`[Clarifier] Intent finalized:`, intent);
      return intent;

    } catch (error) {
      console.error("Clarification failed, falling back to safe defaults.", error);
      return {
        purpose: "general",
        mood: ["neutral"],
        genre: ["ambient"],
        instruments: [],
        bpm: 'auto',
        duration: 30,
        outputFormat: 'stream',
        looping: false,
        adaptive: false,
        adaptiveStates: [],
        temperature: 1.0,
        exportPath: null,
        previewFirst: false
      };
    }
  }
}
