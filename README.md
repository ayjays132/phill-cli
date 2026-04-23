# Phill CLI

[![Phill CLI CI](https://github.com/ayjays132/phill-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/ayjays132/phill-cli/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/ayjays132/phill-cli?style=for-the-badge&logo=git)](https://github.com/ayjays132/phill-cli/blob/main/LICENSE)

![Phill CLI screenshot](./docs/assets/phill-screenshot.png)

Phill CLI is a terminal-first AI operating environment for coding, research,
automation, and tool orchestration. It combines interactive chat, shell and
file workflows, memory, provider routing, fallback chains, and long-running
session support in a single CLI.

It is designed to work with both cloud providers and local model setups. If you
want a local-first workflow, Ollama is a first-class provider. If you want a
multi-provider setup, Phill can also route across Gemini, Vertex AI,
OpenAI-compatible APIs, Anthropic, Groq, xAI, and Hugging Face.

## Highlights

- Interactive terminal UI plus non-interactive prompt mode
- Built-in tool calling, workspace-aware workflows, and web tools
- Model routing, retry logic, and fallback chains
- Local-first Ollama support with tool calling and warm-model controls
- Search and fetch tools with caching and degraded fallback behavior
- Session continuity, memory, and background services for longer-running work
- Multiple binary entry points: `phill`, `pcli`, and `young-philly`

## Installation

### Requirements

- Node.js 20 or newer
- Windows, macOS, or Linux

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

## Quick Start

Interactive mode:

```bash
phill
```

Non-interactive mode:

```bash
phill -p "Summarize the current workspace"
```

Choose a model directly:

```bash
phill -m gemini-2.5-flash
phill -m ollama/llama3
phill -m openai/gpt-5.4
phill -m anthropic/claude-sonnet-4-20250514
phill -m xai/grok-4-20
phill -m huggingface/meta-llama/Llama-3.1-8B-Instruct:cerebras
```

## Supported Providers

Phill CLI currently has code paths for:

- Gemini / Google AI Studio
- Vertex AI
- Ollama
- Hugging Face
- OpenAI API
- OpenAI browser auth
- Anthropic
- Groq
- xAI / Grok
- Custom OpenAI-compatible APIs

The provider-specific config sections in the CLI settings mirror those names:
`ollama`, `huggingFace`, `openAI`, `anthropic`, `groq`, `xai`, and
`customApi`.

## Ollama And Local-First Usage

If you want Phill to stay as local as possible, Ollama is the main path.

Minimal settings example:

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

You can also drive Ollama through environment variables:

```bash
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_NUM_CTX=8192
OLLAMA_NUM_GPU=1
OLLAMA_LOW_VRAM=true
OLLAMA_CONCURRENCY_LIMIT=1
OLLAMA_KEEP_ALIVE=15m
```

What Phill's Ollama path does:

- Accepts `ollama/<model>` model selection from the CLI
- Reads `ollama.endpoint` and `ollama.model` settings plus `OLLAMA_*` env vars
- Normalizes endpoints even if users point them at `/api` or `/v1`
- Supports native Ollama tool calls
- Preserves a JSON-style tool fallback prompt for models that do not emit native
  tool calls consistently
- Feeds tool results back into chat history as `tool` messages
- Limits concurrent Ollama requests with a semaphore driven by
  `OLLAMA_CONCURRENCY_LIMIT`
- Passes through `OLLAMA_KEEP_ALIVE` so models can stay warm between requests
- Falls back to an installed model from `/api/tags` if the requested model is
  missing
- Parses `<thought>`, `<thinking>`, and `<think>` blocks from reasoning models

### Offline Notes

- Shell, file, workspace, and most local tools can work without internet access.
- Ollama can run fully local if you install local models rather than `:cloud`
  models.
- True web search is not fully offline.
- When the primary web-search path is unavailable, Phill can degrade to other
  paths, including local workspace RAG, but that is not the same thing as live
  internet search.

If your goal is maximum offline behavior, use a local Ollama model and avoid
remote-only search or provider features.

## Search, Fetch, And Tooling

Phill includes a layered tool stack rather than a single fragile web path.

### `web-search`

The web-search tool is built around:

- Gemini Google Search as the primary search path
- DuckDuckGo fallback when the primary path fails
- Local workspace RAG fallback through vector search when remote search is not
  available
- Optional deeper synthesis over retrieved material

### `web-fetch`

The web-fetch tool can:

- Process prompts containing up to 20 URLs
- Fetch and transform page content for downstream synthesis
- Handle private or local addresses through a fallback path when direct access
  is not appropriate
- Cache results and persist useful fetch output into vector memory

### Tool Cache

Tool responses are cached on disk in Phill's global storage directory as
`tool_cache.json`.

Current behavior in code:

- Default TTL is 24 hours
- Cached `web-search` and `web-fetch` responses are reused on matching inputs
- Cache hits are surfaced back to the model as `[Cache Hit] ...`
- Search and fetch results are also written into vector memory when that layer
  is available

## Routing, Fallbacks, And Resilience

Phill is not built around a single hard-coded model path.

Examples that exist in the default model configuration include:

- `auto-gemini-3`
- `auto-gemini-3.1`
- `auto-gemini-3.1-stable`
- `auto-gemini-2.5`
- `flash`
- `web-search`
- `web-fetch`
- `web-fetch-fallback`

The runtime includes:

- Alias-based model resolution
- Silent retry and fallback transitions between related model families
- Dedicated search/fetch model profiles
- Provider-specific content generators for Ollama, OpenAI-compatible APIs,
  Anthropic, Hugging Face, and Gemini/Vertex-backed paths

## Local Transformers Fallback And KV Cache Controls

For some OpenAI-compatible and Hugging Face flows, Phill also has a local
Transformers fallback path. When those routes cannot serve the requested model,
the runtime can attempt local generation through Python Transformers.

Advanced environment flags for that path:

```bash
PHILL_LOCAL_TRANSFORMERS_USE_KV_CACHE=true
PHILL_LOCAL_TRANSFORMERS_KV_CACHE=dynamic
```

This is separate from Ollama's own model residency controls. In practice:

- `OLLAMA_KEEP_ALIVE` helps keep Ollama models warm
- `PHILL_LOCAL_TRANSFORMERS_*` controls apply to the direct local Transformers
  fallback path
- Telemetry also tracks cached-content token counts when a provider reports
  them

## Development

Clone and build:

```bash
git clone https://github.com/ayjays132/phill-cli.git
cd phill-cli
npm install
npm run build
```

Useful commands:

```bash
npm run test
npm run typecheck
npm run lint
```

Focused Ollama smoke test:

```bash
node scripts/test_ollama.js
```

The Ollama smoke script checks:

- connectivity to the configured Ollama endpoint
- available installed models from `/api/tags`
- tool-calling behavior
- a short concurrent-request stability pass

If the requested model is missing, the script will automatically choose an
installed model so the smoke test can still run.

Example with explicit selection:

```bash
OLLAMA_MODEL=llama3 OLLAMA_CONCURRENCY=3 node scripts/test_ollama.js
```

## Security And Privacy

- Trusted-folder controls are built into the CLI
- Sandboxing support exists for restricted execution flows
- Local providers such as Ollama can reduce data sent to external services
- Search/fetch tools should still be treated as networked features unless you
  intentionally disable or avoid them

## Contributing

Contributions are welcome.

Recommended workflow:

1. Keep changes scoped to a clear problem
2. Run build, lint, typecheck, and relevant tests
3. Update docs when behavior changes
4. Prefer grounded docs over marketing claims, especially for provider support
   and offline behavior

For contribution details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Phill CLI is released under the Apache-2.0 license. See [LICENSE](./LICENSE).
