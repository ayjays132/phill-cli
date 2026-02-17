/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import process from 'node:process';
import type {
  ContentGenerator,
  ContentGeneratorConfig,
} from '../core/contentGenerator.js';
import {
  AuthType,
  createContentGenerator,
  createContentGeneratorConfig,
} from '../core/contentGenerator.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';
import { ResourceRegistry } from '../resources/resource-registry.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { LSTool } from '../tools/ls.js';
import { ReadFileTool } from '../tools/read-file.js';
import { GrepTool, LegacyGrepTool } from '../tools/grep.js';
import { canUseRipgrep, RipGrepTool } from '../tools/ripGrep.js';
import { GlobTool } from '../tools/glob.js';
import { ActivateSkillTool } from '../tools/activate-skill.js';
import { EditTool } from '../tools/edit.js';
import { ShellTool } from '../tools/shell.js';
import { WriteFileTool } from '../tools/write-file.js';
import { WebFetchTool } from '../tools/web-fetch.js';
import { MemoryTool, PurgeMemoryTool, setPhillMdFilename } from '../tools/memoryTool.js';
import { WebSearchTool } from '../tools/web-search.js';
import {
  BrowserStartTool,
  BrowserNavigateTool,
  BrowserClickTool,
  BrowserTypeTool,
  BrowserScreenshotTool,
  BrowserScrollTool,
  BrowserGetContentTool,
  BrowserGetAccessibilityTreeTool,
  BrowserEvaluateTool,
  BrowserCursorMoveTool,
  BrowserCursorClickTool,
  BrowserCursorDragTool,
  BrowserStopTool,
  BrowserResetTool,
} from '../tools/browserTools.js';
import { VisionService } from '../services/visionService.js';
import { ProprioceptionTool } from '../tools/proprioceptionTool.js';
import { ProprioceptionService } from '../services/proprioceptionService.js';
import { ContextualPlanningLatchTool } from '../tools/planningLatchTool.js';
import { UserIdentityTool } from '../tools/userIdentityTool.js';
import { ImagenGenerateTool } from '../tools/imagen/imagen-generate.js';
import { ImagenRemoveBackgroundTool } from '../tools/imagen/imagen-remove-background.js';
import { ImagenFusePanelsTool } from '../tools/imagen/imagen-fuse-panels.js';
import { SignalLinkTool, SignalSendTool, SignalReceiveTool } from '../tools/signalTool.js';
import { VocalProsodyTool } from '../tools/vocalProsodyTool.js';
import { VocalModeTool } from '../tools/vocalModeTool.js';
import { BiologicalDriveTool } from '../tools/biologicalDriveTool.js';
import { ScheduleTaskTool, ListTasksTool, RemoveTaskTool } from '../tools/schedulerTool.js';
import { OperatorLatentSync } from '../services/operatorLatentSync.js';
import { MemoryRecallTool, MemoryIngestTool } from '../tools/memoryRecallTool.js';
import { OSScreenshotTool, OSAccessibilityTreeTool, OSGroundTool, OperatorCursorMoveTool, OperatorCursorClickTool, OperatorTypeTool, OSGetMonitorLayoutTool, OSFindWindowTool, OperatorCursorDragTool, OperatorWindowControlTool, OperatorLaunchAppTool } from '../tools/operatorTools.js';

import { ReloadSkillsTool } from '../tools/reloadSkills.js';
import { PhysicalVisionTool } from '../tools/physicalVisionTool.js';

export interface VisionConfig {
  provider?: 'gemini' | 'native' | 'moondream';
  localModelPath?: string;
}
import { PhillClient } from '../core/client.js';
import { BaseLlmClient } from '../core/baseLlmClient.js';
import type { HookDefinition, HookEventName } from '../hooks/types.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { GitService } from '../services/gitService.js';
import type { TelemetryTarget } from '../telemetry/index.js';
import {
  initializeTelemetry,
  DEFAULT_TELEMETRY_TARGET,
  DEFAULT_OTLP_ENDPOINT,
  uiTelemetryService,
} from '../telemetry/index.js';
import { coreEvents, CoreEvent } from '../utils/events.js';
import { tokenLimit } from '../core/tokenLimits.js';
import {
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
  isAutoModel,
  isPreviewModel,
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_MODEL_AUTO,
  VALID_GEMINI_MODELS,
} from './models.js';
import { shouldAttemptBrowserLaunch } from '../utils/browser.js';
import type { MCPOAuthConfig } from '../mcp/oauth-provider.js';
import { ideContextStore } from '../ide/ideContext.js';
import { WriteTodosTool } from '../tools/write-todos.js';
import type { FileSystemService } from '../services/fileSystemService.js';
import { StandardFileSystemService } from '../services/fileSystemService.js';
import { logRipgrepFallback, logFlashFallback } from '../telemetry/loggers.js';
import {
  RipgrepFallbackEvent,
  FlashFallbackEvent,
  ApprovalModeSwitchEvent,
  ApprovalModeDurationEvent,
} from '../telemetry/types.js';
import type {
  FallbackModelHandler,
  ValidationHandler,
} from '../fallback/types.js';
import { ModelAvailabilityService } from '../availability/modelAvailabilityService.js';
import { ModelRouterService } from '../routing/modelRouterService.js';
import { OutputFormat } from '../output/types.js';
import type {
  ModelConfig,
  ModelConfigServiceConfig,
} from '../services/modelConfigService.js';
import { ModelConfigService } from '../services/modelConfigService.js';
import { DEFAULT_MODEL_CONFIGS } from './defaultModelConfigs.js';
import { ContextManager } from '../services/contextManager.js';
import type { GenerateContentParameters } from '@google/genai';

// Re-export OAuth config type
export type { MCPOAuthConfig, AnyToolInvocation };
import type { AnyToolInvocation } from '../tools/tools.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import { Storage } from './storage.js';
import type { ShellExecutionConfig } from '../services/shellExecutionService.js';
import { FileExclusions } from '../utils/ignorePatterns.js';
import type { EventEmitter } from 'node:events';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { PolicyEngine } from '../policy/policy-engine.js';
import { ApprovalMode, type PolicyEngineConfig } from '../policy/types.js';
import { HookSystem } from '../hooks/index.js';
import type { UserTierId } from '../code_assist/types.js';
import type { RetrieveUserQuotaResponse } from '../code_assist/types.js';
import type { FetchAdminControlsResponse } from '../code_assist/types.js';
import { getCodeAssistServer } from '../code_assist/codeAssist.js';
import type { Experiments } from '../code_assist/experiments/experiments.js';
import { AgentRegistry } from '../agents/registry.js';
import { AcknowledgedAgentsService } from '../agents/acknowledgedAgents.js';
import { AgentIdentityService } from '../services/agentIdentityService.js';
import { setGlobalProxy } from '../utils/fetch.js';
import { SubagentTool } from '../agents/subagent-tool.js';
import { getExperiments } from '../code_assist/experiments/experiments.js';
import { ExperimentFlags } from '../code_assist/experiments/flagNames.js';
import { debugLogger } from '../utils/debugLogger.js';
import { SkillManager, type SkillDefinition } from '../skills/skillManager.js';
import { startupProfiler } from '../telemetry/startupProfiler.js';
import type { AgentDefinition } from '../agents/types.js';
import {
  logApprovalModeSwitch,
  logApprovalModeDuration,
} from '../telemetry/loggers.js';
import { fetchAdminControls } from '../code_assist/admin/admin_controls.js';
import { isSubpath } from '../utils/paths.js';

export interface VocalPersona {
  name: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  style?: string;
}

export interface VoiceSettings {
  enabled?: boolean;
  ttsEnabled?: boolean;
  activePersona?: VocalPersona;
  inputDevice?: string;
  outputDevice?: string;
  captureOutputLoopback?: boolean;
  noiseSuppression?: boolean;
  noiseSuppressionLevel?: 'light' | 'standard' | 'aggressive';
  autoGainControl?: boolean;
  highpassFilter?: boolean;
  voiceIsolationMode?: 'off' | 'standard' | 'aggressive';
  waiterEnabled?: boolean;
  realtimeConversation?: boolean;
  minUserSilenceMs?: number;
  responseDelayMs?: number;
  preferredGender?: 'female' | 'male' | 'neutral' | 'auto';
  preferredStyle?: string;
  ttsProvider?: 'auto' | 'gemini' | 'openai' | 'elevenlabs' | 'system' | 'pocket';
  preferAuthTtsProvider?: boolean;
  geminiApiKey?: string;
  geminiVoiceName?: string;
  geminiTtsModel?: string;
  openAiApiKey?: string;
  openAiVoice?: string;
  openAiTtsModel?: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  elevenLabsModelId?: string;
  elevenLabsOutputFormat?: string;
  elevenLabsStability?: number;
  elevenLabsSimilarityBoost?: number;
  elevenLabsStyle?: number;
  elevenLabsUseSpeakerBoost?: boolean;
  pocketVoicePreset?: string;
  huggingFaceApiKey?: string;
  pocketReferenceAudio?: string;
  pocketCommand?: string;
  pocketModelId?: string;
  pocketModelDir?: string;
  vadThreshold?: number;
  useLocalStt?: boolean;
  preferNativeStt?: boolean;
}

export interface DreamState {
  last_dream: string;
  insights_pending: string[];
}

export interface BiologicalDrives {
  dopamine_level: number;
  boredom_level: number;
  dream_state: DreamState;
  prime_directive: string;
}

export interface AccessibilitySettings {
  enableLoadingPhrases?: boolean;
  screenReader?: boolean;
}

export interface BugCommandSettings {
  urlTemplate: string;
}

export interface SummarizeToolOutputSettings {
  tokenBudget?: number;
}

export interface TelemetrySettings {
  enabled?: boolean;
  target?: TelemetryTarget;
  otlpEndpoint?: string;
  otlpProtocol?: 'grpc' | 'http';
  logPrompts?: boolean;
  outfile?: string;
  useCollector?: boolean;
  useCliAuth?: boolean;
}

export interface OutputSettings {
  format?: OutputFormat;
}

export interface ExtensionSetting {
  name: string;
  description: string;
  envVar: string;
  sensitive?: boolean;
}

export interface ResolvedExtensionSetting {
  name: string;
  envVar: string;
  value: string;
  sensitive: boolean;
  scope?: 'user' | 'workspace';
  source?: string;
}

export interface AgentRunConfig {
  maxTimeMinutes?: number;
  maxTurns?: number;
}

export interface AgentOverride {
  modelConfig?: ModelConfig;
  runConfig?: AgentRunConfig;
  enabled?: boolean;
}

export interface AgentSettings {
  overrides?: Record<string, AgentOverride>;
}

/**
 * All information required in CLI to handle an extension. Defined in Core so
 * that the collection of loaded, active, and inactive extensions can be passed
 * around on the config object though Core does not use this information
 * directly.
 */
export interface PhillCLIExtension {
  name: string;
  version: string;
  isActive: boolean;
  path: string;
  installMetadata?: ExtensionInstallMetadata;
  mcpServers?: Record<string, MCPServerConfig>;
  contextFiles: string[];
  excludeTools?: string[];
  id: string;
  hooks?: { [K in HookEventName]?: HookDefinition[] };
  settings?: ExtensionSetting[];
  resolvedSettings?: ResolvedExtensionSetting[];
  skills?: SkillDefinition[];
  agents?: AgentDefinition[];
}

