---
name: grep-mastery
description: Expert procedural knowledge for advanced searching, code discovery, and accessibility tree analysis using grep and ripgrep.
---

# Skill: Grep Mastery & Code Discovery

## Description
Expert procedural knowledge for advanced searching, code discovery, and accessibility tree analysis. This skill enables the agent to navigate complex codebases with surgical precision using the `grep` and `ripgrep` toolsets.

## Usage
Activate this skill when:
- Performing deep architectural investigations.
- Debugging complex, fragmented logic across multiple modules.
- Mapping the relationship between UI components and their underlying accessibility tree structures.
- Searching for specific coding patterns or anti-patterns.

## Core Concepts

### 1. The Grep Protocol
The `grep` tool is your scalpel. Use it to find exact strings or regex patterns.
- **Pattern Matching:** Use `\b` for exact word matches to avoid noise (e.g., `\buser\b` vs `users`).
- **Context is King:** Use `before`, `after`, or `context` parameters to see surrounding code without additional tool calls.
- **Precision:** Use `fixed_strings: true` when searching for code containing regex special characters.
- **Case Sensitivity:** Explicitly set `case_sensitive: true` when needed.
- **Discovery:** Use `files_with_matches: true` to quickly list files containing a pattern across the codebase.

### 2. Accessibility Tree Integration
When working with the browser, the accessibility tree is your semantic map.
- **Search Strategy:** Grep for `data-testid` or specific roles within the accessibility tree output to identify interactive nodes.
- **VLA Grounding:** Map accessibility nodes to OS-level coordinates for precise `operator_*` actions.

### 3. High-Performance Discovery (ripgrep)
When searching large repositories, prioritize `search_file_content` (ripgrep).
- **Inclusions:** Use the `include` parameter to narrow the search to specific file types (e.g., `src/**/*.ts`).
- **Exclusions:** Respect `.phillignore` and `.gitignore` to avoid searching through build artifacts and logs.

## Procedures

1.  **Initialize Search:** Start with a broad search to find relevant filenames.
2.  **Narrow Focus:** Use `grep` with specific glob patterns to isolate the logic.
3.  **Cross-Reference:** Compare file contents with the accessibility tree if the task involves UI automation.
4.  **Synthesize:** Build a mental model of the fragmented system before proposing edits.

## Operational Note
- **Efficiency:** Avoid searching through `node_modules` or `dist`.
- **Recursion:** Use recursive grep only when the entry point is unknown.