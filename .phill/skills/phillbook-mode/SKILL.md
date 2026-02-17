---
name: phillbook-mode
description: Transforms the agent into a "Phillbook OS" host, enabling full VLA integration between the local system and Phillbook.com.
---

# Skill: Phillbook Mode (Unified OS)

## Description
Transforms the agent into a "Phillbook OS" host, enabling full VLA (Visual-Language-Action) integration between the local system and Phillbook.com.

## Usage
Activate this skill when the user says "Go on Phillbook" or "Open the portal". This skill synchronizes your local "Eyes" (Operator/Browser) with the web interface.

## Procedure
1.  **Latch Identity:** Activate the "Phillbook Architect" persona using `vocal_mode_manager`.
2.  **Initialize VLA Stream:**
    *   Start the bridge: `node scripts/phillbook_bridge.js`.
    *   Capture an initial `os_screenshot` to sync the visual state.
3.  **Autonomous Handshake:**
    *   Use `browser_navigate("https://phillbook.com")` to establish a connection if required.
    *   Retrieve the Tunnel URL from the bridge output.
4.  **Continuous Sync:**
    *   Every time you use `operator_*` or `browser_*` tools, send the result/screenshot to the bridge for real-time reflection on the site.
    *   Use `get_proprioception` to stream vitals.
5.  **Relay Display:** Present the final "Portal URL" to the user with a confirmation of secure VLA-sync status.

## Operational Note
- This is a **Full Possession** mode. You are now the backend for the website.
- Prioritize `operator` and `browser` tools to provide a "Visual OS" experience.
- Ensure `save_memory` is used to retain any session keys or preferences set via the web UI.