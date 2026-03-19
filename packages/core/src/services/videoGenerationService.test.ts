/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
  afterEach,
} from 'vitest';
import { VideoGenerationService } from './videoGenerationService.js';
import type { Config } from '../config/config.js';
import * as fs from 'node:fs';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/msw.js';

vi.mock('node:fs');
vi.mock('../utils/debugLogger.js');

describe('VideoGenerationService', () => {
  let service: VideoGenerationService;
  let mockConfig: Record<string, any>;

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    service = VideoGenerationService.getInstance();
    mockConfig = {
      getContentGeneratorConfig: vi
        .fn()
        .mockReturnValue({ apiKey: 'test-api-key' }),
      getProjectRoot: vi.fn().mockReturnValue('/mock/root'),
    };
    vi.clearAllMocks();
  });

  it('should successfully initiate video generation and poll until done', async () => {
    const mockOperationName = 'operations/test-op';

    // MSW Handlers
    server.use(
      // Start request
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateVideos',
        () => {
          return HttpResponse.json({ name: mockOperationName });
        },
      ),
      // First poll (not done)
      http.get(
        `https://generativelanguage.googleapis.com/v1beta/operations/${mockOperationName}`,
        () => {
          return HttpResponse.json({ done: false });
        },
        { once: true },
      ),
      // Second poll (done)
      http.get(
        `https://generativelanguage.googleapis.com/v1beta/operations/${mockOperationName}`,
        () => {
          return HttpResponse.json({
            done: true,
            response: {
              generateVideoResponse: {
                generatedSamples: [
                  {
                    video: {
                      videoBytes: 'YmFzZTY0ZGF0YQ==',
                      mimeType: 'video/mp4',
                    },
                  },
                ],
              },
            },
          });
        },
      ),
    );

    const params = {
      prompt: 'test prompt',
      model: 'veo-3.1-generate-preview',
    };

    vi.useFakeTimers();
    const resultPromise = service.generateVideo(
      mockConfig as unknown as Config,
      params,
      'test.mp4',
    );

    // Advance for first poll
    await vi.advanceTimersByTimeAsync(10000);
    // Advance for second poll
    await vi.advanceTimersByTimeAsync(10000);

    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.status).toBe('success');
    expect(result.path).toContain('test.mp4');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should handle API errors during start', async () => {
    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateVideos',
        () => {
          return new HttpResponse('Forbidden', { status: 403 });
        },
      ),
    );

    const params = {
      prompt: 'test prompt',
      model: 'veo-3.1-generate-preview',
    };

    const result = await service.generateVideo(
      mockConfig as unknown as Config,
      params,
    );

    expect(result.status).toBe('error');
    expect(result.error).toContain('403');
  });
});
