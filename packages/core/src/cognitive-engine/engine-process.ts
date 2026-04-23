/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// This file is the entry point for the Meta-Cognition Engine child process.

import { MemoryVault } from './memory-vault.js';
import { PatternLearner } from './pattern-learner.js';
import { debugLogger } from '../utils/debugLogger.js';
import {
  CognitiveLineState,
  EngineMessageType,
  type EngineMessage,
  type RequestEncodeMessage,
  type UpdateUIStateMessage,
} from './engine-types.js';

// Initialize vault and learner
const vault = new MemoryVault();
const learner = new PatternLearner();

// Simulate engine logic
let currentState: CognitiveLineState = CognitiveLineState.DORMANT;
let currentSuggestion: string | undefined = undefined;
const SUGGESTION_COOLDOWN_MS = 5000;
let lastSuggestionTime = 0;

function sendUIStateUpdate() {
  if (process.send) {
    const message: UpdateUIStateMessage = {
      type: EngineMessageType.UPDATE_UI_STATE,
      cognitiveLineState: currentState,
      cognitiveLineSuggestion: currentSuggestion,
    };
    process.send(message);
  }
}

function requestMemoryCompression() {
  if (process.send) {
    const message: RequestEncodeMessage = {
      type: EngineMessageType.REQUEST_ENCODE,
    };
    process.send(message);
  }
}

// Initial state send
sendUIStateUpdate();

// The engine is now tool-driven and doesn't auto-dream by default
// setInterval(() => { ... }, 1000);

process.on('message', (message: EngineMessage) => {
  switch (message.type) {
    case EngineMessageType.SET_CONFIG:
      break;
    case EngineMessageType.USER_INPUT: {
      learner.observe(message.input);
      const prediction = learner.predictNext(message.input);

      if (
        prediction &&
        Date.now() - lastSuggestionTime > SUGGESTION_COOLDOWN_MS
      ) {
        currentState = CognitiveLineState.SUGGESTING;
        currentSuggestion = prediction;
        lastSuggestionTime = Date.now();
        sendUIStateUpdate();

        setTimeout(() => {
          if (currentState === CognitiveLineState.SUGGESTING) {
            currentState = CognitiveLineState.DORMANT;
            currentSuggestion = undefined;
            sendUIStateUpdate();
          }
        }, 3000);
      }
      break;
    }
    case EngineMessageType.ENCODE_RESPONSE: {
      if (message.dlr) {
        vault.addMemory(message.dlr, ['dream-state']);
      }
      currentState = CognitiveLineState.DORMANT;
      currentSuggestion = undefined;
      sendUIStateUpdate();
      break;
    }
    case EngineMessageType.TOOL_OUTPUT: {
      learner.observe(`${message.toolName} ${message.output}`);
      vault.addMemory(
        `TOOL:${message.toolName}|OUT:${message.output.substring(0, 240)}`,
        ['tool-output', message.toolName],
      );
      break;
    }
    case EngineMessageType.TRIGGER_DREAM:
      currentState = CognitiveLineState.DREAMING;
      currentSuggestion = undefined;
      sendUIStateUpdate();
      requestMemoryCompression();
      break;
    case EngineMessageType.GET_INSIGHTS: {
      const summary = vault.getInsightsSummary(3);
      const latchGoals =
        summary.activeLatches.map((latch) => latch.goal).join(' | ') || 'none';
      const recentTags = summary.topTags.join(', ') || 'none';
      if (process.send) {
        process.send({
          type: EngineMessageType.UPDATE_UI_STATE,
          cognitiveLineState: currentState,
          cognitiveLineSuggestion: `Patterns:${learner.getPatterns().length} Tags:${recentTags} Latches:${latchGoals}`,
        });
      }
      break;
    }
    case EngineMessageType.RESET_MEMORY:
      vault.clear();
      learner.clear();
      // Reset internal state
      currentState = CognitiveLineState.DORMANT;
      currentSuggestion = undefined;
      sendUIStateUpdate();
      break;
    default:
      break;
  }
});

// Keep the process alive
debugLogger.debug('Meta-Cognition Engine started.');
