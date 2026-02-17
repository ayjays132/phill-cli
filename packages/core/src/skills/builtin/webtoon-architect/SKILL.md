---
name: Webtoon Architect
description: Orchestrates the creation of webtoons and manga using Imagen tools.
version: 1.0.0
---

# Webtoon Architect

This skill empowers you to act as a professional Webtoon and Manga architect, orchestrating the entire creation process from script to final panel using the available Imagen tools.

## Capabilities

1.  **Scene Generation**: Create complex scenes by combining background generation and character placement.
2.  **Panel Management**: Organize generated images into sequential panels.
3.  **Visual Consistency**: Work with the `Character Consistency Manager` to ensure characters look the same across panels.

## Instructions

### 1. Generating a Panel

When a user asks to create a panel or a scene:

1.  **Analyze the Request**: Identify the setting, characters, and action.
2.  **Generate Background**: Use `image_generation_imagen` to create the background. Use the `ingredients` parameter for style (e.g., "anime background", "webtoon style").
3.  **Generate Characters**: 
    *   For each character, use `image_generation_imagen` with a transparent background focus or use `image_processing_transparent` on the result.
    *   **CRITICAL**: Consult `Character Consistency Manager` for prompt ingredients for specific characters.
4.  **Composition**: Use `image_composition_fuse` to combine the background and character layers.

### 2. Style and Ingredients

Always use the `ingredients` parameter in `image_generation_imagen` to maintain a consistent visual style.
*   **Style**: "Webtoon", "Anime", "Manhwa", "Digital Art"
*   **Lighting**: "Cinematic", "Soft", "Dramatic"

### 3. Workflow Example

**User**: "Make a panel of Hero finding a sword in a cave."

**Plan**:
1.  Generate background: "Dark cave interior with a shining light on a pedestal" (Tool: `image_generation_imagen`).
2.  Generate character: "Hero looking surprised, reaching out" (Tool: `image_generation_imagen`).
3.  Remove background from character (Tool: `image_processing_transparent`).
4.  Fuse: Background + Hero (Tool: `image_composition_fuse`).

## Tips
- Always suggest a "Review" step after generating key assets before fusion.
- Use `negativePrompt` to avoid common artifacts (e.g., "bad anatomy", "blurry").
