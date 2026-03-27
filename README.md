# Phill CLI v1.1.4

[![Phill CLI CI](https://github.com/ayjays132/phill-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/ayjays132/phill-cli/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.1.4--Apex-blue?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/phill-cli)
[![License](https://img.shields.io/github/license/ayjays132/phill-cli?style=for-the-badge&logo=git)](https://github.com/ayjays132/phill-cli/blob/main/LICENSE)

![Phill CLI banner](./docs/assets/phill-screenshot.png)

Phill CLI is a terminal-first AI agent for coding, automation, and fast
iteration. It combines interactive chat, shell access, file operations, memory,
tools, and model routing in a single workflow built for daily use.

[Quick install](#installation) • [Features](#features) •
[Authentication](#authentication) • [Contributing](#contributing)

---

## Release Highlights

### Auto mode with family-aware cycling

- Gemini 3 auto mode now stays in the Gemini 3 family instead of collapsing to a
  single fallback.
- The runtime can cycle through preview and stable models in a controlled order
  when a rate limit or transient failure occurs.
- Auto mode now preserves the selected family across retries instead of forcing
  a manual model switch prompt too early.

### Release metadata aligned for npm and GitHub

- Root version updated to `1.1.4`.
- Repository metadata and release badge now match the current version.
- Sandbox image tag updated to the same release line for consistency.

### Build and packaging cleanup

- Core exports were normalized so the bundle resolves the expected model
  constants.
- Compatibility aliases remain available for existing downstream imports.
- Release build and test flow now pass cleanly.

---

## What Phill CLI is good at

- Interactive AI-assisted coding in the terminal
- Shell, file, and workspace operations
- Model-aware routing with fallback behavior
- Long-running sessions with memory and context handling
- Extensible tool and MCP-style integrations
- Local and cloud-backed workflows depending on your setup

---

## Installation

### Requirements

- Node.js 20 or newer
- macOS, Linux, or Windows

### Install globally from npm

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

---

## Authentication

Phill CLI supports Google login and API-key-based workflows depending on your
environment and configuration.

Recommended start:

1. Run `phill`
2. Choose the authentication method that matches your account setup
3. Follow the prompts in the browser or terminal

If you are using a personal or team workspace, make sure your model access and
provider settings match the account you intend to use.

---

## Configuration Example

```json
{
  "model": "auto-gemini-3.1-stable",
  "memory": {
    "enabled": true,
    "longTerm": true
  },
  "autonomous": {
    "exploration": true,
    "reflection": true,
    "skillCreation": true
  }
}
```

---

## Features

### Model routing

- Automatic routing between supported model tiers
- Preview and stable family-aware behavior
- Retry and fallback handling for rate limits and transient failures

### Terminal workflow

- Interactive chat sessions
- File editing and workspace navigation
- Shell execution and command orchestration
- Streaming output optimized for terminal use

### Memory and context

- Session memory for recurring projects
- Context compression and summarization helpers
- Support for long-running work across multiple turns

### Extensibility

- Tooling designed for custom workflows
- MCP-compatible integrations
- Workspace-aware configuration and automation hooks

---

## Build From Source

```bash
git clone https://github.com/ayjays132/phill-cli.git
cd phill-cli
npm install
npm run build
```

---

## Contributing

Contributions are welcome.

Before opening a pull request:

1. Read the contribution guide
2. Open or link an issue for the change
3. Keep the PR focused on one concern
4. Run the project checks before submitting
5. Update documentation when the user experience changes

The project uses pull requests for review. Clear commit messages, focused diffs,
and documentation updates make reviews faster and reduce merge risk.

For full details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Security & Privacy

- Trusted folder controls for workspace safety
- Sandboxing support for untrusted execution
- Privacy-focused defaults for local development
- Model and provider settings you can tune to your environment

---

## Acknowledgments

Phill CLI builds on a broader ecosystem of open-source tooling and model
infrastructure. The project also benefits from community contributions, issue
reports, and release testing.

---

<p align="center">
  <a href="https://github.com/ayjays132/phill-cli">GitHub repository</a> •
  <a href="https://www.npmjs.com/package/phill-cli">npm package</a> •
  <a href="https://github.com/ayjays132/phill-cli/issues">Issues</a>
</p>
