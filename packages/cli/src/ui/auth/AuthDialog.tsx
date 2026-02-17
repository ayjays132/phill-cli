/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useState } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { RadioButtonSelect } from '../components/shared/RadioButtonSelect.js';
import type {
  LoadableSettingScope,
  LoadedSettings,
} from '../../config/settings.js';
import { SettingScope } from '../../config/settings.js';
import {
  AuthType,
  clearCachedCredentialFile,
  type Config,
} from 'phill-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { AuthState } from '../types.js';
import { runExitCleanup } from '../../utils/cleanup.js';
import { validateAuthMethodWithSettings } from './useAuth.js';
import { RELAUNCH_EXIT_CODE } from '../../utils/processUtils.js';

interface AuthDialogProps {
  config: Config;
  settings: LoadedSettings;
  setAuthState: (state: AuthState) => void;
  authError: string | null;
  onAuthError: (error: string | null) => void;
  setAuthContext: (context: {
    requiresRestart?: boolean;
    apiKeyAuthType?: AuthType;
  }) => void;
}

function authTypeRequiresApiKey(authType: AuthType): boolean {
  return (
    authType === AuthType.USE_GEMINI ||
    authType === AuthType.HUGGINGFACE ||
    authType === AuthType.OPENAI ||
    authType === AuthType.ANTHROPIC ||
    authType === AuthType.GROQ ||
    authType === AuthType.CUSTOM_API
  );
}

function hasApiKeyConfigured(
  authType: AuthType,
  settings: LoadedSettings,
): boolean {
  switch (authType) {
    case AuthType.USE_GEMINI:
      return (
        process.env['PHILL_API_KEY'] !== undefined ||
        process.env['GEMINI_API_KEY'] !== undefined ||
        process.env['GOOGLE_API_KEY'] !== undefined
      );
    case AuthType.HUGGINGFACE:
      return !!(process.env['HUGGINGFACE_API_KEY'] || settings.merged.huggingFace?.apiKey);
    case AuthType.OPENAI:
      return !!(process.env['OPENAI_API_KEY'] || settings.merged.openAI?.apiKey);
    case AuthType.OPENAI_BROWSER:
      return true;
    case AuthType.ANTHROPIC:
      return !!(process.env['ANTHROPIC_API_KEY'] || settings.merged.anthropic?.apiKey);
    case AuthType.GROQ:
      return !!(process.env['GROQ_API_KEY'] || settings.merged.groq?.apiKey);
    case AuthType.CUSTOM_API:
      return !!(process.env['CUSTOM_API_KEY'] || settings.merged.customApi?.apiKey);
    default:
      return true;
  }
}

