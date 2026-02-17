/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface AgentIdentity {
    name?: string;
    description?: string;
    voiceName?: string;
    speechStyle?: string;
    pronouns?: string;
}
export declare class AgentIdentityService {
    static getPath(): string;
    static ensureExists(): Promise<string>;
    static load(): Promise<AgentIdentity>;
    static update(patch: Partial<AgentIdentity>): Promise<void>;
    static reset(): Promise<void>;
}
