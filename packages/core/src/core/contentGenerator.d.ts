/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CountTokensResponse, GenerateContentResponse, GenerateContentParameters, CountTokensParameters, EmbedContentResponse, EmbedContentParameters } from '@google/genai';
import type { Config } from '../config/config.js';
import type { UserTierId } from '../code_assist/types.js';
/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
    generateContent(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    userTier?: UserTierId;
    userTierName?: string;
}
export declare enum AuthType {
    LOGIN_WITH_GOOGLE = "oauth-personal",
    USE_PHILL = "gemini-api-key",
    USE_GEMINI = "gemini-api-key",
    USE_VERTEX_AI = "vertex-ai",
    LEGACY_CLOUD_SHELL = "cloud-shell",
    COMPUTE_ADC = "compute-default-credentials",
    OLLAMA = "ollama",
    HUGGINGFACE = "huggingface",
    OPENAI = "openai",
    OPENAI_BROWSER = "openai-browser",
    ANTHROPIC = "anthropic",
    GROQ = "groq",
    CUSTOM_API = "custom-api"
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
export declare function createContentGeneratorConfig(config: Config, authType: AuthType | undefined): Promise<ContentGeneratorConfig>;
export declare function createContentGenerator(config: ContentGeneratorConfig, gcConfig: Config, sessionId?: string): Promise<ContentGenerator>;
