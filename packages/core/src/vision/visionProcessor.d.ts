/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface UIElement {
    id: string;
    name: string;
    role: string;
    x: number;
    y: number;
    width: number;
    height: number;
    children?: UIElement[];
}
export interface GroundedState {
    elements: UIElement[];
    screenshotPath: string;
    semanticSummary: string;
}
export declare class VisionProcessor {
    private static instance;
    private constructor();
    static getInstance(): VisionProcessor;
    /**
     * Flattens a nested accessibility tree into a searchable list of interactable elements.
     */
    flattenTree(tree: any): UIElement[];
    /**
     * Finds the most relevant UI element at a specific coordinate.
     */
    findElementAt(x: number, y: number, elements: UIElement[]): UIElement | null;
    /**
     * Generates a semantic summary of the visible UI for the LLM.
     */
    generateSemanticSummary(elements: UIElement[]): string;
}