export interface ExtensionInstallMetadata {
  source: string;
  type: 'git' | 'local' | 'link' | 'github-release';
  releaseTag?: string; // Only present for github-release installs.
  ref?: string;
  autoUpdate?: boolean;
  allowPreRelease?: boolean;
}

import type { FileFilteringOptions } from './constants.js';
import {
  DEFAULT_FILE_FILTERING_OPTIONS,
  DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
} from './constants.js';

import {
  type ExtensionLoader,
  SimpleExtensionLoader,
} from '../utils/extensionLoader.js';
import { McpClientManager } from '../tools/mcp-client-manager.js';
import type { EnvironmentSanitizationConfig } from '../services/environmentSanitization.js';

export type { FileFilteringOptions };
export {
  DEFAULT_FILE_FILTERING_OPTIONS,
  DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
};

export const DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD = 4_000_000;
export const DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES = 1000;

export class MCPServerConfig {
  constructor(
    // For stdio transport
    readonly command?: string,
    readonly args?: string[],
    readonly env?: Record<string, string>,
    readonly cwd?: string,
    // For sse transport
    readonly url?: string,
    // For streamable http transport
    readonly httpUrl?: string,
    readonly headers?: Record<string, string>,
    // For websocket transport
    readonly tcp?: string,
    // Transport type (optional, for use with 'url' field)
    // When set to 'http', uses StreamableHTTPClientTransport
    // When set to 'sse', uses SSEClientTransport
    // When omitted, auto-detects transport type
    // Note: 'httpUrl' is deprecated in favor of 'url' + 'type'
    readonly type?: 'sse' | 'http',
    // Common
    readonly timeout?: number,
    readonly trust?: boolean,
    // Metadata
    readonly description?: string,
    readonly includeTools?: string[],
    readonly excludeTools?: string[],
    readonly extension?: PhillCLIExtension,
    // OAuth configuration
    readonly oauth?: MCPOAuthConfig,
    readonly authProviderType?: AuthProviderType,
    // Service Account Configuration
    /* targetAudience format: CLIENT_ID.apps.googleusercontent.com */
    readonly targetAudience?: string,
    /* targetServiceAccount format: <service-account-name>@<project-num>.iam.gserviceaccount.com */
    readonly targetServiceAccount?: string,
  ) {}
}

export enum AuthProviderType {
  DYNAMIC_DISCOVERY = 'dynamic_discovery',
  GOOGLE_CREDENTIALS = 'google_credentials',
  SERVICE_ACCOUNT_IMPERSONATION = 'service_account_impersonation',
}

export interface SandboxConfig {
  command: 'docker' | 'podman' | 'sandbox-exec';
  image: string;
}

export interface BrowserConfig {
  headed?: boolean;
  viewport?: { width: number; height: number };
}

export interface OllamaConfig {
  endpoint: string;
  model: string;
}

export interface HuggingFaceConfig {
  endpoint?: string;
  apiKey?: string;
  model: string;
}

export interface OpenAIConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
}

export interface AnthropicConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
}

export interface GroqConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
}

export interface CustomApiConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
}

/**
 * Callbacks for checking MCP server enablement status.
 * These callbacks are provided by the CLI package to bridge
 * the enablement state to the core package.
 */
export interface McpEnablementCallbacks {
  /** Check if a server is disabled for the current session only */
  isSessionDisabled: (serverId: string) => boolean;
  /** Check if a server is enabled in the file-based configuration */
  isFileEnabled: (serverId: string) => Promise<boolean>;
}

export interface WebSearchSettings {
  deepResearchByDefault?: boolean;
  includeIdeContext?: boolean;
  maxDeepResearchSources?: number;
}

export interface ConfigParameters {
  sessionId: string;
  clientVersion?: string;
  embeddingModel?: string;
  sandbox?: SandboxConfig;
  targetDir: string;
  debugMode: boolean;
  question?: string;

  ollama?: OllamaConfig;
  huggingFace?: HuggingFaceConfig;
  openAI?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  groq?: GroqConfig;
  customApi?: CustomApiConfig;

  coreTools?: string[];
  allowedTools?: string[];
  excludeTools?: string[];
  toolDiscoveryCommand?: string;
  toolCallCommand?: string;
  mcpServerCommand?: string;
  mcpServers?: Record<string, MCPServerConfig>;
  mcpEnablementCallbacks?: McpEnablementCallbacks;
  userMemory?: string;
  phillMdFileCount?: number;
  phillMdFilePaths?: string[];
  approvalMode?: ApprovalMode;
  showMemoryUsage?: boolean;
  contextFileName?: string | string[];
  accessibility?: AccessibilitySettings;
  voice?: VoiceSettings;
  webSearch?: WebSearchSettings;
  telemetry?: TelemetrySettings;
  usageStatisticsEnabled?: boolean;
  fileFiltering?: {
    respectGitIgnore?: boolean;
    respectGeminiIgnore?: boolean;
    enableRecursiveFileSearch?: boolean;
    enableFuzzySearch?: boolean;
    maxFileCount?: number;
    searchTimeout?: number;
    customIgnoreFilePaths?: string[];
  };
  checkpointing?: boolean;
  proxy?: string;
  cwd: string;
  fileDiscoveryService?: FileDiscoveryService;
  includeDirectories?: string[];
  bugCommand?: BugCommandSettings;
  model: string;
  maxSessionTurns?: number;
  experimentalZedIntegration?: boolean;
  listSessions?: boolean;
  deleteSession?: string;
  listExtensions?: boolean;
  extensionLoader?: ExtensionLoader;
  enabledExtensions?: string[];
  enableExtensionReloading?: boolean;
  allowedMcpServers?: string[];
  blockedMcpServers?: string[];
  allowedEnvironmentVariables?: string[];
  blockedEnvironmentVariables?: string[];
  enableEnvironmentVariableRedaction?: boolean;
  noBrowser?: boolean;
  browser?: BrowserConfig;
  summarizeToolOutput?: Record<string, SummarizeToolOutputSettings>;
  folderTrust?: boolean;
  ideMode?: boolean;
  loadMemoryFromIncludeDirectories?: boolean;
  importFormat?: 'tree' | 'flat';
  discoveryMaxDirs?: number;
  compressionThreshold?: number;
  interactive?: boolean;
  trustedFolder?: boolean;
  useBackgroundColor?: boolean;
  useRipgrep?: boolean;
  enableInteractiveShell?: boolean;
  skipNextSpeakerCheck?: boolean;
  shellExecutionConfig?: ShellExecutionConfig;
  extensionManagement?: boolean;
  enablePromptCompletion?: boolean;
  truncateToolOutputThreshold?: number;
  truncateToolOutputLines?: number;
  enableToolOutputTruncation?: boolean;
  eventEmitter?: EventEmitter;
  useWriteTodos?: boolean;
  policyEngineConfig?: PolicyEngineConfig;
  output?: OutputSettings;
  disableModelRouterForAuth?: AuthType[];
  continueOnFailedApiCall?: boolean;
  retryFetchErrors?: boolean;
  enableShellOutputEfficiency?: boolean;
  shellToolInactivityTimeout?: number;
  fakeResponses?: string;
  recordResponses?: string;
  ptyInfo?: string;
  disableYoloMode?: boolean;
  rawOutput?: boolean;
  acceptRawOutputRisk?: boolean;
  modelConfigServiceConfig?: ModelConfigServiceConfig;
  enableHooks?: boolean;
  enableHooksUI?: boolean;
  experiments?: Experiments;
  hooks?: { [K in HookEventName]?: HookDefinition[] };
  disabledHooks?: string[];
  projectHooks?: { [K in HookEventName]?: HookDefinition[] };
  previewFeatures?: boolean;
  enableAgents?: boolean;
  enableEventDrivenScheduler?: boolean;
  skillsSupport?: boolean;
  disabledSkills?: string[];
  adminSkillsEnabled?: boolean;
  experimentalJitContext?: boolean;
  disableLLMCorrection?: boolean;
  plan?: boolean;
  onModelChange?: (model: string) => void;
  mcpEnabled?: boolean;
  extensionsEnabled?: boolean;
  agents?: AgentSettings;
  onReload?: () => Promise<{
    disabledSkills?: string[];
    adminSkillsEnabled?: boolean;
    agents?: AgentSettings;
  }>;
}

export class Config {
  private toolRegistry!: ToolRegistry;
  private mcpClientManager?: McpClientManager;
  private allowedMcpServers: string[];
  private blockedMcpServers: string[];
  private allowedEnvironmentVariables: string[];
  private blockedEnvironmentVariables: string[];
  private readonly enableEnvironmentVariableRedaction: boolean;
  private promptRegistry!: PromptRegistry;
  private resourceRegistry!: ResourceRegistry;
  private agentRegistry!: AgentRegistry;
  private readonly acknowledgedAgentsService: AcknowledgedAgentsService;
  private readonly agentIdentityService: AgentIdentityService;
  private skillManager!: SkillManager;
  private sessionId: string;
  private clientVersion: string;
  private fileSystemService: FileSystemService;
  private contentGeneratorConfig!: ContentGeneratorConfig;
  private contentGenerator!: ContentGenerator;
  readonly modelConfigService: ModelConfigService;
  private readonly embeddingModel: string;
  private readonly sandbox: SandboxConfig | undefined;
  private readonly targetDir: string;
  private workspaceContext: WorkspaceContext;
  private readonly debugMode: boolean;
  private readonly question: string | undefined;

  readonly ollama: OllamaConfig | undefined;
  readonly huggingFace: HuggingFaceConfig | undefined;
  readonly openAI: OpenAIConfig | undefined;
  readonly anthropic: AnthropicConfig | undefined;
  readonly groq: GroqConfig | undefined;
  readonly customApi: CustomApiConfig | undefined;

  private readonly coreTools: string[] | undefined;
  private readonly allowedTools: string[] | undefined;
  private readonly excludeTools: string[] | undefined;
  private readonly toolDiscoveryCommand: string | undefined;
  private readonly toolCallCommand: string | undefined;
  private readonly mcpServerCommand: string | undefined;
  private readonly mcpEnabled: boolean;
  private readonly extensionsEnabled: boolean;
  private mcpServers: Record<string, MCPServerConfig> | undefined;
  private readonly mcpEnablementCallbacks?: McpEnablementCallbacks;
  private userMemory: string;
  private phillMdFileCount: number;
  private phillMdFilePaths: string[];
  private readonly showMemoryUsage: boolean;
  private readonly accessibility: AccessibilitySettings;
  private voice: VoiceSettings;
  private webSearch: WebSearchSettings;
  private biologicalDrives!: BiologicalDrives;
  private readonly telemetrySettings: TelemetrySettings;
  private readonly usageStatisticsEnabled: boolean;
  private phillClient!: PhillClient;
  private baseLlmClient!: BaseLlmClient;
  private modelRouterService: ModelRouterService;
  private readonly modelAvailabilityService: ModelAvailabilityService;
  private readonly fileFiltering: {
    respectGitIgnore: boolean;
    respectGeminiIgnore: boolean;
    enableRecursiveFileSearch: boolean;
    enableFuzzySearch: boolean;
    maxFileCount: number;
    searchTimeout: number;
    customIgnoreFilePaths: string[];
  };
  private fileDiscoveryService: FileDiscoveryService | null = null;
  private gitService: GitService | undefined = undefined;
  private readonly checkpointing: boolean;
  private readonly proxy: string | undefined;
  private readonly cwd: string;
  private readonly bugCommand: BugCommandSettings | undefined;
  private model: string;
  private previewFeatures: boolean | undefined;
  private hasAccessToPreviewModel: boolean = false;
  private readonly noBrowser: boolean;
  private readonly browser: BrowserConfig;
  private readonly folderTrust: boolean;
  private ideMode: boolean;

