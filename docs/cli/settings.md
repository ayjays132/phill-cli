# Phill CLI settings (`/settings` command)

Control your Phill CLI experience with the `/settings` command. The `/settings`
command opens a dialog to view and edit all your Phill CLI settings, including
your UI experience, keybindings, and accessibility features.

Your Phill CLI settings are stored in a `settings.json` file. In addition to
using the `/settings` command, you can also edit them in one of the following
locations:

- **User settings**: `~/.phill/settings.json`
- **Workspace settings**: `your-project/.phill/settings.json`

Note: Workspace settings override user settings.

## Settings reference

Here is a list of all the available settings, grouped by category and ordered as
they appear in the UI.

<!-- SETTINGS-AUTOGEN:START -->

### General

| UI Label                        | Setting                             | Description                                                                             | Default      |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------- | ------------ |
| Preview Features (e.g., models) | `general.previewFeatures`           | Enable preview features (e.g., preview models).                                         | `false`      |
| Vim Mode                        | `general.vimMode`                   | Enable Vim keybindings                                                                  | `false`      |
| Enable Auto Update              | `general.enableAutoUpdate`          | Enable automatic updates.                                                               | `true`       |
| Enable Prompt Completion        | `general.enablePromptCompletion`    | Enable AI-powered prompt completion suggestions while typing.                           | `false`      |
| Auto Retry On Rate Limit        | `general.retryOnRateLimit`          | Automatically retry rate-limited requests every 2 minutes while quota dialog is active. | `true`       |
| Debug Keystroke Logging         | `general.debugKeystrokeLogging`     | Enable debug logging of keystrokes to the console.                                      | `false`      |
| Enable Session Cleanup          | `general.sessionRetention.enabled`  | Enable automatic session cleanup                                                        | `false`      |
| Enable Heartbeat                | `general.heartbeat.enabled`         | Enable periodic background continuation prompts while idle.                             | `false`      |
| Heartbeat Interval Seconds      | `general.heartbeat.intervalSeconds` | Interval in seconds between heartbeat continuation prompts (minimum 10).                | `300`        |
| Heartbeat Prompt                | `general.heartbeat.prompt`          | Prompt text sent by heartbeat when it fires (for example: "continue").                  | `"continue"` |

### Output

| UI Label      | Setting         | Description                                            | Default  |
| ------------- | --------------- | ------------------------------------------------------ | -------- |
| Output Format | `output.format` | The format of the CLI output. Can be `text` or `json`. | `"text"` |

### UI

