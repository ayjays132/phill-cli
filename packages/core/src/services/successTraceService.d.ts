/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface SuccessTrace {
    id: string;
    goal: string;
    dlr: string;
    timestamp: string;
    latencyMs?: number;
}
/**
 * Service for managing the "Success Bank" - a collection of successful
 * execution traces distilled into latent representations.
 */
export declare class SuccessTraceService {
    private static instance;
    private readonly traceFilePath;
    private constructor();
    static getInstance(): SuccessTraceService;
    /**
     * Indexes a successful trace into the RAG-persistent success bank.
     */
    indexTrace(trace: SuccessTrace): Promise<void>;
    /**
     * Retrieves latent wisdom (relevant DLRs) based on a goal.
     * Currently uses simple string matching, but intended for RAG retrieval.
     */
    retrieveLatentWisdom(goal: string): Promise<string[]>;
    private exists;
}
