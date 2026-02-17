/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { URL } from 'node:url';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Storage } from '../config/storage.js';
import { openBrowserSecurely } from '../utils/secure-browser-launcher.js';

const DEFAULT_ISSUER = 'https://auth.openai.com';
const DEFAULT_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const DEFAULT_SCOPE = 'openid profile email offline_access';
const DEFAULT_AUDIENCE = 'https://api.openai.com/v1';
const TOKEN_EXPIRY_SKEW_SECONDS = 60;
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
const DEVICE_FALLBACK_POLL_INTERVAL_SECONDS = 5;
const execFileAsync = promisify(execFile);

interface OpenIdConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  device_authorization_endpoint?: string;
}

interface OpenAiOAuthTokenStore {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  scope?: string;
  expires_at?: number; // epoch seconds
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

interface CodexAuthFile {
  tokens?: {
    access_token?: string;
  };
}

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    throw new Error(
      `${context}: Expected JSON but received non-JSON response (${response.status} ${response.statusText}). ` +
        `Content-Type: ${response.headers.get('content-type') || 'unknown'}. ` +
        `Body starts with: ${snippet || '<empty>'}`,
    );
  }
}

function getClientId(): string {
  return process.env['OPENAI_OAUTH_CLIENT_ID'] || DEFAULT_CLIENT_ID;
}

function getIssuer(): string {
  return process.env['OPENAI_OAUTH_ISSUER'] || DEFAULT_ISSUER;
}

function getScope(): string {
  return process.env['OPENAI_OAUTH_SCOPE'] || DEFAULT_SCOPE;
}

function getAudience(): string {
  return process.env['OPENAI_OAUTH_AUDIENCE'] || DEFAULT_AUDIENCE;
}

function getOpenAiOAuthStoragePath(): string {
  return path.join(Storage.getGlobalPhillDir(), 'openai_oauth.json');
}

function getCodexAuthStoragePath(): string {
  return path.join(os.homedir(), '.codex', 'auth.json');
}

async function readCodexAccessToken(): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(getCodexAuthStoragePath(), 'utf8');
    const parsed = JSON.parse(raw) as CodexAuthFile;
    return parsed.tokens?.access_token;
  } catch {
    return undefined;
  }
}

async function getCodexAccessTokenFallback(
  allowInteractiveLogin: boolean,
): Promise<string | undefined> {
  try {
    await execFileAsync('codex', ['login', 'status'], { maxBuffer: 1024 * 1024 });
  } catch {
    // Not logged in (or status unavailable) is not fatal; continue to interactive flow.
  }

  let token = await readCodexAccessToken();
  if (token) {
    return token;
  }

  if (!allowInteractiveLogin) {
    return undefined;
  }

  try {
    // Prefer Codex's default login flow first (browser sign-in UX).
    await execFileAsync('codex', ['login'], {
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    // Fall back to explicit device auth flow if default login command fails.
  }

  try {
    await execFileAsync('codex', ['login', '--device-auth'], {
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    // If login command failed or user cancelled, return whatever token may exist.
  }
  token = await readCodexAccessToken();
  return token;
}

function isAccessTokenValid(tokens: OpenAiOAuthTokenStore | null): boolean {
  if (!tokens?.access_token || !tokens.expires_at) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return tokens.expires_at > now + TOKEN_EXPIRY_SKEW_SECONDS;
}

async function loadStoredTokens(): Promise<OpenAiOAuthTokenStore | null> {
  try {
    const raw = await fs.readFile(getOpenAiOAuthStoragePath(), 'utf8');
    return JSON.parse(raw) as OpenAiOAuthTokenStore;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: OpenAiOAuthTokenStore): Promise<void> {
  const filePath = getOpenAiOAuthStoragePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // Best effort; ignore on unsupported filesystems.
  }
}

function mergeTokens(
  existing: OpenAiOAuthTokenStore | null,
  incoming: TokenResponse,
): OpenAiOAuthTokenStore {
  const expiresIn = incoming.expires_in ?? 3600;
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: incoming.access_token ?? existing?.access_token,
    refresh_token: incoming.refresh_token ?? existing?.refresh_token,
    id_token: incoming.id_token ?? existing?.id_token,
    token_type: incoming.token_type ?? existing?.token_type,
    scope: incoming.scope ?? existing?.scope,
    expires_at: now + expiresIn,
  };
}

function base64Url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(crypto.randomBytes(64));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function createState(): string {
  return base64Url(crypto.randomBytes(32));
}

function toFormBody(values: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    params.set(k, v);
  }
  return params.toString();
}

async function fetchOpenIdConfig(): Promise<OpenIdConfig> {
  const issuer = getIssuer().replace(/\/+$/, '');
  const response = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!response.ok) {
    throw new Error(
      `Failed to discover OpenAI OAuth metadata: ${response.status} ${response.statusText}`,
    );
  }
  const data = (await response.json()) as Partial<OpenIdConfig>;
  if (!data.authorization_endpoint || !data.token_endpoint) {
    throw new Error('OpenAI OAuth metadata missing authorization/token endpoints.');
  }
  return {
    authorization_endpoint: data.authorization_endpoint,
    token_endpoint: data.token_endpoint,
    device_authorization_endpoint: data.device_authorization_endpoint,
  };
}

async function postTokenRequest(
  tokenEndpoint: string,
  formData: Record<string, string>,
): Promise<TokenResponse> {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: toFormBody(formData),
  });
  const data = await parseJsonResponse<TokenResponse>(
    response,
    'OpenAI OAuth token request failed to parse response',
  );
  if (!response.ok) {
    const error = data.error || response.statusText;
    const details = data.error_description ? ` (${data.error_description})` : '';
    throw new Error(`OpenAI OAuth token request failed: ${error}${details}`);
  }
  return data;
}

