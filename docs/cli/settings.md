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

| UI Label                        | Setting                            | Description                                                   | Default |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------------- | ------- |
| Preview Features (e.g., models) | `general.previewFeatures`          | Enable preview features (e.g., preview models).               | `false` |
| Vim Mode                        | `general.vimMode`                  | Enable Vim keybindings                                        | `false` |
| Enable Auto Update              | `general.enableAutoUpdate`         | Enable automatic updates.                                     | `true`  |
| Enable Prompt Completion        | `general.enablePromptCompletion`   | Enable AI-powered prompt completion suggestions while typing. | `false` |
| Debug Keystroke Logging         | `general.debugKeystrokeLogging`    | Enable debug logging of keystrokes to the console.            | `false` |
| Enable Session Cleanup          | `general.sessionRetention.enabled` | Enable automatic session cleanup                              | `false` |

### Output

| UI Label      | Setting         | Description                                            | Default  |
| ------------- | --------------- | ------------------------------------------------------ | -------- |
| Output Format | `output.format` | The format of the CLI output. Can be `text` or `json`. | `"text"` |

### UI

| UI Label                       | Setting                                 | Description                                                                                                                                                       | Default     |
| ------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Hide Window Title              | `ui.hideWindowTitle`                    | Hide the window title bar                                                                                                                                         | `false`     |
| Show Thoughts in Title         | `ui.showStatusInTitle`                  | Show Phill CLI model thoughts in the terminal window title during the working phase                                                                               | `false`     |
| Dynamic Window Title           | `ui.dynamicWindowTitle`                 | Update the terminal window title with current status icons (Ready: ◇, Action Required: ✋, Working: ✦)                                                            | `true`      |
| Show Home Directory Warning    | `ui.showHomeDirectoryWarning`           | Show a warning when running Phill CLI in the home directory.                                                                                                      | `true`      |
| Hide Tips                      | `ui.hideTips`                           | Hide helpful tips in the UI                                                                                                                                       | `false`     |
| Hide Banner                    | `ui.hideBanner`                         | Hide the application banner                                                                                                                                       | `false`     |
| Hide Context Summary           | `ui.hideContextSummary`                 | Hide the context summary (PHILL.md, MCP servers) above the input.                                                                                                 | `false`     |
| Hide CWD                       | `ui.footer.hideCWD`                     | Hide the current working directory path in the footer.                                                                                                            | `false`     |
| Hide Sandbox Status            | `ui.footer.hideSandboxStatus`           | Hide the sandbox status indicator in the footer.                                                                                                                  | `false`     |
| Hide Model Info                | `ui.footer.hideModelInfo`               | Hide the model name and context usage in the footer.                                                                                                              | `false`     |
| Hide Context Window Percentage | `ui.footer.hideContextPercentage`       | Hides the context window remaining percentage.                                                                                                                    | `true`      |
| Hide Footer                    | `ui.hideFooter`                         | Hide the footer from the UI                                                                                                                                       | `false`     |
| Show Memory Usage              | `ui.showMemoryUsage`                    | Display memory usage information in the UI                                                                                                                        | `false`     |
| Show Line Numbers              | `ui.showLineNumbers`                    | Show line numbers in the chat.                                                                                                                                    | `true`      |
| Show Citations                 | `ui.showCitations`                      | Show citations for generated text in the chat.                                                                                                                    | `false`     |
| Show Model Info In Chat        | `ui.showModelInfoInChat`                | Show the model name in the chat for each model turn.                                                                                                              | `false`     |
| Use Alternate Screen Buffer    | `ui.useAlternateBuffer`                 | Use an alternate screen buffer for the UI, preserving shell history.                                                                                              | `false`     |
| Use Background Color           | `ui.useBackgroundColor`                 | Whether to use background colors in the UI.                                                                                                                       | `true`      |
| Incremental Rendering          | `ui.incrementalRendering`               | Enable incremental rendering for the UI. This option will reduce flickering but may cause rendering artifacts. Only supported when useAlternateBuffer is enabled. | `true`      |
| Show Spinner                   | `ui.showSpinner`                        | Show the spinner during operations.                                                                                                                               | `true`      |
| Enable Loading Phrases         | `ui.accessibility.enableLoadingPhrases` | Enable loading phrases during operations.                                                                                                                         | `true`      |
| Screen Reader Mode             | `ui.accessibility.screenReader`         | Render output in plain-text to be more screen reader accessible                                                                                                   | `false`     |
| Enable Voice                   | `ui.voice.enabled`                      | Whether voice input mode is enabled by default.                                                                                                                   | `false`     |
| Enable TTS                     | `ui.voice.ttsEnabled`                   | Whether text-to-speech is enabled by default.                                                                                                                     | `false`     |
| Input Device                   | `ui.voice.inputDevice`                  | The microphone to use for voice input.                                                                                                                            | `"default"` |
| VAD Threshold                  | `ui.voice.vadThreshold`                 | Voice Activity Detection threshold (RMS amplitude 0-32768).                                                                                                       | `500`       |

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
