/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { CountTokensResponse, GenerateContentResponse, type CountTokensParameters, type EmbedContentParameters, type EmbedContentResponse, type GenerateContentParameters } from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config } from '../config/config.js';
export declare class OpenAICompatibleContentGenerator implements ContentGenerator {
    private readonly endpoint;
    private readonly model;
    private readonly apiKey?;
    private readonly apiKeyProvider?;
    constructor(endpoint: string, model: string, apiKey: string | undefined, apiKeyProvider: (() => Promise<string | undefined>) | undefined, _config: Config);
    generateContent(request: GenerateContentParameters, _userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, _userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    private getHeaders;
    private toMessages;
    private mapFinishReason;
    private isModelUnavailable;
    private generateWithLocalTransformers;
}
