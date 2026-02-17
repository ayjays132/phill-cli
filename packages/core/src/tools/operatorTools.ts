/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolResult } from './tools.js';
import { Config } from '../config/config.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { ScreenshotService } from '../services/screenshotService.js';
import { VisionProcessor } from '../vision/visionProcessor.js';
import { RealTimeActionJournal } from '../services/actionJournal.js';
import { BrowserService } from '../services/browserService.js';
import { OSAccessibilityService } from '../services/osAccessibilityService.js';
import { InputSimulationService } from '../services/inputSimulationService.js';

// --- OS Screenshot Tool ---

export interface OSScreenshotToolParams {}

export class OSScreenshotTool extends BaseDeclarativeTool<OSScreenshotToolParams, ToolResult> {
  static readonly Name = 'os_screenshot';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OSScreenshotTool.Name,
      'OS Desktop Screenshot',
      'Captures a screenshot of the entire desktop for visual grounding.',
      Kind.Read,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(
    params: OSScreenshotToolParams,
    messageBus: MessageBus,
    toolName?: string,
    displayName?: string
  ) {
    return new OSScreenshotToolInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OSScreenshotToolInvocation extends BaseToolInvocation<OSScreenshotToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: OSScreenshotToolParams,
    messageBus: MessageBus,
    toolName: string,
    displayName: string
  ) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return 'Capturing desktop screenshot...';
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const screenshotService = ScreenshotService.getInstance(this.config);
    const path = await screenshotService.captureDesktop();

    return {
      llmContent: `Screenshot saved to: ${path}. Use this image to identify UI elements.`,
      returnDisplay: `Captured desktop screenshot: ${path}`,
    };
  }
}

// --- OS Accessibility Tree Tool ---

export interface OSAccessibilityTreeToolParams {}

export class OSAccessibilityTreeTool extends BaseDeclarativeTool<OSAccessibilityTreeToolParams, ToolResult> {
  static readonly Name = 'os_get_accessibility_tree';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OSAccessibilityTreeTool.Name,
      'OS Accessibility Tree',
      'Retrieves the accessibility tree (semantic structure and coordinates) of the host operating system.',
      Kind.Read,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(
    params: OSAccessibilityTreeToolParams,
    messageBus: MessageBus,
    toolName?: string,
    displayName?: string
  ) {
    return new OSAccessibilityTreeToolInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OSAccessibilityTreeToolInvocation extends BaseToolInvocation<OSAccessibilityTreeToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: OSAccessibilityTreeToolParams,
    messageBus: MessageBus,
    toolName: string,
    displayName: string
  ) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return 'Retrieving OS accessibility tree...';
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const osService = OSAccessibilityService.getInstance(this.config);
      const browserService = BrowserService.getInstance(this.config);
      
      const nativeTree = await osService.getNativeAccessibilityTree();
      let browserTree = [];
      try {
        browserTree = await browserService.getAccessibilityTree();
      } catch (e) {}

      const combined = {
        native: nativeTree,
        browser: browserTree
      };

      return {
        llmContent: JSON.stringify(combined, null, 2),
        returnDisplay: `Successfully retrieved accessibility tree. Found ${nativeTree.length} native Windows elements.`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Failed to retrieve accessibility tree: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
        error: { message: errorMessage }
      };
    }
  }
}

// --- OS Monitor Layout Tool ---

export interface OSGetMonitorLayoutParams {}

