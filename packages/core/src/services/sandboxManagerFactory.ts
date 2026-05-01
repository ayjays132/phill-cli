import { NoopSandboxManager, type SandboxManager } from './sandboxManager.js';

export function createSandboxManager(..._args: unknown[]): SandboxManager {
  return new NoopSandboxManager();
}
