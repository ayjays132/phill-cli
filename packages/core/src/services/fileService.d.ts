/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Config } from '../config/config.js';
export declare class FileService {
    private static instance;
    private config;
    private genAI;
    private constructor();
    static getInstance(config: Config): FileService;
    private getClient;
    /**
     * Uploads a file to the Gemini File API.
     * @param path Local path to the file.
     * @param mimeType MIME type of the file.
     * @returns The URI of the uploaded file.
     */
    uploadFile(path: string, mimeType: string): Promise<string | null>;
}