| UI Label                       | Setting                                   | Description                                                                                                                                                       | Default                           |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Hide Window Title              | `ui.hideWindowTitle`                      | Hide the window title bar                                                                                                                                         | `false`                           |
| Show Thoughts in Title         | `ui.showStatusInTitle`                    | Show Phill CLI model thoughts in the terminal window title during the working phase                                                                               | `false`                           |
| Dynamic Window Title           | `ui.dynamicWindowTitle`                   | Update the terminal window title with current status icons (Ready: ◇, Action Required: ✋, Working: ✦)                                                            | `true`                            |
| Show Home Directory Warning    | `ui.showHomeDirectoryWarning`             | Show a warning when running Phill CLI in the home directory.                                                                                                      | `true`                            |
| Hide Tips                      | `ui.hideTips`                             | Hide helpful tips in the UI                                                                                                                                       | `false`                           |
| Hide Banner                    | `ui.hideBanner`                           | Hide the application banner                                                                                                                                       | `false`                           |
| Hide Context Summary           | `ui.hideContextSummary`                   | Hide the context summary (PHILL.md, MCP servers) above the input.                                                                                                 | `false`                           |
| Hide CWD                       | `ui.footer.hideCWD`                       | Hide the current working directory path in the footer.                                                                                                            | `false`                           |
| Hide Sandbox Status            | `ui.footer.hideSandboxStatus`             | Hide the sandbox status indicator in the footer.                                                                                                                  | `false`                           |
| Hide Model Info                | `ui.footer.hideModelInfo`                 | Hide the model name and context usage in the footer.                                                                                                              | `false`                           |
| Hide Context Window Percentage | `ui.footer.hideContextPercentage`         | Hides the context window remaining percentage.                                                                                                                    | `true`                            |
| Hide Footer                    | `ui.hideFooter`                           | Hide the footer from the UI                                                                                                                                       | `false`                           |
| Show Memory Usage              | `ui.showMemoryUsage`                      | Display memory usage information in the UI                                                                                                                        | `false`                           |
| Show Line Numbers              | `ui.showLineNumbers`                      | Show line numbers in the chat.                                                                                                                                    | `true`                            |
| Show Citations                 | `ui.showCitations`                        | Show citations for generated text in the chat.                                                                                                                    | `false`                           |
| Show Model Info In Chat        | `ui.showModelInfoInChat`                  | Show the model name in the chat for each model turn.                                                                                                              | `false`                           |
| Enable Cognitive Engine        | `ui.cognitiveEngine.enabled`              | Enable the background meta-cognition engine and UI overlay.                                                                                                       | `true`                            |
| Idle Threshold (seconds)       | `ui.cognitiveEngine.idleThresholdSeconds` | Time in seconds before the engine enters "Dreaming" mode.                                                                                                         | `15`                              |
| Use Alternate Screen Buffer    | `ui.useAlternateBuffer`                   | Use an alternate screen buffer for the UI, preserving shell history.                                                                                              | `false`                           |
| Use Background Color           | `ui.useBackgroundColor`                   | Whether to use background colors in the UI.                                                                                                                       | `true`                            |
| Incremental Rendering          | `ui.incrementalRendering`                 | Enable incremental rendering for the UI. This option will reduce flickering but may cause rendering artifacts. Only supported when useAlternateBuffer is enabled. | `true`                            |
| Show Spinner                   | `ui.showSpinner`                          | Show the spinner during operations.                                                                                                                               | `true`                            |
| Enable Loading Phrases         | `ui.accessibility.enableLoadingPhrases`   | Enable loading phrases during operations.                                                                                                                         | `true`                            |
| Screen Reader Mode             | `ui.accessibility.screenReader`           | Render output in plain-text to be more screen reader accessible                                                                                                   | `false`                           |
| Enable Voice                   | `ui.voice.enabled`                        | Whether voice input mode is enabled by default.                                                                                                                   | `false`                           |
| Enable TTS                     | `ui.voice.ttsEnabled`                     | Whether text-to-speech is enabled by default.                                                                                                                     | `false`                           |
| Input Device                   | `ui.voice.inputDevice`                    | The microphone to use for voice input.                                                                                                                            | `"default"`                       |
| Output Device                  | `ui.voice.outputDevice`                   | The speaker/output device to use for voice playback.                                                                                                              | `"default"`                       |
| Capture Output Loopback        | `ui.voice.captureOutputLoopback`          | Capture speaker output back into voice input path for full duplex conversational audio setups.                                                                    | `false`                           |
| Noise Suppression              | `ui.voice.noiseSuppression`               | Enable real-time background noise suppression for microphone capture.                                                                                             | `true`                            |
| Noise Suppression Level        | `ui.voice.noiseSuppressionLevel`          | Strength of real-time noise suppression filtering.                                                                                                                | `"standard"`                      |
| Auto Gain Control              | `ui.voice.autoGainControl`                | Enable automatic gain leveling so quieter voices remain intelligible.                                                                                             | `true`                            |
| High-pass Filter               | `ui.voice.highpassFilter`                 | Reduce low-frequency rumble and HVAC hum from microphone capture.                                                                                                 | `true`                            |
| Voice Isolation Mode           | `ui.voice.voiceIsolationMode`             | Speech-focused cleanup profile. Aggressive removes more background noise but can color voice tone.                                                                | `"standard"`                      |
| Voice Waiter Tool              | `ui.voice.waiterEnabled`                  | Enable persistent voice waiter tool so model can wait/listen/respond naturally in voice mode.                                                                     | `true`                            |
| Realtime Conversation          | `ui.voice.realtimeConversation`           | Keep a continuous listen/respond loop while voice mode is active.                                                                                                 | `true`                            |
| Min User Silence (ms)          | `ui.voice.minUserSilenceMs`               | Minimum silence window before finalizing speech for submission.                                                                                                   | `450`                             |
| Response Delay (ms)            | `ui.voice.responseDelayMs`                | Small delay before sending finalized transcript to model.                                                                                                         | `120`                             |
| Voice Persona                  | `ui.voice.preferredGender`                | Preferred TTS persona. Auto uses agent identity values first.                                                                                                     | `"auto"`                          |
| Voice Style                    | `ui.voice.preferredStyle`                 | Optional TTS speaking style (e.g. calm, cheerful, empathetic).                                                                                                    | `""`                              |
| TTS Provider                   | `ui.voice.ttsProvider`                    | Select TTS backend. Pocket is local fallback-friendly. If setup was skipped, run /voice setup anytime.                                                            | `"auto"`                          |
| Prefer Auth Provider           | `ui.voice.preferAuthTtsProvider`          | If enabled, Gemini/OpenAI auth can be prioritized over legacy Pocket selection while still keeping Pocket fallback.                                               | `true`                            |
| Gemini TTS API Key             | `ui.voice.geminiApiKey`                   | Optional voice-only Gemini API key override for TTS. If empty, existing auth/global Gemini keys are used.                                                         | `""`                              |
| Gemini Voice Name              | `ui.voice.geminiVoiceName`                | Optional Gemini TTS voice override (e.g. Kore, Puck, Charon).                                                                                                     | `""`                              |
| Gemini TTS Model               | `ui.voice.geminiTtsModel`                 | Optional Gemini TTS model override.                                                                                                                               | `"gemini-2.5-flash-preview-tts"`  |
| OpenAI TTS API Key             | `ui.voice.openAiApiKey`                   | Optional voice-only OpenAI API key override for TTS. If empty, existing OpenAI API key settings are used.                                                         | `""`                              |
| OpenAI Voice                   | `ui.voice.openAiVoice`                    | Optional OpenAI TTS voice name override (this is not an API key). Configure API key separately via auth/settings (OPENAI_API_KEY).                                | `""`                              |
| OpenAI TTS Model               | `ui.voice.openAiTtsModel`                 | Optional OpenAI TTS model override.                                                                                                                               | `""`                              |
| ElevenLabs API Key             | `ui.voice.elevenLabsApiKey`               | Optional voice-only ElevenLabs API key override. If empty, ELEVENLABS_API_KEY env var is used.                                                                    | `""`                              |
| ElevenLabs Voice ID            | `ui.voice.elevenLabsVoiceId`              | Default ElevenLabs voice ID for speech output (not an API key). API key is ELEVENLABS_API_KEY.                                                                    | `""`                              |
| ElevenLabs Model               | `ui.voice.elevenLabsModelId`              | ElevenLabs model override (low latency recommended).                                                                                                              | `"eleven_turbo_v2"`               |
| ElevenLabs Output Format       | `ui.voice.elevenLabsOutputFormat`         | ElevenLabs output format (for example pcm_24000, mp3_44100_128).                                                                                                  | `"pcm_24000"`                     |
| ElevenLabs Stability           | `ui.voice.elevenLabsStability`            | ElevenLabs voice setting from 0.0 to 1.0.                                                                                                                         | `0.45`                            |
| ElevenLabs Similarity          | `ui.voice.elevenLabsSimilarityBoost`      | ElevenLabs similarity boost from 0.0 to 1.0.                                                                                                                      | `0.75`                            |
| ElevenLabs Style               | `ui.voice.elevenLabsStyle`                | ElevenLabs style exaggeration from 0.0 to 1.0.                                                                                                                    | `0.2`                             |
| ElevenLabs Speaker Boost       | `ui.voice.elevenLabsUseSpeakerBoost`      | Enable ElevenLabs speaker boost.                                                                                                                                  | `true`                            |
| Hugging Face TTS Key           | `ui.voice.huggingFaceApiKey`              | Optional voice-only Hugging Face key override for Pocket TTS model access. If empty, existing Hugging Face settings/env are used.                                 | `""`                              |
| Pocket Voice Preset            | `ui.voice.pocketVoicePreset`              | Preferred Pocket TTS preset voice (used when Pocket provider is active).                                                                                          | `"alba"`                          |
| Pocket Reference Audio         | `ui.voice.pocketReferenceAudio`           | Reference file for Pocket voice cloning. Defaults to voice_preview_aria.mp3 if present.                                                                           | `"Voices/voice_preview_aria.mp3"` |
| Pocket Model ID                | `ui.voice.pocketModelId`                  | Hugging Face model ID used by Pocket TTS via Transformers.js.                                                                                                     | `"kyutai/pocket-tts"`             |
| Pocket Model Directory         | `ui.voice.pocketModelDir`                 | Optional local model cache directory for Pocket TTS. Leave empty to use the default model cache path. Download/setup with /voice setup.                           | `""`                              |
| VAD Threshold                  | `ui.voice.vadThreshold`                   | Voice Activity Detection threshold (RMS amplitude 0-32768).                                                                                                       | `500`                             |

