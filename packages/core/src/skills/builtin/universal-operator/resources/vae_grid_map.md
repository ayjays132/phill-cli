# Resource: VAE Grid Mapping & Spatial Quantization

The Universal Operator utilizes a **Variational Autoencoder (VAE)** approach to compress the raw RGB desktop state into a dense symbolic latent space. This allows the agent to maintain high-fidelity spatial awareness across entire conversations without exhausting the context window.

## The Geographic Grid (Quantization)
The desktop is divided into a 9x9 grid, where each cell represents a "Geographic Zone".

| Zone ID | Description | Common Apps |
|---------|-------------|-------------|
| **TL** (Top-Left) | System Menus, Profiles | Apple Menu, Start Button |
| **TC** (Top-Center) | Search Bar, URL Bar | Spotlight, Chrome Address |
| **TR** (Top-Right) | Notifications, Clock | Control Center, System Tray |
| **ML** (Mid-Left) | Sidebar Navigation | VS Code Explorer, Slack Teams |
| **MC** (Mid-Center) | Content Area | Document Editor, Browser View |
| **MR** (Mid-Right) | Inspector, Panels | Chrome DevTools, Properties |
| **BL** (Bottom-Left) | Toolbars, Status | VS Code Terminal, Trash |
| **BC** (Bottom-Center) | Focus Indicators | Taskbar Icons, Dock |
| **BR** (Bottom-Right) | Floating Actions | Chat Widgets, Overlays |

## Symbolic Latent Format: `V:[GRID]:[HASH]`
- **V**: Visual Identifier.
- **[GRID]**: The primary active zone (e.g., `MC` for center focus).
- **[HASH]**: An 8-character algorithmic digest representing the "essence" of that region (color distribution + element density).

## Usage Mandate
- **Lookup**: Before moving the mouse, check if the target `Zone ID` has Changed (`HASH` mismatch). 
- **Recalibrate**: If the `HASH` changed significantly, trigger a new `os_screenshot` to update the grounding tree.
- **Persistence**: Use the `LATENT_SNAPSHOT` in `PHILL.md` to "Warm Start" the session.