async function refreshAccessToken(
  config: OpenIdConfig,
  existing: OpenAiOAuthTokenStore,
): Promise<OpenAiOAuthTokenStore | null> {
  if (!existing.refresh_token) {
    return null;
  }
  try {
    const tokenData = await postTokenRequest(config.token_endpoint, {
      grant_type: 'refresh_token',
      refresh_token: existing.refresh_token,
      client_id: getClientId(),
    });
    const merged = mergeTokens(existing, tokenData);
    await saveTokens(merged);
    return merged;
  } catch {
    return null;
  }
}

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const address = server.address() as net.AddressInfo;
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function performBrowserAuthorizationCodeFlow(
  config: OpenIdConfig,
  preferBrowserLaunch: boolean,
): Promise<OpenAiOAuthTokenStore> {
  const port = await getAvailablePort();
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const { verifier, challenge } = createPkcePair();
  const state = createState();

  const authUrl = new URL(config.authorization_endpoint);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', getClientId());
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', getScope());
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('audience', getAudience());

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
        if (reqUrl.pathname !== '/oauth2callback') {
          res.writeHead(404);
          res.end();
          return;
        }
        const err = reqUrl.searchParams.get('error');
        if (err) {
          const desc = reqUrl.searchParams.get('error_description') || 'No description';
          res.writeHead(400);
          res.end('Authentication failed.');
          reject(new Error(`OpenAI OAuth error: ${err} (${desc})`));
          return;
        }
        const responseState = reqUrl.searchParams.get('state');
        const responseCode = reqUrl.searchParams.get('code');
        if (!responseCode || responseState !== state) {
          res.writeHead(400);
          res.end('Invalid callback.');
          reject(new Error('OpenAI OAuth callback validation failed.'));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Authentication complete. You can return to the CLI.');
        resolve(responseCode);
      } catch (error) {
        reject(
          new Error(
            `Failed processing OpenAI OAuth callback: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      } finally {
        server.close();
      }
    });

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('OpenAI OAuth browser sign-in timed out.'));
    }, AUTH_TIMEOUT_MS);

    server.listen(port, '127.0.0.1', () => {
      if (preferBrowserLaunch) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        openBrowserSecurely(authUrl.toString()).catch(() => {
          process.stderr.write(
            `\nOpen this URL to authenticate:\n${authUrl.toString()}\n\n`,
          );
        });
      } else {
        process.stderr.write(
          `\nOpen this URL to authenticate:\n${authUrl.toString()}\n\n`,
        );
      }
    });

    server.on('close', () => clearTimeout(timeout));
    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `OpenAI OAuth callback server failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    });
  });

  const tokenData = await postTokenRequest(config.token_endpoint, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: getClientId(),
    code_verifier: verifier,
  });
  const merged = mergeTokens(await loadStoredTokens(), tokenData);
  await saveTokens(merged);
  return merged;
}

