# Unreal Engine Operator Skill

Comprehensive autonomous control over Unreal Engine 5.x for automated game creation, asset management, and level design.

## Capabilities

- **Project Management**: Create, configure, and initialize Unreal Engine projects from templates.
- **Level Orchestration**: Build entire levels from natural language descriptions using the internal Python API.
- **Asset Pipeline**: Automate importing of FBX, PNG, and WAV assets with auto-material generation.
- **AI Synthesis**: Configure NavMesh, AI Controllers, and Behavior Trees autonomously.
- **Build & Package**: Execute full BuildCookRun pipelines for Win64, Linux, Android, and iOS.
- **Live Mirroring**: Mirrored console command execution via the Remote Control HTTP API.

## Tools

Use the `@unreal` prefix to invoke these automation layers:

- `create_game_project(name: string, template: string)`: Initializes a new UE project.
- `build_level(prompt: string)`: Generates and executes Python scripts to build levels.
- `import_assets(source_paths: string[])`: Batch imports assets into the Content Browser.
- `configure_ai()`: Sets up the AI infrastructure for the current level.
- `build_and_package(platform: string, config: string)`: Runs the UAT pipeline.
- `exec_python(script: string)`: Runs custom Python logic in the editor.
- `remote_console(command: string)`: Sends live commands to a running Unreal Editor instance.

## Usage Patterns

### Creating a Level
"Create a forest level with a winding river, three enemy spawn points near the bridge, and a central campsite."
-> Phill will generate the Python script, spawn the actors, and save the map.

### Automated Packaging
"Cook and package the project for Win64 in Shipping configuration and save it to the /Builds folder."
-> Phill will trigger the UAT BuildCookRun pipeline.

## Implementation Details

This skill utilizes a 5-layer bridge:
1. **CLI Flags**: Hardcoded launch parameters.
2. **Commandlets**: Headless C++ automation tasks.
3. **Console Bridge**: Runtime command injection.
4. **Python API**: High-level editor scripting.
5. **UAT Bridge**: The Unreal Automation Tool for deployment.
