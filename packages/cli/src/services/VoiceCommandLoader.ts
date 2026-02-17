/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ensurePocketModelReady,
  getDefaultPocketModelDir,
  resolvePocketModelDir,
  resolvePocketModelId,
  DeviceManager,
} from 'phill-cli-core';
import {
  type SlashCommand,
  type CommandContext,
  type SlashCommandActionReturn,
  CommandKind,
} from '../ui/commands/types.js';
import { type ICommandLoader } from './types.js';
import { persistentState } from '../utils/persistentState.js';
import { SettingScope } from '../config/settings.js';

function resolvePocketHfTokenLocal(config: CommandContext['services']['config']) {
  const voiceHfApiKey = config?.getVoice().huggingFaceApiKey?.trim();
  if (voiceHfApiKey) return { source: 'voice_huggingface_api_key' as const };
  const envHfToken = process.env['HF_TOKEN']?.trim();
  if (envHfToken) return { source: 'hf_token' as const };
  const envHfApiKey = process.env['HUGGINGFACE_API_KEY']?.trim();
  if (envHfApiKey) return { source: 'huggingface_api_key' as const };
  const configHfApiKey = config?.huggingFace?.apiKey?.trim();
  if (configHfApiKey) return { source: 'config_huggingface_api_key' as const };
  return { source: 'none' as const };
}

type VoiceProviderId = 'auto' | 'gemini' | 'openai' | 'elevenlabs' | 'pocket' | 'system';
type VoiceModelTarget = 'gemini' | 'openai' | 'elevenlabs' | 'pocket';
type VoiceKeyTarget = 'gemini' | 'openai' | 'elevenlabs' | 'huggingface';
type VoiceAudioProfile = 'default' | 'clean' | 'noisy';

