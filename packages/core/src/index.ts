/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Export config
export * from './config/config.js';
export * from './config/defaultModelConfigs.js';
export * from './config/models.js';
export * from './config/constants.js';
export * from './output/types.js';
export * from './output/json-formatter.js';
export * from './output/stream-json-formatter.js';
export * from './policy/types.js';
export * from './policy/policy-engine.js';
export * from './policy/toml-loader.js';
export * from './policy/config.js';
export * from './confirmation-bus/types.js';
export * from './confirmation-bus/message-bus.js';

// Export Commands logic
export * from './commands/extensions.js';
export * from './commands/restore.js';
export * from './commands/init.js';
export * from './commands/memory.js';
export * from './commands/types.js';

// Export Core Logic
export * from './core/client.js';
export * from './core/contentGenerator.js';
export * from './core/loggingContentGenerator.js';
export * from './core/phillChat.js';
export * from './core/logger.js';
export * from './core/prompts.js';
export * from './core/tokenLimits.js';
export * from './core/turn.js';
export * from './core/phillRequest.js';
export * from './core/coreToolScheduler.js';
export * from './scheduler/scheduler.js';
export * from './scheduler/types.js';
export * from './scheduler/tool-executor.js';
export * from './core/recordingContentGenerator.js';

export * from './fallback/types.js';

export * from './code_assist/codeAssist.js';
export * from './code_assist/oauth2.js';
export * from './code_assist/server.js';
export * from './code_assist/setup.js';
export * from './code_assist/types.js';
export * from './code_assist/telemetry.js';
export * from './core/apiKeyCredentialStorage.js';

// Export utilities
export { homedir, tmpdir } from './utils/paths.js';
export * from './utils/paths.js';
export * from './utils/schemaValidator.js';
export * from './utils/errors.js';
export * from './utils/exitCodes.js';
export * from './utils/getFolderStructure.js';
export * from './utils/memoryDiscovery.js';
export * from './utils/getPty.js';
export * from './utils/gitIgnoreParser.js';
export * from './utils/gitUtils.js';
export * from './utils/editor.js';
export * from './utils/quotaErrorDetection.js';
export * from './utils/userAccountManager.js';
export * from './utils/googleQuotaErrors.js';
export * from './utils/googleErrors.js';
export * from './utils/fileUtils.js';
export * from './utils/fileDiffUtils.js';
export * from './utils/retry.js';
export * from './utils/shell-utils.js';
export { PolicyDecision, ApprovalMode } from './policy/types.js';
export * from './utils/tool-utils.js';
export * from './utils/terminalSerializer.js';
export * from './utils/systemEncoding.js';
export * from './utils/textUtils.js';
export * from './utils/formatters.js';
export * from './utils/generateContentResponseUtilities.js';
export * from './utils/filesearch/fileSearch.js';
export * from './utils/errorParsing.js';
export * from './utils/workspaceContext.js';
export * from './utils/environmentContext.js';
export * from './utils/ignorePatterns.js';
export * from './utils/partUtils.js';
export * from './utils/promptIdContext.js';
export * from './utils/thoughtUtils.js';
export * from './utils/debugLogger.js';
export * from './utils/events.js';
export * from './utils/extensionLoader.js';
export * from './utils/package.js';
export * from './utils/version.js';
export * from './utils/checkpointUtils.js';
export * from './utils/secure-browser-launcher.js';
export * from './utils/apiConversionUtils.js';
export * from './utils/channel.js';
export * from './utils/constants.js';

// Export services
export * from './services/fileDiscoveryService.js';
export * from './services/gitService.js';
export * from './services/chatRecordingService.js';
export * from './services/fileSystemService.js';
export * from './services/sessionSummaryUtils.js';
export * from './services/contextManager.js';
export * from './skills/skillManager.js';
export * from './skills/skillLoader.js';
export * from './services/browserService.js';
export * from './services/ethicalGuardService.js';
export * from './services/agentIdentityService.js';
export * from './services/forgeService.js';
export { RealTimeActionJournal, type ActionEntry } from './services/actionJournal.js';
export * from './services/economyService.js';
export * from './services/socialService.js';
export * from './services/latentContextService.js';
export * from './services/operatorLatentSync.js';
export * from './services/visualLatentService.js';
export * from './services/agentAutonomyService.js';
export * from './cognitive-engine/engine-process.js';

