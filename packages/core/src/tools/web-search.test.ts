/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WebSearchToolParams } from './web-search.js';
import { WebSearchTool } from './web-search.js';



import { createMockMessageBus } from '../test-utils/mock-message-bus.js';




describe('WebSearchTool', () => {

  let tool: WebSearchTool;

  beforeEach(() => {

    tool = new WebSearchTool({} as any, createMockMessageBus());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    it('should return an invocation for a valid query', () => {
      const params: WebSearchToolParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation).toBeDefined();
      expect(invocation.params).toEqual(params);
    });

    it('should throw an error for an empty query', () => {
      const params: WebSearchToolParams = { query: '' };
      expect(() => tool.build(params)).toThrow(
        "The 'query' parameter cannot be empty.",
      );
    });

    it('should throw an error for a query with only whitespace', () => {
      const params: WebSearchToolParams = { query: '   ' };
      expect(() => tool.build(params)).toThrow(
        "The 'query' parameter cannot be empty.",
      );
    });
  });

  describe('getDescription', () => {
    it('should return a description of the search', () => {
      const params: WebSearchToolParams = { query: 'test query' };
      const invocation = tool.build(params);
      expect(invocation.getDescription()).toBe(
        'Searching the web for: "test query"',
      );
    });
  });


});
