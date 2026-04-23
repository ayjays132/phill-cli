/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export class Semaphore {
  private tasks: (() => void)[] = [];
  private activeCount: number = 0;

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.activeCount < this.limit) {
      this.activeCount++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.tasks.push(resolve);
    });
  }

  release(): void {
    if (this.tasks.length > 0) {
      const nextTask = this.tasks.shift();
      if (nextTask) {
        nextTask();
      }
    } else {
      this.activeCount--;
    }
  }
}
