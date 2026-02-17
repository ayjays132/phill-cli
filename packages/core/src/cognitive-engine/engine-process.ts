/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// This file is the entry point for the Meta-Cognition Engine child process.

export enum CognitiveLineState {
  DORMANT = 'dormant',
  SUGGESTING = 'suggesting',
  DREAMING = 'dreaming',
}

import { MemoryVault } from './memory-vault.js';
import { PatternLearner } from './pattern-learner.js';

// Define the types for messages between main and engine processes
export enum EngineMessageType {
  UPDATE_UI_STATE = 'update_ui_state',
  USER_INPUT = 'user_input',
  TOOL_OUTPUT = 'tool_output',
  REQUEST_ENCODE = 'request_encode',
  ENCODE_RESPONSE = 'encode_response',
  SET_CONFIG = 'set_config',
  RESET_MEMORY = 'reset_memory',
}

export interface ResetMemoryMessage {
  type: EngineMessageType.RESET_MEMORY;
}

export interface UpdateUIStateMessage {
  type: EngineMessageType.UPDATE_UI_STATE;
  cognitiveLineState: CognitiveLineState;
  cognitiveLineSuggestion?: string;
}

export interface UserInputMessage {
  type: EngineMessageType.USER_INPUT;
  input: string;
}

export interface ToolOutputMessage {
  type: EngineMessageType.TOOL_OUTPUT;
  output: string;
  toolName: string;
}

export interface RequestEncodeMessage {
  type: EngineMessageType.REQUEST_ENCODE;
}

export interface EncodeResponseMessage {
  type: EngineMessageType.ENCODE_RESPONSE;
  dlr: string;
}

export interface SetConfigMessage {
  type: EngineMessageType.SET_CONFIG;
  idleThresholdSeconds: number;
}

export type EngineMessage =
  | UpdateUIStateMessage
  | UserInputMessage
  | ToolOutputMessage
  | RequestEncodeMessage
  | EncodeResponseMessage
  | SetConfigMessage
  | ResetMemoryMessage;

// Initialize vault and learner
const vault = new MemoryVault();
const learner = new PatternLearner();

// Simulate engine logic
let currentState: CognitiveLineState = CognitiveLineState.DORMANT;
let currentSuggestion: string | undefined = undefined;
let lastActivityTime = Date.now();
let IDLE_THRESHOLD_MS = 15000;
let DREAM_TRIGGER_MS = 20000;
const SUGGESTION_COOLDOWN_MS = 5000;
let lastSuggestionTime = 0;
let hasDreamedThisIdlePeriod = false;

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

// Engine heartbeat and idle detection
setInterval(() => {
  const now = Date.now();
  const timeSinceActivity = now - lastActivityTime;

  if (timeSinceActivity > DREAM_TRIGGER_MS && !hasDreamedThisIdlePeriod) {
    currentState = CognitiveLineState.DREAMING;
    currentSuggestion = undefined;
    sendUIStateUpdate();
    
    // Trigger memory compression request
    requestMemoryCompression();
    hasDreamedThisIdlePeriod = true;
  } else if (timeSinceActivity > IDLE_THRESHOLD_MS && timeSinceActivity <= DREAM_TRIGGER_MS) {
    if (currentState !== CognitiveLineState.DREAMING) {
      // Just showing dots during transition
      currentState = CognitiveLineState.DORMANT;
      sendUIStateUpdate();
    }
  } else if (timeSinceActivity <= IDLE_THRESHOLD_MS) {
    if (currentState === CognitiveLineState.DREAMING) {
      currentState = CognitiveLineState.DORMANT;
      sendUIStateUpdate();
    }
    hasDreamedThisIdlePeriod = false;
  }
}, 1000);

process.on('message', (message: EngineMessage) => {
  if (message.type !== EngineMessageType.ENCODE_RESPONSE && message.type !== EngineMessageType.SET_CONFIG) {
    lastActivityTime = Date.now();
  }

  switch (message.type) {
    case EngineMessageType.SET_CONFIG:
      IDLE_THRESHOLD_MS = message.idleThresholdSeconds * 1000;
      DREAM_TRIGGER_MS = IDLE_THRESHOLD_MS + 5000;
      break;
    case EngineMessageType.USER_INPUT:
      learner.observe(message.input);
      const prediction = learner.predictNext(message.input);
      
      if (prediction && Date.now() - lastSuggestionTime > SUGGESTION_COOLDOWN_MS) {
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
    case EngineMessageType.ENCODE_RESPONSE:
      if (message.dlr) {
        vault.addMemory(message.dlr, ['dream-state']);
        // console.log(`Engine stored DLR in vault: ${message.dlr.substring(0, 20)}...`);
      }
      break;
    case EngineMessageType.RESET_MEMORY:
      vault.clear();
      learner.clear();
      // Reset internal state
      currentState = CognitiveLineState.DORMANT;
      currentSuggestion = undefined;
      lastActivityTime = Date.now();
      sendUIStateUpdate();
      break;
  }
});

// Initial state send
sendUIStateUpdate();

// Keep the process alive
console.log('Meta-Cognition Engine started.');
