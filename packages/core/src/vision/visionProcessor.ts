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

/**
 * Represents a node in an OS accessibility tree.
 * Covers both Windows/Linux (PascalCase keys) and macOS (camelCase/windows array) shapes.
 */
export interface AccessibilityNode {
  Name?: string;
  name?: string;
  Role?: string;
  role?: string;
  X?: number;
  x?: number;
  Y?: number;
  y?: number;
  Width?: number;
  w?: number;
  Height?: number;
  h?: number;
  Children?: AccessibilityNode[];
  windows?: AccessibilityNode[];
}

export class VisionProcessor {
  private static instance: VisionProcessor;

  private constructor() {}

  static getInstance(): VisionProcessor {
    if (!VisionProcessor.instance) {
      VisionProcessor.instance = new VisionProcessor();
    }
    return VisionProcessor.instance;
  }

  /**
   * Flattens a nested accessibility tree into a searchable list of interactable elements.
   * Includes safety limits to prevent massive trees from bloating context.
   */
  flattenTree(tree: AccessibilityNode | AccessibilityNode[]): UIElement[] {
    const flattened: UIElement[] = [];
    const MAX_DEPTH = 10;
    const MAX_NODES = 500;

    const traverse = (node: AccessibilityNode, depth = 0) => {
      if (!node || depth > MAX_DEPTH || flattened.length >= MAX_NODES) return;

      // Handle both structured (Windows/Linux) and raw (macOS) trees if possible
      const element: UIElement = {
        id: `el_${flattened.length}`,
        name: node.Name || node.name || 'Unnamed',
        role: node.Role || node.role || 'Unknown',
        x: node.X || node.x || 0,
        y: node.Y || node.y || 0,
        width: node.Width || node.w || 0,
        height: node.Height || node.h || 0,
      };

      // Only add elements that have a name or a significant role
      if (element.name !== 'Unnamed' || depth < 2) {
        flattened.push(element);
      }

      if (node.Children && Array.isArray(node.Children)) {
        node.Children.forEach((child: AccessibilityNode) =>
          traverse(child, depth + 1),
        );
      } else if (node.windows && Array.isArray(node.windows)) {
        // macOS specific structure
        node.windows.forEach((win: AccessibilityNode) =>
          traverse(win, depth + 1),
        );
      }
    };

    if (Array.isArray(tree)) {
      tree.forEach((node) => traverse(node));
    } else {
      traverse(tree);
    }

    return flattened;
  }

  /**
   * Finds the most relevant UI element at a specific coordinate.
   */
  findElementAt(x: number, y: number, elements: UIElement[]): UIElement | null {
    // Find elements containing the point
    const candidates = elements.filter(
      (el) =>
        x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height,
    );

    // Return the smallest element (likely the most specific leaf node)
    if (candidates.length === 0) return null;

    return candidates.reduce((smallest, current) => {
      const smallestArea = smallest.width * smallest.height;
      const currentArea = current.width * current.height;
      return currentArea < smallestArea && currentArea > 0 ? current : smallest;
    });
  }

  /**
   * Generates a semantic summary of the visible UI for the LLM.
   */
  generateSemanticSummary(elements: UIElement[]): string {
    if (elements.length === 0)
      return 'The desktop appears empty or accessibility data is unavailable.';

    let summary = 'Visible UI Elements:\n';
    // Group by role to make it more readable
    const byRole: Record<string, UIElement[]> = {};
    elements.forEach((el) => {
      if (!byRole[el.role]) byRole[el.role] = [];
      byRole[el.role].push(el);
    });

    for (const [role, items] of Object.entries(byRole)) {
      summary += `- ${role}: ${items.map((i) => `${i.name} [at ${i.x},${i.y}]`).join(', ')}\n`;
    }

    return summary;
  }
}
