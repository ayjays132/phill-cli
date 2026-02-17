/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { GoogleGenAI } from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import type { Config } from '../config/config.js';
import { loadApiKey } from './apiKeyCredentialStorage.js';

import type { UserTierId } from '../code_assist/types.js';
import { LoggingContentGenerator } from './loggingContentGenerator.js';
import { InstallationManager } from '../utils/installationManager.js';
import { FakeContentGenerator } from './fakeContentGenerator.js';
import { parseCustomHeaders } from '../utils/customHeaderUtils.js';
import { RecordingContentGenerator } from './recordingContentGenerator.js';
import { getVersion, resolveModel } from '../index.js';
import { OllamaContentGenerator } from './ollamaContentGenerator.js';
import { HuggingFaceContentGenerator } from './huggingFaceContentGenerator.js';
import { OpenAICompatibleContentGenerator } from './openAiCompatibleContentGenerator.js';
import { AnthropicContentGenerator } from './anthropicContentGenerator.js';
import { getOpenAIBrowserAccessToken } from './openAiBrowserAuth.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  userTier?: UserTierId;

  userTierName?: string;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_PHILL = 'gemini-api-key',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  LEGACY_CLOUD_SHELL = 'cloud-shell',
  COMPUTE_ADC = 'compute-default-credentials',
  OLLAMA = 'ollama',
  HUGGINGFACE = 'huggingface',
  OPENAI = 'openai',
  OPENAI_BROWSER = 'openai-browser',
  ANTHROPIC = 'anthropic',
  GROQ = 'groq',
  CUSTOM_API = 'custom-api',
}

export type ContentGeneratorConfig = {
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType;
  proxy?: string;
  ollama?: {
    endpoint: string;
    model: string;
  };
  huggingFace?: {
    endpoint?: string;
    apiKey?: string;
    model: string;
  };
  openAi?: {
    endpoint: string;
    apiKey?: string;
    model: string;
  };
  anthropic?: {
    endpoint: string;
    apiKey?: string;
    model: string;
  };
  groq?: {
    endpoint: string;
    apiKey?: string;
    model: string;
  };
  customApi?: {
    endpoint: string;
    apiKey?: string;
    model: string;
  };
};

