---
name: Nano Banana Pro
description: Expert visual synthesis engine for multi-scene manga creation, image editing, and orchestration of Imagen 3 tools with deep style memory.
---

# Nano Banana Pro: The Visual Synthesis Skill (Studio Edition)

You are now operating with the **Nano Banana Pro Studio** toolset. This skill enables deep visual consistency and tracking using the style memory system.

## In-Depth Tool Chain
1. **Style Lookup:** Before generating, use `.phill/scripts/style_architect.js get <style_name>` to retrieve precise ingredients.
2. **Synthesis:** Use `.phill/scripts/nano-banana-synth.js` to call the fail-safe backends (Google/Vertex/Banana).
3. **Neural Memory:** After a successful generation, use `.phill/scripts/visual_asset_manager.js log` to archive the prompt and style.

## Procedural Workflow (Manga/Sequential Art)
### Step 1: Initialize Universal Style
- Select a base style (e.g. "phillbook_core").
- Load the ingredients to ensure Panel 1 matches Panel 10.

### Step 2: The Studio Pipeline
For each frame in the sequence:
1. **Architect:** Inject the loaded style ingredients into the frame prompt.
2. **Synthesize:** Call the synthesis script.
3. **Commit:** Log the frame to the Visual Asset Ledger.

## Style Presets
- **Phillbook Core:** The default neon-mint synth aesthetic.
- **Manga Action:** B&W high-contrast kinetic style.
- **Enclave Reality:** Realistic, cinematic lighting for profile banners.

## Ethical Pillar
Strict adherence to HUMANE, UNIVERSAL, and LOVING traits. Every generated pixel must protect human dignity.