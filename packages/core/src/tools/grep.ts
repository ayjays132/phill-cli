/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { globStream } from 'glob';
import type { ToolInvocation, ToolResult } from './tools.js';
import { execStreaming } from '../utils/shell-utils.js';
import {
  DEFAULT_TOTAL_MAX_MATCHES,
  DEFAULT_SEARCH_TIMEOUT_MS,
} from './constants.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import { getErrorMessage, isNodeError } from '../utils/errors.js';
import { isGitRepository } from '../utils/gitUtils.js';
import type { Config } from '../config/config.js';
import type { FileExclusions } from '../utils/ignorePatterns.js';
import { ToolErrorType } from './tool-error.js';
import { GREP_TOOL_NAME } from './tool-names.js';
import { debugLogger } from '../utils/debugLogger.js';

// --- Interfaces ---

/**
 * Parameters for the GrepTool
 */
export interface GrepToolParams {
  /**
   * The regular expression pattern to search for in file contents
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current directory relative to root)
   */
  dir_path?: string;

  /**
   * File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
   */
  include?: string;

  /**
   * Show this many lines of context before each match (optional)
   */
  before?: number;

  /**
   * Show this many lines of context after each match (optional)
   */
  after?: number;

  /**
   * Show this many lines of context around each match (optional)
   */
  context?: number;

  /**
   * If true, search is case-sensitive (optional, defaults to false)
   */
  case_sensitive?: boolean;

  /**
   * If true, treats the pattern as a literal string instead of a regex (optional)
   */
  fixed_strings?: boolean;

  /**
   * If true, only returns filenames that contain at least one match (optional)
   */
  files_with_matches?: boolean;
}

/**
 * Result object for a single grep match
 */
interface GrepMatch {
  filePath: string;
  lineNumber: number;
  line: string;
  isContext?: boolean;
}

class GrepToolInvocation extends BaseToolInvocation<
  GrepToolParams,
  ToolResult
