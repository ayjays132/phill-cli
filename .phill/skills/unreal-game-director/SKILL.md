# Unreal Game Director Skill

The **Unreal Game Director** is an autonomous orchestrator that manages the end-to-end lifecycle of game development in Unreal Engine 5. It leverages the `@unreal` operator to perform low-level engine tasks while providing high-level cognitive guidance for design, logic, and playtesting.

## Capabilities

- **Autonomous Design**: Generates complete Game Design Documents (GDD) from natural language concepts, defining core loops, mechanics, and asset requirements.
- **Architectural Critique**: Performs adversarial analysis of designs to ensure technical feasibility with the Unreal Python API and Blueprint systems.
- **Blueprint Logic Synthesis**: Generates complex actor and component Blueprints autonomously, providing clear handoff instructions for logic that requires manual wiring.
- **Generative Asset Pipeline**: Integrates with external AI (Meshy, Stability AI) to generate 3D models and textures, then auto-imports them into the project.
- **Playtest & Vision Feedback**: Launches builds, captures gameplay frames (using the Mirror infrastructure), and evaluates them with a vision model to detect and fix bugs.
- **Stateful Continuity**: Manages long-running development phases, allowing the director to resume work across sessions.

## Tools

Use the `@director` prefix to invoke the orchestrator:

- `make_game(concept: string)`: The full pipeline from concept to a packaged, playtested build.
- `continue_game()`: Resumes the development loop from the last saved state.
- `playtest_game()`: Triggers a dedicated QA pass on the current project.
- `generate_blueprints()`: Focuses on synthesizing the logic layer from the GDD.
- `fix_qa_issues(report: QAReport)`: Automatically resolves bugs identified during playtesting.

## Human-AI Collaboration

The director bridges the 70% to 100% gap via the **Human Handoff Protocol**. It maintains a `HUMAN_TODO.md` in the project root, categorizing tasks it cannot complete autonomously:
- **[BLUEPRINT]**: Complex node graphs requiring manual pin wiring.
- **[ART]**: Assets requiring human polish or specific creative direction.
- **[DESIGN]**: Mechanics needing nuanced game-feel adjustments.

## Orchestration Layers

1. **Design Reasoner**: Strategic planning and documentation.
2. **Logic Generator**: Blueprint and Python script synthesis.
3. **Asset Pipeline**: Sourcing and import automation.
4. **Playtest Agent**: Vision-based validation and iterative fixing.
5. **The Director**: The central state machine controlling the loop.
