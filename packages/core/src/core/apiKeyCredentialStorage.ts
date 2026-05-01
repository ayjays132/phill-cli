/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { HybridTokenStorage } from '../mcp/token-storage/hybrid-token-storage.js';
import type { OAuthCredentials } from '../mcp/token-storage/types.js';
import { debugLogger } from '../utils/debugLogger.js';

const KEYCHAIN_SERVICE_NAME = 'phill-cli-api-key';
const DEFAULT_API_KEY_ENTRY = 'default-api-key';

const storage = new HybridTokenStorage(KEYCHAIN_SERVICE_NAME);

let apiKeyCache: Promise<string | null> | undefined;
let apiKeyCacheExpiresAt = 0;
const API_KEY_CACHE_TTL_MS = 30000;

/**
 * Resets the API key cache. Used exclusively for test isolation.
 * @internal
 */
export function resetApiKeyCacheForTesting() {
  apiKeyCache = undefined;
  apiKeyCacheExpiresAt = 0;
}

/**
 * Load cached API key
 */
export async function loadApiKey(): Promise<string | null> {
  const now = Date.now();
  if (!apiKeyCache || now >= apiKeyCacheExpiresAt) {
    apiKeyCache = (async () => {
      try {
        const credentials = await storage.getCredentials(DEFAULT_API_KEY_ENTRY);

        if (credentials?.token?.accessToken) {
          return credentials.token.accessToken;
        }

        return null;
      } catch (error: unknown) {
        // Log other errors but don't crash, just return null so user can re-enter key
        debugLogger.error('Failed to load API key from storage:', error);
        return null;
      }
    })();
    apiKeyCacheExpiresAt = now + API_KEY_CACHE_TTL_MS;
  }

  return apiKeyCache;
}

async function deleteStoredApiKey(): Promise<void> {
  try {
    await storage.deleteCredentials(DEFAULT_API_KEY_ENTRY);
  } catch (error: unknown) {
    // Ignore errors when deleting, as it might not exist
    debugLogger.warn('Failed to delete API key from storage:', error);
  }
}

/**
 * Save API key
 */
export async function saveApiKey(
  apiKey: string | null | undefined,
): Promise<void> {
  resetApiKeyCacheForTesting();
  if (!apiKey || apiKey.trim() === '') {
    await deleteStoredApiKey();
    return;
  }

  // Wrap API key in OAuthCredentials format as required by HybridTokenStorage
  const credentials: OAuthCredentials = {
    serverName: DEFAULT_API_KEY_ENTRY,
    token: {
      accessToken: apiKey,
      tokenType: 'ApiKey',
    },
    updatedAt: Date.now(),
  };

  await storage.setCredentials(credentials);
}

/**
 * Clear cached API key
 */
export async function clearApiKey(): Promise<void> {
  resetApiKeyCacheForTesting();
  try {
    await storage.deleteCredentials(DEFAULT_API_KEY_ENTRY);
  } catch (error: unknown) {
    debugLogger.error('Failed to clear API key from storage:', error);
  }
}