export function AuthDialog({
  config,
  settings,
  setAuthState,
  authError,
  onAuthError,
  setAuthContext,
}: AuthDialogProps): React.JSX.Element {
  const [exiting, setExiting] = useState(false);
  let items = [
    {
      label: 'Login with Google',
      value: AuthType.LOGIN_WITH_GOOGLE,
      key: AuthType.LOGIN_WITH_GOOGLE,
    },
    ...(process.env['CLOUD_SHELL'] === 'true'
      ? [
        {
          label: 'Use Cloud Shell user credentials',
          value: AuthType.COMPUTE_ADC,
          key: AuthType.COMPUTE_ADC,
        },
      ]
      : process.env['PHILL_CLI_USE_COMPUTE_ADC'] === 'true'
        ? [
          {
            label: 'Use metadata server application default credentials',
            value: AuthType.COMPUTE_ADC,
            key: AuthType.COMPUTE_ADC,
          },
        ]
        : []),
    {
      label: 'Use Gemini API Key',
      value: AuthType.USE_GEMINI,
      key: AuthType.USE_GEMINI,
    },
    {
      label: 'Vertex AI',
      value: AuthType.USE_VERTEX_AI,
      key: AuthType.USE_VERTEX_AI,
    },
    {
      label: 'Ollama (Local)',
      value: AuthType.OLLAMA,
      key: AuthType.OLLAMA,
    },
    {
      label: 'HuggingFace',
      value: AuthType.HUGGINGFACE,
      key: AuthType.HUGGINGFACE,
    },
    {
      label: 'OpenAI / Codex',
      value: AuthType.OPENAI,
      key: AuthType.OPENAI,
    },
    {
      label: 'OpenAI / Codex (Browser Sign-In)',
      value: AuthType.OPENAI_BROWSER,
      key: AuthType.OPENAI_BROWSER,
    },
    {
      label: 'Anthropic (Claude)',
      value: AuthType.ANTHROPIC,
      key: AuthType.ANTHROPIC,
    },
    {
      label: 'Groq',
      value: AuthType.GROQ,
      key: AuthType.GROQ,
    },
    {
      label: 'Custom API (OpenAI-compatible)',
      value: AuthType.CUSTOM_API,
      key: AuthType.CUSTOM_API,
    },
  ];

  if (settings.merged.security.auth.enforcedType) {
    items = items.filter(
      (item) => item.value === settings.merged.security.auth.enforcedType,
    );
  }

  let defaultAuthType = null;
  const defaultAuthTypeEnv = process.env['PHILL_DEFAULT_AUTH_TYPE'];
  if (
    defaultAuthTypeEnv &&
    Object.values(AuthType).includes(defaultAuthTypeEnv as AuthType)
  ) {
    defaultAuthType = defaultAuthTypeEnv as AuthType;
  }

  let initialAuthIndex = items.findIndex((item) => {
    if (settings.merged.security.auth.selectedType) {
      return item.value === settings.merged.security.auth.selectedType;
    }

    if (defaultAuthType) {
      return item.value === defaultAuthType;
    }

    if (
      process.env['PHILL_API_KEY'] ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_API_KEY']
    ) {
      return item.value === AuthType.USE_GEMINI;
    }

    return item.value === AuthType.LOGIN_WITH_GOOGLE;
  });
  if (settings.merged.security.auth.enforcedType) {
    initialAuthIndex = 0;
  }

  const onSelect = useCallback(
    async (authType: AuthType | undefined, scope: LoadableSettingScope) => {
      if (exiting) {
        return;
      }
      if (authType) {
        if (authType === AuthType.LOGIN_WITH_GOOGLE) {
          setAuthContext({ requiresRestart: true });
        } else {
          setAuthContext({});
        }
        await clearCachedCredentialFile();

        settings.setValue(scope, 'security.auth.selectedType', authType);
        if (
          authType === AuthType.LOGIN_WITH_GOOGLE &&
          config.isBrowserLaunchSuppressed()
        ) {
          setExiting(true);
          setTimeout(async () => {
            await runExitCleanup();
            process.exit(RELAUNCH_EXIT_CODE);
          }, 100);
          return;
        }

        if (
          authTypeRequiresApiKey(authType) &&
          !hasApiKeyConfigured(authType, settings)
        ) {
          setAuthContext({ apiKeyAuthType: authType });
          setAuthState(AuthState.AwaitingApiKeyInput);
          return;
        }
      }
      setAuthState(AuthState.Unauthenticated);
    },
    [settings, config, setAuthState, exiting, setAuthContext],
  );

  const handleAuthSelect = (authMethod: AuthType) => {
    const error = validateAuthMethodWithSettings(authMethod, settings);
    if (error) {
      onAuthError(error);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      onSelect(authMethod, SettingScope.User);
    }
  };

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        // Prevent exit if there is an error message.
        // This means they user is not authenticated yet.
        if (authError) {
          return true;
        }
        if (settings.merged.security.auth.selectedType === undefined) {
          // Prevent exiting if no auth method is set
          onAuthError(
            'You must select an auth method to proceed. Press Ctrl+C twice to exit.',
          );
          return true;
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        onSelect(undefined, SettingScope.User);
        return true;
      }
      return false;
    },
    { isActive: true },
  );

  if (exiting) {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.border.focused}
        flexDirection="row"
        padding={1}
        width="100%"
        alignItems="flex-start"
      >
        <Text color={theme.text.primary}>
          Logging in with Google... Restarting Phill CLI to continue.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.focused}
      flexDirection="row"
      padding={1}
      width="100%"
      alignItems="flex-start"
    >
      <Text color={theme.text.accent}>? </Text>
      <Box flexDirection="column" flexGrow={1}>
        <Text bold color={theme.text.primary}>
          Get started
        </Text>
        <Box marginTop={1}>
          <Text color={theme.text.primary}>
            How would you like to authenticate for this project?
          </Text>
        </Box>
        <Box marginTop={1}>
          <RadioButtonSelect
            items={items}
            initialIndex={initialAuthIndex}
            onSelect={handleAuthSelect}
            onHighlight={() => {
              onAuthError(null);
            }}
          />
        </Box>
        {authError && (
          <Box marginTop={1}>
            <Text color={theme.status.error}>{authError}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color={theme.text.secondary}>(Use Enter to select)</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.text.primary}>
            Terms of Service and Privacy Notice for Phill CLI
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.text.link}>
            {
              'https://github.com/ayjays132/phill-cli/blob/main/docs/tos-privacy.md'
            }
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.status.warning}>
            Warning: Use this software at your own risk.
          </Text>
          <Text color={theme.text.secondary}>
            You are responsible for all commands, changes, and external actions.
          </Text>
          <Text color={theme.text.secondary}>
            Phillip Holland and contributors are not liable for data loss,
            damages, or misuse.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
