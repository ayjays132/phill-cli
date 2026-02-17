/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { CountTokensResponse, GenerateContentResponse, type CountTokensParameters, type EmbedContentParameters, type EmbedContentResponse, type GenerateContentParameters } from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config } from '../config/config.js';
export declare class AnthropicContentGenerator implements ContentGenerator {
    private readonly endpoint;
    private readonly model;
    private readonly apiKey?;
    constructor(endpoint: string, model: string, apiKey: string | undefined, _config: Config);
    generateContent(request: GenerateContentParameters, _userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, _userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(_request: EmbedContentParameters): Promise<EmbedContentResponse>;
    private getHeaders;
    private toAnthropicMessages;
    private mapFinishReason;
}