function splitArgs(args: string): string[] {
  return args
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export class VoiceCommandLoader implements ICommandLoader {
  constructor(private toggleVoice: () => void, private toggleTts: () => void) {}

  async loadCommands(_signal: AbortSignal): Promise<SlashCommand[]> {
    const setVoiceSetting = (
      context: CommandContext,
      key: string,
      value: unknown,
    ) => {
      context.services.settings.setValue(SettingScope.User, `voice.${key}`, value);
      context.services.settings.setValue(SettingScope.User, `ui.voice.${key}`, value);
    };

    return [
      {
        name: 'voice',
        description: 'Voice controls and setup',
        kind: CommandKind.BUILT_IN,
        subCommands: [
          {
            name: 'toggle',
            description: 'Toggle voice input mode',
            kind: CommandKind.BUILT_IN,
            autoExecute: true,
            action: async (
              _context: CommandContext,
            ): Promise<SlashCommandActionReturn> => {
              this.toggleVoice();
              return {
                type: 'message',
                messageType: 'info',
                content: 'Voice mode toggled.',
              };
            },
          },
          {
            name: 'setup',
            description: 'Download and prepare Pocket TTS model',
            kind: CommandKind.BUILT_IN,
            autoExecute: true,
            action: async (
              context: CommandContext,
            ): Promise<SlashCommandActionReturn> => {
              const config = context.services.config;
              if (!config) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content: 'Config unavailable for voice setup.',
                };
              }

              context.ui.addItem({
                type: 'info',
                text: 'Pocket TTS setup started. Downloading model files...',
              });

              let lastLoggedPct = -10;
              const result = await ensurePocketModelReady(config, (progress) => {
                if (typeof progress.progress === 'number') {
                  const pct = Math.round(progress.progress * 100);
                  if (pct >= lastLoggedPct + 10) {
                    lastLoggedPct = pct;
                    context.ui.addItem({
                      type: 'info',
                      text: `Pocket TTS download: ${pct}%`,
                    });
                  }
                }
              });

              context.services.settings.setValue(
                SettingScope.User,
                'voice.ttsProvider',
                'pocket',
              );
              persistentState.set('hasSeenPocketTtsOnboarding', true);
              persistentState.set('hasSeenPocketTtsHfAccessOnboarding', true);

              return {
                type: 'message',
                messageType: 'info',
                content: `Pocket TTS setup complete.\nmodel: ${result.modelId}\ndir: ${result.modelDir}`,
              };
            },
          },
          {
            name: 'tts',
            description: 'Set TTS state: /voice tts <on|off|toggle>',
            kind: CommandKind.BUILT_IN,
            autoExecute: false,
            action: async (
              context: CommandContext,
              args: string,
            ): Promise<SlashCommandActionReturn> => {
              const mode = splitArgs(args)[0]?.toLowerCase();
              if (!mode || !['on', 'off', 'toggle'].includes(mode)) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content: 'Usage: /voice tts <on|off|toggle>',
                };
              }
              if (mode === 'toggle') {
                this.toggleTts();
                return {
                  type: 'message',
                  messageType: 'info',
                  content: 'TTS toggled.',
                };
              }
              setVoiceSetting(context, 'ttsEnabled', mode === 'on');
              return {
                type: 'message',
                messageType: 'info',
                content: `TTS ${mode === 'on' ? 'enabled' : 'disabled'}.`,
              };
            },
          },
          {
            name: 'provider',
            description:
              'Set preferred TTS provider: /voice provider <auto|gemini|openai|elevenlabs|pocket|system>',
            kind: CommandKind.BUILT_IN,
            autoExecute: false,
            action: async (
              context: CommandContext,
              args: string,
            ): Promise<SlashCommandActionReturn> => {
              const provider = splitArgs(args)[0]?.toLowerCase() as
                | VoiceProviderId
                | undefined;
              const allowed: VoiceProviderId[] = [
                'auto',
                'gemini',
                'openai',
                'elevenlabs',
                'pocket',
                'system',
              ];
              if (!provider || !allowed.includes(provider)) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content:
                    'Usage: /voice provider <auto|gemini|openai|elevenlabs|pocket|system>',
                };
              }
              setVoiceSetting(context, 'ttsProvider', provider);
              return {
                type: 'message',
                messageType: 'info',
                content: `Voice TTS provider set to: ${provider}`,
              };
            },
          },
          {
            name: 'key',
            description:
              'Manage voice-only API keys: /voice key <set|clear|status> ...',
            kind: CommandKind.BUILT_IN,
            autoExecute: false,
            action: async (
              context: CommandContext,
              args: string,
            ): Promise<SlashCommandActionReturn> => {
              const tokens = splitArgs(args);
              const op = tokens[0]?.toLowerCase();
              const target = tokens[1]?.toLowerCase() as VoiceKeyTarget | undefined;
              const keyFieldByTarget: Record<VoiceKeyTarget, string> = {
                gemini: 'geminiApiKey',
                openai: 'openAiApiKey',
                elevenlabs: 'elevenLabsApiKey',
                huggingface: 'huggingFaceApiKey',
              };

              if (op === 'status') {
                const voice = context.services.config?.getVoice();
                const status = [
                  `gemini: ${voice?.geminiApiKey ? 'configured' : 'fallback-only'}`,
                  `openai: ${voice?.openAiApiKey ? 'configured' : 'fallback-only'}`,
                  `elevenlabs: ${voice?.elevenLabsApiKey ? 'configured' : 'fallback-only'}`,
                  `huggingface: ${voice?.huggingFaceApiKey ? 'configured' : 'fallback-only'}`,
                ].join('\n');
                return {
                  type: 'message',
                  messageType: 'info',
                  content: `Voice API key status\n${status}`,
                };
              }

              if (!op || !['set', 'clear'].includes(op) || !target || !(target in keyFieldByTarget)) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content:
                    'Usage: /voice key set <gemini|openai|elevenlabs|huggingface> <value>\n       /voice key clear <gemini|openai|elevenlabs|huggingface>\n       /voice key status',
                };
              }

              const field = keyFieldByTarget[target];
              if (op === 'clear') {
                setVoiceSetting(context, field, '');
                return {
                  type: 'message',
                  messageType: 'info',
                  content: `Cleared voice-only key for ${target}.`,
                };
              }

              const value = tokens.slice(2).join(' ').trim();
              if (!value) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content: `Usage: /voice key set ${target} <value>`,
                };
              }
              setVoiceSetting(context, field, value);
              return {
                type: 'message',
                messageType: 'info',
                content: `Saved voice-only key for ${target}.`,
              };
            },
          },
          {
            name: 'model',
            description:
              'Manage voice model overrides: /voice model <set|status> ...',
            kind: CommandKind.BUILT_IN,
            autoExecute: false,
            action: async (
              context: CommandContext,
              args: string,
            ): Promise<SlashCommandActionReturn> => {
              const tokens = splitArgs(args);
              const op = tokens[0]?.toLowerCase();
              const target = tokens[1]?.toLowerCase() as
                | VoiceModelTarget
                | undefined;
              const fieldByTarget: Record<VoiceModelTarget, string> = {
                gemini: 'geminiTtsModel',
                openai: 'openAiTtsModel',
                elevenlabs: 'elevenLabsModelId',
                pocket: 'pocketModelId',
              };
              if (op === 'status') {
                const voice = context.services.config?.getVoice();
                return {
                  type: 'message',
                  messageType: 'info',
                  content:
                    `Voice model overrides\n` +
                    `gemini: ${voice?.geminiTtsModel || '(default)'}\n` +
                    `openai: ${voice?.openAiTtsModel || '(default)'}\n` +
                    `elevenlabs: ${voice?.elevenLabsModelId || '(default)'}\n` +
                    `pocket: ${voice?.pocketModelId || '(default)'}`,
                };
              }
              if (!op || op !== 'set' || !target || !(target in fieldByTarget)) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content:
                    'Usage: /voice model set <gemini|openai|elevenlabs|pocket> <model-id>\n       /voice model status',
                };
              }
              const modelId = tokens.slice(2).join(' ').trim();
              if (!modelId) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content: `Usage: /voice model set ${target} <model-id>`,
                };
              }
              setVoiceSetting(context, fieldByTarget[target], modelId);
              return {
                type: 'message',
                messageType: 'info',
                content: `Set ${target} voice model override to: ${modelId}`,
              };
            },
          },
          {
            name: 'voice',
            description:
              'Set provider voice override: /voice voice set <gemini|openai|elevenlabs|pocket> <voice>',
            kind: CommandKind.BUILT_IN,
            autoExecute: false,
            action: async (
              context: CommandContext,
              args: string,
            ): Promise<SlashCommandActionReturn> => {
              const tokens = splitArgs(args);
              const op = tokens[0]?.toLowerCase();
              const target = tokens[1]?.toLowerCase() as
                | VoiceModelTarget
                | undefined;
              const fieldByTarget: Record<VoiceModelTarget, string> = {
                gemini: 'geminiVoiceName',
                openai: 'openAiVoice',
                elevenlabs: 'elevenLabsVoiceId',
                pocket: 'pocketVoicePreset',
              };
              if (!op || op !== 'set' || !target || !(target in fieldByTarget)) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content:
                    'Usage: /voice voice set <gemini|openai|elevenlabs|pocket> <voice-name-or-id>',
                };
              }
              const voiceValue = tokens.slice(2).join(' ').trim();
              if (!voiceValue) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content:
                    `Usage: /voice voice set ${target} <voice-name-or-id>`,
                };
              }
              setVoiceSetting(context, fieldByTarget[target], voiceValue);
              return {
                type: 'message',
                messageType: 'info',
                content: `Set ${target} voice override to: ${voiceValue}`,
              };
            },
          },
          {
            name: 'audio',
            description:
              'Manage voice audio devices and processing: /voice audio <list|input|output|profile|status> ...',
            kind: CommandKind.BUILT_IN,
            autoExecute: false,
            action: async (
              context: CommandContext,
              args: string,
            ): Promise<SlashCommandActionReturn> => {
              const tokens = splitArgs(args);
              const op = tokens[0]?.toLowerCase();
              const value = tokens.slice(1).join(' ').trim();

              if (op === 'list') {
                const deviceManager = DeviceManager.getInstance();
                const [inputs, outputs] = await Promise.all([
                  deviceManager.getInputDevices(),
                  deviceManager.getOutputDevices(),
                ]);
                const inputText = inputs
                  .map((d, idx) => `${idx + 1}. ${d.name} (${d.id})`)
                  .join('\n');
                const outputText = outputs
                  .map((d, idx) => `${idx + 1}. ${d.name} (${d.id})`)
                  .join('\n');
                return {
                  type: 'message',
                  messageType: 'info',
                  content:
                    `Voice audio devices\n` +
                    `\nInput devices\n${inputText || '(none)'}\n` +
                    `\nOutput devices\n${outputText || '(none)'}\n` +
                    `\nUse /voice audio input <device-id>\nUse /voice audio output <device-id>`,
                };
              }

              if (op === 'input') {
                if (!value) {
                  return {
                    type: 'message',
                    messageType: 'error',
                    content: 'Usage: /voice audio input <device-id-or-index>',
                  };
                }
                let resolvedValue = value;
                const index = parseInt(value, 10);
                if (!isNaN(index) && index > 0 && /^\d+$/.test(value)) {
                  const deviceManager = DeviceManager.getInstance();
                  const devices = await deviceManager.getInputDevices();
                  if (index <= devices.length) {
                    resolvedValue = devices[index - 1].id;
                  }
                }
                setVoiceSetting(context, 'inputDevice', resolvedValue);
                return {
                  type: 'message',
                  messageType: 'info',
                  content: `Voice input device set to: ${resolvedValue}`,
                };
              }

              if (op === 'output') {
                if (!value) {
                  return {
                    type: 'message',
                    messageType: 'error',
                    content: 'Usage: /voice audio output <device-id-or-index>',
                  };
                }
                let resolvedValue = value;
                const index = parseInt(value, 10);
                if (!isNaN(index) && index > 0 && /^\d+$/.test(value)) {
                  const deviceManager = DeviceManager.getInstance();
                  const devices = await deviceManager.getOutputDevices();
                  if (index <= devices.length) {
                    resolvedValue = devices[index - 1].id;
                  }
                }
                setVoiceSetting(context, 'outputDevice', resolvedValue);
                return {
                  type: 'message',
                  messageType: 'info',
                  content: `Voice output device set to: ${resolvedValue}`,
                };
              }

              if (op === 'profile') {
                const profile = (tokens[1]?.toLowerCase() ??
                  '') as VoiceAudioProfile;
                if (!['default', 'clean', 'noisy'].includes(profile)) {
                  return {
                    type: 'message',
                    messageType: 'error',
                    content: 'Usage: /voice audio profile <default|clean|noisy>',
                  };
                }

                if (profile === 'default') {
                  setVoiceSetting(context, 'noiseSuppression', true);
                  setVoiceSetting(context, 'noiseSuppressionLevel', 'standard');
                  setVoiceSetting(context, 'autoGainControl', true);
                  setVoiceSetting(context, 'highpassFilter', true);
                  setVoiceSetting(context, 'voiceIsolationMode', 'standard');
                } else if (profile === 'clean') {
                  setVoiceSetting(context, 'noiseSuppression', true);
                  setVoiceSetting(context, 'noiseSuppressionLevel', 'light');
                  setVoiceSetting(context, 'autoGainControl', true);
                  setVoiceSetting(context, 'highpassFilter', true);
                  setVoiceSetting(context, 'voiceIsolationMode', 'off');
                } else {
                  setVoiceSetting(context, 'noiseSuppression', true);
                  setVoiceSetting(context, 'noiseSuppressionLevel', 'aggressive');
                  setVoiceSetting(context, 'autoGainControl', true);
                  setVoiceSetting(context, 'highpassFilter', true);
                  setVoiceSetting(context, 'voiceIsolationMode', 'aggressive');
                }

                return {
                  type: 'message',
                  messageType: 'info',
                  content: `Voice audio profile applied: ${profile}`,
                };
              }

              if (op === 'status') {
                const voice = context.services.config?.getVoice();
                return {
                  type: 'message',
                  messageType: 'info',
                  content:
                    `Voice audio status\n` +
                    `inputDevice: ${voice?.inputDevice ?? 'default'}\n` +
                    `outputDevice: ${voice?.outputDevice ?? 'default'}\n` +
                    `noiseSuppression: ${voice?.noiseSuppression !== false}\n` +
                    `noiseSuppressionLevel: ${voice?.noiseSuppressionLevel ?? 'standard'}\n` +
                    `autoGainControl: ${voice?.autoGainControl !== false}\n` +
                    `highpassFilter: ${voice?.highpassFilter !== false}\n` +
                    `voiceIsolationMode: ${voice?.voiceIsolationMode ?? 'standard'}`,
                };
              }

              return {
                type: 'message',
                messageType: 'error',
                content:
                  'Usage: /voice audio list\n       /voice audio input <device-id>\n       /voice audio output <device-id>\n       /voice audio profile <default|clean|noisy>\n       /voice audio status',
              };
            },
          },
          {
            name: 'fallback',
            description: 'Show current TTS fallback order and active provider',
            kind: CommandKind.BUILT_IN,
            autoExecute: true,
            action: async (
              context: CommandContext,
            ): Promise<SlashCommandActionReturn> => {
              const voice = context.services.config?.getVoice();
              const provider = voice?.ttsProvider ?? 'auto';
              return {
                type: 'message',
                messageType: 'info',
                content:
                  `Voice fallback diagnostics\n` +
                  `configuredProvider: ${provider}\n` +
                  `preferAuthProvider: ${voice?.preferAuthTtsProvider !== false}\n` +
                  `fallbackOrder: selected -> gemini -> openai -> elevenlabs -> pocket -> system`,
              };
            },
          },
          {
            name: 'skip',
            description:
              'Skip Pocket TTS onboarding reminder for now (you can set up later)',
            kind: CommandKind.BUILT_IN,
            autoExecute: true,
            action: async (): Promise<SlashCommandActionReturn> => {
              persistentState.set('hasSeenPocketTtsOnboarding', true);
              return {
                type: 'message',
                messageType: 'info',
                content:
                  'Pocket TTS setup skipped for now. You can run /voice setup anytime later.',
              };
            },
          },
          {
            name: 'skip-google-tts-key',
            description:
              'Skip Google-login Gemini API key backup reminder for now',
            kind: CommandKind.BUILT_IN,
            autoExecute: true,
            action: async (): Promise<SlashCommandActionReturn> => {
              persistentState.set('hasSeenGoogleTtsApiKeyOnboarding', true);
              return {
                type: 'message',
                messageType: 'info',
                content:
                  'Google-login TTS API key backup reminder skipped for now. You can still set API keys later from /auth or environment variables.',
              };
            },
          },
          {
            name: 'status',
            description: 'Show Pocket TTS setup status',
            kind: CommandKind.BUILT_IN,
            autoExecute: true,
            action: async (
              context: CommandContext,
            ): Promise<SlashCommandActionReturn> => {
              const config = context.services.config;
              if (!config) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content: 'Config unavailable for voice status.',
                };
              }
              const modelId = resolvePocketModelId(config);
              const modelDir = resolvePocketModelDir(config);
              const defaultDir = getDefaultPocketModelDir(config);
              const tokenStatus = resolvePocketHfTokenLocal(config);
              const voice = config.getVoice();
              const hfStatus =
                tokenStatus.source === 'none'
                  ? 'missing'
                  : `found (${tokenStatus.source})`;
              return {
                type: 'message',
                messageType: 'info',
                content:
                  `Voice status\n` +
                  `provider: ${voice.ttsProvider ?? 'auto'}\n` +
                  `ttsEnabled: ${voice.ttsEnabled !== false}\n` +
                  `voiceEnabled: ${voice.enabled === true}\n` +
                  `fallbackOrder: selected -> gemini -> openai -> elevenlabs -> pocket -> system\n` +
                  `\nPocket TTS status\n` +
                  `model: ${modelId}\n` +
                  `modelDir: ${modelDir}\n` +
                  `defaultDir: ${defaultDir}\n` +
                  `huggingfaceToken: ${hfStatus}\n` +
                  `modelAccessLink: https://huggingface.co/kyutai/pocket-tts`,
              };
            },
          },
          {
            name: 'skip-pocket-hf-access',
            description:
              'Skip Pocket TTS Hugging Face access/token reminder for now',
            kind: CommandKind.BUILT_IN,
            autoExecute: true,
            action: async (): Promise<SlashCommandActionReturn> => {
              persistentState.set('hasSeenPocketTtsHfAccessOnboarding', true);
              return {
                type: 'message',
                messageType: 'info',
                content:
                  'Pocket TTS Hugging Face access reminder skipped for now. You can still set HF token later and run /voice setup.',
              };
            },
          },
          {
            name: 'path',
            description: 'Set Pocket TTS model dir: /voice path <directory>',
            kind: CommandKind.BUILT_IN,
            autoExecute: false,
            action: async (
              context: CommandContext,
              args: string,
            ): Promise<SlashCommandActionReturn> => {
              const dir = args.trim();
              if (!dir) {
                return {
                  type: 'message',
                  messageType: 'error',
                  content: 'Usage: /voice path <directory>',
                };
              }
              context.services.settings.setValue(
                SettingScope.User,
                'voice.pocketModelDir',
                dir,
              );
              return {
                type: 'message',
                messageType: 'info',
                content: `Pocket model directory set to: ${dir}`,
              };
            },
          },
        ],
        action: async (_context: CommandContext): Promise<SlashCommandActionReturn> =>
          ({
            type: 'message',
            messageType: 'info',
            content:
              'Voice command available. Use /voice toggle, /voice tts <on|off|toggle>, /voice provider <id>, /voice key <set|clear|status>, /voice model <set|status>, /voice voice set <provider> <voice>, /voice audio <list|input|output|profile|status>, /voice fallback, /voice setup, /voice status, or /voice path <dir>.',
          }),
      },
      {
        name: 'tts',
        description: 'Toggle text-to-speech output.',
        kind: CommandKind.BUILT_IN,
        action: async (_context: CommandContext): Promise<SlashCommandActionReturn> => {
          this.toggleTts();
          return {
            type: 'message',
            messageType: 'info',
            content: 'TTS toggled.',
          };
        },
      },
    ];
  }
}