### IDE

| UI Label | Setting       | Description                  | Default |
| -------- | ------------- | ---------------------------- | ------- |
| IDE Mode | `ide.enabled` | Enable IDE integration mode. | `false` |

### Model

| UI Label                | Setting                      | Description                                                                            | Default |
| ----------------------- | ---------------------------- | -------------------------------------------------------------------------------------- | ------- |
| Max Session Turns       | `model.maxSessionTurns`      | Maximum number of user/model/tool turns to keep in a session. -1 means unlimited.      | `-1`    |
| Compression Threshold   | `model.compressionThreshold` | The fraction of context usage at which to trigger context compression (e.g. 0.2, 0.3). | `0.5`   |
| Skip Next Speaker Check | `model.skipNextSpeakerCheck` | Skip the next speaker check.                                                           | `true`  |

### Ollama

| UI Label   | Setting           | Description          | Default                    |
| ---------- | ----------------- | -------------------- | -------------------------- |
| Endpoint   | `ollama.endpoint` | Ollama API endpoint. | `"http://127.0.0.1:11434"` |
| Model Name | `ollama.model`    | Model name to use.   | `"llama3"`                 |

### Signal

| UI Label              | Setting                 | Description                                                              | Default |
| --------------------- | ----------------------- | ------------------------------------------------------------------------ | ------- |
| Enable Signal Daemon  | `signal.enabled`        | Enable the background daemon for receiving Signal messages.              | `false` |
| Signal Account Number | `signal.account`        | Your Signal phone number (e.g. +123456789).                              | `""`    |
| Trusted Numbers       | `signal.trustedNumbers` | List of phone numbers allowed to send remote commands to this Phill CLI. | `[]`    |

