/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates the cosine similarity between two numeric vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let magASq = 0;
  let magBSq = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magASq += vecA[i] * vecA[i];
    magBSq += vecB[i] * vecB[i];
  }
  
  if (magASq === 0 || magBSq === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(magASq) * Math.sqrt(magBSq));
}