> {
  private readonly fileExclusions: FileExclusions;

  constructor(
    private readonly config: Config,
    params: GrepToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
    this.fileExclusions = config.getFileExclusions();
  }

  /**
   * Parses a single line of grep-like output (git grep, system grep).
   * Expects format: filePath:lineNumber:lineContent or filePath-lineNumber-lineContent (for context)
   * @param {string} line The line to parse.
   * @param {string} basePath The absolute directory for path resolution.
   * @returns {GrepMatch | null} Parsed match or null if malformed.
   */
  private parseGrepLine(line: string, basePath: string): GrepMatch | null {
    if (!line.trim()) return null;

    // Matches filePath:lineNumber:lineContent (match) or filePath-lineNumber-lineContent (context)
    // We use a more robust regex that handles both : and - as separators
    const match = line.match(/^(.+?)([:-])(\d+)([:-])(.*)$/);
    if (!match) return null;

    const [, filePathRaw, separator1, lineNumberStr, separator2, lineContent] =
      match;
    const lineNumber = parseInt(lineNumberStr, 10);
    const isContext = separator1 === '-' || separator2 === '-';

    if (!isNaN(lineNumber)) {
      const absoluteFilePath = path.resolve(basePath, filePathRaw);
      const relativeCheck = path.relative(basePath, absoluteFilePath);
      if (
        relativeCheck === '..' ||
        relativeCheck.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativeCheck)
      ) {
        return null;
      }

      const relativeFilePath = path.relative(basePath, absoluteFilePath);

      return {
        filePath: relativeFilePath || path.basename(absoluteFilePath),
        lineNumber,
        line: lineContent,
        isContext,
      };
    }
    return null;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    try {
      const workspaceContext = this.config.getWorkspaceContext();
      const pathParam = this.params.dir_path;

      let searchDirAbs: string | null = null;
      if (pathParam) {
        searchDirAbs = path.resolve(this.config.getTargetDir(), pathParam);
        const validationError = this.config.validatePathAccess(searchDirAbs);
        if (validationError) {
          return {
            llmContent: validationError,
            returnDisplay: 'Error: Path not in workspace.',
            error: {
              message: validationError,
              type: ToolErrorType.PATH_NOT_IN_WORKSPACE,
            },
          };
        }

        try {
          const stats = await fsPromises.stat(searchDirAbs);
          if (!stats.isDirectory()) {
            return {
              llmContent: `Path is not a directory: ${searchDirAbs}`,
              returnDisplay: 'Error: Path is not a directory.',
              error: {
                message: `Path is not a directory: ${searchDirAbs}`,
                type: ToolErrorType.PATH_IS_NOT_A_DIRECTORY,
              },
            };
          }
        } catch (error: unknown) {
          if (isNodeError(error) && error.code === 'ENOENT') {
            return {
              llmContent: `Path does not exist: ${searchDirAbs}`,
              returnDisplay: 'Error: Path does not exist.',
              error: {
                message: `Path does not exist: ${searchDirAbs}`,
                type: ToolErrorType.FILE_NOT_FOUND,
              },
            };
          }
          const errorMessage = getErrorMessage(error);
          return {
            llmContent: `Failed to access path stats for ${searchDirAbs}: ${errorMessage}`,
            returnDisplay: 'Error: Failed to access path.',
            error: {
              message: `Failed to access path stats for ${searchDirAbs}: ${errorMessage}`,
              type: ToolErrorType.GREP_EXECUTION_ERROR,
            },
          };
        }
      }

      const searchDirDisplay = pathParam || '.';

      // Determine which directories to search
      let searchDirectories: readonly string[];
      if (searchDirAbs === null) {
        // No path specified - search all workspace directories
        searchDirectories = workspaceContext.getDirectories();
      } else {
        // Specific path provided - search only that directory
        searchDirectories = [searchDirAbs];
      }

      // Collect matches from all search directories
      let allMatches: GrepMatch[] = [];
      const totalMaxMatches = DEFAULT_TOTAL_MAX_MATCHES;

      // Create a timeout controller to prevent indefinitely hanging searches
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => {
        timeoutController.abort();
      }, DEFAULT_SEARCH_TIMEOUT_MS);

      // Link the passed signal to our timeout controller
      const onAbort = () => timeoutController.abort();
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      try {
        for (const searchDir of searchDirectories) {
          const remainingLimit = totalMaxMatches - allMatches.length;
          if (remainingLimit <= 0) break;

          const matches = await this.performGrepSearch({
            params: this.params,
            path: searchDir,
            maxMatches: remainingLimit,
            signal: timeoutController.signal,
          });

          // Add directory prefix if searching multiple directories
          if (searchDirectories.length > 1) {
            const dirName = path.basename(searchDir);
            matches.forEach((match) => {
              match.filePath = path.join(dirName, match.filePath);
            });
          }

          allMatches = allMatches.concat(matches);
        }
      } finally {
        clearTimeout(timeoutId);
        signal.removeEventListener('abort', onAbort);
      }

      let searchLocationDescription: string;
      if (searchDirAbs === null) {
        const numDirs = workspaceContext.getDirectories().length;
        searchLocationDescription =
          numDirs > 1
            ? `across ${numDirs} workspace directories`
            : `in the workspace directory`;
      } else {
        searchLocationDescription = `in path "${searchDirDisplay}"`;
      }

      if (allMatches.length === 0) {
        const noMatchMsg = `No matches found for pattern "${this.params.pattern}" ${searchLocationDescription}${this.params.include ? ` (filter: "${this.params.include}")` : ''}.`;
        return { llmContent: noMatchMsg, returnDisplay: `No matches found` };
      }

      const wasTruncated = allMatches.length >= totalMaxMatches;

      if (this.params.files_with_matches) {
        const uniqueFiles = [
          ...new Set(allMatches.map((m) => m.filePath)),
        ].sort();
        let llmContent = `Found matches for pattern "${this.params.pattern}" in ${uniqueFiles.length} files ${searchLocationDescription}${this.params.include ? ` (filter: "${this.params.include}")` : ''}:\n`;
        llmContent += uniqueFiles.join('\n');
        return {
          llmContent: llmContent.trim(),
          returnDisplay: `Found matches in ${uniqueFiles.length} files`,
        };
      }

      // Group matches by file
      const matchesByFile = allMatches.reduce(
        (acc, match) => {
          const fileKey = match.filePath;
          if (!acc[fileKey]) {
            acc[fileKey] = [];
          }
          acc[fileKey].push(match);
          return acc;
        },
        {} as Record<string, GrepMatch[]>,
      );

      // Sort matches within each file by line number
      for (const fileKey in matchesByFile) {
        matchesByFile[fileKey].sort((a, b) => a.lineNumber - b.lineNumber);
      }

      const matchCount = allMatches.filter((m) => !m.isContext).length;
      const matchTerm = matchCount === 1 ? 'match' : 'matches';

      let llmContent = `Found ${matchCount} ${matchTerm} for pattern "${this.params.pattern}" ${searchLocationDescription}${this.params.include ? ` (filter: "${this.params.include}")` : ''}${wasTruncated ? ` (results limited to ${totalMaxMatches} matches for performance)` : ''}:\n---\n`;

      for (const filePath in matchesByFile) {
        llmContent += `File: ${filePath}
`;
        let lastLineNumber = -1;
        matchesByFile[filePath].forEach((match) => {
          if (lastLineNumber !== -1 && match.lineNumber > lastLineNumber + 1) {
            llmContent += '--\n'; // separator for non-contiguous context
          }
          const trimmedLine = match.line;
          const prefix = match.isContext ? ' ' : 'L';
          llmContent += `${prefix}${match.lineNumber}: ${trimmedLine}\n`;
          lastLineNumber = match.lineNumber;
        });
        llmContent += '---\n';
      }

      return {
        llmContent: llmContent.trim(),
        returnDisplay: `Found ${matchCount} ${matchTerm}${wasTruncated ? ' (limited)' : ''}`,
      };
    } catch (error) {
      debugLogger.warn(`Error during GrepLogic execution: ${error}`);
      const errorMessage = getErrorMessage(error);
      return {
        llmContent: `Error during grep search operation: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.GREP_EXECUTION_ERROR,
        },
      };
    }
  }

  /**
   * Checks if a command is available in the system's PATH.
   * @param {string} command The command name (e.g., 'git', 'grep').
   * @returns {Promise<boolean>} True if the command is available, false otherwise.
   */
  private isCommandAvailable(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const checkCommand = process.platform === 'win32' ? 'where' : 'command';
      const checkArgs =
        process.platform === 'win32' ? [command] : ['-v', command];
      try {
        const child = spawn(checkCommand, checkArgs, {
          stdio: 'ignore',
          shell: true,
        });
        child.on('close', (code) => resolve(code === 0));
        child.on('error', (err) => {
          debugLogger.debug(
            `[GrepTool] Failed to start process for '${command}':`,
            err.message,
          );
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Performs the actual search using the prioritized strategies.
   * @param options Search options including pattern, absolute path, and include glob.
   * @returns A promise resolving to an array of match objects.
   */
  private async performGrepSearch(options: {
    params: GrepToolParams;
    path: string; // Expects absolute path
    maxMatches: number;
    signal: AbortSignal;
  }): Promise<GrepMatch[]> {
    const { params, path: absolutePath, maxMatches } = options;
    const {
      pattern,
      include,
      before,
      after,
      context,
      case_sensitive,
      fixed_strings,
      files_with_matches,
    } = params;
    let strategyUsed = 'none';

    try {
      // --- Strategy 1: git grep ---
      const isGit = isGitRepository(absolutePath);
      const gitAvailable = isGit && (await this.isCommandAvailable('git'));

      if (gitAvailable) {
        strategyUsed = 'git grep';
        const gitArgs = ['grep', '--untracked', '-n'];

        if (fixed_strings) gitArgs.push('-F');
        else gitArgs.push('-E');

        if (!case_sensitive) gitArgs.push('--ignore-case');
        if (files_with_matches) gitArgs.push('-l');

        if (before !== undefined) gitArgs.push(`-B${before}`);
        if (after !== undefined) gitArgs.push(`-A${after}`);
        if (context !== undefined) gitArgs.push(`-C${context}`);

        gitArgs.push(pattern);

        if (include) {
          gitArgs.push('--', include);
        }

        try {
          const generator = execStreaming('git', gitArgs, {
            cwd: absolutePath,
            signal: options.signal,
            allowedExitCodes: [0, 1],
          });

          const results: GrepMatch[] = [];
          for await (const line of generator) {
            if (files_with_matches) {
              results.push({ filePath: line.trim(), lineNumber: 0, line: '' });
            } else {
              const match = this.parseGrepLine(line, absolutePath);
              if (match) {
                results.push(match);
              }
            }
            if (results.length >= maxMatches) {
              break;
            }
          }
          return results;
        } catch (gitError: unknown) {
          debugLogger.debug(
            `GrepLogic: git grep failed: ${getErrorMessage(
              gitError,
            )}. Falling back...`,
          );
        }
      }

      // --- Strategy 2: System grep ---
      debugLogger.debug(
        'GrepLogic: System grep is being considered as fallback strategy.',
      );

      const grepAvailable = await this.isCommandAvailable('grep');
      if (grepAvailable) {
        strategyUsed = 'system grep';
        const grepArgs = ['-r', '-n', '-H', '-I'];

        if (fixed_strings) grepArgs.push('-F');
        else grepArgs.push('-E');

        if (!case_sensitive) grepArgs.push('-i');
        if (files_with_matches) grepArgs.push('-l');

        if (before !== undefined) grepArgs.push(`-B${before}`);
        if (after !== undefined) grepArgs.push(`-A${after}`);
        if (context !== undefined) grepArgs.push(`-C${context}`);

        // Extract directory names from exclusion patterns for grep --exclude-dir
        const globExcludes = this.fileExclusions.getGlobExcludes();
        const commonExcludes = globExcludes
          .map((pattern) => {
            let dir = pattern;
            if (dir.startsWith('**/')) {
              dir = dir.substring(3);
            }
            if (dir.endsWith('/**')) {
              dir = dir.slice(0, -3);
            } else if (dir.endsWith('/')) {
              dir = dir.slice(0, -1);
            }

            // Only consider patterns that are likely directories. This filters out file patterns.
            if (dir && !dir.includes('/') && !dir.includes('*')) {
              return dir;
            }
            return null;
          })
          .filter((dir): dir is string => !!dir);
        commonExcludes.forEach((dir) => grepArgs.push(`--exclude-dir=${dir}`));
        if (include) {
          grepArgs.push(`--include=${include}`);
        }
        grepArgs.push(pattern);
        grepArgs.push('.');

        const results: GrepMatch[] = [];
        try {
          const generator = execStreaming('grep', grepArgs, {
            cwd: absolutePath,
            signal: options.signal,
            allowedExitCodes: [0, 1],
          });

          for await (const line of generator) {
            if (files_with_matches) {
              results.push({ filePath: line.trim(), lineNumber: 0, line: '' });
            } else {
              const match = this.parseGrepLine(line, absolutePath);
              if (match) {
                results.push(match);
              }
            }
            if (results.length >= maxMatches) {
              break;
            }
          }
          return results;
        } catch (grepError: unknown) {
          if (
            grepError instanceof Error &&
            /Permission denied|Is a directory/i.test(grepError.message)
          ) {
            return results;
          }
          debugLogger.debug(
            `GrepLogic: System grep failed: ${getErrorMessage(
              grepError,
            )}. Falling back...`,
          );
        }
      }

      // --- Strategy 3: Pure JavaScript Fallback ---
      debugLogger.debug(
        'GrepLogic: Falling back to JavaScript grep implementation.',
      );
      strategyUsed = 'javascript fallback';
      const globPattern = include ? include : '**/*';
      const ignorePatterns = this.fileExclusions.getGlobExcludes();

      const filesStream = globStream(globPattern, {
        cwd: absolutePath,
        dot: true,
        ignore: ignorePatterns,
        absolute: true,
        nodir: true,
        signal: options.signal,
      });

      const regexFlags = case_sensitive ? '' : 'i';
      const regex = fixed_strings
        ? null
        : new RegExp(pattern, regexFlags || undefined);
      const allMatches: GrepMatch[] = [];

      for await (const filePath of filesStream) {
        if (allMatches.length >= maxMatches) break;
        const fileAbsolutePath = filePath;
        // security check
        const relativePath = path.relative(absolutePath, fileAbsolutePath);
        if (
          relativePath === '..' ||
          relativePath.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relativePath)
        )
          continue;

        try {
          const content = await fsPromises.readFile(fileAbsolutePath, 'utf8');
          const lines = content.split(/\r?\n/);
          const fileMatches: GrepMatch[] = [];

          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            let isMatch = false;
            if (fixed_strings) {
              isMatch = case_sensitive
                ? line.includes(pattern)
                : line.toLowerCase().includes(pattern.toLowerCase());
            } else if (regex) {
              isMatch = regex.test(line);
            }

            if (isMatch) {
              if (files_with_matches) {
                fileMatches.push({
                  filePath: relativePath || path.basename(fileAbsolutePath),
                  lineNumber: 0,
                  line: '',
                });
                break; // Only need one match for files_with_matches
              }

              const actualBefore = context !== undefined ? context : before || 0;
              const actualAfter = context !== undefined ? context : after || 0;

              if (actualBefore > 0 || actualAfter > 0) {
                const start = Math.max(0, index - actualBefore);
                const end = Math.min(lines.length - 1, index + actualAfter);
                for (let i = start; i <= end; i++) {
                  fileMatches.push({
                    filePath: relativePath || path.basename(fileAbsolutePath),
                    lineNumber: i + 1,
                    line: lines[i],
                    isContext: i !== index,
                  });
                }
              } else {
                fileMatches.push({
                  filePath: relativePath || path.basename(fileAbsolutePath),
                  lineNumber: index + 1,
                  line,
                });
              }

              if (allMatches.length + fileMatches.length >= maxMatches) break;
            }
          }

          // Deduplicate context lines if they overlap
          if (!files_with_matches && (before || after || context)) {
            const seen = new Set<number>();
            const uniqueFileMatches: GrepMatch[] = [];
            for (const m of fileMatches) {
              if (!seen.has(m.lineNumber)) {
                uniqueFileMatches.push(m);
                seen.add(m.lineNumber);
              } else if (!m.isContext) {
                // If we already added this line as context but now it's a match, update it
                const existing = uniqueFileMatches.find(
                  (em) => em.lineNumber === m.lineNumber,
                );
                if (existing) existing.isContext = false;
              }
            }
            allMatches.push(...uniqueFileMatches);
          } else {
            allMatches.push(...fileMatches);
          }
        } catch (readError: unknown) {
          // Ignore errors like permission denied or file gone during read
          if (!isNodeError(readError) || readError.code !== 'ENOENT') {
            debugLogger.debug(
              `GrepLogic: Could not read/process ${fileAbsolutePath}: ${getErrorMessage(
                readError,
              )}`,
            );
          }
        }
      }

      return allMatches;
    } catch (error: unknown) {
      debugLogger.warn(
        `GrepLogic: Error in performGrepSearch (Strategy: ${strategyUsed}): ${getErrorMessage(
          error,
        )}`,
      );
      throw error; // Re-throw
    }
  }

  getDescription(): string {
    let description = `'${this.params.pattern}'`;
    if (this.params.include) {
      description += ` in ${this.params.include}`;
    }
    if (this.params.dir_path) {
      const resolvedPath = path.resolve(
        this.config.getTargetDir(),
        this.params.dir_path,
      );
      if (
        resolvedPath === this.config.getTargetDir() ||
        this.params.dir_path === '.'
      ) {
        description += ` within ./`;
      } else {
        const relativePath = makeRelative(
          resolvedPath,
          this.config.getTargetDir(),
        );
        description += ` within ${shortenPath(relativePath)}`;
      }
    } else {
      // When no path is specified, indicate searching all workspace directories
      const workspaceContext = this.config.getWorkspaceContext();
      const directories = workspaceContext.getDirectories();
      if (directories.length > 1) {
        description += ` across all workspace directories`;
      }
    }
    return description;
  }
}

/**
 * Implementation of the Grep tool logic (moved from CLI)
 */
export class GrepTool extends BaseDeclarativeTool<GrepToolParams, ToolResult> {
  static readonly Name = GREP_TOOL_NAME;
  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      GrepTool.Name,
      'SearchText',
      'Searches for a regular expression pattern within the content of files in a specified directory (or current working directory). Can filter files by a glob pattern. Returns the lines containing matches, along with their file paths and line numbers.',
      Kind.Search,
      {
        properties: {
          pattern: {
            description: `The regular expression (regex) pattern to search for within file contents (e.g., 'function\\s+myFunction', 'import\\s+\\{.*\\}\\s+from\\s+.*').`,
            type: 'string',
          },
          dir_path: {
            description:
              'Optional: The absolute path to the directory to search within. If omitted, searches the current working directory.',
            type: 'string',
          },
          include: {
            description: `Optional: A glob pattern to filter which files are searched (e.g., '*.js', '*.{ts,tsx}', 'src/**'). If omitted, searches all files (respecting potential global ignores).`,
            type: 'string',
          },
          before: {
            description:
              'Optional: Show this many lines of context before each match (equivalent to grep -B).',
            type: 'number',
          },
          after: {
            description:
              'Optional: Show this many lines of context after each match (equivalent to grep -A).',
            type: 'number',
          },
          context: {
            description:
              'Optional: Show this many lines of context around each match (equivalent to grep -C).',
            type: 'number',
          },
          case_sensitive: {
            description:
              'Optional: If true, search is case-sensitive. Defaults to false (ignore case).',
            type: 'boolean',
          },
          fixed_strings: {
            description:
              'Optional: If true, treats the pattern as a literal string instead of a regular expression.',
            type: 'boolean',
          },
          files_with_matches: {
            description:
              'Optional: If true, only returns the names of files that contain at least one match.',
            type: 'boolean',
          },
        },
        required: ['pattern'],
        type: 'object',
      },
      messageBus,
      true,
      false,
    );
  }

  /**
   * Validates the parameters for the tool
   * @param params Parameters to validate
   * @returns An error message string if invalid, null otherwise
   */
  protected override validateToolParamValues(
    params: GrepToolParams,
  ): string | null {
    if (!params.fixed_strings) {
      try {
        new RegExp(params.pattern);
      } catch (error) {
        return `Invalid regular expression pattern provided: ${params.pattern}. Error: ${getErrorMessage(error)}`;
      }
    }

    // Only validate dir_path if one is provided
    if (params.dir_path) {
      const resolvedPath = path.resolve(
        this.config.getTargetDir(),
        params.dir_path,
      );
      const validationError = this.config.validatePathAccess(resolvedPath);
      if (validationError) {
        return validationError;
      }

      // We still want to check if it's a directory
      try {
        const stats = fs.statSync(resolvedPath);
        if (!stats.isDirectory()) {
          return `Path is not a directory: ${resolvedPath}`;
        }
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === 'ENOENT') {
          return `Path does not exist: ${resolvedPath}`;
        }
        return `Failed to access path stats for ${resolvedPath}: ${getErrorMessage(error)}`;
      }
    }

    return null; // Parameters are valid
  }

  protected createInvocation(
    params: GrepToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<GrepToolParams, ToolResult> {
    return new GrepToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

/**
 * A legacy alias for the Grep tool, allowing usage of the 'grep' command name.
 */
export class LegacyGrepTool extends GrepTool {
  constructor(config: Config, messageBus: MessageBus) {
    super(config, messageBus);
    // @ts-expect-error - overriding readonly name for alias
    this.name = 'grep';
  }
}