### HuggingFace

| UI Label   | Setting                | Description                                       | Default     |
| ---------- | ---------------------- | ------------------------------------------------- | ----------- |
| Endpoint   | `huggingFace.endpoint` | HuggingFace Inference API endpoint.               | `undefined` |
| API Key    | `huggingFace.apiKey`   | HuggingFace API Key (optional for public models). | `undefined` |
| Model Name | `huggingFace.model`    | Model name to use.                                | `"gpt2"`    |

### OpenAI

| UI Label   | Setting           | Description                             | Default                       |
| ---------- | ----------------- | --------------------------------------- | ----------------------------- |
| Endpoint   | `openAI.endpoint` | OpenAI-compatible API endpoint.         | `"https://api.openai.com/v1"` |
| API Key    | `openAI.apiKey`   | API key for OpenAI-compatible provider. | `undefined`                   |
| Model Name | `openAI.model`    | Model name to use.                      | `"gpt-4o"`                    |

### Anthropic

| UI Label   | Setting              | Description             | Default                          |
| ---------- | -------------------- | ----------------------- | -------------------------------- |
| Endpoint   | `anthropic.endpoint` | Anthropic API endpoint. | `"https://api.anthropic.com/v1"` |
| API Key    | `anthropic.apiKey`   | Anthropic API key.      | `undefined`                      |
| Model Name | `anthropic.model`    | Model name to use.      | `"claude-3-5-sonnet-latest"`     |

