/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useSettings } from './SettingsContext.js';
import { SettingScope } from '../../config/settings.js';

import type { AudioDevice, Config } from 'phill-cli-core';

export interface VoiceState {
  isEnabled: boolean;
  ttsEnabled: boolean;
  status: 'idle' | 'listening' | 'processing' | 'speaking';
  waiterState: 'off' | 'listening' | 'waiting' | 'ready';
  transcript: string;
  currentTool: string | null;
  inputVolume: number;
  outputVolume: number;
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  selectedInputDevice: string;
  selectedOutputDevice: string;
  emotion: string;
}

export interface VoiceContextValue {
  voiceState: VoiceState;
  toggleVoice: () => void;
  toggleTts: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setStatus: (status: VoiceState['status']) => void;
  setWaiterState: (state: VoiceState['waiterState']) => void;
  setTranscript: (transcript: string) => void;
  setCurrentTool: (tool: string | null) => void;
  setInputVolume: (volume: number) => void;
  setOutputVolume: (volume: number) => void;
  setInputDevices: (devices: AudioDevice[]) => void;
  setOutputDevices: (devices: AudioDevice[]) => void;
  setSelectedInputDevice: (deviceId: string) => void;
  setSelectedOutputDevice: (deviceId: string) => void;
  setEmotion: (emotion: string) => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children, config }: { children: React.ReactNode; config?: Config }) {
  const settings = useSettings();

  const {
    mergedVoiceEnabled,
    mergedTtsEnabled,
    mergedInputDevice,
    mergedOutputDevice,
  } = useMemo(() => {
    const merged = settings.merged as unknown as {
      ui?: { voice?: Partial<VoiceState> & Record<string, unknown> };
      voice?: Partial<VoiceState> & Record<string, unknown>;
    };
    const mergedVoice = (merged.ui?.voice ?? merged.voice ?? {}) as Record<
      string,
      unknown
    >;
    return {
      mergedVoiceEnabled: (mergedVoice['enabled'] as boolean | undefined) ?? false,
      mergedTtsEnabled: (mergedVoice['ttsEnabled'] as boolean | undefined) ?? false,
      mergedInputDevice: (mergedVoice['inputDevice'] as string | undefined) ?? 'default',
      mergedOutputDevice: (mergedVoice['outputDevice'] as string | undefined) ?? 'default',
    };
  }, [settings.merged]);

  const [voiceState, setVoiceState] = useState<VoiceState>(() => ({
    isEnabled: mergedVoiceEnabled,
    ttsEnabled: mergedTtsEnabled,
    status: mergedVoiceEnabled ? 'listening' : 'idle',
    waiterState: 'off',
    transcript: '',
    currentTool: null,
    inputVolume: 0,
    outputVolume: 0,
    inputDevices: [],
    outputDevices: [],
    selectedInputDevice: mergedInputDevice,
    selectedOutputDevice: mergedOutputDevice,
    emotion: 'Neutral',
  }));

  const setVoiceEnabled = useCallback(
    (enabled: boolean) => {
      setVoiceState((prev) => {
        if (prev.isEnabled === enabled && prev.status === (enabled ? 'listening' : 'idle')) {
          return prev;
        }
        // Defer setting value to avoid sync update during render/state update
        setTimeout(() => {
          settings.setValue(SettingScope.User, 'voice.enabled', enabled);
          settings.setValue(SettingScope.User, 'ui.voice.enabled', enabled);
        }, 0);
        return {
          ...prev,
          isEnabled: enabled,
          status: enabled ? 'listening' : 'idle',
        };
      });
    },
    [settings],
  );

  const toggleVoice = useCallback(() => {
    setVoiceState((prev) => {
      const newState = !prev.isEnabled;
      setTimeout(() => {
        settings.setValue(SettingScope.User, 'voice.enabled', newState);
        settings.setValue(SettingScope.User, 'ui.voice.enabled', newState);
      }, 0);
      return {
        ...prev,
        isEnabled: newState,
        status: newState ? 'listening' : 'idle',
      };
    });
  }, [settings]);

  const setTtsEnabled = useCallback(
    (enabled: boolean) => {
      setVoiceState((prev) => {
        if (prev.ttsEnabled === enabled) return prev;
        setTimeout(() => {
          settings.setValue(SettingScope.User, 'voice.ttsEnabled', enabled);
          settings.setValue(SettingScope.User, 'ui.voice.ttsEnabled', enabled);
        }, 0);
        return { ...prev, ttsEnabled: enabled };
      });
    },
    [settings],
  );

  const toggleTts = useCallback(() => {
    setVoiceState((prev) => {
      const newState = !prev.ttsEnabled;
      setTimeout(() => {
        settings.setValue(SettingScope.User, 'voice.ttsEnabled', newState);
        settings.setValue(SettingScope.User, 'ui.voice.ttsEnabled', newState);
      }, 0);
      return {
        ...prev,
        ttsEnabled: newState,
      };
    });
  }, [settings]);

  const setStatus = useCallback((status: VoiceState['status']) => {
    setVoiceState((prev) => (prev.status === status ? prev : { ...prev, status }));
  }, []);

  const setWaiterState = useCallback((waiterState: VoiceState['waiterState']) => {
    setVoiceState((prev) =>
      prev.waiterState === waiterState ? prev : { ...prev, waiterState },
    );
  }, []);

  const setTranscript = useCallback((transcript: string) => {
    setVoiceState((prev) =>
      prev.transcript === transcript ? prev : { ...prev, transcript },
    );
  }, []);

  const setCurrentTool = useCallback((tool: string | null) => {
    setVoiceState((prev) =>
      prev.currentTool === tool ? prev : { ...prev, currentTool: tool },
    );
  }, []);

  const setInputVolume = useCallback((volume: number) => {
    setVoiceState((prev) =>
      prev.inputVolume === volume ? prev : { ...prev, inputVolume: volume },
    );
  }, []);

  const setOutputVolume = useCallback((volume: number) => {
    setVoiceState((prev) =>
      prev.outputVolume === volume ? prev : { ...prev, outputVolume: volume },
    );
  }, []);

  const setInputDevices = useCallback((devices: AudioDevice[]) => {
    setVoiceState((prev) =>
      prev.inputDevices === devices ? prev : { ...prev, inputDevices: devices },
    );
  }, []);

  const setOutputDevices = useCallback((devices: AudioDevice[]) => {
    setVoiceState((prev) =>
      prev.outputDevices === devices
        ? prev
        : { ...prev, outputDevices: devices },
    );
  }, []);

  const setSelectedInputDevice = useCallback((deviceId: string) => {
    setVoiceState((prev) => {
      if (prev.selectedInputDevice === deviceId) return prev;
      setTimeout(() => {
        settings.setValue(SettingScope.User, 'voice.inputDevice', deviceId);
        settings.setValue(SettingScope.User, 'ui.voice.inputDevice', deviceId);
      }, 0);
      return { ...prev, selectedInputDevice: deviceId };
    });
  }, [settings]);

  const setSelectedOutputDevice = useCallback((deviceId: string) => {
    setVoiceState((prev) => {
      if (prev.selectedOutputDevice === deviceId) return prev;
      setTimeout(() => {
        settings.setValue(SettingScope.User, 'voice.outputDevice', deviceId);
        settings.setValue(SettingScope.User, 'ui.voice.outputDevice', deviceId);
      }, 0);
      return { ...prev, selectedOutputDevice: deviceId };
    });
  }, [settings]);

  const setEmotion = useCallback((emotion: string) => {
    setVoiceState((prev) => (prev.emotion === emotion ? prev : { ...prev, emotion }));
  }, []);

  useEffect(() => {
    setVoiceState((prev) => {
      const nextIsEnabled = mergedVoiceEnabled;
      const nextTtsEnabled = mergedTtsEnabled;
      const nextInputDevice = mergedInputDevice;
      const nextOutputDevice = mergedOutputDevice;
      const nextStatus = nextIsEnabled ? prev.status : 'idle';

      if (
        prev.isEnabled === nextIsEnabled &&
        prev.ttsEnabled === nextTtsEnabled &&
        prev.selectedInputDevice === nextInputDevice &&
        prev.selectedOutputDevice === nextOutputDevice &&
        prev.status === nextStatus
      ) {
        return prev;
      }

      return {
        ...prev,
        isEnabled: nextIsEnabled,
        ttsEnabled: nextTtsEnabled,
        selectedInputDevice: nextInputDevice,
        selectedOutputDevice: nextOutputDevice,
        status: nextStatus,
        waiterState: nextIsEnabled ? prev.waiterState : 'off',
      };
    });
  }, [
    mergedVoiceEnabled,
    mergedTtsEnabled,
    mergedInputDevice,
    mergedOutputDevice,
  ]);

  const contextValue = useMemo(() => ({
    voiceState,
    toggleVoice,
    toggleTts,
    setVoiceEnabled,
    setTtsEnabled,
    setStatus,
    setWaiterState,
    setTranscript,
    setCurrentTool,
    setInputVolume,
    setOutputVolume,
    setInputDevices,
    setOutputDevices,
    setSelectedInputDevice,
    setSelectedOutputDevice,
    setEmotion,
  }), [
    voiceState,
    toggleVoice,
    toggleTts,
    setVoiceEnabled,
    setTtsEnabled,
    setStatus,
    setWaiterState,
    setTranscript,
    setCurrentTool,
    setInputVolume,
    setOutputVolume,
    setInputDevices,
    setOutputDevices,
    setSelectedInputDevice,
    setSelectedOutputDevice,
    setEmotion,
  ]);

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextValue {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