async function performDeviceCodeFlow(config: OpenIdConfig): Promise<OpenAiOAuthTokenStore> {
  if (!config.device_authorization_endpoint) {
    throw new Error('OpenAI OAuth device authorization endpoint is unavailable.');
  }

  const deviceResp = await fetch(config.device_authorization_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: toFormBody({
      client_id: getClientId(),
      scope: getScope(),
      audience: getAudience(),
    }),
  });
  const deviceData = await parseJsonResponse<
    Partial<DeviceAuthorizationResponse> & {
      error?: string;
      error_description?: string;
    }
  >(deviceResp, 'OpenAI OAuth device authorization response parse failure');
  if (!deviceResp.ok || !deviceData.device_code || !deviceData.user_code || !deviceData.verification_uri) {
    const err = deviceData.error || deviceResp.statusText;
    const desc = deviceData.error_description ? ` (${deviceData.error_description})` : '';
    throw new Error(`OpenAI OAuth device flow setup failed: ${err}${desc}`);
  }

  const verificationUrl = deviceData.verification_uri_complete || deviceData.verification_uri;
  process.stderr.write(
    `\nOpen this URL and complete sign-in:\n${verificationUrl}\nCode: ${deviceData.user_code}\n\n`,
  );

  let intervalSeconds = deviceData.interval || DEVICE_FALLBACK_POLL_INTERVAL_SECONDS;
  const startedAt = Date.now();
  const expiresMs = (deviceData.expires_in || 600) * 1000;

  while (Date.now() - startedAt < expiresMs) {
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
    const tokenResp = await fetch(config.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: toFormBody({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceData.device_code,
        client_id: getClientId(),
      }),
    });
    const tokenData = await parseJsonResponse<TokenResponse>(
      tokenResp,
      'OpenAI OAuth device token polling parse failure',
    );
    if (tokenResp.ok && tokenData.access_token) {
      const merged = mergeTokens(await loadStoredTokens(), tokenData);
      await saveTokens(merged);
      return merged;
    }
    if (!tokenData.error) {
      continue;
    }
    if (tokenData.error === 'authorization_pending') {
      continue;
    }
    if (tokenData.error === 'slow_down') {
      intervalSeconds += 5;
      continue;
    }
    if (tokenData.error === 'access_denied') {
      throw new Error('OpenAI OAuth device flow was denied by the user.');
    }
    if (tokenData.error === 'expired_token') {
      throw new Error('OpenAI OAuth device flow expired before completion.');
    }
    throw new Error(
      `OpenAI OAuth device flow failed: ${tokenData.error}${tokenData.error_description ? ` (${tokenData.error_description})` : ''}`,
    );
  }

  throw new Error('OpenAI OAuth device flow timed out.');
}

export async function getOpenAIBrowserAccessToken(
  allowInteractiveLogin: boolean,
  preferBrowserLaunch: boolean,
): Promise<string | undefined> {
  let stored = await loadStoredTokens();
  if (isAccessTokenValid(stored)) {
    return stored?.access_token;
  }

  const openIdConfig = await fetchOpenIdConfig();
  if (stored?.refresh_token) {
    stored = await refreshAccessToken(openIdConfig, stored);
    if (isAccessTokenValid(stored)) {
      return stored?.access_token;
    }
  }

  if (!allowInteractiveLogin) {
    return stored?.access_token;
  }

  const useBrowserCodeFlow = process.env['OPENAI_OAUTH_USE_BROWSER_CODE_FLOW'] === 'true';
  let interactiveTokens: OpenAiOAuthTokenStore;
  try {
    if (useBrowserCodeFlow && preferBrowserLaunch) {
      try {
        interactiveTokens = await performBrowserAuthorizationCodeFlow(
          openIdConfig,
          true,
        );
      } catch (error) {
        process.stderr.write(
          `\nOpenAI browser auth did not complete (${error instanceof Error ? error.message : String(error)}).\n` +
            'Falling back to device sign-in flow.\n\n',
        );
        interactiveTokens = await performDeviceCodeFlow(openIdConfig);
      }
    } else {
      // Default behavior mirrors Codex-style login UX: device flow.
      interactiveTokens = await performDeviceCodeFlow(openIdConfig);
    }
    return interactiveTokens.access_token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isForbiddenDeviceFailure =
      message.includes('device authorization response parse failure') &&
      message.includes('403 Forbidden');

    if (isForbiddenDeviceFailure) {
      const codexToken = await getCodexAccessTokenFallback(allowInteractiveLogin);
      if (codexToken) {
        return codexToken;
      }
      throw new Error(
        'OpenAI OAuth is forbidden for this client setup (403). ' +
          'No Codex fallback token was found. Use OPENAI_API_KEY auth or configure a valid OAuth client via OPENAI_OAUTH_CLIENT_ID.',
      );
    }
    throw error;
  }
}