### Groq

| UI Label   | Setting         | Description                      | Default                            |
| ---------- | --------------- | -------------------------------- | ---------------------------------- |
| Endpoint   | `groq.endpoint` | Groq OpenAI-compatible endpoint. | `"https://api.groq.com/openai/v1"` |
| API Key    | `groq.apiKey`   | Groq API key.                    | `undefined`                        |
| Model Name | `groq.model`    | Model name to use.               | `"llama-3.3-70b-versatile"`        |

### Xai

| UI Label   | Setting        | Description                     | Default                 |
| ---------- | -------------- | ------------------------------- | ----------------------- |
| Endpoint   | `xai.endpoint` | xAI OpenAI-compatible endpoint. | `"https://api.x.ai/v1"` |
| API Key    | `xai.apiKey`   | xAI API key.                    | `undefined`             |
| Model Name | `xai.model`    | Grok model name to use.         | `"grok-4-20"`           |

### CustomApi

| UI Label   | Setting              | Description                                 | Default                      |
| ---------- | -------------------- | ------------------------------------------- | ---------------------------- |
| Endpoint   | `customApi.endpoint` | Custom OpenAI-compatible endpoint.          | `"http://localhost:8000/v1"` |
| API Key    | `customApi.apiKey`   | Optional API key for the custom endpoint.   | `undefined`                  |
| Model Name | `customApi.model`    | Model name to use (passed through exactly). | `"custom-model"`             |

### Browser

| UI Label    | Setting                   | Description                                  | Default |
| ----------- | ------------------------- | -------------------------------------------- | ------- |
| Headed Mode | `browser.headed`          | Run browser in headed mode (visible window). | `true`  |
| Width       | `browser.viewport.width`  | Description not provided.                    | `1280`  |
| Height      | `browser.viewport.height` | Description not provided.                    | `720`   |

### Context

| UI Label                             | Setting                                           | Description                                                                                                                                                                                                                                | Default |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Memory Discovery Max Dirs            | `context.discoveryMaxDirs`                        | Maximum number of directories to search for memory.                                                                                                                                                                                        | `200`   |
| Load Memory From Include Directories | `context.loadMemoryFromIncludeDirectories`        | Controls how /memory refresh loads PHILL.md files. When true, include directories are scanned; when false, only the current directory is used.                                                                                             | `false` |
| Respect .gitignore                   | `context.fileFiltering.respectGitIgnore`          | Respect .gitignore files when searching.                                                                                                                                                                                                   | `true`  |
| Respect .phillignore                 | `context.fileFiltering.respectGeminiIgnore`       | Respect .phillignore files when searching.                                                                                                                                                                                                 | `true`  |
| Enable Recursive File Search         | `context.fileFiltering.enableRecursiveFileSearch` | Enable recursive file search functionality when completing @ references in the prompt.                                                                                                                                                     | `true`  |
| Enable Fuzzy Search                  | `context.fileFiltering.enableFuzzySearch`         | Enable fuzzy search when searching for files.                                                                                                                                                                                              | `true`  |
| Custom Ignore File Paths             | `context.fileFiltering.customIgnoreFilePaths`     | Additional ignore file paths to respect. These files take precedence over .phillignore and .gitignore. Files earlier in the array take precedence over files later in the array, e.g. the first file takes precedence over the second one. | `[]`    |

### Tools