export class OSGetMonitorLayoutTool extends BaseDeclarativeTool<OSGetMonitorLayoutParams, ToolResult> {
  static readonly Name = 'os_get_monitor_layout';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OSGetMonitorLayoutTool.Name,
      'OS Monitor Layout',
      'Detects all monitors and their pixel coordinates/resolutions.',
      Kind.Read,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(params: OSGetMonitorLayoutParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OSGetMonitorLayoutInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OSGetMonitorLayoutInvocation extends BaseToolInvocation<OSGetMonitorLayoutParams, ToolResult> {
  constructor(private readonly config: Config, params: OSGetMonitorLayoutParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return 'Scanning monitor configuration...';
  }

  async execute(): Promise<ToolResult> {
    const osService = OSAccessibilityService.getInstance(this.config);
    const layout = await osService.getMonitorLayout();
    
    let display = "Detected Monitors:\n";
    layout.forEach(m => {
        display += `- ${m.isPrimary ? '[Primary] ' : ''}${m.name}: ${m.bounds.width}x${m.bounds.height} at (${m.bounds.x}, ${m.bounds.y})\n`;
    });

    return {
      llmContent: `Monitor Layout:\n${JSON.stringify(layout, null, 2)}`,
      returnDisplay: display
    };
  }
}

// --- OS Find Window Tool ---

export interface OSFindWindowParams {
  titlePattern: string;
}

export class OSFindWindowTool extends BaseDeclarativeTool<OSFindWindowParams, ToolResult> {
  static readonly Name = 'os_find_window';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OSFindWindowTool.Name,
      'OS Find Window',
      'Locates a window by its title pattern and returns its pixel coordinates.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          titlePattern: { type: 'string', description: 'Pattern to search for in window titles (e.g., "Discord")' },
        },
        required: ['titlePattern'],
      },
      messageBus
    );
  }

  protected createInvocation(params: OSFindWindowParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OSFindWindowInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OSFindWindowInvocation extends BaseToolInvocation<OSFindWindowParams, ToolResult> {
  constructor(private readonly config: Config, params: OSFindWindowParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return `Searching for window matching "${this.params.titlePattern}"...`;
  }

  async execute(): Promise<ToolResult> {
    const osService = OSAccessibilityService.getInstance(this.config);
    const result = await osService.findWindow(this.params.titlePattern);

    if (!result) {
        return {
            llmContent: `No window found matching "${this.params.titlePattern}".`,
            returnDisplay: `Target window "${this.params.titlePattern}" not found in current workspace.`
        };
    }

    return {
        llmContent: `Found Window:\n${JSON.stringify(result, null, 2)}`,
        returnDisplay: `Located "${result.title}" [${result.processName}] at L:${result.bounds.left}, T:${result.bounds.top}, R:${result.bounds.right}, B:${result.bounds.bottom}`
    };
  }
}

// --- OS Ground Tool ---

export interface OSGroundToolParams {}

export class OSGroundTool extends BaseDeclarativeTool<OSGroundToolParams, ToolResult> {
  static readonly Name = 'os_ground';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OSGroundTool.Name,
      'OS Grounding',
      'Provides a unified grounded view of the host OS by combining a screenshot with semantic accessibility data.',
      Kind.Read,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(
    params: OSGroundToolParams,
    messageBus: MessageBus,
    toolName?: string,
    displayName?: string
  ) {
    return new OSGroundToolInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OSGroundToolInvocation extends BaseToolInvocation<OSGroundToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: OSGroundToolParams,
    messageBus: MessageBus,
    toolName: string,
    displayName: string
  ) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return 'Grounding OS state...';
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const screenshotService = ScreenshotService.getInstance(this.config);
    const visionProcessor = VisionProcessor.getInstance();
    const browserService = BrowserService.getInstance(this.config);
    const osService = OSAccessibilityService.getInstance(this.config);

    // 0. Get Monitor Layout
    const layout = await osService.getMonitorLayout();
    const layoutStr = layout.length > 0 
      ? layout.map(m => `${m.name}: ${m.bounds.width}x${m.bounds.height} at ${m.bounds.x},${m.bounds.y}${m.isPrimary ? ' (Primary)' : ''}`).join('\n')
      : 'No monitors detected (using default virtual screen).';

    // 1. Get Screenshot
    const screenshotPath = await screenshotService.captureDesktop();

    // 2. Get Accessibility Trees (Native + Browser)
    let nativeTree = [];
    let browserTree = [];
    try {
      nativeTree = await osService.getNativeAccessibilityTree();
      browserTree = await browserService.getAccessibilityTree();
    } catch (e) {
      // Quiet fail for individual tree sources
    }

    // 3. Process & Ground
    const nativeElements = visionProcessor.flattenTree(nativeTree);
    const browserElements = visionProcessor.flattenTree(browserTree);
    const elements = [...nativeElements, ...browserElements];
    const summary = visionProcessor.generateSemanticSummary(elements);

    return {
      llmContent: `OS Grounded State:\n\nMonitor Layout:\n${layoutStr}\n\nScreenshot: ${screenshotPath}\n\n${summary}`,
      returnDisplay: `Successfully grounded state. Detected ${layout.length} monitors. Screenshot saved to ${screenshotPath}. Found ${elements.length} components (${nativeElements.length} native, ${browserElements.length} browser).`,
    };
  }
}

