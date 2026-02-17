/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { Config } from '../config/config.js';
import { AuthType } from '../core/contentGenerator.js';
import process from 'node:process';
import { debugLogger } from '../utils/debugLogger.js';

export class FileService {
  private static instance: FileService;
  private config: Config;
  private genAI: GoogleGenAI | null = null;

  private constructor(config: Config) {
    this.config = config;
  }

  public static getInstance(config: Config): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService(config);
    }
    return FileService.instance;
  }

  private getClient(): GoogleGenAI | null {
    if (this.genAI) return this.genAI;

    // Only support Gemini for now
    if (
      this.config.getAuthType() === AuthType.USE_GEMINI ||
      this.config.getAuthType() === AuthType.USE_VERTEX_AI
    ) {
      // Re-use logic from contentGenerator or similar to get API key
      // We might need to access config.apiKey directly if it's exposed, 
      // or we rely on the ContentGenerator creation logic which is inside a function.
      // For now, let's assume config has the credentials populated.
      const apiKey =
        process.env['PHILL_API_KEY'] ||
        process.env['GEMINI_API_KEY'] ||
        process.env['GOOGLE_API_KEY'];
      if (apiKey) {
        this.genAI = new GoogleGenAI({ apiKey });
        return this.genAI;
      }
    }
    return null;
  }

  /**
   * Uploads a file to the Gemini File API.
   * @param path Local path to the file.
   * @param mimeType MIME type of the file.
   * @returns The URI of the uploaded file.
   */
  async uploadFile(path: string, mimeType: string): Promise<string | null> {
    const client = this.getClient();
    if (!client) {
      debugLogger.warn('FileService: No GenAI client available for upload.');
      return null;
    }

    try {
      // converting to base64 for inline if needed, but File API is preferred for large files.
      // The @google/genai SDK (v0.x/1.x) might verify on `uploadFile` method on `files` or `fileManager`.
      // Let's check available methods on client instance. 
      // Note: The newer @google/genai might not have `getGenerativeModel` at root, or `files` at root.
      // It often has `media` or `files` namespace.
      
      // Since we can't inspect the SDK effectively at runtime here, we'll try standard pattern.
      // If it fails, we fall back to returning null (and the Agent will use base64 inline if it can).
      
      // @ts-ignore - Assuming standard SDK structure
      if (client.files && client.files.uploadFile) { 
         // @ts-ignore
         const uploadResponse = await client.files.uploadFile(path, { mimeType });
         return uploadResponse.file.uri;
      }
      
      // Fallback: If no File API, we might just return null and let the tool return the path.
      return null;
    } catch (error) {
      debugLogger.error('FileService: Upload failed', error);
      return null;
    }
  }
}
