export class ExecutionLifecycleService {
  private static injectionService: unknown;

  constructor(..._args: unknown[]) {}

  static setInjectionService(injectionService: unknown): void {
    ExecutionLifecycleService.injectionService = injectionService;
  }

  static getInjectionService(): unknown {
    return ExecutionLifecycleService.injectionService;
  }
}