| UI Label                         | Setting                              | Description                                                                                                                                                                    | Default     |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| Enable Interactive Shell         | `tools.shell.enableInteractiveShell` | Use node-pty for an interactive shell experience. Fallback to child_process still applies.                                                                                     | `true`      |
| Show Color                       | `tools.shell.showColor`              | Show color in shell output.                                                                                                                                                    | `false`     |
| Auto Accept                      | `tools.autoAccept`                   | Automatically accept and execute tool calls that are considered safe (e.g., read-only operations).                                                                             | `false`     |
| Approval Mode                    | `tools.approvalMode`                 | The default approval mode for tool execution. 'default' prompts for approval, 'auto_edit' auto-approves edit tools, and 'plan' is read-only mode. 'yolo' is not supported yet. | `"default"` |
| Use Ripgrep                      | `tools.useRipgrep`                   | Use ripgrep for file content search instead of the fallback implementation. Provides faster search performance.                                                                | `true`      |
| Enable Tool Output Truncation    | `tools.enableToolOutputTruncation`   | Enable truncation of large tool outputs.                                                                                                                                       | `true`      |
| Tool Output Truncation Threshold | `tools.truncateToolOutputThreshold`  | Truncate tool output if it is larger than this many characters. Set to -1 to disable.                                                                                          | `4000000`   |
| Tool Output Truncation Lines     | `tools.truncateToolOutputLines`      | The number of lines to keep when truncating tool output.                                                                                                                       | `1000`      |
| Disable LLM Correction           | `tools.disableLLMCorrection`         | Disable LLM-based error correction for edit tools. When enabled, tools will fail immediately if exact string matches are not found, instead of attempting to self-correct.     | `true`      |

### WebSearch

| UI Label                  | Setting                            | Description                                                                 | Default |
| ------------------------- | ---------------------------------- | --------------------------------------------------------------------------- | ------- |
| Deep Research by Default  | `webSearch.deepResearchByDefault`  | Perform autonomous deep research synthesis by default for every search.     | `false` |
| Include IDE Context       | `webSearch.includeIdeContext`      | Automatically include selected IDE code as context for search queries.      | `true`  |
| Max Deep Research Sources | `webSearch.maxDeepResearchSources` | Maximum number of top results to fetch and synthesize during deep research. | `3`     |

### Security

| UI Label                              | Setting                                         | Description                                                                                                                                      | Default |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Disable YOLO Mode                     | `security.disableYoloMode`                      | Disable YOLO mode, even if enabled by a flag.                                                                                                    | `false` |
| Allow Permanent Tool Approval         | `security.enablePermanentToolApproval`          | Enable the "Allow for all future sessions" option in tool confirmation dialogs.                                                                  | `false` |
| Auto-Approve All Actions Forever      | `security.autoApproveAllActionsForever`         | If enabled, Phill starts in full auto-approve mode (YOLO) for trusted folders. High risk: commands and tool actions can execute without prompts. | `false` |
| Blocks extensions from Git            | `security.blockGitExtensions`                   | Blocks installing and loading extensions from Git.                                                                                               | `false` |
| Folder Trust                          | `security.folderTrust.enabled`                  | Setting to track whether Folder trust is enabled.                                                                                                | `false` |
| Enable Environment Variable Redaction | `security.environmentVariableRedaction.enabled` | Enable redaction of environment variables that may contain secrets.                                                                              | `false` |

### Experimental

| UI Label         | Setting                      | Description                                                                         | Default |
| ---------------- | ---------------------------- | ----------------------------------------------------------------------------------- | ------- |
| Use OSC 52 Paste | `experimental.useOSC52Paste` | Use OSC 52 sequence for pasting instead of clipboardy (useful for remote sessions). | `false` |
| Plan             | `experimental.plan`          | Enable planning features (Plan Mode and tools).                                     | `false` |

### Skills

| UI Label            | Setting          | Description          | Default |
| ------------------- | ---------------- | -------------------- | ------- |
| Enable Agent Skills | `skills.enabled` | Enable Agent Skills. | `true`  |

### HooksConfig

| UI Label           | Setting                     | Description                                                                      | Default |
| ------------------ | --------------------------- | -------------------------------------------------------------------------------- | ------- |
| Enable Hooks       | `hooksConfig.enabled`       | Canonical toggle for the hooks system. When disabled, no hooks will be executed. | `true`  |
| Hook Notifications | `hooksConfig.notifications` | Show visual indicators when hooks are executing.                                 | `true`  |

<!-- SETTINGS-AUTOGEN:END -->
