/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import os from 'node:os';
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import {
  AuthType,
  PREVIEW_PHILL_MODEL,
  PREVIEW_PHILL_FLASH_MODEL,
  PREVIEW_PHILL_3_1_MODEL_ID,
  PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
  PREVIEW_PHILL_3_1_MODEL_AUTO,
  DEFAULT_PHILL_MODEL,
  DEFAULT_PHILL_FLASH_MODEL,
  DEFAULT_PHILL_FLASH_LITE_MODEL,
  DEFAULT_PHILL_MODEL_AUTO,
  ModelSlashCommandEvent,
  logModelSlashCommand,
  getDisplayString,
} from 'phill-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { ThemedGradient } from './ThemedGradient.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { PremiumFrame } from './shared/PremiumFrame.js';

interface ModelDialogProps {
  onClose: () => void;
}

interface ProviderOption {
  value: string;
  title: string;
  key: string;
  description?: string;
}

function getProviderRecommendedModels(authType: AuthType | undefined): string[] {
  switch (authType) {
    case AuthType.OPENAI:
    case AuthType.OPENAI_BROWSER:
      return [
        // Latest GPT-5 family
        'gpt-5.2',
        'gpt-5.1',
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        // Codex-optimized families
        'gpt-5.2-codex',
        'gpt-5.3-codex',
        'gpt-5.1-codex',
        'gpt-5.1-codex-max',
        'gpt-5-codex',
        'gpt-5.1-codex-mini',
        'codex-mini-latest',
        // GPT-4.1 family
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
        // Reasoning models
        'o3',
        'o4-mini',
        'o1',
        'o1-mini',
        'o1-preview',
        // GPT-4o family
        'gpt-4o',
        'gpt-4o-mini',
        // Previous models
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
      ];
    case AuthType.ANTHROPIC:
      return [
        // Claude 4.6 family (newest)
        'claude-opus-4-6-20250805',
        // Claude 4.5 family
        'claude-opus-4-5-20251101',
        'claude-sonnet-4-5-20250929',
        'claude-haiku-4-5-20251001',
        // Claude 4.1 and 4 family
        'claude-opus-4-1-20250805',
        'claude-opus-4-20250514',
        'claude-sonnet-4-20250514',
        // Claude 3.5 family
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-haiku-20241022',
        // Claude 3 family
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        // Aliases
        'claude-3-opus-latest',
        'claude-3-5-sonnet-latest',
        'claude-3-5-haiku-latest',
      ];
    case AuthType.GROQ:
      return [
        // Groq Compound systems
        'groq/compound',
        'groq/compound-mini',
        // OpenAI GPT-OSS models on Groq
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'openai/gpt-oss-safeguard-20b',
        // Llama family
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        // DeepSeek reasoning models
        'deepseek-r1-distill-llama-70b',
        'deepseek-r1-distill-qwen-32b',
        // Qwen and Kimi models
        'qwen/qwen3-32b',
        'moonshotai/kimi-k2-instruct-0905',
        // Other models
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
        // Audio models
        'whisper-large-v3',
        'whisper-large-v3-turbo',
      ];
    default:
      return [];
  }
}

function dedupeNonEmpty(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(values.map((v) => (v ?? '').trim()).filter((v) => v.length > 0)),
  );
}

async function discoverOllamaModels(endpoint: string): Promise<string[]> {
  const base = endpoint.replace(/\/+$/, '');
  const response = await fetch(`${base}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama /api/tags failed with status ${response.status}`);
  }
  const json = (await response.json()) as {
    models?: Array<{ name?: string; model?: string }>;
  };
  const models = (json.models ?? []).flatMap((m) => [m.name, m.model]);
  return dedupeNonEmpty(models);
}

