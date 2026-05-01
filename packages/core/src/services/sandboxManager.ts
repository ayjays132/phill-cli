export interface SandboxManager {
  dispose?: () => void | Promise<void>;
}

export class NoopSandboxManager implements SandboxManager {
  dispose(): void {}
}