// Export IDE specific logic
export * from './ide/ide-client.js';
export * from './ide/ideContext.js';
export * from './ide/ide-installer.js';
export { IDE_DEFINITIONS, type IdeInfo } from './ide/detect-ide.js';
export * from './ide/constants.js';
export * from './ide/types.js';

// Export Shell Execution Service
export * from './services/shellExecutionService.js';

// Export base tool definitions
export * from './tools/tools.js';
export * from './tools/tool-error.js';
export * from './tools/tool-registry.js';
export * from './tools/tool-names.js';
export * from './resources/resource-registry.js';

// Export prompt logic
export * from './prompts/mcp-prompts.js';

// Export agent definitions
export * from './agents/types.js';
export * from './agents/agentLoader.js';
export * from './agents/local-executor.js';

// Export specific tool logic
export * from './tools/read-file.js';
export * from './tools/ls.js';
export * from './tools/grep.js';
export * from './tools/ripGrep.js';
export * from './tools/glob.js';
export * from './tools/edit.js';
export * from './tools/write-file.js';
export * from './tools/web-fetch.js';
export * from './tools/memoryTool.js';
export * from './tools/shell.js';
export * from './tools/web-search.js';
export * from './tools/read-many-files.js';
export * from './tools/mcp-client.js';
export * from './tools/mcp-tool.js';
export * from './tools/browserTools.js';
export * from './tools/write-todos.js';

// MCP OAuth
export { MCPOAuthProvider } from './mcp/oauth-provider.js';
export type {
  OAuthToken,
  OAuthCredentials,
} from './mcp/token-storage/types.js';
export { MCPOAuthTokenStorage } from './mcp/oauth-token-storage.js';
export type { MCPOAuthConfig } from './mcp/oauth-provider.js';
export type {
  OAuthAuthorizationServerMetadata,
  OAuthProtectedResourceMetadata,
} from './mcp/oauth-utils.js';
export { OAuthUtils } from './mcp/oauth-utils.js';

// Export telemetry functions
export * from './telemetry/index.js';
export { sessionId } from './utils/session.js';
export * from './utils/browser.js';
export { Storage } from './config/storage.js';

// Export hooks system
export * from './hooks/index.js';

// Export hook types
export * from './hooks/types.js';

// Export agent types
export * from './agents/types.js';

// Export stdio utils
export * from './utils/stdio.js';
export * from './utils/terminal.js';

// Export voice infrastructure
export { AudioManager } from './voice/audioManager.js';
export { GeminiLiveClient } from './voice/geminiLiveClient.js';
export { VoiceService, type VoiceServiceStatus, type VoiceServiceEvents } from './voice/VoiceService.js';
export type { AudioConfig } from './voice/audioManager.js';
export type { GeminiLiveConfig, GeminiLiveClientEvents } from './voice/geminiLiveClient.js';
export { DeviceManager } from './voice/deviceManager.js';
export type { AudioDevice } from './voice/deviceManager.js';
export { TTSService } from './voice/ttsService.js';
export {
  ensurePocketModelReady,
  getDefaultPocketModelDir,
  resolvePocketModelDir,
  resolvePocketModelId,
  resolvePocketHfToken,
} from './voice/pocketTtsSetupService.js';

// Export continuity utilities
export * from './utils/continuityVault.js';

// Additional exports from root index.ts
export { makeFakeConfig } from './test-utils/config.js';
export * from './utils/pathReader.js';
export { ClearcutLogger } from './telemetry/clearcut-logger/clearcut-logger.js';
export { KeychainTokenStorage } from './mcp/token-storage/keychain-token-storage.js';
export { getCodeAssistServer } from './code_assist/codeAssist.js';
export { getExperiments } from './code_assist/experiments/experiments.js';
export { ExperimentFlags } from './code_assist/experiments/flagNames.js';
export { getErrorStatus, ModelNotFoundError } from './utils/httpErrors.js';
