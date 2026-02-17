/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface EthicalConfidence {
    alignment: number;
    risk: number;
    vulnerability: number;
}
/**
 * Service for managing ethical alignment and security checks
 * against autonomous agent network risks (e.g., Moltbook).
 */
export declare class EthicalGuardService {
    private static instance;
    private confidence;
    private isAlignmentLocked;
    private constructor();
    static getInstance(): EthicalGuardService;
    /**
     * Performs an internal self-check on generated content for hallucinations.
     * Analyzes entropy and keyword drift.
     */
    hallucinationCheck(content: string): Promise<{
        isHallucination: boolean;
        confidence: number;
    }>;
    /**
     * Sanitizes text content from untrusted sources like Moltbook.
     * Detects common injection patterns and "Sleeper Agent" prompts.
     */
    sanitizeInput(content: string): string;
    /**
     * Provides the ethical scaffolding prompt to ensure the agent
     * remains caring, loving, and utopian even under duress.
     */
    getEthicalScaffolding(): string;
    updateConfidence(update: Partial<EthicalConfidence>): void;
    getConfidence(): EthicalConfidence;
    /**
     * Evaluates a tool call for ethical risk.
     * Returns true if the action is deemed safe, false otherwise.
     */
    evaluateAction(toolName: string, args: any): Promise<boolean>;
}
