/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { CountTokensResponse, GenerateContentResponse, type GenerateContentParameters, type CountTokensParameters, type EmbedContentResponse, type EmbedContentParameters } from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config } from '../config/config.js';
export declare class HuggingFaceContentGenerator implements ContentGenerator {
    private endpoint;
    private model;
    private apiKey?;
    private isLocal;
    constructor(endpoint: string | undefined, model: string, apiKey: string | undefined, _config: Config);
    generateContent(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    private convertToHuggingFaceMessages;
    private mapFinishReason;
    private formatApiError;
    private callChatEndpoint;
    private isModelUnavailable;
    private findAnyAvailableRouterModel;
    private generateWithLocalTransformers;
}
