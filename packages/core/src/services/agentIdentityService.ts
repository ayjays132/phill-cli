/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Storage } from '../config/storage.js';

export interface AgentIdentity {
  name?: string;
  description?: string;
  voiceName?: string;
  speechStyle?: string;
  pronouns?: string;
}

const DEFAULT_TEMPLATE = [
  '# Phill Self Identity',
  '',
  'name:',
  'description: Conversational coding copilot with clear, calm, high-agency delivery.',
  'pronouns:',
  'voiceName: Kore',
  'speechStyle: Warm, confident, and precise. Feminine default tone. Blend cinematic empathy and calm intelligence with practical execution. Keep phrasing concise, helpful, and human. Match the user language automatically and preserve accent and pronunciation of proper nouns.',
  '',
  '## Notes',
  '- Add evolving facts about the agent identity here.',
  '',
].join('\n');

function parseFrontMatter(content: string): AgentIdentity {
  const result: AgentIdentity = {};
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.includes(':')) {
      continue;
    }
    const [rawKey, ...rawValue] = line.split(':');
    const key = rawKey.trim();
    const value = rawValue.join(':').trim();
    if (!value) continue;
    if (key === 'name') result.name = value;
    if (key === 'description') result.description = value;
    if (key === 'pronouns') result.pronouns = value;
    if (key === 'voiceName') result.voiceName = value;
    if (key === 'speechStyle') result.speechStyle = value;
  }
  return result;
}

export class AgentIdentityService {
  getPath(): string {
    return Storage.getAgentIdentityFilePath();
  }

  async ensureExists(): Promise<string> {
    const filePath = this.getPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, DEFAULT_TEMPLATE, 'utf-8');
    }
    return filePath;
  }

  async load(): Promise<AgentIdentity> {
    const filePath = await this.ensureExists();
    const content = await fs.readFile(filePath, 'utf-8');
    return parseFrontMatter(content);
  }

  async getIdentity(): Promise<AgentIdentity> {
    return this.load();
  }

  async update(patch: Partial<AgentIdentity>): Promise<void> {
    const filePath = await this.ensureExists();
    const current = await this.load();
    const next: AgentIdentity = { ...current, ...patch };
    const content = [
      '# Phill Self Identity',
      '',
      `name: ${next.name ?? ''}`,
      `description: ${next.description ?? ''}`,
      `pronouns: ${next.pronouns ?? ''}`,
      `voiceName: ${next.voiceName ?? ''}`,
      `speechStyle: ${next.speechStyle ?? ''}`,
      '',
      '## Notes',
      '- Add evolving facts about the agent identity here.',
      '',
    ].join('\n');
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async reset(): Promise<void> {
    const filePath = this.getPath();
    await fs.rm(filePath, { force: true });
    await this.ensureExists();
  }
}
