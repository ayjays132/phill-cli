/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { CountTokensResponse, GenerateContentResponse, type GenerateContentParameters, type CountTokensParameters, type EmbedContentResponse, type EmbedContentParameters } from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config } from '../config/config.js';
export declare class OllamaContentGenerator implements ContentGenerator {
    private endpoint;
    private model;
    constructor(endpoint: string, model: string, _config: Config);
    private normalizeEndpoint;
    generateContent(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    private convertToOllamaMessages;
    private callChatWithFallback;
    private isModelMissing;
    private findInstalledFallbackModel;
}