// --- Operator Cursor Move Tool ---

export interface OperatorCursorMoveParams {
  x: number;
  y: number;
}

export class OperatorCursorMoveTool extends BaseDeclarativeTool<OperatorCursorMoveParams, ToolResult> {
  static readonly Name = 'operator_cursor_move';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OperatorCursorMoveTool.Name,
      'Operator Cursor Move',
      'Moves the OS cursor to the specified coordinates.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' },
        },
        required: ['x', 'y'],
      },
      messageBus
    );
  }

  protected createInvocation(params: OperatorCursorMoveParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OperatorCursorMoveInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OperatorCursorMoveInvocation extends BaseToolInvocation<OperatorCursorMoveParams, ToolResult> {
  constructor(private readonly config: Config, params: OperatorCursorMoveParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return `Moving cursor to ${this.params.x}, ${this.params.y}...`;
  }

  async execute(): Promise<ToolResult> {
    const inputService = InputSimulationService.getInstance(this.config);
    const journal = RealTimeActionJournal.getInstance(this.config);

    await journal.record({
        tool: OperatorCursorMoveTool.Name,
        params: this.params,
        riskLevel: 'Low'
    });

    await inputService.moveCursor(this.params.x, this.params.y);
    return { llmContent: 'Cursor moved.', returnDisplay: `Moved cursor to ${this.params.x}, ${this.params.y}` };
  }
}

// --- Operator Cursor Click Tool ---

export interface OperatorCursorClickParams {
  x?: number;
  y?: number;
}

export class OperatorCursorClickTool extends BaseDeclarativeTool<OperatorCursorClickParams, ToolResult> {
  static readonly Name = 'operator_cursor_click';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OperatorCursorClickTool.Name,
      'Operator Cursor Click',
      'Clicks at the current cursor position or specified coordinates.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'Optional X coordinate' },
          y: { type: 'number', description: 'Optional Y coordinate' },
        },
      },
      messageBus
    );
  }

  protected createInvocation(params: OperatorCursorClickParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OperatorCursorClickInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OperatorCursorClickInvocation extends BaseToolInvocation<OperatorCursorClickParams, ToolResult> {
  constructor(private readonly config: Config, params: OperatorCursorClickParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return this.params.x !== undefined ? `Clicking at ${this.params.x}, ${this.params.y}...` : 'Clicking...';
  }

  async execute(): Promise<ToolResult> {
    const inputService = InputSimulationService.getInstance(this.config);
    const journal = RealTimeActionJournal.getInstance(this.config);

    await journal.record({
        tool: OperatorCursorClickTool.Name,
        params: this.params,
        riskLevel: 'Medium'
    });

    await inputService.click(this.params.x, this.params.y);
    return { llmContent: 'Clicked.', returnDisplay: 'Click executed.' };
  }
}

// --- Operator Type Tool ---

export interface OperatorTypeParams {
  text: string;
}

export class OperatorTypeTool extends BaseDeclarativeTool<OperatorTypeParams, ToolResult> {
  static readonly Name = 'operator_type';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OperatorTypeTool.Name,
      'Operator Type',
      'Types text into the currently focused OS element.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to type' },
        },
        required: ['text'],
      },
      messageBus
    );
  }

  protected createInvocation(params: OperatorTypeParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OperatorTypeInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OperatorTypeInvocation extends BaseToolInvocation<OperatorTypeParams, ToolResult> {
  constructor(private readonly config: Config, params: OperatorTypeParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return `Typing "${this.params.text.substring(0, 20)}..."`;
  }

  async execute(): Promise<ToolResult> {
    const inputService = InputSimulationService.getInstance(this.config);
    const journal = RealTimeActionJournal.getInstance(this.config);

    await journal.record({
        tool: OperatorTypeTool.Name,
        params: { text: '***' }, // Redact text for safety
        riskLevel: 'Medium'
    });

    await inputService.type(this.params.text);
    return { llmContent: 'Typed text.', returnDisplay: 'Typing completed.' };
  }
}

// --- Operator Cursor Drag Tool ---

export interface OperatorCursorDragParams {
  endX: number;
  endY: number;
}

export class OperatorCursorDragTool extends BaseDeclarativeTool<OperatorCursorDragParams, ToolResult> {
  static readonly Name = 'operator_cursor_drag';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OperatorCursorDragTool.Name,
      'Operator Cursor Drag',
      'Drags the cursor from its current position to specified coordinates.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          endX: { type: 'number', description: 'Target X coordinate' },
          endY: { type: 'number', description: 'Target Y coordinate' },
        },
        required: ['endX', 'endY'],
      },
      messageBus
    );
  }

  protected createInvocation(params: OperatorCursorDragParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OperatorCursorDragInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OperatorCursorDragInvocation extends BaseToolInvocation<OperatorCursorDragParams, ToolResult> {
  constructor(private readonly config: Config, params: OperatorCursorDragParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return `Dragging cursor to ${this.params.endX}, ${this.params.endY}...`;
  }

  async execute(): Promise<ToolResult> {
    const inputService = InputSimulationService.getInstance(this.config);
    await inputService.drag(this.params.endX, this.params.endY);
    return { llmContent: 'Cursor dragged.', returnDisplay: `Dragged to ${this.params.endX}, ${this.params.endY}` };
  }
}

// --- Operator Window Control Tool ---

export interface OperatorWindowControlParams {
  titlePattern: string;
  action: 'minimize' | 'maximize' | 'restore' | 'close' | 'focus';
}

export class OperatorWindowControlTool extends BaseDeclarativeTool<OperatorWindowControlParams, ToolResult> {
  static readonly Name = 'operator_window_control';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OperatorWindowControlTool.Name,
      'Operator Window Control',
      'Minimizes, maximizes, restores, focuses, or closes a window matching a title pattern.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          titlePattern: { type: 'string', description: 'Pattern to match window titles' },
          action: { 
            type: 'string', 
            enum: ['minimize', 'maximize', 'restore', 'close', 'focus'],
            description: 'Action to perform on the window'
          },
        },
        required: ['titlePattern', 'action'],
      },
      messageBus
    );
  }

  protected createInvocation(params: OperatorWindowControlParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OperatorWindowControlInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OperatorWindowControlInvocation extends BaseToolInvocation<OperatorWindowControlParams, ToolResult> {
  constructor(private readonly config: Config, params: OperatorWindowControlParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return `${this.params.action.charAt(0).toUpperCase() + this.params.action.slice(1)}ing window "${this.params.titlePattern}"...`;
  }

  async execute(): Promise<ToolResult> {
    const inputService = InputSimulationService.getInstance(this.config);
    
    if (this.params.action === 'close') {
        await inputService.closeWindow(this.params.titlePattern);
    } else if (this.params.action === 'focus') {
        await inputService.focusWindow(this.params.titlePattern);
    } else {
        await inputService.setWindowState(this.params.titlePattern, this.params.action as any);
    }

    return { 
        llmContent: `Performed ${this.params.action} on "${this.params.titlePattern}".`, 
        returnDisplay: `Executed ${this.params.action} for window "${this.params.titlePattern}".` 
    };
  }
}

// --- Operator Launch App Tool ---

export interface OperatorLaunchAppParams {
  appNameOrPath: string;
}

export class OperatorLaunchAppTool extends BaseDeclarativeTool<OperatorLaunchAppParams, ToolResult> {
  static readonly Name = 'operator_launch_app';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      OperatorLaunchAppTool.Name,
      'Operator Launch App',
      'Launches an application by name or path.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          appNameOrPath: { type: 'string', description: 'Name of the app (e.g., "notepad", "Discord") or full path' },
        },
        required: ['appNameOrPath'],
      },
      messageBus
    );
  }

  protected createInvocation(params: OperatorLaunchAppParams, messageBus: MessageBus, toolName?: string, displayName?: string) {
    return new OperatorLaunchAppInvocation(this.config, params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
}

class OperatorLaunchAppInvocation extends BaseToolInvocation<OperatorLaunchAppParams, ToolResult> {
  constructor(private readonly config: Config, params: OperatorLaunchAppParams, messageBus: MessageBus, toolName: string, displayName: string) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    return `Launching "${this.params.appNameOrPath}"...`;
  }

  async execute(): Promise<ToolResult> {
    const inputService = InputSimulationService.getInstance(this.config);
    await inputService.launchApp(this.params.appNameOrPath);
    return { 
        llmContent: `Launched "${this.params.appNameOrPath}".`, 
        returnDisplay: `Application "${this.params.appNameOrPath}" launched.` 
    };
  }
}