export async function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): Promise<ContentGeneratorConfig> {
  const geminiApiKey =
    process.env['PHILL_API_KEY'] ||
    process.env['GEMINI_API_KEY'] ||
    process.env['GOOGLE_API_KEY'] ||
    (await loadApiKey()) ||
    undefined;
  const googleApiKey =
    process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY'] || undefined;
  const googleCloudProject =
    process.env['GOOGLE_CLOUD_PROJECT'] ||
    process.env['GOOGLE_CLOUD_PROJECT_ID'] ||
    undefined;
  const googleCloudLocation = process.env['GOOGLE_CLOUD_LOCATION'] || undefined;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    authType,
    proxy: config?.getProxy(),
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.COMPUTE_ADC
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

    return contentGeneratorConfig;
  }

  if (authType === AuthType.OLLAMA) {
    const ollamaEndpoint =
      config.ollama?.endpoint ||
      process.env['OLLAMA_ENDPOINT'] ||
      'http://localhost:11434';
    const ollamaModel =
      config.ollama?.model ||
      process.env['OLLAMA_MODEL'] ||
      'llama2';
    
    contentGeneratorConfig.ollama = {
      endpoint: ollamaEndpoint,
      model: ollamaModel,
    };

    return contentGeneratorConfig;
  }

  if (authType === AuthType.HUGGINGFACE) {
    const hfEndpoint =
      config.huggingFace?.endpoint ||
      process.env['HUGGINGFACE_ENDPOINT'] || 'https://router.huggingface.co';
    const hfApiKey =
      config.huggingFace?.apiKey || process.env['HUGGINGFACE_API_KEY'];
    const hfModel =
      config.huggingFace?.model ||
      process.env['HUGGINGFACE_MODEL'] ||
      'meta-llama/Llama-2-7b-chat-hf';
    
    contentGeneratorConfig.huggingFace = {
      endpoint: hfEndpoint,
      apiKey: hfApiKey,
      model: hfModel,
    };

    return contentGeneratorConfig;
  }

  if (authType === AuthType.OPENAI || authType === AuthType.OPENAI_BROWSER) {
    const openAiToken =
      authType === AuthType.OPENAI_BROWSER
        ? await getOpenAIBrowserAccessToken(
            true,
            !config.isBrowserLaunchSuppressed(),
          )
        : undefined;
    if (authType === AuthType.OPENAI_BROWSER && !openAiToken) {
      throw new Error(
        'OpenAI browser auth token not found. Re-authenticate with OpenAI browser sign-in and try again.',
      );
    }
    contentGeneratorConfig.openAi = {
      endpoint:
        config.openAI?.endpoint ||
        process.env['OPENAI_ENDPOINT'] ||
        'https://api.openai.com/v1',
      apiKey:
        authType === AuthType.OPENAI_BROWSER
          ? openAiToken
          : config.openAI?.apiKey || process.env['OPENAI_API_KEY'],
      model:
        config.openAI?.model ||
        process.env['OPENAI_MODEL'] ||
        'gpt-4o',
    };
    return contentGeneratorConfig;
  }

  if (authType === AuthType.ANTHROPIC) {
    contentGeneratorConfig.anthropic = {
      endpoint:
        config.anthropic?.endpoint ||
        process.env['ANTHROPIC_ENDPOINT'] ||
        'https://api.anthropic.com/v1',
      apiKey:
        config.anthropic?.apiKey || process.env['ANTHROPIC_API_KEY'],
      model:
        config.anthropic?.model ||
        process.env['ANTHROPIC_MODEL'] ||
        'claude-3-5-sonnet-latest',
    };
    return contentGeneratorConfig;
  }

  if (authType === AuthType.GROQ) {
    const groqKey =
      config.groq?.apiKey ||
      process.env['GROQ_API_KEY'] ||
      process.env['PHILL_GROQ_API_KEY'];

    contentGeneratorConfig.groq = {
      endpoint:
        config.groq?.endpoint ||
        process.env['GROQ_ENDPOINT'] ||
        'https://api.groq.com/openai/v1',
      apiKey: groqKey?.trim(),
      model:
        config.groq?.model ||
        process.env['GROQ_MODEL'] ||
        'deepseek-r1-distill-llama-70b',
    };
    return contentGeneratorConfig;
  }

  if (authType === AuthType.CUSTOM_API) {
    contentGeneratorConfig.customApi = {
      endpoint:
        config.customApi?.endpoint ||
        process.env['CUSTOM_API_ENDPOINT'] ||
        'http://localhost:8000/v1',
      apiKey:
        config.customApi?.apiKey || process.env['CUSTOM_API_KEY'],
      model:
        config.customApi?.model ||
        process.env['CUSTOM_API_MODEL'] ||
        config.getModel(),
    };
    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const generator = await (async () => {
    if (gcConfig.fakeResponses) {
      const fakeGenerator = await FakeContentGenerator.fromFile(
        gcConfig.fakeResponses,
      );
      return new LoggingContentGenerator(fakeGenerator, gcConfig);
    }
    const version = await getVersion();
    const model = resolveModel(
      gcConfig.getModel(),
      gcConfig.getPreviewFeatures(),
    );
    const customHeadersEnv =
      process.env['PHILL_CLI_CUSTOM_HEADERS'] || undefined;
    const userAgent = `PhillCLI/${version}/${model} (${process.platform}; ${process.arch})`;
    const customHeadersMap = parseCustomHeaders(customHeadersEnv);
    const apiKeyAuthMechanism =
      process.env['PHILL_API_KEY_AUTH_MECHANISM'] || 'x-goog-api-key';

    const baseHeaders: Record<string, string> = {
      ...customHeadersMap,
      'User-Agent': userAgent,
    };

    if (
      apiKeyAuthMechanism === 'bearer' &&
      (config.authType === AuthType.USE_GEMINI ||
        config.authType === AuthType.USE_VERTEX_AI) &&
      config.apiKey
    ) {
      baseHeaders['Authorization'] = `Bearer ${config.apiKey}`;
    }
    if (
      config.authType === AuthType.LOGIN_WITH_GOOGLE ||
      config.authType === AuthType.COMPUTE_ADC
    ) {
      const httpOptions = { headers: baseHeaders };
      return new LoggingContentGenerator(
        await createCodeAssistContentGenerator(
          httpOptions,
          config.authType,
          gcConfig,
          sessionId,
        ),
        gcConfig,
      );
    }

    if (
      config.authType === AuthType.USE_GEMINI ||
      config.authType === AuthType.USE_VERTEX_AI
    ) {
      let headers: Record<string, string> = { ...baseHeaders };
      if (gcConfig?.getUsageStatisticsEnabled()) {
        const installationManager = new InstallationManager();
        const installationId = installationManager.getInstallationId();
        headers = {
          ...headers,
          'x-phill-api-privileged-user-id': `${installationId}`,
        };
      }
      const httpOptions = { headers };

      const googleGenAI = new GoogleGenAI({
        apiKey: config.apiKey === '' ? undefined : config.apiKey,
        vertexai: config.vertexai,
        httpOptions,
      });
      return new LoggingContentGenerator(googleGenAI.models, gcConfig);
    }

    if (config.authType === AuthType.OLLAMA) {
      if (!config.ollama) {
        throw new Error('Ollama configuration is missing');
      }
      return new LoggingContentGenerator(
        new OllamaContentGenerator(
          config.ollama.endpoint,
          config.ollama.model,
          gcConfig,
        ),
        gcConfig,
      );
    }

    if (config.authType === AuthType.HUGGINGFACE) {
      if (!config.huggingFace) {
        throw new Error('HuggingFace configuration is missing');
      }
      return new LoggingContentGenerator(
        new HuggingFaceContentGenerator(
          config.huggingFace.endpoint,
          config.huggingFace.model,
          config.huggingFace.apiKey,
          gcConfig,
        ),
        gcConfig,
      );
    }

    if (config.authType === AuthType.OPENAI) {
      if (!config.openAi) {
        throw new Error('OpenAI configuration is missing');
      }
      return new LoggingContentGenerator(
        new OpenAICompatibleContentGenerator(
          config.openAi.endpoint,
          config.openAi.model,
          config.openAi.apiKey,
          undefined,
          gcConfig,
        ),
        gcConfig,
      );
    }

    if (config.authType === AuthType.OPENAI_BROWSER) {
      if (!config.openAi) {
        throw new Error('OpenAI configuration is missing');
      }
      return new LoggingContentGenerator(
        new OpenAICompatibleContentGenerator(
          config.openAi.endpoint,
          config.openAi.model,
          config.openAi.apiKey,
          async () =>
            getOpenAIBrowserAccessToken(false, !gcConfig.isBrowserLaunchSuppressed()),
          gcConfig,
        ),
        gcConfig,
      );
    }

    if (config.authType === AuthType.ANTHROPIC) {
      if (!config.anthropic) {
        throw new Error('Anthropic configuration is missing');
      }
      return new LoggingContentGenerator(
        new AnthropicContentGenerator(
          config.anthropic.endpoint,
          config.anthropic.model,
          config.anthropic.apiKey,
          gcConfig,
        ),
        gcConfig,
      );
    }

    if (config.authType === AuthType.GROQ) {
      if (!config.groq) {
        throw new Error('Groq configuration is missing');
      }
      return new LoggingContentGenerator(
        new OpenAICompatibleContentGenerator(
          config.groq.endpoint,
          config.groq.model,
          config.groq.apiKey,
          undefined,
          gcConfig,
        ),
        gcConfig,
      );
    }

    if (config.authType === AuthType.CUSTOM_API) {
      if (!config.customApi) {
        throw new Error('Custom API configuration is missing');
      }
      return new LoggingContentGenerator(
        new OpenAICompatibleContentGenerator(
          config.customApi.endpoint,
          config.customApi.model,
          config.customApi.apiKey,
          undefined,
          gcConfig,
        ),
        gcConfig,
      );
    }

    throw new Error(
      `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
    );
  })();

  if (gcConfig.recordResponses) {
    return new RecordingContentGenerator(generator, gcConfig.recordResponses);
  }

  return generator;
}
