/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MCPServerConfig } from 'phill-cli-core';
import { type TelemetrySettings } from 'phill-cli-core';
export declare const USER_SETTINGS_DIR: any;
export declare const USER_SETTINGS_PATH: any;
export interface Settings {
    mcpServers?: Record<string, MCPServerConfig>;
    coreTools?: string[];
    excludeTools?: string[];
    telemetry?: TelemetrySettings;
    showMemoryUsage?: boolean;
    checkpointing?: CheckpointingSettings;
    folderTrust?: boolean;
    general?: {
        previewFeatures?: boolean;
    };
    fileFiltering?: {
        respectGitIgnore?: boolean;
        respectGeminiIgnore?: boolean;
        enableRecursiveFileSearch?: boolean;
        customIgnoreFilePaths?: string[];
    };
}
export interface SettingsError {
    message: string;
    path: string;
}
export interface CheckpointingSettings {
    enabled?: boolean;
}
/**
 * Loads settings from user and workspace directories.
 * Project settings override user settings.
 *
 * How is it different to phill-cli/cli: Returns already merged settings rather
 * than `LoadedSettings` (unnecessary since we are not modifying users
 * settings.json).
 */
export declare function loadSettings(workspaceDir: string): Settings;
