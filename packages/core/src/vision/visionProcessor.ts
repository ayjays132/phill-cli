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

export class VisionProcessor {
  private static instance: VisionProcessor;

  private constructor() {}

  public static getInstance(): VisionProcessor {
    if (!VisionProcessor.instance) {
      VisionProcessor.instance = new VisionProcessor();
    }
    return VisionProcessor.instance;
  }

  /**
   * Flattens a nested accessibility tree into a searchable list of interactable elements.
   */
  public flattenTree(tree: any): UIElement[] {
    const flattened: UIElement[] = [];

    const traverse = (node: any, depth = 0) => {
      if (!node) return;

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
        node.Children.forEach((child: any) => traverse(child, depth + 1));
      } else if (node.windows && Array.isArray(node.windows)) {
          // macOS specific structure
          node.windows.forEach((win: any) => traverse(win, depth + 1));
      }
    };

    if (Array.isArray(tree)) {
      tree.forEach(node => traverse(node));
    } else {
      traverse(tree);
    }

    return flattened;
  }

  /**
   * Finds the most relevant UI element at a specific coordinate.
   */
  public findElementAt(x: number, y: number, elements: UIElement[]): UIElement | null {
    // Find elements containing the point
    const candidates = elements.filter(el => 
      x >= el.x && x <= (el.x + el.width) &&
      y >= el.y && y <= (el.y + el.height)
    );

    // Return the smallest element (likely the most specific leaf node)
    if (candidates.length === 0) return null;
    
    return candidates.reduce((smallest, current) => {
      const smallestArea = smallest.width * smallest.height;
      const currentArea = current.width * current.height;
      return (currentArea < smallestArea && currentArea > 0) ? current : smallest;
    });
  }

  /**
   * Generates a semantic summary of the visible UI for the LLM.
   */
  public generateSemanticSummary(elements: UIElement[]): string {
    if (elements.length === 0) return "The desktop appears empty or accessibility data is unavailable.";

    let summary = "Visible UI Elements:\n";
    // Group by role to make it more readable
    const byRole: Record<string, UIElement[]> = {};
    elements.forEach(el => {
      if (!byRole[el.role]) byRole[el.role] = [];
      byRole[el.role].push(el);
    });

    for (const [role, items] of Object.entries(byRole)) {
      summary += `- ${role}: ${items.map(i => `${i.name} [at ${i.x},${i.y}]`).join(', ')}\n`;
    }

    return summary;
  }
}
