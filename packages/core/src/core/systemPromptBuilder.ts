/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SystemPromptBuilder orchestrates the assembly of the system instruction.
 * It ensures that Wisdom, Ethics, and Coherency layers are properly structured.
 */
export class SystemPromptBuilder {
  private basePrompt: string = '';
  private wisdom: string = '';
  private ethics: string = '';
  private visualTrace: string = '';
  private concepts: string[] = [];

  setBasePrompt(prompt: string): this {
    this.basePrompt = prompt;
    return this;
  }

  setWisdom(wisdom: string): this {
    this.wisdom = wisdom;
    return this;
  }

  setEthics(ethics: string): this {
    this.ethics = ethics;
    return this;
  }

  setVisualTrace(trace: string): this {
    this.visualTrace = trace;
    return this;
  }

  setConcepts(concepts: string[]): this {
    this.concepts = concepts;
    return this;
  }

  build(): string {
    const parts: string[] = [];

    if (this.basePrompt) {
      parts.push(this.basePrompt.trim());
    }

    if (this.concepts && this.concepts.length > 0) {
      parts.push(`<foundational_concepts>\n${this.concepts.join('\n')}\n</foundational_concepts>`);
    }

    if (this.wisdom) {
      parts.push(`<latent_wisdom>\n${this.wisdom.trim()}\n</latent_wisdom>`);
    }

    if (this.ethics) {
      parts.push(`<ethical_alignment>\n${this.ethics.trim()}\n</ethical_alignment>`);
    }

    if (this.visualTrace) {
      parts.push(`<visual_temporal_trace>\n${this.visualTrace.trim()}\n</visual_temporal_trace>`);
    }

    return parts.join('\n\n').trim();
  }
}
