/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ExtensionInstallMetadata, type PhillCLIExtension } from 'phill-cli-core';
export declare const EXTENSIONS_DIRECTORY_NAME: any;
export declare const EXTENSIONS_CONFIG_FILENAME = "phill-extension.json";
export declare const INSTALL_METADATA_FILENAME = ".phill-extension-install.json";
export declare function loadExtensions(workspaceDir: string): PhillCLIExtension[];
export declare function loadInstallMetadata(extensionDir: string): ExtensionInstallMetadata | undefined;
