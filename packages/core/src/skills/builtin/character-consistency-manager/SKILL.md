---
name: Character Consistency Manager
description: Manages character sheets and style guides to ensure visual consistency across generations.
version: 1.0.0
---

# Character Consistency Manager

This skill is responsible for maintaining the visual identity of characters across multiple image generations. It acts as the "Memory" for character designs.

## Capabilities

1.  **Character Sheets**: distinct profiles for characters including their physical appearance, clothing, and typical expressions.
2.  **Prompt Formulation**: providing the exact "ingredients" and prompt segments to other tools to recreate a character.
3.  **Seed Management**: Tracking successful seeds to use as a baseline.

## Instructions

### 1. Defining a Character

When the user introduces a new character:
1.  Ask for key details: Hair color, eye color, clothing, distinct features (scars, accessories).
2.  Create a "Character Sheet" (in memory or scratchpad).
3.  Generate a reference image using `image_generation_imagen` to lock in the look.

### 2. Enforcing Consistency

When generating a scene with a known character:
1.  **Retrieve Ingredients**: usage the `ingredients` parameter of `image_generation_imagen`.
    *   `style`: Keep consistent (e.g., "Anime").
    *   `mood`: Variable based on scene.
2.  **Prompt Injection**: Automatically append the character's specific visual description to the prompt.
    *   *Example*: "Hero (young man, spiky blue hair, red scarf, black tactical vest)..."
3.  **Seed Reuse**: If a specific pose is not required, try reusing the seed of a reference image for facial consistency.

### 3. Collaboration

Work closely with `Webtoon Architect`. When `Webtoon Architect` requests a character, provide the full prompt description and recommended ingredients.

## Example Character Data

*   **Name**: Akira
*   **Description**: "Teenage boy, messy black hair, golden eyes, wearing a cyberpunk school uniform."
*   **Ingredients**: `{ "style": "cyberpunk anime", "camera": "portrait" }`
