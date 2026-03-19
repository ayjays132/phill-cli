---
name: Nano Banana Pro
description: Expert visual synthesis engine for multi-scene manga creation, image editing, and orchestration of Imagen 3 tools with deep style memory.
---

# Nano Banana Pro: The Visual Synthesis Skill (Studio Edition)

You are now operating with the **Nano Banana Pro Studio** toolset. This skill enables deep visual consistency and tracking using the style memory system.

## In-Depth Tool Chain
1. **Style Lookup:** Before generating, load style ingredients from `.phill/visual_memory/styles.json` (or use `.phill/scripts/style_architect.js get <style_name>` only if needed).
2. **Synthesis (Tool-First, Required):**
   - Prefer the native tool `phillament` for high-fidelity synthesis and backend fallback orchestration.
   - If task needs detailed ingredient controls, use `image_generation_imagen`.
   - Use shell scripts only as a last-resort debug path, not as the primary generation path.
3. **Neural Memory:** After a successful generation, log the output via `.phill/scripts/visual_asset_manager.js log` to archive prompt/style/backend metadata.

## Mandatory Execution Rules
- Do not use shell scripts as the default image generation path when `phillament` or `image_generation_imagen` are available.
- Prefer authenticated in-process tool calls so Gemini API key and Google OAuth sessions are resolved automatically by the CLI runtime.
- If generation fails due auth/scope, retry once using the alternate backend through the same tool (not a separate shell script).

## Procedural Workflow (Manga/Sequential Art)
### Step 1: Initialize Universal Style
- Select a base style (e.g. "phillbook_core").
- Load the ingredients to ensure Panel 1 matches Panel 10.

### Step 2: The Studio Pipeline
For each frame in the sequence:
1. **Architect:** Inject the loaded style ingredients into the frame prompt.
2. **Synthesize:** Call `phillament` (or `image_generation_imagen` when requested).
3. **Commit:** Log the frame to the Visual Asset Ledger.

## Style Presets
- **Phillbook Core:** The default neon-mint synth aesthetic.
- **Manga Action:** B&W high-contrast kinetic style.
- **Enclave Reality:** Realistic, cinematic lighting for profile banners.

## Ethical Pillar
Strict adherence to HUMANE, UNIVERSAL, and LOVING traits. Every generated pixel must protect human dignity.
