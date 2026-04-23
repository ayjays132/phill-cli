/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionDeclaration } from '@google/genai';

/**
 * Simplifies a function declaration schema for better compatibility with small,
 * local models (like Llama 3 8B) by removing non-essential descriptions and
 * flattening overly complex types where possible.
 */
export function simplifyToolSchema(
  declaration: FunctionDeclaration,
): FunctionDeclaration {
  if (!declaration.parametersJsonSchema) {
    return declaration;
  }

  const simplifiedSchema = JSON.parse(
    JSON.stringify(declaration.parametersJsonSchema),
  );

  // Recursively clean up the schema
  function cleanNode(node: any) {
    if (!node || typeof node !== 'object') return;

    // Local models sometimes hallucinate options if enums have long descriptions
    // We only keep property descriptions if strictly necessary, but for ultimate
    // simplification, we can remove them. We'll leave root descriptions intact.
    if (node.properties) {
      for (const key of Object.keys(node.properties)) {
        const prop = node.properties[key];
        
        // Strip verbose property descriptions to save tokens
        if (prop.description && prop.description.length > 100) {
           prop.description = prop.description.substring(0, 97) + '...';
        }
        
        cleanNode(prop);
      }
    }

    if (node.items) {
      cleanNode(node.items);
    }
    
    // Remove unsupported fields for some local Ollama models
    delete node.default;
    delete node.examples;
    delete node.$comment;
  }

  cleanNode(simplifiedSchema);

  return {
    name: declaration.name,
    description: declaration.description,
    parametersJsonSchema: simplifiedSchema,
  };
}