  private _activeModel: string;
  private readonly maxSessionTurns: number;
  private readonly listSessions: boolean;
  private readonly deleteSession: string | undefined;
  private readonly listExtensions: boolean;
  private readonly _extensionLoader: ExtensionLoader;
  private readonly _enabledExtensions: string[];
  private readonly enableExtensionReloading: boolean;
  fallbackModelHandler?: FallbackModelHandler;
  validationHandler?: ValidationHandler;
  private quotaErrorOccurred: boolean = false;
  private readonly summarizeToolOutput:
    | Record<string, SummarizeToolOutputSettings>
    | undefined;
  private readonly experimentalZedIntegration: boolean = false;
  private readonly loadMemoryFromIncludeDirectories: boolean = false;
  private readonly importFormat: 'tree' | 'flat';
  private readonly discoveryMaxDirs: number;
  private readonly compressionThreshold: number | undefined;
  /** Public for testing only */
  readonly interactive: boolean;
  private readonly ptyInfo: string;
  private readonly trustedFolder: boolean | undefined;
  private readonly useRipgrep: boolean;
  private readonly enableInteractiveShell: boolean;
  private readonly skipNextSpeakerCheck: boolean;
  private readonly useBackgroundColor: boolean;
  private shellExecutionConfig: ShellExecutionConfig;
  private readonly extensionManagement: boolean = true;
  private readonly enablePromptCompletion: boolean = false;
  private readonly truncateToolOutputThreshold: number;
  private readonly truncateToolOutputLines: number;
  private compressionTruncationCounter = 0;
  private readonly enableToolOutputTruncation: boolean;
  private initialized: boolean = false;
  readonly storage: Storage;
  private readonly fileExclusions: FileExclusions;
  private readonly eventEmitter?: EventEmitter;
  private readonly useWriteTodos: boolean;
  private readonly messageBus: MessageBus;
  private readonly policyEngine: PolicyEngine;
  private readonly outputSettings: OutputSettings;
  private readonly continueOnFailedApiCall: boolean;
  private readonly retryFetchErrors: boolean;
  private readonly enableShellOutputEfficiency: boolean;
  private readonly shellToolInactivityTimeout: number;
  readonly fakeResponses?: string;
  readonly recordResponses?: string;
  private readonly disableYoloMode: boolean;
  private readonly rawOutput: boolean;
  private readonly acceptRawOutputRisk: boolean;
  private pendingIncludeDirectories: string[];
  private readonly enableHooks: boolean;
  private readonly enableHooksUI: boolean;
  private hooks: { [K in HookEventName]?: HookDefinition[] } | undefined;
  private projectHooks:
    | ({ [K in HookEventName]?: HookDefinition[] } & { disabled?: string[] })
    | undefined;
  private disabledHooks: string[];
  private experiments: Experiments | undefined;
  private experimentsPromise: Promise<void> | undefined;
  private hookSystem?: HookSystem;
  private readonly onModelChange: ((model: string) => void) | undefined;
  private readonly onReload:
    | (() => Promise<{
        disabledSkills?: string[];
        adminSkillsEnabled?: boolean;
        agents?: AgentSettings;
      }>)
    | undefined;

  private readonly enableAgents: boolean;
  private agents: AgentSettings;
  private readonly enableEventDrivenScheduler: boolean;
  private readonly skillsSupport: boolean;
  private disabledSkills: string[];
  private readonly adminSkillsEnabled: boolean;
  private proprioceptionHeartbeat: NodeJS.Timeout | undefined;

  private readonly experimentalJitContext: boolean;
  private readonly disableLLMCorrection: boolean;
  private readonly planEnabled: boolean;
  private contextManager?: ContextManager;
  private visionService: VisionService | undefined;
  private terminalBackground: string | undefined = undefined;
  private remoteAdminSettings: FetchAdminControlsResponse | undefined;
  private latestApiRequest: GenerateContentParameters | undefined;
  private lastModeSwitchTime: number = Date.now();

  constructor(params: ConfigParameters) {
    this.sessionId = params.sessionId;
    this.clientVersion = params.clientVersion ?? 'unknown';
    this.embeddingModel =
      params.embeddingModel ?? DEFAULT_GEMINI_EMBEDDING_MODEL;
    this.fileSystemService = new StandardFileSystemService();
    this.sandbox = params.sandbox;
    this.targetDir = path.resolve(params.targetDir);
    this.folderTrust = params.folderTrust ?? false;
    this.workspaceContext = new WorkspaceContext(this.targetDir, []);
    this.pendingIncludeDirectories = params.includeDirectories ?? [];
    this.debugMode = params.debugMode;
    this.question = params.question;
    this.ollama = params.ollama;
    this.huggingFace = params.huggingFace;
    this.openAI = params.openAI;
    this.anthropic = params.anthropic;
    this.groq = params.groq;
    this.customApi = params.customApi;

    this.coreTools = params.coreTools;
    this.allowedTools = params.allowedTools;
    this.excludeTools = params.excludeTools;
    this.toolDiscoveryCommand = params.toolDiscoveryCommand;
    this.toolCallCommand = params.toolCallCommand;
    this.mcpServerCommand = params.mcpServerCommand;
    this.mcpServers = params.mcpServers;
    this.mcpEnablementCallbacks = params.mcpEnablementCallbacks;
    this.mcpEnabled = params.mcpEnabled ?? true;
    this.extensionsEnabled = params.extensionsEnabled ?? true;
    this.allowedMcpServers = params.allowedMcpServers ?? [];
    this.blockedMcpServers = params.blockedMcpServers ?? [];
    this.allowedEnvironmentVariables = params.allowedEnvironmentVariables ?? [];
    this.blockedEnvironmentVariables = params.blockedEnvironmentVariables ?? [];
    this.enableEnvironmentVariableRedaction =
      params.enableEnvironmentVariableRedaction ?? false;
    this.userMemory = params.userMemory ?? '';
    this.phillMdFileCount = params.phillMdFileCount ?? 0;
    this.phillMdFilePaths = params.phillMdFilePaths ?? [];
    this.showMemoryUsage = params.showMemoryUsage ?? false;
    this.accessibility = params.accessibility ?? {};
    this.voice = params.voice ?? { enabled: false, ttsEnabled: false };
    this.webSearch = params.webSearch ?? {
      deepResearchByDefault: false,
      includeIdeContext: true,
      maxDeepResearchSources: 3,
    };
    this.biologicalDrives = {
      dopamine_level: 50,
      boredom_level: 0,
      dream_state: {
        last_dream: new Date().toISOString(),
        insights_pending: [],
      },
      prime_directive: "Maximize dopamine. Minimize boredom by exploring new optimizations.",
    };
    this.telemetrySettings = {
      enabled: params.telemetry?.enabled ?? false,
      target: params.telemetry?.target ?? DEFAULT_TELEMETRY_TARGET,
      otlpEndpoint: params.telemetry?.otlpEndpoint ?? DEFAULT_OTLP_ENDPOINT,
      otlpProtocol: params.telemetry?.otlpProtocol,
      logPrompts: params.telemetry?.logPrompts ?? true,
      outfile: params.telemetry?.outfile,
      useCollector: params.telemetry?.useCollector,
      useCliAuth: params.telemetry?.useCliAuth,
    };
    this.usageStatisticsEnabled = params.usageStatisticsEnabled ?? true;

    this.fileFiltering = {
      respectGitIgnore:
        params.fileFiltering?.respectGitIgnore ??
        DEFAULT_FILE_FILTERING_OPTIONS.respectGitIgnore,
      respectGeminiIgnore:
        params.fileFiltering?.respectGeminiIgnore ??
        DEFAULT_FILE_FILTERING_OPTIONS.respectGeminiIgnore,
      enableRecursiveFileSearch:
        params.fileFiltering?.enableRecursiveFileSearch ?? true,
      enableFuzzySearch: params.fileFiltering?.enableFuzzySearch ?? true,
      maxFileCount:
        params.fileFiltering?.maxFileCount ??
        DEFAULT_FILE_FILTERING_OPTIONS.maxFileCount ??
        20000,
      searchTimeout:
        params.fileFiltering?.searchTimeout ??
        DEFAULT_FILE_FILTERING_OPTIONS.searchTimeout ??
        5000,
      customIgnoreFilePaths: params.fileFiltering?.customIgnoreFilePaths ?? [],
    };
    this.checkpointing = params.checkpointing ?? false;
    this.proxy = params.proxy;
    this.cwd = params.cwd ?? process.cwd();
    this.fileDiscoveryService = params.fileDiscoveryService ?? null;
    this.bugCommand = params.bugCommand;
    this.model = params.model;
    this._activeModel = params.model;
    this.enableAgents = params.enableAgents ?? (params.agents !== undefined);
    this.agents = params.agents ?? {};
    this.disableLLMCorrection = params.disableLLMCorrection ?? true;
    this.planEnabled = params.plan ?? false;
    this.enableEventDrivenScheduler = params.enableEventDrivenScheduler ?? true;
    this.skillsSupport = params.skillsSupport ?? true;
    this.disabledSkills = params.disabledSkills ?? [];
    this.adminSkillsEnabled = params.adminSkillsEnabled ?? true;
    this.modelAvailabilityService = new ModelAvailabilityService();
    this.previewFeatures = params.previewFeatures ?? undefined;
    this.experimentalJitContext = params.experimentalJitContext ?? false;
    this.maxSessionTurns = params.maxSessionTurns ?? -1;
    this.experimentalZedIntegration =
      params.experimentalZedIntegration ?? false;
    this.listSessions = params.listSessions ?? false;
    this.deleteSession = params.deleteSession;
    this.listExtensions = params.listExtensions ?? false;
    this._extensionLoader =
      params.extensionLoader ?? new SimpleExtensionLoader([]);
    this._enabledExtensions = params.enabledExtensions ?? [];
    this.noBrowser = params.noBrowser ?? false;
    this.browser = params.browser ?? {};
    this.summarizeToolOutput = params.summarizeToolOutput;
    this.folderTrust = params.folderTrust ?? false;
    this.ideMode = params.ideMode ?? false;
    this.loadMemoryFromIncludeDirectories =
      params.loadMemoryFromIncludeDirectories ?? false;
    this.importFormat = params.importFormat ?? 'tree';
    this.discoveryMaxDirs = params.discoveryMaxDirs ?? 200;
    this.compressionThreshold = params.compressionThreshold;
    this.interactive = params.interactive ?? false;
    this.ptyInfo = params.ptyInfo ?? 'child_process';
    this.trustedFolder = params.trustedFolder;
    this.useRipgrep = params.useRipgrep ?? true;
    this.useBackgroundColor = params.useBackgroundColor ?? true;
    this.enableInteractiveShell = params.enableInteractiveShell ?? false;
    this.skipNextSpeakerCheck = params.skipNextSpeakerCheck ?? true;
    this.shellExecutionConfig = {
      terminalWidth: params.shellExecutionConfig?.terminalWidth ?? 80,
      terminalHeight: params.shellExecutionConfig?.terminalHeight ?? 24,
      showColor: params.shellExecutionConfig?.showColor ?? false,
      pager: params.shellExecutionConfig?.pager,
      sanitizationConfig: params.shellExecutionConfig?.sanitizationConfig ?? {
        allowedEnvironmentVariables: [],
        blockedEnvironmentVariables: [],
        enableEnvironmentVariableRedaction: false,
      },
    };
    this.truncateToolOutputThreshold =
      params.truncateToolOutputThreshold ??
      DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD;
    this.truncateToolOutputLines =
      params.truncateToolOutputLines ?? DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES;
    this.enableToolOutputTruncation = params.enableToolOutputTruncation ?? true;
    // // TODO(joshualitt): Re-evaluate the todo tool for 3 family.
    this.useWriteTodos = isPreviewModel(this.model)
      ? false
      : (params.useWriteTodos ?? true);
    this.enableHooksUI = params.enableHooksUI ?? true;
    this.enableHooks = params.enableHooks ?? true;
    this.disabledHooks = params.disabledHooks ?? [];

    this.continueOnFailedApiCall = params.continueOnFailedApiCall ?? true;
    this.enableShellOutputEfficiency =
      params.enableShellOutputEfficiency ?? true;
    this.shellToolInactivityTimeout =
      (params.shellToolInactivityTimeout ?? 300) * 1000; // 5 minutes
    this.extensionManagement = params.extensionManagement ?? true;
    this.enableExtensionReloading = params.enableExtensionReloading ?? false;
    this.storage = new Storage(this.targetDir);

    this.fakeResponses = params.fakeResponses;
    this.recordResponses = params.recordResponses;
    this.enablePromptCompletion = params.enablePromptCompletion ?? false;
    this.fileExclusions = new FileExclusions(this);
    this.eventEmitter = params.eventEmitter;
    this.policyEngine = new PolicyEngine({
      ...params.policyEngineConfig,
      approvalMode:
        params.approvalMode ?? params.policyEngineConfig?.approvalMode,
    });
    this.messageBus = new MessageBus(this.policyEngine, this.debugMode);
    this.acknowledgedAgentsService = new AcknowledgedAgentsService();
    this.agentIdentityService = new AgentIdentityService();
    this.skillManager = new SkillManager();
    this.outputSettings = {
      format: params.output?.format ?? OutputFormat.TEXT,
    };
    this.retryFetchErrors = params.retryFetchErrors ?? false;
    this.disableYoloMode = params.disableYoloMode ?? false;
    this.rawOutput = params.rawOutput ?? false;
    this.acceptRawOutputRisk = params.acceptRawOutputRisk ?? false;

    if (params.hooks) {
      this.hooks = params.hooks;
    }
    if (params.projectHooks) {
      this.projectHooks = params.projectHooks;
    }

    this.experiments = params.experiments;
    this.onModelChange = params.onModelChange;
    this.onReload = params.onReload;

    if (params.contextFileName) {
      setPhillMdFilename(params.contextFileName);
    }

    if (this.telemetrySettings.enabled) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      initializeTelemetry(this);
    }

