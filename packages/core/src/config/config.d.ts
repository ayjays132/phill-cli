/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContentGenerator, ContentGeneratorConfig } from '../core/contentGenerator.js';
import { AuthType } from '../core/contentGenerator.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';
import { ResourceRegistry } from '../resources/resource-registry.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { VisionService } from '../services/visionService.js';
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
import type { MCPOAuthConfig } from '../mcp/oauth-provider.js';
import type { FileSystemService } from '../services/fileSystemService.js';
import type { FallbackModelHandler, ValidationHandler } from '../fallback/types.js';
import { ModelAvailabilityService } from '../availability/modelAvailabilityService.js';
import { ModelRouterService } from '../routing/modelRouterService.js';
import { OutputFormat } from '../output/types.js';
import type { ModelConfig, ModelConfigServiceConfig } from '../services/modelConfigService.js';
import { ModelConfigService } from '../services/modelConfigService.js';
import { ContextManager } from '../services/contextManager.js';
import type { GenerateContentParameters } from '@google/genai';
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
import type { Experiments } from '../code_assist/experiments/experiments.js';
import { AgentRegistry } from '../agents/registry.js';
import { AcknowledgedAgentsService } from '../agents/acknowledgedAgents.js';
import { SkillManager, type SkillDefinition } from '../skills/skillManager.js';
import type { AgentDefinition } from '../agents/types.js';
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
    hooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
    settings?: ExtensionSetting[];
    resolvedSettings?: ResolvedExtensionSetting[];
    skills?: SkillDefinition[];
    agents?: AgentDefinition[];
}
export interface ExtensionInstallMetadata {
    source: string;
    type: 'git' | 'local' | 'link' | 'github-release';
    releaseTag?: string;
    ref?: string;
    autoUpdate?: boolean;
    allowPreRelease?: boolean;
}
import type { FileFilteringOptions } from './constants.js';
import { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS } from './constants.js';
import { type ExtensionLoader } from '../utils/extensionLoader.js';
import { McpClientManager } from '../tools/mcp-client-manager.js';
import type { EnvironmentSanitizationConfig } from '../services/environmentSanitization.js';
export type { FileFilteringOptions };
export { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS, };
export declare const DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD = 4000000;
export declare const DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES = 1000;
export declare class MCPServerConfig {
    readonly command?: string | undefined;
    readonly args?: string[] | undefined;
    readonly env?: Record<string, string> | undefined;
    readonly cwd?: string | undefined;
    readonly url?: string | undefined;
    readonly httpUrl?: string | undefined;
    readonly headers?: Record<string, string> | undefined;
    readonly tcp?: string | undefined;
    readonly type?: "sse" | "http" | undefined;
    readonly timeout?: number | undefined;
    readonly trust?: boolean | undefined;
    readonly description?: string | undefined;
    readonly includeTools?: string[] | undefined;
    readonly excludeTools?: string[] | undefined;
    readonly extension?: PhillCLIExtension | undefined;
    readonly oauth?: MCPOAuthConfig | undefined;
    readonly authProviderType?: AuthProviderType | undefined;
    readonly targetAudience?: string | undefined;
    readonly targetServiceAccount?: string | undefined;
    constructor(command?: string | undefined, args?: string[] | undefined, env?: Record<string, string> | undefined, cwd?: string | undefined, url?: string | undefined, httpUrl?: string | undefined, headers?: Record<string, string> | undefined, tcp?: string | undefined, type?: "sse" | "http" | undefined, timeout?: number | undefined, trust?: boolean | undefined, description?: string | undefined, includeTools?: string[] | undefined, excludeTools?: string[] | undefined, extension?: PhillCLIExtension | undefined, oauth?: MCPOAuthConfig | undefined, authProviderType?: AuthProviderType | undefined, targetAudience?: string | undefined, targetServiceAccount?: string | undefined);
}
export declare enum AuthProviderType {
    DYNAMIC_DISCOVERY = "dynamic_discovery",
    GOOGLE_CREDENTIALS = "google_credentials",
    SERVICE_ACCOUNT_IMPERSONATION = "service_account_impersonation"
}
export interface SandboxConfig {
    command: 'docker' | 'podman' | 'sandbox-exec';
    image: string;
}
export interface BrowserConfig {
    headed?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
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
    hooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
    disabledHooks?: string[];
    projectHooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
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
export declare class Config {
    private toolRegistry;
    private mcpClientManager?;
    private allowedMcpServers;
    private blockedMcpServers;
    private allowedEnvironmentVariables;
    private blockedEnvironmentVariables;
    private readonly enableEnvironmentVariableRedaction;
    private promptRegistry;
    private resourceRegistry;
    private agentRegistry;
    private readonly acknowledgedAgentsService;
    private skillManager;
    private sessionId;
    private clientVersion;
    private fileSystemService;
    private contentGeneratorConfig;
    private contentGenerator;
    readonly modelConfigService: ModelConfigService;
    private readonly embeddingModel;
    private readonly sandbox;
    private readonly targetDir;
    private workspaceContext;
    private readonly debugMode;
    private readonly question;
    readonly ollama: OllamaConfig | undefined;
    readonly huggingFace: HuggingFaceConfig | undefined;
    readonly openAI: OpenAIConfig | undefined;
    readonly anthropic: AnthropicConfig | undefined;
    readonly groq: GroqConfig | undefined;
    readonly customApi: CustomApiConfig | undefined;
    private readonly coreTools;
    private readonly allowedTools;
    private readonly excludeTools;
    private readonly toolDiscoveryCommand;
    private readonly toolCallCommand;
    private readonly mcpServerCommand;
    private readonly mcpEnabled;
    private readonly extensionsEnabled;
    private mcpServers;
    private readonly mcpEnablementCallbacks?;
    private userMemory;
    private phillMdFileCount;
    private phillMdFilePaths;
    private readonly showMemoryUsage;
    private readonly accessibility;
    private voice;
    private webSearch;
    private biologicalDrives;
    private readonly telemetrySettings;
    private readonly usageStatisticsEnabled;
    private phillClient;
    private baseLlmClient;
    private modelRouterService;
    private readonly modelAvailabilityService;
    private readonly fileFiltering;
    private fileDiscoveryService;
    private gitService;
    private readonly checkpointing;
    private readonly proxy;
    private readonly cwd;
    private readonly bugCommand;
    private model;
    private previewFeatures;
    private hasAccessToPreviewModel;
    private readonly noBrowser;
    private readonly browser;
    private readonly folderTrust;
    private ideMode;
    private _activeModel;
    private readonly maxSessionTurns;
    private readonly listSessions;
    private readonly deleteSession;
    private readonly listExtensions;
    private readonly _extensionLoader;
    private readonly _enabledExtensions;
    private readonly enableExtensionReloading;
    fallbackModelHandler?: FallbackModelHandler;
    validationHandler?: ValidationHandler;
    private quotaErrorOccurred;
    private readonly summarizeToolOutput;
    private readonly experimentalZedIntegration;
    private readonly loadMemoryFromIncludeDirectories;
    private readonly importFormat;
    private readonly discoveryMaxDirs;
    private readonly compressionThreshold;
    /** Public for testing only */
    readonly interactive: boolean;
    private readonly ptyInfo;
    private readonly trustedFolder;
    private readonly useRipgrep;
    private readonly enableInteractiveShell;
    private readonly skipNextSpeakerCheck;
    private readonly useBackgroundColor;
    private shellExecutionConfig;
    private readonly extensionManagement;
    private readonly enablePromptCompletion;
    private readonly truncateToolOutputThreshold;
    private readonly truncateToolOutputLines;
    private compressionTruncationCounter;
    private readonly enableToolOutputTruncation;
    private initialized;
    readonly storage: Storage;
    private readonly fileExclusions;
    private readonly eventEmitter?;
    private readonly useWriteTodos;
    private readonly messageBus;
    private readonly policyEngine;
    private readonly outputSettings;
    private readonly continueOnFailedApiCall;
    private readonly retryFetchErrors;
    private readonly enableShellOutputEfficiency;
    private readonly shellToolInactivityTimeout;
    readonly fakeResponses?: string;
    readonly recordResponses?: string;
    private readonly disableYoloMode;
    private readonly rawOutput;
    private readonly acceptRawOutputRisk;
    private pendingIncludeDirectories;
    private readonly enableHooks;
    private readonly enableHooksUI;
    private hooks;
    private projectHooks;
    private disabledHooks;
    private experiments;
    private experimentsPromise;
    private hookSystem?;
    private readonly onModelChange;
    private readonly onReload;
    private readonly enableAgents;
    private agents;
    private readonly enableEventDrivenScheduler;
    private readonly skillsSupport;
    private disabledSkills;
    private readonly adminSkillsEnabled;
    private proprioceptionHeartbeat;
    private readonly experimentalJitContext;
    private readonly disableLLMCorrection;
    private readonly planEnabled;
    private contextManager?;
    private visionService;
    private terminalBackground;
    private remoteAdminSettings;
    private latestApiRequest;
    private lastModeSwitchTime;
    constructor(params: ConfigParameters);
    /**
     * Must only be called once, throws if called again.
     */
    initialize(): Promise<void>;
    createToolRegistry(): Promise<ToolRegistry>;
    isToolAllowed(toolName: string, className?: string): boolean;
    getContentGenerator(): ContentGenerator;
    private isGeminiModelSelection;
    private getDefaultModelForAuthConfig;
    refreshAuth(authMethod: AuthType): Promise<void>;
    getExperimentsAsync(): Promise<Experiments | undefined>;
    getUserTier(): UserTierId | undefined;
    getUserTierName(): string | undefined;
    /**
     * Provides access to the BaseLlmClient for stateless LLM operations.
     */
    getBaseLlmClient(): BaseLlmClient;
    getSessionId(): string;
    setSessionId(sessionId: string): void;
    setTerminalBackground(terminalBackground: string | undefined): void;
    getTerminalBackground(): string | undefined;
    getLatestApiRequest(): GenerateContentParameters | undefined;
    setLatestApiRequest(req: GenerateContentParameters): void;
    getRemoteAdminSettings(): FetchAdminControlsResponse | undefined;
    setRemoteAdminSettings(settings: FetchAdminControlsResponse): void;
    shouldLoadMemoryFromIncludeDirectories(): boolean;
    getImportFormat(): 'tree' | 'flat';
    getDiscoveryMaxDirs(): number;
    getContentGeneratorConfig(): ContentGeneratorConfig;
    getModel(): string;
    setModel(newModel: string, isTemporary?: boolean): void;
    activateFallbackMode(model: string): void;
    getActiveModel(): string;
    setActiveModel(model: string): void;
    setFallbackModelHandler(handler: FallbackModelHandler): void;
    getFallbackModelHandler(): FallbackModelHandler | undefined;
    setValidationHandler(handler: ValidationHandler): void;
    getValidationHandler(): ValidationHandler | undefined;
    resetTurn(): void;
    getMaxSessionTurns(): number;
    setQuotaErrorOccurred(value: boolean): void;
    getQuotaErrorOccurred(): boolean;
    getEmbeddingModel(): string;
    getSandbox(): SandboxConfig | undefined;
    isRestrictiveSandbox(): boolean;
    getTargetDir(): string;
    getProjectRoot(): string;
    getWorkspaceContext(): WorkspaceContext;
    getAgentRegistry(): AgentRegistry;
    getAcknowledgedAgentsService(): AcknowledgedAgentsService;
    getToolRegistry(): ToolRegistry;
    getPromptRegistry(): PromptRegistry;
    getSkillManager(): SkillManager;
    getResourceRegistry(): ResourceRegistry;
    getDebugMode(): boolean;
    getQuestion(): string | undefined;
    getPreviewFeatures(): boolean | undefined;
    setPreviewFeatures(previewFeatures: boolean): void;
    getHasAccessToPreviewModel(): boolean;
    setHasAccessToPreviewModel(hasAccess: boolean): void;
    refreshUserQuota(): Promise<RetrieveUserQuotaResponse | undefined>;
    getCoreTools(): string[] | undefined;
    getAllowedTools(): string[] | undefined;
    /**
     * All the excluded tools from static configuration, loaded extensions, or
     * other sources.
     *
     * May change over time.
     */
    getExcludeTools(): Set<string> | undefined;
    getToolDiscoveryCommand(): string | undefined;
    getToolCallCommand(): string | undefined;
    getMcpServerCommand(): string | undefined;
    /**
     * The user configured MCP servers (via phill settings files).
     *
     * Does NOT include mcp servers configured by extensions.
     */
    getMcpServers(): Record<string, MCPServerConfig> | undefined;
    getMcpEnabled(): boolean;
    getMcpEnablementCallbacks(): McpEnablementCallbacks | undefined;
    getExtensionsEnabled(): boolean;
    getMcpClientManager(): McpClientManager | undefined;
    getAllowedMcpServers(): string[] | undefined;
    getBlockedMcpServers(): string[] | undefined;
    get sanitizationConfig(): EnvironmentSanitizationConfig;
    setMcpServers(mcpServers: Record<string, MCPServerConfig>): void;
    getUserMemory(): string;
    /**
     * Refreshes the MCP context, including memory, tools, and system instructions.
     */
    refreshMcpContext(): Promise<void>;
    setUserMemory(newUserMemory: string): void;
    getGlobalMemory(): string;
    getEnvironmentMemory(): string;
    getContextManager(): ContextManager | undefined;
    isJitContextEnabled(): boolean;
    getPhillMdFileCount(): number;
    setPhillMdFileCount(count: number): void;
    getPhillMdFilePaths(): string[];
    setPhillMdFilePaths(paths: string[]): void;
    getApprovalMode(): ApprovalMode;
    setApprovalMode(mode: ApprovalMode): void;
    /**
     * Logs the duration of the current approval mode.
     */
    logCurrentModeDuration(mode: ApprovalMode): void;
    isYoloModeDisabled(): boolean;
    getRawOutput(): boolean;
    getAcceptRawOutputRisk(): boolean;
    getPendingIncludeDirectories(): string[];
    clearPendingIncludeDirectories(): void;
    getShowMemoryUsage(): boolean;
    getOutputFormat(): OutputFormat;
    getExperiments(): Experiments | undefined;
    getNextCompressionTruncationId(): number;
    setExperiments(experiments: Experiments): void;
    getAccessibility(): AccessibilitySettings;
    getVoice(): VoiceSettings;
    setVoice(voice: VoiceSettings): void;
    setVocalPersona(persona: VocalPersona): void;
    clearVocalPersona(): void;
    getBiologicalDrives(): BiologicalDrives;
    getWebSearchSettings(): WebSearchSettings;
    setBiologicalDrives(drives: Partial<BiologicalDrives>): void;
    loadBiologicalDrives(): Promise<void>;
    saveBiologicalDrives(): Promise<void>;
    resetBiologicalDrives(): Promise<void>;
    getTelemetryEnabled(): boolean;
    getTelemetryLogPromptsEnabled(): boolean;
    getTelemetryOtlpEndpoint(): string;
    getTelemetryOtlpProtocol(): 'grpc' | 'http';
    getTelemetryTarget(): TelemetryTarget;
    getTelemetryOutfile(): string | undefined;
    getTelemetryUseCollector(): boolean;
    getTelemetryUseCliAuth(): boolean;
    getPhillClient(): PhillClient;
    /**
     * Updates the system instruction with the latest user memory.
     * Whenever the user memory (PHILL.md files) is updated.
     */
    updateSystemInstructionIfInitialized(): void;
    getModelRouterService(): ModelRouterService;
    getModelAvailabilityService(): ModelAvailabilityService;
    getEnableRecursiveFileSearch(): boolean;
    getFileFilteringEnableFuzzySearch(): boolean;
    getFileFilteringRespectGitIgnore(): boolean;
    getFileFilteringRespectPhillIgnore(): boolean;
    getCustomIgnoreFilePaths(): string[];
    getFileFilteringOptions(): FileFilteringOptions;
    /**
     * Gets custom file exclusion patterns from configuration.
     * TODO: This is a placeholder implementation. In the future, this could
     * read from settings files, CLI arguments, or environment variables.
     */
    getCustomExcludes(): string[];
    getFileExclusions(): FileExclusions;
    getCheckpointingEnabled(): boolean;
    getProxy(): string | undefined;
    getWorkingDir(): string;
    getBugCommand(): BugCommandSettings | undefined;
    getFileService(): FileDiscoveryService;
    getUsageStatisticsEnabled(): boolean;
    getExperimentalZedIntegration(): boolean;
    getListExtensions(): boolean;
    getListSessions(): boolean;
    getDeleteSession(): string | undefined;
    getExtensionManagement(): boolean;
    getExtensions(): PhillCLIExtension[];
    getExtensionLoader(): ExtensionLoader;
    getEnabledExtensions(): string[];
    getEnableExtensionReloading(): boolean;
    getDisableLLMCorrection(): boolean;
    isPlanEnabled(): boolean;
    isAgentsEnabled(): boolean;
    isEventDrivenSchedulerEnabled(): boolean;
    getNoBrowser(): boolean;
    getAgentsSettings(): AgentSettings;
    isBrowserLaunchSuppressed(): boolean;
    getSummarizeToolOutputConfig(): Record<string, SummarizeToolOutputSettings> | undefined;
    getIdeMode(): boolean;
    /**
     * Returns 'true' if the folder trust feature is enabled.
     */
    getFolderTrust(): boolean;
    /**
     * Returns 'true' if the workspace is considered "trusted".
     * 'false' for untrusted.
     */
    isTrustedFolder(): boolean;
    setIdeMode(value: boolean): void;
    /**
     * Get the current FileSystemService
     */
    /**
     * Get the current FileSystemService
     */
    getFileSystemService(): FileSystemService;
    getGitService(): Promise<GitService>;
    private onAgentsRefreshed;
    /**
     * Get the current FileDiscoveryService, initializing it if necessary.
     */
    getFileDiscoveryService(): FileDiscoveryService;
    /**
     * Checks if a given absolute path is allowed for file system operations.
     * A path is allowed if it's within the workspace context or the project's temporary directory.
     *
     * @param absolutePath The absolute path to check.
     * @returns true if the path is allowed, false otherwise.
     */
    isPathAllowed(absolutePath: string): boolean;
    /**
     * Validates if a path is allowed and returns a detailed error message if not.
     *
     * @param absolutePath The absolute path to validate.
     * @returns An error message string if the path is disallowed, null otherwise.
     */
    validatePathAccess(absolutePath: string): string | null;
    /**
     * Set a custom FileSystemService
     */
    setFileSystemService(fileSystemService: FileSystemService): void;
    getCompressionThreshold(): Promise<number | undefined>;
    getUserCaching(): Promise<boolean | undefined>;
    getNumericalRoutingEnabled(): Promise<boolean>;
    getClassifierThreshold(): Promise<number | undefined>;
    getBannerTextNoCapacityIssues(): Promise<string>;
    getBannerTextCapacityIssues(): Promise<string>;
    private ensureExperimentsLoaded;
    isInteractiveShellEnabled(): boolean;
    isSkillsSupportEnabled(): boolean;
    /**
     * Reloads skills by re-discovering them from extensions and local directories.
     */
    reloadSkills(): Promise<void>;
    /**
     * Reloads agent settings.
     */
    reloadAgents(): Promise<void>;
    isInteractive(): boolean;
    getUseRipgrep(): boolean;
    getUseBackgroundColor(): boolean;
    getEnableInteractiveShell(): boolean;
    getSkipNextSpeakerCheck(): boolean;
    getContinueOnFailedApiCall(): boolean;
    getRetryFetchErrors(): boolean;
    getEnableShellOutputEfficiency(): boolean;
    getShellToolInactivityTimeout(): number;
    getShellExecutionConfig(): ShellExecutionConfig;
    setShellExecutionConfig(config: ShellExecutionConfig): void;
    getScreenReader(): boolean;
    getEnablePromptCompletion(): boolean;
    getEnableToolOutputTruncation(): boolean;
    getTruncateToolOutputThreshold(): number;
    getTruncateToolOutputLines(): number;
    getUseWriteTodos(): boolean;
    isEnableHooksUI(): boolean;
    getEnableHooks(): boolean;
    getHooks(): {
        [K in HookEventName]?: HookDefinition[];
    } | undefined;
    getProjectHooks(): ({
        [K in HookEventName]?: HookDefinition[];
    } & {
        disabled?: string[];
    }) | undefined;
    getDisabledHooks(): string[];
    updateDisabledHooks(disabledHooks: string[]): void;
    getMessageBus(): MessageBus;
    getHookSystem(): HookSystem | undefined;
    getPolicyEngine(): PolicyEngine;
    getBrowserHeaded(): boolean | undefined;
    getBrowserViewport(): {
        width: number;
        height: number;
    } | undefined;
    getVisionService(): VisionService | undefined;
    getAuthType(): AuthType | undefined;
    dispose(): Promise<void>;
}
