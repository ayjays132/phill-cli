# ⚡ Phill CLI

[![Phill CLI CI](https://github.com/ayjays132/phill-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/ayjays132/phill-cli/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/ayjays132/phill-cli?style=for-the-badge&logo=git)](https://github.com/ayjays132/phill-cli/blob/main/LICENSE)

![Phill CLI screenshot](./docs/assets/phill-screenshot.png)

> **A terminal-first AI operating environment for coding, research, automation, local models, tool orchestration, and agentic developer workflows.**

Phill CLI brings an AI agent directly into your terminal. It combines interactive chat, shell and file workflows, workspace awareness, model routing, fallback chains, local-first Ollama support, memory, skills, extensions, MCP tooling, checkpointing, policy controls, sandboxing, headless automation, and long-running session support in a single CLI.

It is designed for developers and power users who want an AI assistant that can work **inside the repo, inside the shell, under their rules**.

Phill CLI works with both cloud providers and local model setups. If you want a local-first workflow, Ollama is a first-class path. If you want a multi-provider workflow, Phill can route across Gemini, Vertex AI, OpenAI-compatible APIs, Anthropic, Groq, xAI, Hugging Face, and custom endpoints.

---

## ✨ Why Phill CLI?

Most AI coding tools make you choose between convenience and control.

Phill CLI is built for both:

- 🖥️ **Terminal-first workflow** - interactive chat, slash commands, non-interactive prompts, piping, scripting, and CI/CD usage.
- 🧠 **Memory and continuity** - session continuity, workspace context, PHILL.md-style memory, vector memory paths where available, cached tool results, and checkpoint-backed restore flows.
- 🛠️ **Real tool use** - shell commands, file reads/edits, web search, web fetch, workspace search, MCP tools, custom commands, and extension-provided capabilities.
- 🧩 **Skills and extensions** - reusable agent knowledge, workflow packs, prompts, references, scripts, commands, hooks, MCP servers, and subagent definitions.
- 🔐 **Policy and governance** - rule-based allow, deny, or ask-user decisions for tool calls.
- 🧱 **Trust and sandboxing** - trusted-folder controls, restricted execution flows, Docker/Podman-style isolation, macOS Seatbelt support where available, and safer behavior in unknown workspaces.
- 🧬 **Model freedom** - Gemini, Vertex AI, Ollama, OpenAI-compatible APIs, Anthropic, Groq, xAI, Hugging Face, local Transformers fallback, and custom APIs.
- 📡 **MCP and external tool orchestration** - connect Phill to local tools, remote services, databases, internal APIs, code search, browser tools, and other agent systems through Model Context Protocol.
- 📲 **Signal CLI tooling** - advanced Signal-related tooling is included for users who configure Signal-based workflows.
- 🧪 **Advanced developer lab** - subagents, headless JSON output, background services, custom slash commands, local-first workflows, and experimental autonomous patterns.

---

## 🧭 Table of Contents

- [Highlights](#-highlights)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Operating Modes](#-operating-modes)
- [Supported Providers](#-supported-providers)
- [Ollama and Local-First Usage](#-ollama-and-local-first-usage)
- [Search, Fetch, and Tooling](#-search-fetch-and-tooling)
- [Routing, Fallbacks, and Resilience](#-routing-fallbacks-and-resilience)
- [Local Transformers Fallback and KV Cache Controls](#-local-transformers-fallback-and-kv-cache-controls)
- [Memory and Continuity](#-memory-and-continuity)
- [Skills](#-skills)
- [Extensions](#-extensions)
- [MCP Integration](#-mcp-integration)
- [Subagents](#-subagents)
- [Signal and Messaging Tooling](#-signal-and-messaging-tooling)
- [Checkpointing and Restore](#-checkpointing-and-restore)
- [Policy Engine](#-policy-engine)
- [Trusted Folders](#-trusted-folders)
- [Sandboxing](#-sandboxing)
- [Headless and Automation Mode](#-headless-and-automation-mode)
- [Custom Commands](#-custom-commands)
- [Configuration](#-configuration)
- [Security and Privacy](#-security-and-privacy)
- [Recommended Workflows](#-recommended-workflows)
- [Feature Status](#-feature-status)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Credits](#-credits)

---

## 🚀 Highlights

- Interactive terminal UI plus non-interactive prompt mode
- Built-in tool calling, workspace-aware workflows, shell tools, file tools, and web tools
- Model routing, retry logic, provider-specific content generators, and fallback chains
- Local-first Ollama support with tool calling, concurrency controls, warm-model controls, and installed-model fallback
- Search and fetch tools with caching, degraded fallback behavior, and optional workspace RAG fallback
- Session continuity, memory, and background services for longer-running work
- Headless mode with JSON and streaming JSON output for scripts and CI/CD
- Agent skills for reusable workflows and domain-specific expertise
- Extensions that can bundle skills, commands, hooks, MCP servers, prompts, resources, and subagents
- MCP support for connecting external tools, resources, prompts, and local/remote services
- Signal CLI tooling for advanced messaging workflows
- Checkpointing and restore for safer file modifications
- Policy engine for allow/deny/ask-user tool governance
- Trusted-folder controls and sandboxing for safer work with unknown repositories
- Multiple binary entry points: `phill`, `pcli`, and `young-philly`

---

## 📦 Installation

### Requirements

- Node.js 20 or newer
- Windows, macOS, or Linux
- Optional: Ollama for local models
- Optional: Docker or Podman for containerized sandboxing
- Optional: provider API keys for cloud model providers

### Media Requirements

Phill CLI comes with `ffmpeg` and `ffplay` installed automatically as dependencies via `ffmpeg-static` and `ffplay-static`. This provides cross-platform media capabilities without requiring manual system-level installs.

### Install globally

```bash
npm install -g phill-cli
```

### Run without installing

```bash
npx phill-cli
```

### Start the CLI

```bash
phill
```

You can also use:

```bash
pcli
young-philly
```

---

## ⚡ Quick Start

### Interactive mode

```bash
phill
```

### Non-interactive prompt mode

```bash
phill -p "Summarize the current workspace"
```

### Choose a model directly

```bash
phill -m gemini-2.5-flash
phill -m ollama/llama3
phill -m openai/gpt-5.4
phill -m anthropic/claude-sonnet-4-20250514
phill -m xai/grok-4-20
phill -m huggingface/meta-llama/Llama-3.1-8B-Instruct:cerebras
```

### Pipe content into Phill

```bash
cat README.md | phill -p "Improve this README while preserving its structure"
```

### Use Phill in scripts

```bash
phill -p "Generate release notes from the latest git diff" --output-format json
```

---

## 🧭 Operating Modes

Phill CLI supports several usage patterns.

### 1. Interactive Agent Mode

Best for live coding, debugging, research, codebase exploration, and iterative work.

```bash
phill
```

### 2. One-Shot Prompt Mode

Best for quick tasks.

```bash
phill -p "Explain this repo"
```

### 3. Headless Automation Mode

Best for shell scripts, CI/CD, build pipelines, test automation, and structured programmatic usage.

```bash
phill -p "Review this diff" --output-format json
```

### 4. Local-First Mode

Best when using Ollama or local models.

```bash
phill -m ollama/llama3
```

### 5. Workspace Agent Mode

Best when running inside a repository.

```bash
cd my-project
phill
```

---

## 🤖 Supported Providers

Phill CLI currently has code paths and configuration sections for:

| Provider | Typical Use |
|---|---|
| Gemini / Google AI Studio | Gemini model workflows |
| Vertex AI | Google Cloud and enterprise workflows |
| Ollama | Local-first and private workflows |
| Hugging Face | Hosted model and provider-backed model access |
| OpenAI API | OpenAI model workflows |
| OpenAI browser auth | Browser-authenticated OpenAI workflows where supported |
| OpenAI-compatible APIs | Local servers, proxies, gateways, and third-party providers |
| Anthropic | Claude model workflows |
| Groq | Low-latency hosted inference |
| xAI / Grok | Grok model workflows |
| Custom APIs | Bring your own compatible endpoint |
| Local Transformers fallback | Direct local fallback path for supported flows |

Provider-specific config sections mirror those names:

```json
{
  "ollama": {},
  "huggingFace": {},
  "openAI": {},
  "anthropic": {},
  "groq": {},
  "xai": {},
  "customApi": {}
}
```

---

## 🦙 Ollama and Local-First Usage

If you want Phill to stay as local as possible, Ollama is the main path.

### Minimal settings example

```json
{
  "security": {
    "auth": {
      "selectedType": "ollama"
    }
  },
  "ollama": {
    "endpoint": "http://127.0.0.1:11434",
    "model": "llama3"
  }
}
```

### Environment variables

```bash
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_NUM_CTX=8192
OLLAMA_NUM_GPU=1
OLLAMA_LOW_VRAM=true
OLLAMA_CONCURRENCY_LIMIT=1
OLLAMA_KEEP_ALIVE=15m
```

### What Phill's Ollama path does

- Accepts `ollama/<model>` model selection from the CLI
- Reads `ollama.endpoint` and `ollama.model` settings plus `OLLAMA_*` environment variables
- Normalizes endpoints even if users point them at `/api` or `/v1`
- Supports native Ollama tool calls
- Preserves a JSON-style tool fallback prompt for models that do not emit native tool calls consistently
- Feeds tool results back into chat history as `tool` messages
- Limits concurrent Ollama requests with a semaphore driven by `OLLAMA_CONCURRENCY_LIMIT`
- Passes through `OLLAMA_KEEP_ALIVE` so models can stay warm between requests
- Falls back to an installed model from `/api/tags` if the requested model is missing
- Parses `<thought>`, `<thinking>`, and `<think>` blocks from reasoning models

### Offline Notes

- Shell, file, workspace, and most local tools can work without internet access.
- Ollama can run fully local if you install local models rather than `:cloud` models.
- True web search is not fully offline.
- When the primary web-search path is unavailable, Phill can degrade to other paths, including local workspace RAG, but that is not the same thing as live internet search.
- Remote providers, hosted APIs, remote MCP servers, web search, and web fetch remain networked features unless disabled or replaced.

For maximum offline behavior, use a local Ollama model and avoid remote-only search or provider features:

```bash
phill -m ollama/your-local-model
```

---

## 🌐 Search, Fetch, and Tooling

Phill includes a layered tool stack rather than a single fragile web path.

### `web-search`

The web-search tool is built around:

- Gemini Google Search as the primary search path
- DuckDuckGo fallback when the primary path fails
- Local workspace RAG fallback through vector search when remote search is not available
- Optional deeper synthesis over retrieved material

### `web-fetch`

The web-fetch tool can:

- Process prompts containing up to 20 URLs
- Fetch and transform page content for downstream synthesis
- Handle private or local addresses through a fallback path when direct access is not appropriate
- Cache results and persist useful fetch output into vector memory where available

### Tool Cache

Tool responses are cached on disk in Phill's global storage directory as `tool_cache.json`.

Current behavior in code:

- Default TTL is 24 hours
- Cached `web-search` and `web-fetch` responses are reused on matching inputs
- Cache hits are surfaced back to the model as `[Cache Hit] ...`
- Search and fetch results are also written into vector memory when that layer is available

### Tool categories

Phill CLI can support tool-based workflows across categories such as:

- shell execution
- file reading and editing
- workspace search
- web search
- URL fetch
- MCP tools
- memory/context tools
- custom commands
- extension tools
- subagent tools
- structured automation

Tool execution can be governed by confirmation, policies, approval modes, trusted-folder state, and sandbox configuration.

---

## 🔄 Routing, Fallbacks, and Resilience

Phill is not built around a single hard-coded model path.

Examples that exist in the default model configuration include:

- `auto-gemini-3` for the Gemini CLI-style preview auto ladder
- `auto-gemini-3.1` for Phill's extended preview ladder
- `auto-gemini-2.5` for the Gemini CLI-style stable auto ladder and default Google/Gemini auth selection
- `auto-gemini-3.1-stable` as a legacy compatibility alias for older saved configs
- `flash`
- `web-search`
- `web-fetch`
- `web-fetch-fallback`

The runtime includes:

- Alias-based model resolution
- Silent retry and fallback transitions between related model families
- Dedicated search/fetch model profiles
- Cross-provider token usage capture when Gemini, OpenAI-compatible providers, Anthropic, Hugging Face, or Ollama report counts
- Provider-specific content generators for Ollama, OpenAI-compatible APIs, Anthropic, Hugging Face, and Gemini/Vertex-backed paths
- Degraded fallback behavior for search/fetch workflows
- Local fallback paths where configured

---

## 🧬 Local Transformers Fallback and KV Cache Controls

For some OpenAI-compatible and Hugging Face flows, Phill also has a local Transformers fallback path. When those routes cannot serve the requested model, the runtime can attempt local generation through Python Transformers.

Advanced environment flags for that path:

```bash
PHILL_LOCAL_TRANSFORMERS_USE_KV_CACHE=true
PHILL_LOCAL_TRANSFORMERS_KV_CACHE=dynamic
```

This is separate from Ollama's model residency controls.

In practice:

- `OLLAMA_KEEP_ALIVE` helps keep Ollama models warm
- `PHILL_LOCAL_TRANSFORMERS_*` controls apply to the direct local Transformers fallback path
- Telemetry can track cached-content token counts when a provider reports them

---

## 🧠 Memory and Continuity

Phill CLI is designed to reduce agent amnesia across longer workflows.

Memory and continuity can include:

- PHILL.md-style memory/context files
- Modular memory imports
- Workspace-aware context loading
- Session continuity
- Cached tool results
- Search/fetch persistence
- Vector memory paths where available
- Background services for longer-running work
- Checkpoint-aware conversation restore
- Reusable skills and context files

### Modular memory imports

Phill CLI can modularize memory/context files using imports such as:

```markdown
# PHILL.md

Project rules live here.

@./docs/agent-rules.md
@./docs/testing-guidelines.md
@./docs/security-checklist.md
```

This helps teams keep memory/context structured and reusable.

Benefits include:

- Smaller reusable context files
- Project-specific conventions
- Shared team instructions
- Safer import boundaries
- Circular import protection
- Maximum import-depth controls
- Easier debugging of memory trees

---

## 🧩 Skills

Skills are reusable agent capability packages.

A skill can define:

- What it does
- When it should activate
- What instructions it gives the model
- What references/assets/scripts it includes
- What workflows it supports
- How it should interact with tools
- What constraints or output formats it should follow

Skills are useful for:

- Solidity and smart-contract audits
- Security reviews
- Repository onboarding
- Release workflows
- Code review checklists
- Testing patterns
- Documentation generation
- Framework-specific coding guidance
- Prompt-injection review
- Domain-specific reasoning

### Example skill concept

```markdown
---
name: security-auditor
description: Analyze code for vulnerabilities and produce a structured report.
---

You are a security-focused code auditor.

Focus on:
- input validation
- authentication and authorization
- injection risks
- unsafe file operations
- hardcoded secrets
- dependency risks
- logic errors
- test coverage gaps

Return:
1. Summary
2. Findings
3. Severity
4. Evidence
5. Suggested fixes
```

### Skill safety

Depending on configuration, skill activation may require confirmation. This matters because skills can influence prompts, workflow behavior, and tool usage.

---

## 🧱 Extensions

Extensions let Phill CLI bundle capabilities together.

An extension may include:

- skills
- custom commands
- MCP servers
- prompts
- hooks
- subagents
- references
- scripts
- assets
- workspace configuration

This creates a modular system where projects or teams can package repeatable workflows.

### Example extension ideas

- Security audit pack
- Release management pack
- Framework-specific coding pack
- Internal company workflow pack
- Local model routing pack
- Signal/MCP automation pack
- Smart-contract review pack
- Documentation generator pack

---

## 🔌 MCP Integration

Phill CLI supports Model Context Protocol for connecting external tools and resources.

MCP can expose:

- Tools
- Resources
- Prompts
- Databases
- Code search
- Browser tools
- Internal APIs
- GitHub tools
- Cloud services
- Local automation servers
- Remote agent capabilities

Supported MCP patterns may include:

- Stdio servers
- HTTP/SSE-style servers
- Tool registration
- Tool filtering
- Confirmation and trust settings
- Resources via URI-like references
- Prompts exposed as commands
- Extension-packaged MCP servers

### Example MCP server concept

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

---

## 🤝 Subagents

Phill CLI supports subagent-style workflows for specialized task delegation.

Subagents can be useful when you want:

- Focused context
- A separate reasoning loop
- Restricted tools
- Domain-specific personas
- Deep codebase investigation
- Documentation lookup
- Security-only analysis
- Isolated task execution

### Example subagent

```markdown
---
name: codebase-investigator
description: Deeply maps project structure and dependencies.
tools:
  - read_file
  - search_file_content
model: gemini-2.5-pro
max_turns: 20
---

You are a codebase investigator.

Your job is to map how the project works without making file changes.
```

> ⚠️ Some subagent capabilities may be experimental or configuration-dependent. Be careful when granting powerful tools like shell execution or file writing.

---

## 📲 Signal and Messaging Tooling

Phill CLI includes Signal-related tooling/components in the repository, such as `tools/signal-cli`.

This can support advanced workflows involving Signal CLI infrastructure or messaging automation where configured correctly.

Because messaging setups are sensitive and environment-specific:

- Verify local dependencies
- Configure credentials carefully
- Keep private keys secure
- Avoid exposing message history
- Review automation before running it unattended
- Treat Signal workflows as advanced integrations

> ✅ Phill CLI should be credited for including Signal-related tooling.  
> ⚠️ Whether your install behaves as a full messaging gateway depends on the current repo state, configuration, and local setup.

---

## 🧯 Checkpointing and Restore

Phill CLI can create checkpoints before AI-powered file modifications.

A checkpoint can include:

1. **A shadow Git snapshot**  
   Stored outside your project Git repository, commonly under:

   ```txt
   ~/.phill/history/<project_hash>
   ```

2. **Conversation history**  
   The chat state up to that point.

3. **The tool call**  
   The file-modifying tool call that was about to run.

### Enable checkpointing

```json
{
  "general": {
    "checkpointing": {
      "enabled": true
    }
  }
}
```

### Restore a checkpoint

```text
/restore
/restore <checkpoint_file>
```

Restore can:

- Revert project files
- Restore conversation history
- Re-propose the original tool call

This makes it safer to accept larger edits, refactors, rewrites, and automated file changes.

---

## 🔐 Policy Engine

Phill CLI includes a policy engine for fine-grained tool execution control.

A policy rule can decide:

- `allow` - execute automatically
- `deny` - block the call
- `ask_user` - require confirmation

### Example policy

```toml
[[rule]]
toolName = "run_shell_command"
commandPrefix = "git status"
decision = "allow"
priority = 100
```

### Ask before Git commands

```toml
[[rule]]
toolName = "run_shell_command"
commandPrefix = "git "
decision = "ask_user"
priority = 100
```

### Block dangerous commands

```toml
[[rule]]
toolName = "run_shell_command"
argsPattern = "rm\\s+-rf\\s+/"
decision = "deny"
priority = 999
```

### Policy tiers

Policies can be organized into tiers:

| Tier | Purpose |
|---|---|
| Default | Built-in default policy behavior |
| User | User-defined policies |
| Admin | Administrator/system policies |

Higher tiers can override lower tiers.

This makes Phill CLI especially useful for:

- Teams
- Enterprise environments
- Regulated workflows
- Shared developer machines
- CI/CD systems
- Security-sensitive repositories
- Local agent governance

---

## 🛡️ Trusted Folders

Workspace trust is critical for agent security.

Phill CLI can restrict behavior in untrusted folders.

Untrusted mode may disable or restrict:

- Workspace settings
- Workspace environment loading
- Tool auto-accept
- MCP servers
- Custom commands
- Extension loading
- Memory loading
- Other local execution paths

This helps reduce risk from:

- Malicious repositories
- Prompt-injection files
- Hostile workspace configuration
- Unreviewed automation
- Unexpected tool execution paths

### Recommended practice

Only trust a folder when you understand the project and are comfortable with its local configuration.

---

## 🧱 Sandboxing

Phill CLI supports restricted execution flows.

Depending on your OS and setup, sandboxing may use:

- Docker
- Podman
- macOS Seatbelt
- Restricted mounts
- Controlled ports
- Network restrictions
- Environment variable filtering
- Isolated command execution

Sandboxing is recommended when:

- Inspecting unknown repositories
- Running generated commands
- Testing dependency installs
- Executing untrusted scripts
- Using external MCP servers
- Letting an agent perform multi-step tool workflows

---

## 🧰 Headless and Automation Mode

Headless mode lets you run Phill CLI from scripts, CI/CD, and automation pipelines.

### Prompt mode

```bash
phill --prompt "Generate a changelog from the latest git diff"
```

### Pipe mode

```bash
git diff | phill -p "Review this diff for bugs"
```

### JSON output

```bash
phill -p "Analyze this workspace" --output-format json
```

### Streaming JSON

```bash
phill -p "Run a structured code review" --output-format stream-json
```

Headless output can include:

- Response text
- Model statistics
- Token usage
- Tool call statistics
- File modification counts
- Error data
- Metadata for downstream scripts

---

## 🪄 Custom Commands

Custom commands let you turn prompts into reusable slash commands.

Commands can live in:

```txt
~/.phill/commands/
<project>/.phill/commands/
```

Project commands can override global commands.

### Example command

```toml
description = "Generate release notes from the current diff."

prompt = """
You are preparing release notes.

Use the current git diff and summarize:
1. Features
2. Fixes
3. Breaking changes
4. Migration notes
"""
```

Invoked as:

```text
/release-notes
```

### Argument injection

```toml
description = "Search the repo for a pattern and summarize matches."

prompt = """
Please summarize findings for: {{args}}

Search results:
!{grep -r {{args}} .}
"""
```

Phill CLI can escape arguments inside shell command blocks to reduce command-injection risk.

---

## ⚙️ Configuration

Phill CLI configuration can include:

- Provider settings
- Model defaults
- Tool settings
- MCP servers
- Security settings
- Sandbox settings
- Checkpointing
- Policy paths
- Memory/context settings
- Extension settings
- UI settings
- Workspace preferences

### Example local model config

```json
{
  "security": {
    "auth": {
      "selectedType": "ollama"
    }
  },
  "ollama": {
    "endpoint": "http://127.0.0.1:11434",
    "model": "llama3"
  }
}
```

### Enterprise-style precedence

Configuration may be layered across:

1. System defaults
2. User settings
3. Workspace settings
4. System overrides

This allows administrators to enforce security policies and default behavior while still allowing user/project customization where appropriate.

---

## 🔒 Security and Privacy

Phill CLI is powerful because it can use tools. Treat it seriously.

### Recommended safety practices

- Use trusted folders carefully.
- Keep checkpointing enabled for code-editing workflows.
- Prefer `ask_user` policies for destructive tools.
- Use sandboxing for unknown repositories.
- Use local models when privacy matters.
- Disable network tools when working offline or with sensitive code.
- Review MCP servers before enabling them.
- Avoid giving subagents unrestricted shell/file permissions.
- Keep API keys out of prompts and repository files.
- Use admin policies in shared or enterprise environments.
- Review diffs before committing AI-generated changes.

### Local privacy

Local providers such as Ollama can reduce data sent to external services.

However:

- Remote providers send prompts/context to those providers.
- Web search and fetch are networked features.
- MCP servers may access external systems.
- Shell commands may expose local data if misused.

---

## 🧠 Recommended Workflows

### 🔍 Codebase investigation

```bash
phill -p "Map the architecture of this repository and identify the core modules."
```

### 🛡️ Security review

```bash
phill -p "Audit this codebase for authentication, authorization, injection, and unsafe file handling issues."
```

### 🧪 Test generation

```bash
phill -p "Find untested logic and propose tests. Do not modify files until I approve."
```

### 📝 Documentation

```bash
phill -p "Improve the README and create a developer onboarding guide."
```

### 🧾 Release notes

```bash
git diff main...HEAD | phill -p "Generate release notes from this diff."
```

### 🦙 Fully local repo summary

```bash
phill -m ollama/llama3 -p "Summarize this workspace using local tools only."
```

### 🔐 Policy-controlled workflow

```bash
phill
```

Then rely on policies to allow safe commands and ask/deny risky ones.

### 🧩 Skill-driven workflow

```text
Use the security-auditor skill to review this repository.
```

### 📡 MCP-driven workflow

```text
Use the configured GitHub MCP tools to summarize open issues and suggest next steps.
```

---

## 🧭 Feature Status

| Capability | Status |
|---|---|
| Interactive terminal UI | ✅ Core |
| Non-interactive prompt mode | ✅ Core |
| Headless/JSON automation | ✅ Core |
| Provider routing | ✅ Core |
| Retry and fallback chains | ✅ Core |
| Ollama local-first support | ✅ Core |
| OpenAI-compatible APIs | ✅ Core |
| Anthropic/Groq/xAI/Hugging Face paths | ✅ Supported/configurable |
| Web search/fetch | ✅ Core |
| Workspace RAG fallback | ✅ Available where configured |
| Tool cache | ✅ Core |
| Session continuity | ✅ Core |
| Memory/context files | ✅ Core/advanced |
| Local Transformers fallback | 🧪 Advanced fallback path |
| MCP integration | ✅ Advanced |
| Skills | ✅ Supported/advanced |
| Extensions | ✅ Advanced |
| Custom commands | ✅ Advanced |
| Checkpointing | ✅ Available, usually opt-in |
| Policy engine | ✅ Advanced |
| Trusted folders | ✅ Security feature |
| Sandboxing | ✅ Available/config-dependent |
| Subagents | 🧪 Experimental/advanced |
| Signal CLI tooling | 🧪 Advanced integration/tooling |
| Enterprise config layering | ✅ Advanced |

---

## 🏆 Why Phill CLI Stands Out

Phill CLI is not just another chat wrapper.

It is built around a simple idea:

> **The terminal is still the most powerful developer interface, and an AI agent should meet developers there with local control, real tools, provider freedom, memory, extensibility, and safety rails.**

Phill CLI stands out because it combines:

- Local-first model support
- Multi-provider routing
- Workspace-aware tools
- Web search/fetch with degraded fallbacks
- Local workspace RAG paths where available
- Policy-based tool governance
- Checkpointing and restore
- MCP integration
- Skills
- Extensions
- Sandboxing
- Trusted-folder controls
- Custom commands
- Signal CLI tooling
- Headless automation
- CLI-native ergonomics

That makes it especially compelling for power users who want an agent they can shape, restrict, extend, automate, and run close to their own code.

---

## 🧪 Development

### Clone and build

```bash
git clone https://github.com/ayjays132/phill-cli.git
cd phill-cli
npm install
npm run build
```

### Useful commands

```bash
npm run test
npm run typecheck
npm run lint
```

### Focused Ollama smoke test

```bash
node scripts/test_ollama.js
```

The Ollama smoke script checks:

- Connectivity to the configured Ollama endpoint
- Available installed models from `/api/tags`
- Tool-calling behavior
- A short concurrent-request stability pass

If the requested model is missing, the script will automatically choose an installed model so the smoke test can still run.

Example with explicit selection:

```bash
OLLAMA_MODEL=llama3 OLLAMA_CONCURRENCY=3 node scripts/test_ollama.js
```

---

## 🤝 Contributing

Contributions are welcome.

Recommended workflow:

1. Keep changes scoped to a clear problem.
2. Run build, lint, typecheck, and relevant tests.
3. Update docs when behavior changes.
4. Prefer grounded docs over marketing claims, especially for provider support, security features, local execution, and offline behavior.
5. Call out experimental features clearly.
6. Add examples where possible.

For contribution details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📜 License

Phill CLI is released under the Apache-2.0 license.

See [LICENSE](./LICENSE) for details.

---

## 🙏 Credits

Phill CLI builds on open-source foundations and is released as an open-source project.

The project is associated with Phill / Phillip A. Holland Jr. and is forked from Google’s Gemini CLI foundation. Credit to the upstream Gemini CLI project and the wider open-source ecosystem that makes terminal-native agents possible.

---

## ⚠️ Final Note

Phill CLI is powerful. Use it thoughtfully.

Any AI agent that can run tools, edit files, fetch URLs, call MCP servers, or execute shell commands should be treated like a junior developer with terminal access: useful, fast, creative, and always worth supervising when the stakes are high.

Use policies. Use checkpoints. Use sandboxing. Review diffs. Keep control.

**Welcome to Phill CLI. Build fast. Stay sovereign. ⚡**
