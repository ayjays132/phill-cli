/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import path from 'node:path';
import { makeRelative, shortenPath } from '../utils/paths.js';
import type { ToolInvocation, ToolLocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';

import type { PartUnion } from '@google/genai';
import {
  processSingleFileContent,
  getSpecificMimeType,
  readFileWithEncoding,
} from '../utils/fileUtils.js';
import { debugLogger } from '../utils/debugLogger.js';
import type { Config } from '../config/config.js';
import { FileOperation } from '../telemetry/metrics.js';
import { getProgrammingLanguage } from '../telemetry/telemetry-utils.js';
import { logFileOperation } from '../telemetry/loggers.js';
import { FileOperationEvent } from '../telemetry/types.js';
import { READ_FILE_TOOL_NAME } from './tool-names.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';

/**
 * Parameters for the ReadFile tool
 */
export interface ReadFileToolParams {
  /**
   * The path to the file to read
   */
  file_path: string;

  /**
   * The line number to start reading from (optional)
   */
  offset?: number;

  /**
   * The number of lines to read (optional)
   */
  limit?: number;

  /**
   * Optional: A regular expression pattern to search for. If found, reads a window of lines around the first match.
   */
  pattern?: string;
}

class ReadFileToolInvocation extends BaseToolInvocation<
  ReadFileToolParams,
  ToolResult
> {
  private readonly resolvedPath: string;
  constructor(
    private config: Config,
    params: ReadFileToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
    this.resolvedPath = path.resolve(
      this.config.getTargetDir(),
      this.params.file_path,
    );
  }

  getDescription(): string {
    const relativePath = makeRelative(
      this.resolvedPath,
      this.config.getTargetDir(),
    );
    let desc = shortenPath(relativePath);
    if (this.params.pattern) {
      desc += ` (pattern: "${this.params.pattern}")`;
    }
    return desc;
  }

  override toolLocations(): ToolLocation[] {
    return [{ path: this.resolvedPath, line: this.params.offset }];
  }

  async execute(): Promise<ToolResult> {
    const validationError = this.config.validatePathAccess(this.resolvedPath);
    if (validationError) {
      return {
        llmContent: validationError,
        returnDisplay: 'Path not in workspace.',
        error: {
          message: validationError,
          type: ToolErrorType.PATH_NOT_IN_WORKSPACE,
        },
      };
    }

    let offset = this.params.offset;
    let limit = this.params.limit;

    if (this.params.pattern) {
      try {
        const content = await readFileWithEncoding(this.resolvedPath);
        const lines = content.split(/\r?\n/);
        const regex = new RegExp(this.params.pattern, 'i');
        const matchIndex = lines.findIndex((line) => regex.test(line));

        if (matchIndex !== -1) {
          const windowSize = limit || 20;
          offset = Math.max(0, matchIndex - Math.floor(windowSize / 2));
          limit = windowSize;
        }
      } catch (e) {
        debugLogger.debug(`Pattern-based read failed for ${this.resolvedPath}`, e);
        // Fallback to normal offset/limit if pattern search fails
      }
    }

    const result = await processSingleFileContent(
      this.resolvedPath,
      this.config.getTargetDir(),
      this.config.getFileSystemService(),
      offset,
      limit,
    );

    if (result.error) {
      return {
        llmContent: result.llmContent,
        returnDisplay: result.returnDisplay || 'Error reading file',
        error: {
          message: result.error,
          type: result.errorType,
        },
      };
    }

    let llmContent: PartUnion;
    if (result.isTruncated) {
      const [start, end] = result.linesShown!;
      const total = result.originalLineCount!;
      const nextOffset = offset ? offset + end - start + 1 : end;
      llmContent = `
IMPORTANT: The file content has been truncated.
Status: Showing lines ${start}-${end} of ${total} total lines.
Action: To read more of the file, you can use the 'offset' and 'limit' parameters in a subsequent 'read_file' call. For example, to read the next section of the file, use offset: ${nextOffset}.

--- FILE CONTENT (truncated) ---
${result.llmContent}`;
    } else {
      llmContent = result.llmContent || '';
    }

    const lines =
      typeof result.llmContent === 'string'
        ? result.llmContent.split('\n').length
        : undefined;
    const mimetype = getSpecificMimeType(this.resolvedPath);
    const programming_language = getProgrammingLanguage({
      file_path: this.resolvedPath,
    });
    logFileOperation(
      this.config,
      new FileOperationEvent(
        READ_FILE_TOOL_NAME,
        FileOperation.READ,
        lines,
        mimetype,
        path.extname(this.resolvedPath),
        programming_language,
      ),
    );

    return {
      llmContent,
      returnDisplay: result.returnDisplay || '',
    };
  }
}

/**
 * Implementation of the ReadFile tool logic
 */
export class ReadFileTool extends BaseDeclarativeTool<
  ReadFileToolParams,
  ToolResult
> {
  static readonly Name = READ_FILE_TOOL_NAME;
  private readonly fileDiscoveryService: FileDiscoveryService;

  constructor(
    private config: Config,
    messageBus: MessageBus,
  ) {
    super(
      ReadFileTool.Name,
      'ReadFile',
      `Reads and returns the content of a specified file. If the file is large, the content will be truncated. The tool's response will clearly indicate if truncation has occurred and will provide details on how to read more of the file using the 'offset' and 'limit' parameters. Handles text, images (PNG, JPG, GIF, WEBP, SVG, BMP), audio files (MP3, WAV, AIFF, AAC, OGG, FLAC), and PDF files. For text files, it can read specific line ranges.`,
      Kind.Read,
      {
        properties: {
          file_path: {
            description: 'The path to the file to read.',
            type: 'string',
          },
          offset: {
            description:
              "Optional: For text files, the 0-based line number to start reading from. Requires 'limit' to be set. Use for paginating through large files.",
            type: 'number',
          },
          limit: {
            description:
              "Optional: For text files, maximum number of lines to read. Use with 'offset' to paginate through large files. If omitted, reads the entire file (if feasible, up to a default limit).",
            type: 'number',
          },
          pattern: {
            description:
              "Optional: A regular expression pattern to search for. If found, the tool will read a window of lines around the first match. Useful for finding a specific function or class definition.",
            type: 'string',
          },
        },
        required: ['file_path'],
        type: 'object',
      },
      messageBus,
      true,
      false,
    );
    this.fileDiscoveryService = new FileDiscoveryService(
      config.getTargetDir(),
      config.getFileFilteringOptions(),
    );
  }

  protected override validateToolParamValues(
    params: ReadFileToolParams,
  ): string | null {
    if (params.file_path.trim() === '') {
      return "The 'file_path' parameter must be non-empty.";
    }

    const resolvedPath = path.resolve(
      this.config.getTargetDir(),
      params.file_path,
    );

    const validationError = this.config.validatePathAccess(resolvedPath);
    if (validationError) {
      return validationError;
    }

    if (params.offset !== undefined && params.offset < 0) {
      return 'Offset must be a non-negative number';
    }
    if (params.limit !== undefined && params.limit <= 0) {
      return 'Limit must be a positive number';
    }
    if (params.pattern !== undefined) {
      try {
        new RegExp(params.pattern);
      } catch (e) {
        return `Invalid regular expression pattern: ${params.pattern}`;
      }
    }

    const fileFilteringOptions = this.config.getFileFilteringOptions();
    if (
      this.fileDiscoveryService.shouldIgnoreFile(
        resolvedPath,
        fileFilteringOptions,
      )
    ) {
      return `File path '${resolvedPath}' is ignored by configured ignore patterns.`;
    }

    return null;
  }

  protected createInvocation(
    params: ReadFileToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ReadFileToolParams, ToolResult> {
    return new ReadFileToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
