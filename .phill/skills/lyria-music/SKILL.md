---
name: lyria-music
description: Universal, generative AI music skill for creating, steering, and exporting high-quality audio for any purpose (games, films, apps, etc.).
---

# Lyria Music Generation Skill

This skill allows you to generate, stream, and export high-fidelity music using the Lyria model. It is designed to be universally applicable, serving as the central "music engine" for any project.

## Capabilities

1.  **Generate Music from Description**: Create music based on mood, genre, purpose, and instrumentation.
2.  **Adaptive Music Sessions**: Create dynamic, state-aware music streams that change in real-time (e.g., exploring -> combat).
3.  **Real-Time Steering**: Seamlessly transition music without stopping the stream.
4.  **Export to Any Format**: Save as WAV, MP3, OGG, or loop-ready assets.
5.  **Live Preview**: Stream audio directly to speakers for immediate feedback.
6.  **Clarification**: The skill intelligently asks for missing details to ensure the best result.

## Tools Provided

This skill exposes the following tools via the `@music` MCP server/interface:

-   `generate`: Create music from a prompt. Handles clarification, generation, and export.
-   `preview`: Stream a short snippet to speakers for quick ideation.
-   `adaptive_setup`: Initialize a session with multiple adaptive states (e.g., for a game).
-   `steer`: Manually transition the current music stream to a new state or mood.
-   `export`: Save the currently playing or generated audio to a file.
-   `stop`: Stop playback and clear the session.
-   `remix`: Adjust the current music parameters (e.g., "make it darker") while keeping the session active.

## Usage Examples

### 1. Simple Generation
```bash
@music generate "tense horror music for a 2 minute film scene, export as wav"
```

### 2. Adaptive Game Music
```bash
@music adaptive_setup for a stealth game with states: stealth, detected, combat, safe
@music steer to combat
# (Later)
@music steer to safe
```

### 3. Quick Ambience
```bash
@music preview "lo-fi hip hop for studying"
```

### 4. App UI Sounds
```bash
@music generate "short upbeat notification sound, 2 seconds, export as mp3"
```

## Architecture

The skill is built on a modular architecture:
-   **Clarifier**: Ensures intent is clear before generation.
-   **Prompt Builder**: Translates intent into weighted Lyria prompts.
-   **Session Manager**: Handles the WebSocket connection and stream lifecycle.
-   **State Controller**: Manages adaptive state transitions and crossfading.
-   **Output Handler**: Converts raw PCM audio to desired formats (WAV/MP3/OGG/Stream).

## Configuration

Ensure the `music` MCP server is registered in your settings:
```json
{
  "mcpServers": {
    "music": {
      "command": "node",
      "args": ["tools/lyria-music/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-key-here", // Required for intent clarification
        "LYRIA_API_KEY": "optional-key-here" // Optional, falls back to Google ADC (gcloud auth)
      }
    }
  }
}
```
Authentication works automatically:
1. Checks `LYRIA_API_KEY` or `GEMINI_API_KEY`.
2. check Google Application Default Credentials (ADC) via `gcloud auth application-default login`.
