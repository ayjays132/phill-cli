/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type FunctionCall } from '@google/genai';
import { type PolicyEngineConfig, type PolicyRule, type SafetyCheckerRule, type HookCheckerRule, ApprovalMode, type CheckResult } from './types.js';
import type { CheckerRunner } from '../safety/checker-runner.js';
export declare class PolicyEngine {
    private rules;
    private checkers;
    private hookCheckers;
    private readonly defaultDecision;
    private readonly nonInteractive;
    private readonly checkerRunner?;
    private approvalMode;
    constructor(config?: PolicyEngineConfig, checkerRunner?: CheckerRunner);
    /**
     * Update the current approval mode.
     */
    setApprovalMode(mode: ApprovalMode): void;
    /**
     * Get the current approval mode.
     */
    getApprovalMode(): ApprovalMode;
    private shouldDowngradeForRedirection;
    /**
     * Check if a shell command is allowed.
     */
    private checkShellCommand;
    /**
     * Check if a tool call is allowed based on the configured policies.
     * Returns the decision and the matching rule (if any).
     */
    check(toolCall: FunctionCall, serverName: string | undefined): Promise<CheckResult>;
    /**
     * Add a new rule to the policy engine.
     */
    addRule(rule: PolicyRule): void;
    addChecker(checker: SafetyCheckerRule): void;
    /**
     * Remove rules for a specific tool.
     */
    removeRulesForTool(toolName: string): void;
    /**
     * Get all current rules.
     */
    getRules(): readonly PolicyRule[];
    getCheckers(): readonly SafetyCheckerRule[];
    /**
     * Add a new hook checker to the policy engine.
     */
    addHookChecker(checker: HookCheckerRule): void;
    /**
     * Get all current hook checkers.
     */
    getHookCheckers(): readonly HookCheckerRule[];
    private applyNonInteractiveMode;
}
