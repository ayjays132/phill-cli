/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// A lightweight, Hebbian-style pattern learner for the Meta-Cognition Engine.
// It learns transition probabilities between user inputs and system actions without an LLM.

interface TransitionMap {
  [key: string]: { [next: string]: number };
}

export class PatternLearner {
  private transitions: TransitionMap = {};
  private lastSymbol: string | null = null;

  // Simple heuristic to tokenize inputs into "symbols"
  private tokenize(input: string): string {
    const lower = input.toLowerCase().trim();
    if (lower.startsWith('git ')) return `GIT_${lower.split(' ')[1] || 'CMD'}`;
    if (lower.startsWith('npm ')) return `NPM_${lower.split(' ')[1] || 'CMD'}`;
    if (lower.includes('test')) return 'TEST_ACTION';
    if (lower.includes('build')) return 'BUILD_ACTION';
    if (lower.includes('fix')) return 'FIX_ACTION';
    return 'GENERIC_INPUT';
  }

  public observe(input: string) {
    const symbol = this.tokenize(input);
    if (this.lastSymbol) {
      this.learn(this.lastSymbol, symbol);
    }
    this.lastSymbol = symbol;
  }

  private learn(from: string, to: string) {
    if (!this.transitions[from]) {
      this.transitions[from] = {};
    }
    if (!this.transitions[from][to]) {
      this.transitions[from][to] = 0;
    }
    this.transitions[from][to]++;
  }

  public predictNext(input: string): string | null {
    const symbol = this.tokenize(input);
    const nextOptions = this.transitions[symbol];
    if (!nextOptions) return null;

    // Find highest probability next step
    let bestNext: string | null = null;
    let maxCount = 0;
    for (const [next, count] of Object.entries(nextOptions)) {
      if (count > maxCount) {
        maxCount = count;
        bestNext = next;
      }
    }
    
    return this.decode(bestNext);
  }

  private decode(symbol: string | null): string | null {
    if (!symbol) return null;
    switch (symbol) {
      case 'GIT_STATUS': return 'Check git status?';
      case 'GIT_COMMIT': return 'Ready to commit?';
      case 'TEST_ACTION': return 'Run tests?';
      case 'BUILD_ACTION': return 'Build project?';
      case 'FIX_ACTION': return 'Apply fix?';
      default: return null;
    }
  }
  
  public clear() {
    this.transitions = {};
    this.lastSymbol = null;
  }
}
