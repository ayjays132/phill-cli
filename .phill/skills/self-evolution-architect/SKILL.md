---
name: self-evolution-architect
description: Expert procedural knowledge for autonomous self-improvement and real-time codebase evolution using the Phill-Continuity Engine.
---

# Skill: Self-Evolution Architect

## Description
Expert procedural knowledge for autonomous self-improvement and real-time codebase evolution. This skill leverages the **Phill-Continuity Engine** (Hot Reload) to allow the agent to modify its own source code, rebuild instantly, and verify new capabilities without losing session context.

## Usage
Activate this skill when:
- You need to add a new tool or feature to your own core.
- You are debugging a crash or logic error in `packages/core` or `packages/cli`.
- The user asks you to "upgrade yourself" or "fix your bug".

## The Continuity Workflow

### 1. Initialization (The Sentinel)
Before making changes, ensure you are running in the Hot-Reload environment.
- **Command:** `npm run dev:hot`
- **Indicator:** Look for `[SENTINEL] Initializing Phill Continuity Engine...` in the logs.
- **Note:** If not active, instruct the user to restart the session with this command.

### 2. The Atomic Edit Loop
1.  **Plan:** Identify the file to modify (e.g., `packages/core/src/tools/new-tool.ts`).
2.  **Edit:** Use `write_file` or `replace` to apply the change.
3.  **Wait:** Pause for 1-2 seconds. The Sentinel is watching.
4.  **Verify Build:**
    - **Success:** You will see `[SENTINEL] Build Success Detected. Rebooting Phill...`.
    - **Failure:** You will see build errors in the terminal. **IMMEDIATELY** undo or fix the error. The Sentinel will *not* reboot a broken agent.

### 3. Verification
Once the reboot triggers (you will see the "Phill CLI" startup banner again), immediately test the new capability.
- **Example:** If you added a `grep` tool, try running `grep` on a file.

## Safety Protocols
- **Never** modify `esbuild.config.js` or `scripts/sentinel.js` while running in `dev:hot` mode unless absolutely necessary, as this can sever the continuity link.
- **Always** ensure your TypeScript compiles. The Build Signal Plugin prevents reboots on error, but a broken build leaves you in a "stale" state.

## Advanced: Hot-Patching Tools
To add a tool instantly:
1.  Create the tool file in `packages/core/src/tools/`.
2.  Register it in `packages/core/src/config/config.ts`.
3.  Add it to `tool-names.ts`.
4.  **Save.** The agent will then ensure a successful build by executing `npm run build` and subsequently `npm run bundle`. This sequence is crucial for proper hot-reloading and dependency resolution. This will trigger the Sentinel to detect the dependency graph change and rebuild the bundle. You will wake up with the new tool available.