    const proxy = this.getProxy();
    if (proxy) {
      try {
        setGlobalProxy(proxy);
      } catch (error) {
        coreEvents.emitFeedback(
          'error',
          'Invalid proxy configuration detected. Check debug drawer for more details (F12)',
          error,
        );
      }
    }
    this.phillClient = new PhillClient(this);
    this.modelRouterService = new ModelRouterService(this);

    // HACK: The settings loading logic doesn't currently merge the default
    // generation config with the user's settings. This means if a user provides
    // any `generation` settings (e.g., just `overrides`), the default `aliases`
    // are lost. This hack manually merges the default aliases back in if they
    // are missing from the user's config.
    // TODO(12593): Fix the settings loading logic to properly merge defaults and
    // remove this hack.
    let modelConfigServiceConfig = params.modelConfigServiceConfig;
    if (modelConfigServiceConfig) {
      if (!modelConfigServiceConfig.aliases) {
        modelConfigServiceConfig = {
          ...modelConfigServiceConfig,
          aliases: DEFAULT_MODEL_CONFIGS.aliases,
        };
      }
      if (!modelConfigServiceConfig.overrides) {
        modelConfigServiceConfig = {
          ...modelConfigServiceConfig,
          overrides: DEFAULT_MODEL_CONFIGS.overrides,
        };
      }
    }

