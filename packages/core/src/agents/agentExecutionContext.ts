/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface AgentExecutionContext {
  agentStack: string[];
}

const agentExecutionContext = new AsyncLocalStorage<AgentExecutionContext>();

export function runWithAgentExecutionContext<T>(
  context: AgentExecutionContext,
  fn: () => T,
): T {
  return agentExecutionContext.run(context, fn);
}

export function getAgentExecutionContext():
  | AgentExecutionContext
  | undefined {
  return agentExecutionContext.getStore();
}
