/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CognitiveLineState {
  DORMANT = 'dormant',
  SUGGESTING = 'suggesting',
  DREAMING = 'dreaming',
}

// Define the types for messages between main and engine processes
export enum EngineMessageType {
  UPDATE_UI_STATE = 'update_ui_state',
  USER_INPUT = 'user_input',
  TOOL_OUTPUT = 'tool_output',
  REQUEST_ENCODE = 'request_encode',
  ENCODE_RESPONSE = 'encode_response',
  SET_CONFIG = 'set_config',
  RESET_MEMORY = 'reset_memory',
  TRIGGER_DREAM = 'trigger_dream',
  GET_INSIGHTS = 'get_insights',
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

export interface TriggerDreamMessage {
  type: EngineMessageType.TRIGGER_DREAM;
}

export interface GetInsightsMessage {
  type: EngineMessageType.GET_INSIGHTS;
}

export type EngineMessage =
  | UpdateUIStateMessage
  | UserInputMessage
  | ToolOutputMessage
  | RequestEncodeMessage
  | EncodeResponseMessage
  | SetConfigMessage
  | ResetMemoryMessage
  | TriggerDreamMessage
  | GetInsightsMessage;
