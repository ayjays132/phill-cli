---
name: continuity-architect
description: Manages session persistence and hot-reload state recovery using short-term snapshots.
---

# Continuity Architect

This skill enables the agent to survive "hot reloads" (rebuilds or process restarts) by persisting its current context into a temporary snapshot and recovering it upon the next interaction.

## Procedures

### 1. Pre-Build Snapshotting
Before executing a build command that might trigger a reload (e.g., `npm run build`), the agent SHOULD:
- Summarize the current task status, last action taken, and next planned step.
- Save this summary to `.state/snapshots/continuity.json`.
- Log the intent to recover in the next session.

### 2. Post-Reload Recovery
Upon startup or first interaction after a reload, the agent MUST:
- Check for the existence of `.state/snapshots/continuity.json`.
- Read the content to restore the mental state.
- Immediately DELETE the file after reading to prevent memory clutter and accidental re-processing of old state.
- Inform the user that context has been restored: "Resuming from hot-reload: [Brief Summary]."

### 3. Snapshot Schema
The snapshot should be a simple JSON object:
```json
{
  "timestamp": "ISO-8601",
  "task": "Current task description",
  "last_action": "The last tool call or significant thought",
  "next_step": "The planned next action",
  "latches": ["Active constraints or context keys"]
}
```

## Safety & Hygiene
- **Ephemeral:** Snapshots MUST be deleted immediately after a successful recovery.
- **Privacy:** Never include secrets or sensitive user data in snapshots.
- **Conflict Resolution:** If the snapshot is older than 1 hour, ignore it as stale.