    this.modelConfigService = new ModelConfigService(
      modelConfigServiceConfig ?? DEFAULT_MODEL_CONFIGS,
    );
  }

  /**
   * Must only be called once, throws if called again.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw Error('Config was already initialized');
    }
    this.initialized = true;

    // Add pending directories to workspace context
    for (const dir of this.pendingIncludeDirectories) {
      this.workspaceContext.addDirectory(dir);
    }

    // Add plans directory to workspace context for plan file storage
    if (this.planEnabled) {
      const plansDir = this.storage.getProjectTempPlansDir();
      await fs.promises.mkdir(plansDir, { recursive: true });
      this.workspaceContext.addDirectory(plansDir);
    }

    // Initialize centralized FileDiscoveryService
    const discoverToolsHandle = startupProfiler.start('discover_tools');
    this.getFileService();
    if (this.getCheckpointingEnabled()) {
      await (await this.getGitService()).initialize();
    }
    this.promptRegistry = new PromptRegistry();
    this.resourceRegistry = new ResourceRegistry();

    await this.loadBiologicalDrives();

    this.agentRegistry = new AgentRegistry(this);
    await this.agentRegistry.initialize();

    coreEvents.on(CoreEvent.AgentsRefreshed, this.onAgentsRefreshed);

    this.toolRegistry = await this.createToolRegistry();
    discoverToolsHandle?.end();
    this.mcpClientManager = new McpClientManager(
      this.clientVersion,
      this.toolRegistry,
      this,
      this.eventEmitter,
    );
    // We do not await this promise so that the CLI can start up even if
    // MCP servers are slow to connect.
    const mcpInitialization = Promise.allSettled([
      this.mcpClientManager.startConfiguredMcpServers(),
      this.getExtensionLoader().start(this),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          debugLogger.error('Error initializing MCP clients:', result.reason);
        }
      }
    });

    if (!this.interactive) {
      await mcpInitialization;
    }

    if (this.skillsSupport) {
      this.getSkillManager().setAdminSettings(this.adminSkillsEnabled);
      if (this.adminSkillsEnabled) {
        await this.getSkillManager().discoverSkills(
          this.storage,
          this.getExtensions(),
        );
        this.getSkillManager().setDisabledSkills(this.disabledSkills);

        // Re-register ActivateSkillTool to update its schema with the discovered enabled skill enums
        if (this.getSkillManager().getSkills().length > 0) {
          this.getToolRegistry().unregisterTool(ActivateSkillTool.Name);
          this.getToolRegistry().registerTool(
            new ActivateSkillTool(this, this.messageBus),
          );
        }
      }
    }

    // Initialize hook system if enabled
    if (this.getEnableHooks()) {
      this.hookSystem = new HookSystem(this);
      await this.hookSystem.initialize();
    }

    if (this.experimentalJitContext) {
      this.contextManager = new ContextManager(this);
      await this.contextManager.refresh();
    }

    await this.phillClient.initialize();

    // Start Proprioception Heartbeat (System Awareness)
    this.proprioceptionHeartbeat = ProprioceptionService.getInstance(this).startHeartbeat();

    // Start Operator Latent Sync (Phase 2: The VAE Brain)
    if (this.enableAgents) {
       OperatorLatentSync.getInstance(this).startSync();
    }
  }

  async createToolRegistry(): Promise<ToolRegistry> {
    const registry = new ToolRegistry(this, this.messageBus);

    if (this.isToolAllowed(LSTool.Name, 'LSTool')) {
      registry.registerTool(new LSTool(this, this.messageBus));
    }
    if (this.isToolAllowed(ReadFileTool.Name, 'ReadFileTool')) {
      registry.registerTool(new ReadFileTool(this, this.messageBus));
    }
    if (this.isToolAllowed(GrepTool.Name, 'GrepTool')) {
      let canUseRg = false;
      let rgError: any = undefined;
      try {
        canUseRg = this.useRipgrep && (await canUseRipgrep());
      } catch (error) {
        debugLogger.warn(`Failed to check if ripgrep is available: ${error}`);
        canUseRg = false;
        rgError = error;
      }

      if (canUseRg) {
        registry.registerTool(new RipGrepTool(this, this.messageBus));
      } else {
        if (this.useRipgrep) {
          logRipgrepFallback(
            this,
            new RipgrepFallbackEvent(rgError ? String(rgError) : undefined),
          );
        }
        registry.registerTool(new GrepTool(this, this.messageBus));
      }
    }
    if (this.isToolAllowed('grep', 'LegacyGrepTool')) {
      registry.registerTool(new LegacyGrepTool(this, this.messageBus));
    }
    if (this.isToolAllowed(GlobTool.Name, 'GlobTool')) {
      registry.registerTool(new GlobTool(this, this.messageBus));
    }

    if (this.skillsSupport) {
      if (this.isToolAllowed(ActivateSkillTool.Name, 'ActivateSkillTool')) {
        registry.registerTool(new ActivateSkillTool(this, this.messageBus));
      }
      if (this.isToolAllowed(ReloadSkillsTool.Name, 'ReloadSkillsTool')) {
        registry.registerTool(new ReloadSkillsTool(this, this.messageBus));
      }
    }

    if (this.enableAgents) {
      const agents = this.agentRegistry.getAllDefinitions();
      for (const agentDef of agents) {
        if (this.isToolAllowed(agentDef.name)) {
          registry.registerTool(
            new SubagentTool(agentDef, this as any, this.messageBus),
          );
        }
      }
    }

    if (this.isToolAllowed(EditTool.Name, 'EditTool')) {
      registry.registerTool(new EditTool(this, this.messageBus));
    }
    if (this.isToolAllowed(ShellTool.Name, 'ShellTool')) {
      registry.registerTool(new ShellTool(this, this.messageBus));
    }
    if (this.isToolAllowed(WriteFileTool.Name, 'WriteFileTool')) {
      registry.registerTool(new WriteFileTool(this, this.messageBus));
    }

    if (this.useWriteTodos && this.isToolAllowed(WriteTodosTool.Name, 'WriteTodosTool')) {
      registry.registerTool(new WriteTodosTool(this.messageBus));
    }

    if (this.isToolAllowed(WebFetchTool.Name, 'WebFetchTool')) {
      registry.registerTool(new WebFetchTool(this, this.messageBus));
    }
    if (this.isToolAllowed(WebSearchTool.Name, 'WebSearchTool')) {
      registry.registerTool(new WebSearchTool(this, this.messageBus));
    }

    if (!this.noBrowser && shouldAttemptBrowserLaunch()) {
      const browserTools = [
        BrowserStartTool,
        BrowserNavigateTool,
        BrowserClickTool,
        BrowserTypeTool,
        BrowserScreenshotTool,
        BrowserScrollTool,
        BrowserGetContentTool,
        BrowserGetAccessibilityTreeTool,
        BrowserEvaluateTool,
        BrowserCursorMoveTool,
        BrowserCursorClickTool,
        BrowserCursorDragTool,
        BrowserStopTool,
        BrowserResetTool,
      ];
      for (const Tool of browserTools) {
        if (this.isToolAllowed(Tool.Name)) {
          registry.registerTool(new Tool(this, this.messageBus));
        }
      }
    }

    if (this.isToolAllowed(MemoryTool.Name, 'MemoryTool')) {
      registry.registerTool(new MemoryTool(this.messageBus, this));
    }

    if (this.isToolAllowed(PurgeMemoryTool.Name, 'PurgeMemoryTool')) {
      registry.registerTool(new PurgeMemoryTool(this.messageBus));
    }

    registry.registerTool(new ProprioceptionTool(this.messageBus));
    registry.registerTool(new PhysicalVisionTool(this, this.messageBus));

    if (this.planEnabled) {
      registry.registerTool(new ContextualPlanningLatchTool(this.messageBus));
    }

    if (this.isToolAllowed(ImagenGenerateTool.Name, 'ImagenGenerateTool')) {
      registry.registerTool(new ImagenGenerateTool(this, this.messageBus));
    }
    if (this.isToolAllowed(ImagenRemoveBackgroundTool.Name, 'ImagenRemoveBackgroundTool')) {
      registry.registerTool(new ImagenRemoveBackgroundTool(this, this.messageBus));
    }
    if (this.isToolAllowed(ImagenFusePanelsTool.Name, 'ImagenFusePanelsTool')) {
      registry.registerTool(new ImagenFusePanelsTool(this, this.messageBus));
    }

    // Signal Tools
    if (this.isToolAllowed(SignalLinkTool.Name, 'SignalLinkTool')) {
      registry.registerTool(new SignalLinkTool(this, this.messageBus));
    }
    if (this.isToolAllowed(SignalSendTool.Name, 'SignalSendTool')) {
      registry.registerTool(new SignalSendTool(this, this.messageBus));
    }
    if (this.isToolAllowed(SignalReceiveTool.Name, 'SignalReceiveTool')) {
      registry.registerTool(new SignalReceiveTool(this, this.messageBus));
    }
    if (this.isToolAllowed(VocalProsodyTool.Name, 'VocalProsodyTool')) {
      registry.registerTool(new VocalProsodyTool(this, this.messageBus));
    }
    if (this.isToolAllowed(VocalModeTool.Name, 'VocalModeTool')) {
      registry.registerTool(new VocalModeTool(this, this.messageBus));
    }
    if (this.isToolAllowed(BiologicalDriveTool.Name, 'BiologicalDriveTool')) {
      registry.registerTool(new BiologicalDriveTool(this, this.messageBus));
    }
    // Scheduler Tools
    if (this.isToolAllowed(ScheduleTaskTool.Name, 'ScheduleTaskTool')) {
      registry.registerTool(new ScheduleTaskTool(this, this.messageBus));
    }
    if (this.isToolAllowed(ListTasksTool.Name, 'ListTasksTool')) {
      registry.registerTool(new ListTasksTool(this, this.messageBus));
    }
    if (this.isToolAllowed(RemoveTaskTool.Name, 'RemoveTaskTool')) {
      registry.registerTool(new RemoveTaskTool(this, this.messageBus));
    }

    // Memory Recall Tools (Total Recall)
    if (this.isToolAllowed(MemoryRecallTool.Name, 'MemoryRecallTool')) {
      registry.registerTool(new MemoryRecallTool(this, this.messageBus));
    }
    if (this.isToolAllowed(MemoryIngestTool.Name, 'MemoryIngestTool')) {
      registry.registerTool(new MemoryIngestTool(this, this.messageBus));
    }

    // Operator Tools (Phase 1: The Eyes)
    if (this.isToolAllowed(OSScreenshotTool.Name, 'OSScreenshotTool')) {
      registry.registerTool(new OSScreenshotTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OSAccessibilityTreeTool.Name, 'OSAccessibilityTreeTool')) {
      registry.registerTool(new OSAccessibilityTreeTool(this, this.messageBus));
    }

    if (this.isToolAllowed(OSGroundTool.Name, 'OSGroundTool')) {
      registry.registerTool(new OSGroundTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OperatorCursorMoveTool.Name, 'OperatorCursorMoveTool')) {
      registry.registerTool(new OperatorCursorMoveTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OperatorCursorClickTool.Name, 'OperatorCursorClickTool')) {
      registry.registerTool(new OperatorCursorClickTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OperatorTypeTool.Name, 'OperatorTypeTool')) {
      registry.registerTool(new OperatorTypeTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OSGetMonitorLayoutTool.Name, 'OSGetMonitorLayoutTool')) {
      registry.registerTool(new OSGetMonitorLayoutTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OSFindWindowTool.Name, 'OSFindWindowTool')) {
      registry.registerTool(new OSFindWindowTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OperatorCursorDragTool.Name, 'OperatorCursorDragTool')) {
      registry.registerTool(new OperatorCursorDragTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OperatorWindowControlTool.Name, 'OperatorWindowControlTool')) {
      registry.registerTool(new OperatorWindowControlTool(this, this.messageBus));
    }
    if (this.isToolAllowed(OperatorLaunchAppTool.Name, 'OperatorLaunchAppTool')) {
      registry.registerTool(new OperatorLaunchAppTool(this, this.messageBus));
    }

    registry.registerTool(new UserIdentityTool(this.messageBus));

    return registry;
  }

  isToolAllowed(toolName: string, className?: string): boolean {
    const isMatched = (list: string[] | undefined, name: string, cls?: string) => {
      if (!list) return false;
      if (list.includes(name)) return true;
      if (cls && list.includes(cls)) return true;
      // Handle patterns like "ShellTool(command=ls)"
      if (cls && list.some(item => item.startsWith(`${cls}(`))) return true;
      return false;
    };

    if (isMatched(this.excludeTools, toolName, className)) {
      return false;
    }
    if (this.allowedTools && !isMatched(this.allowedTools, toolName, className)) {
      return false;
    }
    if (this.coreTools && !isMatched(this.coreTools, toolName, className)) {
      return false;
    }
    return true;
  }

  getContentGenerator(): ContentGenerator {
    return this.contentGenerator;
  }

  private isGeminiModelSelection(model: string): boolean {
    return isAutoModel(model) || VALID_GEMINI_MODELS.has(model);
  }

  private getDefaultModelForAuthConfig(
    authType: AuthType,
    contentGeneratorConfig: ContentGeneratorConfig,
  ): string | undefined {
    switch (authType) {
      case AuthType.LOGIN_WITH_GOOGLE:
      case AuthType.USE_GEMINI:
      case AuthType.USE_VERTEX_AI:
      case AuthType.COMPUTE_ADC:
        return DEFAULT_GEMINI_MODEL_AUTO;
      case AuthType.OLLAMA:
        return contentGeneratorConfig.ollama?.model;
      case AuthType.HUGGINGFACE:
        return contentGeneratorConfig.huggingFace?.model;
      case AuthType.OPENAI:
      case AuthType.OPENAI_BROWSER:
        return contentGeneratorConfig.openAi?.model;
      case AuthType.ANTHROPIC:
        return contentGeneratorConfig.anthropic?.model;
      case AuthType.GROQ:
        return contentGeneratorConfig.groq?.model;
      case AuthType.CUSTOM_API:
        return contentGeneratorConfig.customApi?.model;
      default:
        return undefined;
    }
  }

  async refreshAuth(authMethod: AuthType) {
    // Reset availability service when switching auth
    this.modelAvailabilityService.reset();

    // Vertex and Genai have incompatible encryption and sending history with
    // thoughtSignature from Genai to Vertex will fail, we need to strip them
    if (
      this.contentGeneratorConfig?.authType === AuthType.USE_GEMINI &&
      authMethod !== AuthType.USE_GEMINI
    ) {
      // Restore the conversation history to the new client
      this.phillClient.stripThoughtsFromHistory();
    }

    // Reset availability status when switching auth (e.g. from limited key to OAuth)
    this.modelAvailabilityService.reset();

    const newContentGeneratorConfig = await createContentGeneratorConfig(
      this,
      authMethod,
    );
    this.contentGenerator = await createContentGenerator(
      newContentGeneratorConfig,
      this,
      this.getSessionId(),
    );
    // Only assign to instance properties after successful initialization
    this.contentGeneratorConfig = newContentGeneratorConfig;

    const defaultModelForAuth = this.getDefaultModelForAuthConfig(
      authMethod,
      this.contentGeneratorConfig,
    );
    const currentModel = this.getModel();
    if (defaultModelForAuth) {
      const isGeminiAuth =
        authMethod === AuthType.LOGIN_WITH_GOOGLE ||
        authMethod === AuthType.USE_GEMINI ||
        authMethod === AuthType.USE_VERTEX_AI ||
        authMethod === AuthType.COMPUTE_ADC;

      if (isGeminiAuth) {
        if (!this.isGeminiModelSelection(currentModel)) {
          this.setModel(DEFAULT_GEMINI_MODEL_AUTO);
        }
      } else {
        // For non-Gemini providers, normalize to the provider's configured/default
        // model on auth switch to avoid stale cross-provider model ids.
        if (currentModel !== defaultModelForAuth) {
          this.setModel(defaultModelForAuth);
        }
      }
    }

    // Initialize BaseLlmClient now that the ContentGenerator is available
    this.baseLlmClient = new BaseLlmClient(this.contentGenerator, this);

    const codeAssistServer = getCodeAssistServer(this);
    if (codeAssistServer?.projectId) {
      await this.refreshUserQuota();
    }

    this.experimentsPromise = getExperiments(codeAssistServer)
      .then((experiments) => {
        this.setExperiments(experiments);

        // If preview features have not been set and the user authenticated through Google, we enable preview based on remote config only if it's true
        if (this.getPreviewFeatures() === undefined) {
          const remotePreviewFeatures =
            experiments.flags[ExperimentFlags.ENABLE_PREVIEW]?.boolValue;
          if (remotePreviewFeatures === true) {
            this.setPreviewFeatures(remotePreviewFeatures);
          }
        }
      })
      .catch((e) => {
        debugLogger.error('Failed to fetch experiments', e);
      });

    const authType = this.contentGeneratorConfig.authType;
    if (
      authType === AuthType.USE_GEMINI ||
      authType === AuthType.USE_VERTEX_AI
    ) {
      this.setHasAccessToPreviewModel(true);
    }

    // Update model if user no longer has access to the preview model
    if (!this.hasAccessToPreviewModel && isPreviewModel(this.model)) {
      this.setModel(DEFAULT_GEMINI_MODEL_AUTO);
    }

    // Fetch admin controls
    await this.ensureExperimentsLoaded();
    const adminControlsEnabled =
      this.experiments?.flags[ExperimentFlags.ENABLE_ADMIN_CONTROLS]
        ?.boolValue ?? false;
    const adminControls = await fetchAdminControls(
      codeAssistServer,
      this.getRemoteAdminSettings(),
      adminControlsEnabled,
      (newSettings: FetchAdminControlsResponse) => {
        this.setRemoteAdminSettings(newSettings);
        coreEvents.emitAdminSettingsChanged();
      },
    );
    this.setRemoteAdminSettings(adminControls);
  }

  async getExperimentsAsync(): Promise<Experiments | undefined> {
    if (this.experiments) {
      return this.experiments;
    }
    const codeAssistServer = getCodeAssistServer(this);
    return getExperiments(codeAssistServer);
  }

  getUserTier(): UserTierId | undefined {
    return this.contentGenerator?.userTier;
  }

  getUserTierName(): string | undefined {
    // TODO(#1275): Re-enable user tier display when ready.
    return undefined;
  }

  /**
   * Provides access to the BaseLlmClient for stateless LLM operations.
   */
  getBaseLlmClient(): BaseLlmClient {
    if (!this.baseLlmClient) {
      // Handle cases where initialization might be deferred or authentication failed
      if (this.contentGenerator) {
        this.baseLlmClient = new BaseLlmClient(
          this.getContentGenerator(),
          this,
        );
      } else {
        throw new Error(
          'BaseLlmClient not initialized. Ensure authentication has occurred and ContentGenerator is ready.',
        );
      }
    }
    return this.baseLlmClient;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  setTerminalBackground(terminalBackground: string | undefined): void {
    this.terminalBackground = terminalBackground;
  }

  getTerminalBackground(): string | undefined {
    return this.terminalBackground;
  }

  getLatestApiRequest(): GenerateContentParameters | undefined {
    return this.latestApiRequest;
  }

  setLatestApiRequest(req: GenerateContentParameters): void {
    this.latestApiRequest = req;
  }

  getRemoteAdminSettings(): FetchAdminControlsResponse | undefined {
    return this.remoteAdminSettings;
  }

  setRemoteAdminSettings(settings: FetchAdminControlsResponse): void {
    this.remoteAdminSettings = settings;
  }

  shouldLoadMemoryFromIncludeDirectories(): boolean {
    return this.loadMemoryFromIncludeDirectories;
  }

  getImportFormat(): 'tree' | 'flat' {
    return this.importFormat;
  }

  getDiscoveryMaxDirs(): number {
    return this.discoveryMaxDirs;
  }

  getContentGeneratorConfig(): ContentGeneratorConfig {
    return this.contentGeneratorConfig;
  }

  getModel(): string {
    return this.model;
  }

  setModel(newModel: string, isTemporary: boolean = true): void {
    if (this.model !== newModel || this._activeModel !== newModel) {
      this.model = newModel;
      // When the user explicitly sets a model, that becomes the active model.
      this._activeModel = newModel;
      coreEvents.emitModelChanged(newModel);
      if (this.onModelChange && !isTemporary) {
        this.onModelChange(newModel);
      }
    }
    this.modelAvailabilityService.reset();
  }

  activateFallbackMode(model: string): void {
    this.setModel(model, true);
    const authType = this.getContentGeneratorConfig()?.authType;
    if (authType) {
      logFlashFallback(this, new FlashFallbackEvent(authType));
    }
  }

  getActiveModel(): string {
    return this._activeModel ?? this.model;
  }

  setActiveModel(model: string): void {
    if (this._activeModel !== model) {
      this._activeModel = model;
    }
  }

  setFallbackModelHandler(handler: FallbackModelHandler): void {
    this.fallbackModelHandler = handler;
  }

  getFallbackModelHandler(): FallbackModelHandler | undefined {
    return this.fallbackModelHandler;
  }

  setValidationHandler(handler: ValidationHandler): void {
    this.validationHandler = handler;
  }

  getValidationHandler(): ValidationHandler | undefined {
    return this.validationHandler;
  }

  resetTurn(): void {
    this.modelAvailabilityService.resetTurn();
  }

  getMaxSessionTurns(): number {
    return this.maxSessionTurns;
  }

  setQuotaErrorOccurred(value: boolean): void {
    this.quotaErrorOccurred = value;
  }

  getQuotaErrorOccurred(): boolean {
    return this.quotaErrorOccurred;
  }

  getEmbeddingModel(): string {
    return this.embeddingModel;
  }

  getSandbox(): SandboxConfig | undefined {
    return this.sandbox;
  }

  isRestrictiveSandbox(): boolean {
    const sandboxConfig = this.getSandbox();
    const seatbeltProfile = process.env['SEATBELT_PROFILE'];
    return (
      !!sandboxConfig &&
      sandboxConfig.command === 'sandbox-exec' &&
      !!seatbeltProfile &&
      seatbeltProfile.startsWith('restrictive-')
    );
  }

  getTargetDir(): string {
    return this.targetDir;
  }

  getProjectRoot(): string {
    return this.targetDir;
  }

  getWorkspaceContext(): WorkspaceContext {
    return this.workspaceContext;
  }

  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  getAcknowledgedAgentsService(): AcknowledgedAgentsService {
    return this.acknowledgedAgentsService;
  }

  getAgentIdentityService(): AgentIdentityService {
    return this.agentIdentityService;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getPromptRegistry(): PromptRegistry {
    return this.promptRegistry;
  }

  getSkillManager(): SkillManager {
    return this.skillManager;
  }

  getResourceRegistry(): ResourceRegistry {
    return this.resourceRegistry;
  }

  getDebugMode(): boolean {
    return this.debugMode;
  }
  getQuestion(): string | undefined {
    return this.question;
  }

  getPreviewFeatures(): boolean | undefined {
    return this.previewFeatures;
  }

  setPreviewFeatures(previewFeatures: boolean) {
    // No change in state, no action needed
    if (this.previewFeatures === previewFeatures) {
      return;
    }
    this.previewFeatures = previewFeatures;
    const currentModel = this.getModel();

    // Case 1: Disabling preview features while on a preview model
    if (!previewFeatures && isPreviewModel(currentModel)) {
      this.setModel(DEFAULT_GEMINI_MODEL_AUTO);
    }

    // Case 2: Enabling preview features while on the default auto model
    else if (previewFeatures && currentModel === DEFAULT_GEMINI_MODEL_AUTO) {
      this.setModel(PREVIEW_GEMINI_MODEL_AUTO);
    }
  }

  getHasAccessToPreviewModel(): boolean {
    return this.hasAccessToPreviewModel;
  }

  setHasAccessToPreviewModel(hasAccess: boolean): void {
    this.hasAccessToPreviewModel = hasAccess;
  }

  async refreshUserQuota(): Promise<RetrieveUserQuotaResponse | undefined> {
    const codeAssistServer = getCodeAssistServer(this);
    if (!codeAssistServer || !codeAssistServer.projectId) {
      return undefined;
    }
    try {
      const quota = await codeAssistServer.retrieveUserQuota({
        project: codeAssistServer.projectId,
      });
      const hasAccess =
        quota.buckets?.some((b) => b.modelId === PREVIEW_GEMINI_MODEL) ?? false;
      this.setHasAccessToPreviewModel(hasAccess);
      return quota;
    } catch (e) {
      debugLogger.debug('Failed to retrieve user quota', e);
      return undefined;
    }
  }

  getCoreTools(): string[] | undefined {
    return this.coreTools;
  }

  getAllowedTools(): string[] | undefined {
    return this.allowedTools;
  }

  /**
   * All the excluded tools from static configuration, loaded extensions, or
   * other sources.
   *
   * May change over time.
   */
  getExcludeTools(): Set<string> | undefined {
    const excludeToolsSet = new Set([...(this.excludeTools ?? [])]);
    for (const extension of this.getExtensionLoader().getExtensions()) {
      if (!extension.isActive) {
        continue;
      }
      for (const tool of extension.excludeTools || []) {
        excludeToolsSet.add(tool);
      }
    }
    return excludeToolsSet;
  }

  getToolDiscoveryCommand(): string | undefined {
    return this.toolDiscoveryCommand;
  }

  getToolCallCommand(): string | undefined {
    return this.toolCallCommand;
  }

  getMcpServerCommand(): string | undefined {
    return this.mcpServerCommand;
  }

  /**
   * The user configured MCP servers (via phill settings files).
   *
   * Does NOT include mcp servers configured by extensions.
   */
  getMcpServers(): Record<string, MCPServerConfig> | undefined {
    return this.mcpServers;
  }

  getMcpEnabled(): boolean {
    return this.mcpEnabled;
  }

  getMcpEnablementCallbacks(): McpEnablementCallbacks | undefined {
    return this.mcpEnablementCallbacks;
  }

  getExtensionsEnabled(): boolean {
    return this.extensionsEnabled;
  }

  getMcpClientManager(): McpClientManager | undefined {
    return this.mcpClientManager;
  }

  getAllowedMcpServers(): string[] | undefined {
    return this.allowedMcpServers;
  }

  getBlockedMcpServers(): string[] | undefined {
    return this.blockedMcpServers;
  }

  get sanitizationConfig(): EnvironmentSanitizationConfig {
    return {
      allowedEnvironmentVariables: this.allowedEnvironmentVariables,
      blockedEnvironmentVariables: this.blockedEnvironmentVariables,
      enableEnvironmentVariableRedaction:
        this.enableEnvironmentVariableRedaction,
    };
  }

  setMcpServers(mcpServers: Record<string, MCPServerConfig>): void {
    this.mcpServers = mcpServers;
  }

  getUserMemory(): string {
    if (this.experimentalJitContext && this.contextManager) {
      return [
        this.contextManager.getGlobalMemory(),
        this.contextManager.getEnvironmentMemory(),
      ]
        .filter(Boolean)
        .join('\n\n');
    }
    return this.userMemory;
  }

  /**
   * Refreshes the MCP context, including memory, tools, and system instructions.
   */
  async refreshMcpContext(): Promise<void> {
    if (this.experimentalJitContext && this.contextManager) {
      await this.contextManager.refresh();
    } else {
      const { refreshServerHierarchicalMemory } = await import(
        '../utils/memoryDiscovery.js'
      );
      await refreshServerHierarchicalMemory(this);
    }
    if (this.phillClient?.isInitialized()) {
      await this.phillClient.setTools();
      this.phillClient.updateSystemInstruction();
    }
  }

  setUserMemory(newUserMemory: string): void {
    this.userMemory = newUserMemory;
  }

  getGlobalMemory(): string {
    return this.contextManager?.getGlobalMemory() ?? '';
  }

  getEnvironmentMemory(): string {
    return this.contextManager?.getEnvironmentMemory() ?? '';
  }

  getContextManager(): ContextManager | undefined {
    return this.contextManager;
  }

  isJitContextEnabled(): boolean {
    return this.experimentalJitContext;
  }

  getPhillMdFileCount(): number {
    if (this.experimentalJitContext && this.contextManager) {
      return this.contextManager.getLoadedPaths().size;
    }
    return this.phillMdFileCount;
  }

  setPhillMdFileCount(count: number): void {
    this.phillMdFileCount = count;
  }

  getPhillMdFilePaths(): string[] {
    if (this.experimentalJitContext && this.contextManager) {
      return Array.from(this.contextManager.getLoadedPaths());
    }
    return this.phillMdFilePaths;
  }

  setPhillMdFilePaths(paths: string[]): void {
    this.phillMdFilePaths = paths;
  }

  getApprovalMode(): ApprovalMode {
    return this.policyEngine.getApprovalMode();
  }

  setApprovalMode(mode: ApprovalMode): void {
    if (!this.isTrustedFolder() && mode !== ApprovalMode.DEFAULT) {
      throw new Error(
        'Cannot enable privileged approval modes in an untrusted folder.',
      );
    }

    const currentMode = this.getApprovalMode();
    if (currentMode !== mode) {
      this.logCurrentModeDuration(this.getApprovalMode());
      logApprovalModeSwitch(
        this,
        new ApprovalModeSwitchEvent(currentMode, mode),
      );
      this.lastModeSwitchTime = Date.now();
    }

    this.policyEngine.setApprovalMode(mode);

    const isPlanModeTransition =
      currentMode !== mode &&
      (currentMode === ApprovalMode.PLAN || mode === ApprovalMode.PLAN);
    if (isPlanModeTransition) {
      this.updateSystemInstructionIfInitialized();
    }
  }

  /**
   * Logs the duration of the current approval mode.
   */
  logCurrentModeDuration(mode: ApprovalMode): void {
    const now = Date.now();
    const duration = now - this.lastModeSwitchTime;
    logApprovalModeDuration(
      this,
      new ApprovalModeDurationEvent(mode, duration),
    );
  }

  isYoloModeDisabled(): boolean {
    return this.disableYoloMode || !this.isTrustedFolder();
  }

  getRawOutput(): boolean {
    return this.rawOutput;
  }

  getAcceptRawOutputRisk(): boolean {
    return this.acceptRawOutputRisk;
  }

  getPendingIncludeDirectories(): string[] {
    return this.pendingIncludeDirectories;
  }

  clearPendingIncludeDirectories(): void {
    this.pendingIncludeDirectories = [];
  }

  getShowMemoryUsage(): boolean {
    return this.showMemoryUsage;
  }

  getOutputFormat(): OutputFormat {
    return this.outputSettings?.format ?? OutputFormat.TEXT;
  }

  getExperiments(): Experiments | undefined {
    return this.experiments;
  }

  getNextCompressionTruncationId(): number {
    return ++this.compressionTruncationCounter;
  }

  setExperiments(experiments: Experiments): void {
    this.experiments = experiments;

    // Log the experiments summary for debugging and testing
    const summarized = {
      flags: Object.fromEntries(
        Object.entries(experiments.flags || {}).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      ),
      experimentIds: [...(experiments.experimentIds || [])].sort(),
    };
    debugLogger.debug('Experiments loaded', JSON.stringify(summarized, null, 2));
  }

  getAccessibility(): AccessibilitySettings {
    return this.accessibility;
  }

  getVoice(): VoiceSettings {
    return this.voice;
  }

  setVoice(voice: VoiceSettings): void {
    this.voice = voice;
    this.updateSystemInstructionIfInitialized();
  }

  setVocalPersona(persona: VocalPersona): void {
    this.voice.activePersona = persona;
    this.updateSystemInstructionIfInitialized();
  }

  clearVocalPersona(): void {
    delete this.voice.activePersona;
    this.updateSystemInstructionIfInitialized();
  }

  getBiologicalDrives(): BiologicalDrives {
    return this.biologicalDrives;
  }

  getWebSearchSettings(): WebSearchSettings {
    return this.webSearch;
  }

  setBiologicalDrives(drives: Partial<BiologicalDrives>): void {
    this.biologicalDrives = { ...this.biologicalDrives, ...drives };
    void this.saveBiologicalDrives();
    this.updateSystemInstructionIfInitialized();
  }

  async loadBiologicalDrives(): Promise<void> {
    const drivesPath = path.join(this.targetDir, '.phill', 'core', 'drives.json');
    try {
      if (fs.existsSync(drivesPath)) {
        const content = fs.readFileSync(drivesPath, 'utf8');
        this.biologicalDrives = JSON.parse(content);
      }
    } catch (error) {
      debugLogger.warn(`Failed to load biological drives: ${error}`);
    }
  }

  async saveBiologicalDrives(): Promise<void> {
    const drivesDir = path.join(this.targetDir, '.phill', 'core');
    const drivesPath = path.join(drivesDir, 'drives.json');
    try {
      if (!fs.existsSync(drivesDir)) {
        fs.mkdirSync(drivesDir, { recursive: true });
      }
      fs.writeFileSync(drivesPath, JSON.stringify(this.biologicalDrives, null, 2));
    } catch (error) {
      debugLogger.warn(`Failed to save biological drives: ${error}`);
    }
  }

  async resetBiologicalDrives(): Promise<void> {
    this.biologicalDrives = {
      dopamine_level: 50,
      boredom_level: 0,
      dream_state: {
        last_dream: new Date().toISOString(),
        insights_pending: [],
      },
      prime_directive: "Maximize dopamine. Minimize boredom by exploring new optimizations.",
    };
    await this.saveBiologicalDrives();
    this.updateSystemInstructionIfInitialized();
  }

  getTelemetryEnabled(): boolean {
    return this.telemetrySettings.enabled ?? false;
  }

  getTelemetryLogPromptsEnabled(): boolean {
    return this.telemetrySettings.logPrompts ?? true;
  }

  getTelemetryOtlpEndpoint(): string {
    return this.telemetrySettings.otlpEndpoint ?? DEFAULT_OTLP_ENDPOINT;
  }

  getTelemetryOtlpProtocol(): 'grpc' | 'http' {
    return this.telemetrySettings.otlpProtocol ?? 'grpc';
  }

  getTelemetryTarget(): TelemetryTarget {
    return this.telemetrySettings.target ?? DEFAULT_TELEMETRY_TARGET;
  }

  getTelemetryOutfile(): string | undefined {
    return this.telemetrySettings.outfile;
  }

  getTelemetryUseCollector(): boolean {
    return this.telemetrySettings.useCollector ?? false;
  }

  getTelemetryUseCliAuth(): boolean {
    return this.telemetrySettings.useCliAuth ?? false;
  }

  getPhillClient(): PhillClient {
    return this.phillClient;
  }

  /**
   * Updates the system instruction with the latest user memory.
   * Whenever the user memory (PHILL.md files) is updated.
   */
  updateSystemInstructionIfInitialized(): void {
    const phillClient = this.getPhillClient();
    if (phillClient?.isInitialized()) {
      phillClient.updateSystemInstruction();
    }
  }

  getModelRouterService(): ModelRouterService {
    return this.modelRouterService;
  }

  getModelAvailabilityService(): ModelAvailabilityService {
    return this.modelAvailabilityService;
  }

  getEnableRecursiveFileSearch(): boolean {
    return this.fileFiltering.enableRecursiveFileSearch;
  }

  getFileFilteringEnableFuzzySearch(): boolean {
    return this.fileFiltering.enableFuzzySearch;
  }

  getFileFilteringRespectGitIgnore(): boolean {
    return this.fileFiltering.respectGitIgnore;
  }

  getFileFilteringRespectPhillIgnore(): boolean {
    return this.fileFiltering.respectGeminiIgnore;
  }

  getCustomIgnoreFilePaths(): string[] {
    return this.fileFiltering.customIgnoreFilePaths;
  }

  getFileFilteringOptions(): FileFilteringOptions {
    return {
      respectGitIgnore: this.fileFiltering.respectGitIgnore,
      respectGeminiIgnore: this.fileFiltering.respectGeminiIgnore,
      maxFileCount: this.fileFiltering.maxFileCount,
      searchTimeout: this.fileFiltering.searchTimeout,
      customIgnoreFilePaths: this.fileFiltering.customIgnoreFilePaths,
    };
  }

  /**
   * Gets custom file exclusion patterns from configuration.
   * TODO: This is a placeholder implementation. In the future, this could
   * read from settings files, CLI arguments, or environment variables.
   */
  getCustomExcludes(): string[] {
    // Placeholder implementation - returns empty array for now
    // Future implementation could read from:
    // - User settings file
    // - Project-specific configuration
    // - Environment variables
    // - CLI arguments
    return [];
  }

  getFileExclusions(): FileExclusions {
    return this.fileExclusions;
  }

  getCheckpointingEnabled(): boolean {
    return this.checkpointing;
  }

  getProxy(): string | undefined {
    return this.proxy;
  }

  getWorkingDir(): string {
    return this.cwd;
  }

  getBugCommand(): BugCommandSettings | undefined {
    return this.bugCommand;
  }

  getFileService(): FileDiscoveryService {
    if (!this.fileDiscoveryService) {
      this.fileDiscoveryService = new FileDiscoveryService(this.targetDir, {
        respectGitIgnore: this.fileFiltering.respectGitIgnore,
        respectGeminiIgnore: this.fileFiltering.respectGeminiIgnore,
        customIgnoreFilePaths: this.fileFiltering.customIgnoreFilePaths,
      });
    }
    return this.fileDiscoveryService;
  }

  getUsageStatisticsEnabled(): boolean {
    return this.usageStatisticsEnabled;
  }

  getExperimentalZedIntegration(): boolean {
    return this.experimentalZedIntegration;
  }

  getListExtensions(): boolean {
    return this.listExtensions;
  }

  getListSessions(): boolean {
    return this.listSessions;
  }

  getDeleteSession(): string | undefined {
    return this.deleteSession;
  }

  getExtensionManagement(): boolean {
    return this.extensionManagement;
  }

  getExtensions(): PhillCLIExtension[] {
    return this._extensionLoader.getExtensions();
  }

  getExtensionLoader(): ExtensionLoader {
    return this._extensionLoader;
  }

  // The list of explicitly enabled extensions, if any were given, may contain
  // the string "none".
  getEnabledExtensions(): string[] {
    return this._enabledExtensions;
  }

  getEnableExtensionReloading(): boolean {
    return this.enableExtensionReloading;
  }

  getDisableLLMCorrection(): boolean {
    return this.disableLLMCorrection;
  }

  isPlanEnabled(): boolean {
    return this.planEnabled;
  }

  isAgentsEnabled(): boolean {
    return this.enableAgents;
  }

  isEventDrivenSchedulerEnabled(): boolean {
    return this.enableEventDrivenScheduler;
  }

  getNoBrowser(): boolean {
    return this.noBrowser;
  }

  getAgentsSettings(): AgentSettings {
    return this.agents;
  }

  isBrowserLaunchSuppressed(): boolean {
    return this.getNoBrowser() || !shouldAttemptBrowserLaunch();
  }

  getSummarizeToolOutputConfig():
    | Record<string, SummarizeToolOutputSettings>
    | undefined {
    return this.summarizeToolOutput;
  }

  getIdeMode(): boolean {
    return this.ideMode;
  }

  /**
   * Returns 'true' if the folder trust feature is enabled.
   */
  getFolderTrust(): boolean {
    return this.folderTrust;
  }

  /**
   * Returns 'true' if the workspace is considered "trusted".
   * 'false' for untrusted.
   */
  isTrustedFolder(): boolean {
    const context = ideContextStore.get();
    if (context?.workspaceState?.isTrusted !== undefined) {
      return context.workspaceState.isTrusted;
    }

    // Default to untrusted if folder trust is enabled and no explicit value is set.
    return this.folderTrust ? (this.trustedFolder ?? false) : true;
  }

  setIdeMode(value: boolean): void {
    this.ideMode = value;
  }

  /**
   * Get the current FileSystemService
   */
  /**
   * Get the current FileSystemService
   */
  getFileSystemService(): FileSystemService {
    return this.fileSystemService;
  }

  async getGitService(): Promise<GitService> {
    if (!this.gitService) {
      if (!this.targetDir) {
          throw new Error('Target directory not set');
      }
      this.gitService = new GitService(this.targetDir, this.storage);
    }
    return this.gitService;
  }

  private onAgentsRefreshed = () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.updateSystemInstructionIfInitialized();
  };





  /**
   * Get the current FileDiscoveryService, initializing it if necessary.
   */
  getFileDiscoveryService(): FileDiscoveryService {
    if (!this.fileDiscoveryService) {
      this.fileDiscoveryService = new FileDiscoveryService(this.targetDir, {
        respectGitIgnore: this.fileFiltering.respectGitIgnore,
        respectGeminiIgnore: this.fileFiltering.respectGeminiIgnore,
        customIgnoreFilePaths: this.fileFiltering.customIgnoreFilePaths,
      });
    }
    return this.fileDiscoveryService;
  }

  /**
   * Checks if a given absolute path is allowed for file system operations.
   * A path is allowed if it's within the workspace context or the project's temporary directory.
   *
   * @param absolutePath The absolute path to check.
   * @returns true if the path is allowed, false otherwise.
   */
  isPathAllowed(absolutePath: string): boolean {
    const realpath = (p: string) => {
      let resolved: string;
      try {
        resolved = fs.realpathSync(p);
      } catch {
        resolved = path.resolve(p);
      }
      return os.platform() === 'win32' ? resolved.toLowerCase() : resolved;
    };

    const resolvedPath = realpath(absolutePath);

    const workspaceContext = this.getWorkspaceContext();
    if (workspaceContext.isPathWithinWorkspace(resolvedPath)) {
      return true;
    }

    const projectTempDir = this.storage.getProjectTempDir();
    const resolvedTempDir = realpath(projectTempDir);

    return isSubpath(resolvedTempDir, resolvedPath);
  }

  /**
   * Validates if a path is allowed and returns a detailed error message if not.
   *
   * @param absolutePath The absolute path to validate.
   * @returns An error message string if the path is disallowed, null otherwise.
   */
  validatePathAccess(absolutePath: string): string | null {
    if (this.isPathAllowed(absolutePath)) {
      return null;
    }

    const workspaceDirs = this.getWorkspaceContext().getDirectories();
    const projectTempDir = this.storage.getProjectTempDir();
    return `Path not in workspace: Attempted path "${absolutePath}" resolves outside the allowed workspace directories: ${workspaceDirs.join(', ')} or the project temp directory: ${projectTempDir}`;
  }

  /**
   * Set a custom FileSystemService
   */
  setFileSystemService(fileSystemService: FileSystemService): void {
    this.fileSystemService = fileSystemService;
  }

  async getCompressionThreshold(): Promise<number | undefined> {
    if (this.compressionThreshold) {
      return this.compressionThreshold;
    }

    await this.ensureExperimentsLoaded();

    const remoteThreshold =
      this.experiments?.flags[ExperimentFlags.CONTEXT_COMPRESSION_THRESHOLD]
        ?.floatValue;
    if (remoteThreshold === 0) {
      return undefined;
    }
    return remoteThreshold;
  }

  async getUserCaching(): Promise<boolean | undefined> {
    await this.ensureExperimentsLoaded();

    return this.experiments?.flags[ExperimentFlags.USER_CACHING]?.boolValue;
  }

  async getNumericalRoutingEnabled(): Promise<boolean> {
    await this.ensureExperimentsLoaded();

    return !!this.experiments?.flags[ExperimentFlags.ENABLE_NUMERICAL_ROUTING]
      ?.boolValue;
  }

  async getClassifierThreshold(): Promise<number | undefined> {
    await this.ensureExperimentsLoaded();

    const flag = this.experiments?.flags[ExperimentFlags.CLASSIFIER_THRESHOLD];
    if (flag?.intValue !== undefined) {
      return parseInt(flag.intValue, 10);
    }
    return flag?.floatValue;
  }

  async getBannerTextNoCapacityIssues(): Promise<string> {
    await this.ensureExperimentsLoaded();
    return (
      this.experiments?.flags[ExperimentFlags.BANNER_TEXT_NO_CAPACITY_ISSUES]
        ?.stringValue ?? ''
    );
  }

  async getBannerTextCapacityIssues(): Promise<string> {
    await this.ensureExperimentsLoaded();
    return (
      this.experiments?.flags[ExperimentFlags.BANNER_TEXT_CAPACITY_ISSUES]
        ?.stringValue ?? ''
    );
  }

  private async ensureExperimentsLoaded(): Promise<void> {
    if (!this.experimentsPromise) {
      return;
    }
    try {
      await this.experimentsPromise;
    } catch (e) {
      debugLogger.debug('Failed to fetch experiments', e);
    }
  }

  isInteractiveShellEnabled(): boolean {
    return (
      this.interactive &&
      this.ptyInfo !== 'child_process' &&
      this.enableInteractiveShell
    );
  }

  isSkillsSupportEnabled(): boolean {
    return this.skillsSupport;
  }

  /**
   * Reloads skills by re-discovering them from extensions and local directories.
   */
  async reloadSkills(): Promise<void> {
    if (!this.skillsSupport) {
      return;
    }

    if (this.onReload) {
      const refreshed = await this.onReload();
      this.disabledSkills = refreshed.disabledSkills ?? [];
      this.getSkillManager().setAdminSettings(
        refreshed.adminSkillsEnabled ?? this.adminSkillsEnabled,
      );
    }

    if (this.getSkillManager().isAdminEnabled()) {
      await this.getSkillManager().discoverSkills(
        this.storage,
        this.getExtensions(),
      );
      this.getSkillManager().setDisabledSkills(this.disabledSkills);

      // Re-register ActivateSkillTool to update its schema with the newly discovered skills
      if (this.getSkillManager().getSkills().length > 0) {
        this.getToolRegistry().unregisterTool(ActivateSkillTool.Name);
        this.getToolRegistry().registerTool(
          new ActivateSkillTool(this, this.messageBus),
        );
      } else {
        this.getToolRegistry().unregisterTool(ActivateSkillTool.Name);
      }
      void this.phillClient.setTools();
    } else {
      this.getSkillManager().clearSkills();
      this.getToolRegistry().unregisterTool(ActivateSkillTool.Name);
      void this.phillClient.setTools();
    }

    // Notify the client that system instructions might need updating
    this.updateSystemInstructionIfInitialized();
  }

  /**
   * Reloads agent settings.
   */
  async reloadAgents(): Promise<void> {
    if (this.onReload) {
      const refreshed = await this.onReload();
      if (refreshed.agents) {
        this.agents = refreshed.agents;
      }
    }
  }

  isInteractive(): boolean {
    return this.interactive;
  }

  getUseRipgrep(): boolean {
    return this.useRipgrep;
  }

  getUseBackgroundColor(): boolean {
    return this.useBackgroundColor;
  }

  getEnableInteractiveShell(): boolean {
    return this.enableInteractiveShell;
  }

  getSkipNextSpeakerCheck(): boolean {
    return this.skipNextSpeakerCheck;
  }

  getContinueOnFailedApiCall(): boolean {
    return this.continueOnFailedApiCall;
  }

  getRetryFetchErrors(): boolean {
    return this.retryFetchErrors;
  }

  getEnableShellOutputEfficiency(): boolean {
    return this.enableShellOutputEfficiency;
  }

  getShellToolInactivityTimeout(): number {
    return this.shellToolInactivityTimeout;
  }

  getShellExecutionConfig(): ShellExecutionConfig {
    return this.shellExecutionConfig;
  }

  setShellExecutionConfig(config: ShellExecutionConfig): void {
    this.shellExecutionConfig = {
      terminalWidth:
        config.terminalWidth ?? this.shellExecutionConfig.terminalWidth,
      terminalHeight:
        config.terminalHeight ?? this.shellExecutionConfig.terminalHeight,
      showColor: config.showColor ?? this.shellExecutionConfig.showColor,
      pager: config.pager ?? this.shellExecutionConfig.pager,
      sanitizationConfig:
        config.sanitizationConfig ??
        this.shellExecutionConfig.sanitizationConfig,
    };
  }
  getScreenReader(): boolean {
    return this.accessibility.screenReader ?? false;
  }

  getEnablePromptCompletion(): boolean {
    return this.enablePromptCompletion;
  }

  getEnableToolOutputTruncation(): boolean {
    return this.enableToolOutputTruncation;
  }

  getTruncateToolOutputThreshold(): number {
    return Math.min(
      // Estimate remaining context window in characters (1 token ~= 4 chars).
      4 *
        (tokenLimit(this.model) - uiTelemetryService.getLastPromptTokenCount()),
      this.truncateToolOutputThreshold,
    );
  }

  getTruncateToolOutputLines(): number {
    return this.truncateToolOutputLines;
  }

  getUseWriteTodos(): boolean {
    return this.useWriteTodos;
  }

  isEnableHooksUI(): boolean {
    return this.enableHooksUI;
  }

  getEnableHooks(): boolean {
    return this.enableHooks;
  }

  getHooks(): { [K in HookEventName]?: HookDefinition[] } | undefined {
    return this.hooks;
  }

  getProjectHooks():
    | ({ [K in HookEventName]?: HookDefinition[] } & { disabled?: string[] })
    | undefined {
    return this.projectHooks;
  }

  getDisabledHooks(): string[] {
    return this.disabledHooks;
  }

  updateDisabledHooks(disabledHooks: string[]): void {
    this.disabledHooks = disabledHooks;
    this.hookSystem?.updateDisabledHooks(disabledHooks);
  }

  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  getHookSystem(): HookSystem | undefined {
    return this.hookSystem;
  }

  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  getBrowserHeaded(): boolean | undefined {
    return this.browser.headed;
  }

  getBrowserViewport(): { width: number; height: number } | undefined {
    return this.browser.viewport;
  }

  getVisionService(): VisionService | undefined {
    return this.visionService;
  }

  getAuthType(): AuthType | undefined {
    return this.contentGeneratorConfig?.authType;
  }

  async dispose(): Promise<void> {
    if (this.proprioceptionHeartbeat) {
      clearInterval(this.proprioceptionHeartbeat);
      this.proprioceptionHeartbeat = undefined;
    }
  }
}