async function discoverHuggingFaceCacheModels(): Promise<string[]> {
  const home = os.homedir();
  const hfHome = process.env['HF_HOME']?.trim();
  const explicitHubCache = process.env['HUGGINGFACE_HUB_CACHE']?.trim();
  const explicitHubCacheAlt = process.env['HF_HUB_CACHE']?.trim();

  const cacheRoots = dedupeNonEmpty([
    explicitHubCache,
    explicitHubCacheAlt,
    hfHome ? path.join(hfHome, 'hub') : undefined,
    path.join(home, '.cache', 'huggingface', 'hub'),
    process.platform === 'win32'
      ? path.join(home, 'AppData', 'Local', 'huggingface', 'hub')
      : undefined,
  ]);

  const found = new Set<string>();
  for (const root of cacheRoots) {
    try {
      const entries = await readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith('models--')) continue;
        const model = entry.name
          .slice('models--'.length)
          .replace(/--/g, '/')
          .trim();
        if (model) {
          found.add(model);
        }
      }
    } catch {
      // Ignore missing/non-readable cache roots.
    }
  }

  return Array.from(found).sort((a, b) => a.localeCompare(b));
}

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useConfig();
  const { terminalWidth } = useUIState();
  const [view, setView] = useState<'main' | 'manual'>('main');
  const [persistMode, setPersistMode] = useState(false);
  const authType = config?.getContentGeneratorConfig()?.authType;
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  // Determine the Preferred Model (read once when the dialog opens).
  const preferredModel = config?.getModel() || DEFAULT_PHILL_MODEL_AUTO;
  const isGeminiAuth =
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.USE_PHILL ||
    authType === AuthType.USE_VERTEX_AI ||
    authType === AuthType.COMPUTE_ADC;

  const shouldShowPreviewModels =
    config?.getPreviewFeatures() && config.getHasAccessToPreviewModel();

  useEffect(() => {
    let cancelled = false;
    if (isGeminiAuth) {
      setProviderOptions([]);
      setProviderLoading(false);
      setProviderError(null);
      return;
    }

    const loadProviderModels = async () => {
      setProviderLoading(true);
      setProviderError(null);

      const contentConfig = config?.getContentGeneratorConfig();
      const currentModel = preferredModel;

      try {
        let discovered: string[] = [];
        if (authType === AuthType.OLLAMA) {
          const endpoint =
            contentConfig?.ollama?.endpoint ||
            process.env['OLLAMA_ENDPOINT'] ||
            'http://localhost:11434';
          discovered = await discoverOllamaModels(endpoint);
        } else if (authType === AuthType.HUGGINGFACE) {
          discovered = await discoverHuggingFaceCacheModels();
        }

        const providerConfigured = (() => {
          switch (authType) {
            case AuthType.OLLAMA:
              return contentConfig?.ollama?.model ?? process.env['OLLAMA_MODEL'];
            case AuthType.HUGGINGFACE:
              return (
                contentConfig?.huggingFace?.model ??
                process.env['HUGGINGFACE_MODEL']
              );
            case AuthType.OPENAI:
            case AuthType.OPENAI_BROWSER:
              return contentConfig?.openAi?.model ?? process.env['OPENAI_MODEL'];
            case AuthType.ANTHROPIC:
              return (
                contentConfig?.anthropic?.model ?? process.env['ANTHROPIC_MODEL']
              );
            case AuthType.GROQ:
              return contentConfig?.groq?.model ?? process.env['GROQ_MODEL'];
            case AuthType.CUSTOM_API:
              return (
                contentConfig?.customApi?.model ?? process.env['CUSTOM_API_MODEL']
              );
            default:
              return undefined;
          }
        })();

        const recommended = getProviderRecommendedModels(authType);
        const models = dedupeNonEmpty([
          currentModel,
          providerConfigured,
          ...recommended,
          ...discovered,
        ]);
        const items = models.map((model) => ({
          value: model,
          title: model,
          key: model,
          description: model === currentModel ? 'Current model' : 'Available model',
        }));

        if (!cancelled) {
          setProviderOptions(items);
          setProviderLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          const fallbackModels = dedupeNonEmpty([
            currentModel,
            process.env['OLLAMA_MODEL'],
            process.env['HUGGINGFACE_MODEL'],
            process.env['OPENAI_MODEL'],
            process.env['ANTHROPIC_MODEL'],
            process.env['GROQ_MODEL'],
            process.env['CUSTOM_API_MODEL'],
          ]);
          setProviderOptions(
            fallbackModels.map((model) => ({
              value: model,
              title: model,
              key: model,
              description: model === currentModel ? 'Current model' : 'Available model',
            })),
          );
          setProviderError(
            error instanceof Error ? error.message : 'Failed to discover provider models.',
          );
          setProviderLoading(false);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadProviderModels();
    return () => {
      cancelled = true;
    };
  }, [authType, config, isGeminiAuth, preferredModel]);

  const manualModelSelected = useMemo(() => {
    const manualModels = [
      DEFAULT_PHILL_MODEL,
      DEFAULT_PHILL_FLASH_MODEL,
      DEFAULT_PHILL_FLASH_LITE_MODEL,
      PREVIEW_PHILL_MODEL,
      PREVIEW_PHILL_FLASH_MODEL,
      PREVIEW_PHILL_3_1_MODEL_ID,
      PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
    ];
    if (manualModels.includes(preferredModel)) {
      return preferredModel;
    }
    return '';
  }, [preferredModel]);

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        if (view === 'manual') {
          setView('main');
        } else {
          onClose();
        }
        return true;
      }
      if (key.name === 'tab') {
        setPersistMode((prev) => !prev);
        return true;
      }
      return false;
    },
    { isActive: true },
  );

  const mainOptions = useMemo(() => {
    if (!isGeminiAuth) {
      return providerOptions.length > 0
        ? providerOptions
        : [
          {
            value: preferredModel,
            title: preferredModel,
            description: 'Current model',
            key: preferredModel,
          },
        ];
    }

    const list = [
      {
        value: PREVIEW_PHILL_3_1_MODEL_AUTO,
        title: getDisplayString(PREVIEW_PHILL_3_1_MODEL_AUTO),
        description:
          'Adaptive auto mode (preview tier): routes between gemini-3.1-pro and gemini-3.1-flash, then retries intelligently on transient limits.',
        key: PREVIEW_PHILL_3_1_MODEL_AUTO,
      },
      {
        value: DEFAULT_PHILL_MODEL_AUTO,
        title: getDisplayString(DEFAULT_PHILL_MODEL_AUTO),
        description:
          'Adaptive auto mode (stable tier): routes between gemini-2.5-pro and gemini-2.5-flash with fast fallback behavior under rate pressure.',
        key: DEFAULT_PHILL_MODEL_AUTO,
      },
      {
        value: 'Manual',
        title: manualModelSelected
          ? `Manual (${manualModelSelected})`
          : 'Manual',
        description: 'Manually select a model',
        key: 'Manual',
      },
    ];
    return list;
  }, [
    isGeminiAuth,
    manualModelSelected,
    preferredModel,
    providerOptions,
  ]);

  const manualOptions = useMemo(() => {
    // Gemini 2.5 core models — the primary manual selection tier.
    const gemini25Models = [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ];

    // Phill 3 / preview tier (only shown when preview is enabled).
    const withPreview = shouldShowPreviewModels
      ? [
          PREVIEW_PHILL_MODEL,
          PREVIEW_PHILL_FLASH_MODEL,
          PREVIEW_PHILL_3_1_MODEL_ID,
          PREVIEW_PHILL_3_1_FLASH_MODEL_ID,
          'gemini-3-pro',
          'gemini-3-flash',
        ]
      : [];

    return dedupeNonEmpty([...withPreview, ...gemini25Models]).map(
      (model) => ({
        value: model,
        title: model,
        key: model,
      }),
    );
  }, [shouldShowPreviewModels]);

  const options =
    isGeminiAuth && view === 'manual' ? manualOptions : mainOptions;

  // Calculate the initial index based on the preferred model.
  const initialIndex = useMemo(() => {
    const idx = options.findIndex((option) => option.value === preferredModel);
    if (idx !== -1) {
      return idx;
    }
    if (view === 'main') {
      const manualIdx = options.findIndex((o) => o.value === 'Manual');
      return manualIdx !== -1 ? manualIdx : 0;
    }
    return 0;
  }, [preferredModel, options, view]);

  // Handle selection internally (Autonomous Dialog).
  const handleSelect = useCallback(
    (model: string) => {
      if (model === 'Manual') {
        setView('manual');
        return;
      }

      if (config) {
        config.setModel(model, persistMode ? false : true);
        const event = new ModelSlashCommandEvent(model);
        logModelSlashCommand(config, event);
      }
      onClose();
    },
    [config, onClose, persistMode],
  );

  let header;
  let subheader;

  if (!isGeminiAuth) {
    header = `Provider: ${authType ?? 'unknown'}`;
    subheader = providerLoading
      ? 'Discovering models for the current provider...'
      : providerError
        ? `Model discovery partial: ${providerError}`
        : 'Showing models discovered for the current provider.';
  } else if (shouldShowPreviewModels) {
    // Do not show any header or subheader since it's already showing preview model
    // options
    header = undefined;
    subheader = undefined;
    // When a user has the access but has not enabled the preview features.
  } else if (config?.getHasAccessToPreviewModel()) {
    header = 'Phill 3 is now available.';
    subheader =
      'Enable "Preview features" in /settings.\nLearn more at https://goo.gle/enable-preview-features';
  } else {
    header = 'Phill 3 is coming soon.';
    subheader = undefined;
  }

  return (
    <PremiumFrame
      width={Math.max(60, terminalWidth - 2)}
      title="Model Routing Control"
      subtitle="Auto mode, manual selection, and persistence are all configurable."
      borderColor={theme.border.focused}
    >
      <Text bold>Select Model</Text>

      <Box flexDirection="column">
        {header && (
          <Box marginTop={1}>
            <ThemedGradient>
              <Text>{header}</Text>
            </ThemedGradient>
          </Box>
        )}
        {subheader && <Text>{subheader}</Text>}
      </Box>
      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={options}
          onSelect={handleSelect}
          initialIndex={initialIndex}
          showNumbers={true}
        />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color={theme.text.primary}>
            Remember model for future sessions:{' '}
          </Text>
          <Text color={theme.status.success}>
            {persistMode ? 'true' : 'false'}
          </Text>
        </Box>
        <Text color={theme.text.secondary}>(Press Tab to toggle)</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>
          {'> Auto modes are rate-limit aware and designed to preserve flow with minimal interruption.'}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>
          {'> To use a specific model on startup, use the --model flag.'}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>(Press Esc to close)</Text>
      </Box>
    </PremiumFrame>
  );
}


