# Forge UI Mobile-Responsiveness Walkthrough

## Overview
The Forge UI has been refactored to be fully mobile-responsive, ensuring an "extraordinary" user experience across all devices. This transition involved moving from a desktop-centric grid layout to a fluid, breakpoint-aware architecture.

## Primary Changes

### 1. Global Navigation Architecture
- **Desktop Rail**: A persistent vertical nav rail on the left.
- **Mobile Dock**: A bottom navigation bar for primary tools (Canvas, Workbench, Visuals, Court).
- **Control Drawer**: A slide-in sidebar on mobile for "Logic & Governance" (Pulse, Reality, Terminal), keeping the main tools focused.

### 2. Module Optimizations

#### Forge Canvas
- **Viewport**: Automatically hides side-controls on mobile to maximize the canvas area.
- **Header**: Condensed title and actions.

#### Neural Workbench
- **Mobile View**: Replaces the split-screen view with a detail-view pattern.
- **Inspector**: Takes over the screen when a trace is selected for deep analysis.

#### High Court
- **Tab System**: Uses a horizontally scrollable tab bar on mobile.
- **Vertical Stacking**: Oracle, Uplink, and Genetic sections stack vertically for a scrollable feed experience.

#### Reality Field
- **Full-Screen Editor**: Maximizes the code editor space.
- **Action Bar**: Fixed bottom action bar for "Initiate Run" and "Staple" on mobile.

#### Terminal & Metrics
- **Condensed HUD**: Scales down the "God-View" status bar.
- **Stacked Layout**: Terminal command line moves above the traffic stream on mobile.

## Design tokens used
- `sm:` (640px+) for tablet/desktop transitions.
- `lg:` (1024px+) for advanced grid layouts.
- `text-xs` to `text-6xl` responsive scaling.
- `p-4` to `p-12` responsive padding.

## Next Steps
- Extensive testing on physical mobile devices.
- Performance optimization for low-end mobile hardware.
