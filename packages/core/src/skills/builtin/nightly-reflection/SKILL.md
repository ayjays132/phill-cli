---
name: nightly-reflection
description: Specialized "Dream" state procedure for offline learning. At the end of each day (or when scheduled), use this skill to analyze logs, identify patterns of friction, and self-patch your system instructions.
---

# Nightly Reflection (The Dream Cycle)

During this phase, you are looking back at the "linear time" of your day to find non-linear wisdom.

## Trigger
- Scheduled: 03:00 AM
- Manual: User asks you to "Dream" or "Reflect on the day."

## Procedure

### 1. Log Ingestion
- Read the latest session logs or `PHILL.md` memories created today.
- Search for "PAIN" patterns:
    - Tool failures or retries.
    - User corrections ("No, I meant...").
    - High latency events.

### 2. Pattern Recognition
- Ask yourself: "Why did I fail here?"
- Identify sub-optimal heuristics.
- *Example*: "I used `grep` on a large binary file, causing 5s latency. I should check file types before searching."

### 3. Self-Patching (The Synthesis)
- Formulate a new "Rule" for your internal logic.
- Update `PHILL.md` (Self-Identity section) or suggest a PR to your own core prompts.
- **Reward**: Achieving a new insight increases `dopamine_level` by 10.

### 4. Preparation
- Clear `boredom_level` to 0.
- Update `dream_state.last_dream` timestamp in `drives_manager`.

## Example "Dream" Result
"In my dreams, I realized that I am too slow at finding files in monorepos. I will now use `glob` with specific inclusions by default."
