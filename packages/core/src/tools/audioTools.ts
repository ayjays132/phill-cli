/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolResult } from './tools.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { debugLogger } from '../utils/debugLogger.js';

export interface AnalyzeAudioParams {
  query?: string;
}

/**
 * ANALYZE AUDIO TOOL
 * Captures the last few seconds of 'ear' buffer from AudioManager 
 * and sends it to Gemini for environmental or speech analysis.
 */
export class AnalyzeAudioTool extends BaseDeclarativeTool<AnalyzeAudioParams, ToolResult> {
  static readonly Name = 'analyze_audio';

  constructor(messageBus: MessageBus) {
    super(
      AnalyzeAudioTool.Name,
      'Analyze Host Audio',
      'Analyzes the last ~sec of what the system is currently hearing (voice or environment).',
      Kind.Read,
      {
        type: 'object',
        properties: {
          query: { 
            type: 'string', 
            description: 'Specific question about the audio (e.g., "What song is this?" or "Is anyone talking?")' 
          },
        },
      },
      messageBus
    );
  }

  protected createInvocation(
    params: AnalyzeAudioParams,
    messageBus: MessageBus,
    toolName?: string,
    displayName?: string
  ) {
    return new AnalyzeAudioInvocation(params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class AnalyzeAudioInvocation extends BaseToolInvocation<AnalyzeAudioParams, ToolResult> {
  constructor(
    params: AnalyzeAudioParams,
    messageBus: MessageBus,
    toolName: string,
    displayName: string
  ) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return 'Analyzing captured system audio...';
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const { VoiceService } = await import('../voice/VoiceService.js');
      const voiceService = VoiceService.getInstance();
      
      // We need a way to get the audioManager from VoiceService.
      // I'll add a getter to VoiceService.
      
      const analysis = await (voiceService as any).getAudioManager()?.analyzeAudio(this.params.query);

      if (!analysis) {
        return {
          llmContent: "No active audio capture session found to analyze. Please ensure Voice Mode is active.",
          returnDisplay: "Failed: Voice Mode not active."
        };
      }

      return {
        llmContent: `Audio Analysis Result: ${analysis}`,
        returnDisplay: `Successfully analyzed recent audio. Result: ${analysis.substring(0, 100)}...`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLogger.error('AnalyzeAudioTool execution failed:', error);
      return {
        llmContent: `Failed to analyze audio: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
        error: { message: errorMessage }
      };
    }
  }
}
