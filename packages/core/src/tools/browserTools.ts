/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import type { Config } from '../config/config.js';
import { BrowserService } from '../services/browserService.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { OperatorLatentSync } from '../services/operatorLatentSync.js';

// --- Browser Start Tool ---

export interface BrowserStartToolParams {}

export class BrowserStartTool extends BaseDeclarativeTool<BrowserStartToolParams, ToolResult> {
  static readonly Name = 'browser_start';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserStartTool.Name,
      'Start Browser',
      'Starts the browser for automation.',
      Kind.Execute,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserStartToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserStartToolParams, ToolResult> {
    return new BrowserStartToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserStartToolInvocation extends BaseToolInvocation<BrowserStartToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserStartToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return 'Starting browser...';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.startBrowser();
    
    // [Autonomy Hook] Start Latent Sync for Browser Grounding
    OperatorLatentSync.getInstance(this.config).startSync();

    return {
      llmContent: 'Browser started successfully.',
      returnDisplay: 'Browser started.',
    };
  }
}


// --- Browser Navigate Tool ---

export interface BrowserNavigateToolParams {
  url: string;
}

export class BrowserNavigateTool extends BaseDeclarativeTool<BrowserNavigateToolParams, ToolResult> {
  static readonly Name = 'browser_navigate';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserNavigateTool.Name,
      'Navigate Browser',
      'Navigates the browser to a specific URL.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to navigate to.' },
        },
        required: ['url'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserNavigateToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserNavigateToolParams, ToolResult> {
    return new BrowserNavigateToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserNavigateToolInvocation extends BaseToolInvocation<BrowserNavigateToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserNavigateToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Navigating to ${this.params.url}...`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.navigate(this.params.url);
    return {
      llmContent: `Navigated to ${this.params.url}`,
      returnDisplay: `Navigated to ${this.params.url}`,
    };
  }
}


// --- Browser Click Tool ---

export interface BrowserClickToolParams {
  selector: string;
}

export class BrowserClickTool extends BaseDeclarativeTool<BrowserClickToolParams, ToolResult> {
  static readonly Name = 'browser_click';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserClickTool.Name,
      'Click Element',
      'Clicks on an element on the page identified by a selector.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of the element to click.' },
        },
        required: ['selector'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserClickToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserClickToolParams, ToolResult> {
    return new BrowserClickToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserClickToolInvocation extends BaseToolInvocation<BrowserClickToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserClickToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Clicking element: ${this.params.selector}`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.click(this.params.selector);
    return {
      llmContent: `Clicked ${this.params.selector}`,
      returnDisplay: `Clicked ${this.params.selector}`,
    };
  }
}


// --- Browser Type Tool ---

export interface BrowserTypeToolParams {
  selector: string;
  text: string;
}

export class BrowserTypeTool extends BaseDeclarativeTool<BrowserTypeToolParams, ToolResult> {
  static readonly Name = 'browser_type';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserTypeTool.Name,
      'Type Text',
      'Types text into an element on the page.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of the element to type into.' },
          text: { type: 'string', description: 'The text to type.' },
        },
        required: ['selector', 'text'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserTypeToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserTypeToolParams, ToolResult> {
    return new BrowserTypeToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserTypeToolInvocation extends BaseToolInvocation<BrowserTypeToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserTypeToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Typing "${this.params.text}" into ${this.params.selector}`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.type(this.params.selector, this.params.text);
    return {
      llmContent: `Typed "${this.params.text}" into ${this.params.selector}`,
      returnDisplay: `Typed "${this.params.text}" into ${this.params.selector}`,
    };
  }
}


// --- Browser Screenshot Tool ---

export interface BrowserScreenshotToolParams {}

export class BrowserScreenshotTool extends BaseDeclarativeTool<BrowserScreenshotToolParams, ToolResult> {
  static readonly Name = 'browser_screenshot';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserScreenshotTool.Name,
      'Capture Screenshot',
      'Captures a screenshot of the current page.',
      Kind.Read,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserScreenshotToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserScreenshotToolParams, ToolResult> {
    return new BrowserScreenshotToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserScreenshotToolInvocation extends BaseToolInvocation<BrowserScreenshotToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserScreenshotToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return 'Capturing screenshot...';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    const buffer = await browserService.getScreenshot();
    
    if (!buffer) {
       return {
        llmContent: 'Failed to capture screenshot (browser might not be open)',
        returnDisplay: 'Failed to capture screenshot.',
        error: { message: 'Browser not open' }
      };
    }

    const tempDir = this.config.storage.getProjectTempDir();
    const cleanPath = (await import('path')).join(tempDir, `screenshot_${Date.now()}.png`);
    const fs = await import('fs/promises');
    await fs.writeFile(cleanPath, buffer);

    // Attempt to upload to Gemini File API for VLA
    let uriMessage = '';
    try {
      const { FileService } = await import('../services/fileService.js');
      const fileService = FileService.getInstance(this.config);
      const uri = await fileService.uploadFile(cleanPath, 'image/png');
      if (uri) {
        uriMessage = `\nFile URI: ${uri}`;
      }
    } catch (e) {
      // Ignored
    }

    return {
      llmContent: `Screenshot saved to ${cleanPath}${uriMessage}`,
      returnDisplay: `Screenshot saved to ${cleanPath}`,
    };
  }
}

// --- Browser Scroll Tool ---

export interface BrowserScrollToolParams {
  direction: 'up' | 'down' | 'top' | 'bottom';
  amount?: number;
  selector?: string;
}

export class BrowserScrollTool extends BaseDeclarativeTool<BrowserScrollToolParams, ToolResult> {
  static readonly Name = 'browser_scroll';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserScrollTool.Name,
      'Scroll Page',
      'Scrolls the page or a specific element.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down', 'top', 'bottom'], description: 'Direction to scroll.' },
          amount: { type: 'number', description: 'Amount to scroll in pixels (default 500).' },
          selector: { type: 'string', description: 'Selector of the element to scroll (optional).' },
        },
        required: ['direction'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserScrollToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserScrollToolParams, ToolResult> {
    return new BrowserScrollToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserScrollToolInvocation extends BaseToolInvocation<BrowserScrollToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserScrollToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Scrolling ${this.params.direction}...`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.scroll(this.params.selector, this.params.direction, this.params.amount);
    return {
      llmContent: `Scrolled ${this.params.direction}`,
      returnDisplay: `Scrolled ${this.params.direction}`,
    };
  }
}


// --- Browser Get Content Tool ---

export interface BrowserGetContentToolParams {
  format: 'text' | 'markdown' | 'html';
}

export class BrowserGetContentTool extends BaseDeclarativeTool<BrowserGetContentToolParams, ToolResult> {
  static readonly Name = 'browser_get_content';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserGetContentTool.Name,
      'Get Page Content',
      'Extracts the content of the current page.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['text', 'markdown', 'html'], description: 'Format of the content.' },
        },
        required: ['format'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserGetContentToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserGetContentToolParams, ToolResult> {
    return new BrowserGetContentToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserGetContentToolInvocation extends BaseToolInvocation<BrowserGetContentToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserGetContentToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Getting page content in ${this.params.format} format...`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    const content = await browserService.getContent(this.params.format);
    return {
      llmContent: content,
      returnDisplay: `Retrieved ${content.length} characters of ${this.params.format} content.`,
    };
  }
}


// --- Browser Get Accessibility Tree Tool ---

export interface BrowserGetAccessibilityTreeToolParams {}

export class BrowserGetAccessibilityTreeTool extends BaseDeclarativeTool<BrowserGetAccessibilityTreeToolParams, ToolResult> {
  static readonly Name = 'browser_get_accessibility_tree';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserGetAccessibilityTreeTool.Name,
      'Get Accessibility Tree',
      'Gets the accessibility tree of the current page (semantic structure).',
      Kind.Read,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserGetAccessibilityTreeToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserGetAccessibilityTreeToolParams, ToolResult> {
    return new BrowserGetAccessibilityTreeToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserGetAccessibilityTreeToolInvocation extends BaseToolInvocation<BrowserGetAccessibilityTreeToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserGetAccessibilityTreeToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return 'Getting accessibility tree...';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    const tree = await browserService.getAccessibilityTree();
    return {
      llmContent: JSON.stringify(tree, null, 2),
      returnDisplay: 'Retrieved accessibility tree.',
    };
  }
}


// --- Browser Evaluate Tool ---

export interface BrowserEvaluateToolParams {
  script: string;
}

export class BrowserEvaluateTool extends BaseDeclarativeTool<BrowserEvaluateToolParams, ToolResult> {
  static readonly Name = 'browser_evaluate';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserEvaluateTool.Name,
      'Evaluate Script',
      'Executes JavaScript in the browser context.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          script: { type: 'string', description: 'JavaScript code to execute.' },
        },
        required: ['script'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserEvaluateToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserEvaluateToolParams, ToolResult> {
    return new BrowserEvaluateToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserEvaluateToolInvocation extends BaseToolInvocation<BrowserEvaluateToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserEvaluateToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return 'Evaluating script...';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    const result = await browserService.evaluate(this.params.script);
    return {
      llmContent: JSON.stringify(result, null, 2),
      returnDisplay: 'Script executed.',
    };
  }
}

// --- Browser Cursor Move Tool ---

export interface BrowserCursorMoveToolParams {
  x: number;
  y: number;
}

export class BrowserCursorMoveTool extends BaseDeclarativeTool<BrowserCursorMoveToolParams, ToolResult> {
  static readonly Name = 'browser_cursor_move';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserCursorMoveTool.Name,
      'Move Cursor',
      'Moves the visible cursor to the specified coordinates.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'The x-coordinate to move to.' },
          y: { type: 'number', description: 'The y-coordinate to move to.' },
        },
        required: ['x', 'y'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserCursorMoveToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserCursorMoveToolParams, ToolResult> {
    return new BrowserCursorMoveToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserCursorMoveToolInvocation extends BaseToolInvocation<BrowserCursorMoveToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserCursorMoveToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Moving cursor to (${this.params.x}, ${this.params.y})`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.cursorMove(this.params.x, this.params.y);
    return {
      llmContent: `Moved cursor to (${this.params.x}, ${this.params.y})`,
      returnDisplay: `Moved cursor to (${this.params.x}, ${this.params.y})`,
    };
  }
}

// --- Browser Cursor Click Tool ---

export interface BrowserCursorClickToolParams {}

export class BrowserCursorClickTool extends BaseDeclarativeTool<BrowserCursorClickToolParams, ToolResult> {
  static readonly Name = 'browser_cursor_click';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserCursorClickTool.Name,
      'Click at Cursor',
      'Clicks at the current position of the visible cursor.',
      Kind.Execute,
      { type: 'object', properties: {} },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserCursorClickToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserCursorClickToolParams, ToolResult> {
    return new BrowserCursorClickToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserCursorClickToolInvocation extends BaseToolInvocation<BrowserCursorClickToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserCursorClickToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return 'Clicking at cursor';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.cursorClick();
    return {
      llmContent: 'Clicked at cursor',
      returnDisplay: 'Clicked at cursor',
    };
  }
}

// --- Browser Cursor Drag Tool ---

export interface BrowserCursorDragToolParams {
  endX: number;
  endY: number;
}

export class BrowserCursorDragTool extends BaseDeclarativeTool<BrowserCursorDragToolParams, ToolResult> {
  static readonly Name = 'browser_cursor_drag';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserCursorDragTool.Name,
      'Drag Cursor',
      'Drags the cursor from its current position to the specified coordinates.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          endX: { type: 'number', description: 'The x-coordinate to drag to.' },
          endY: { type: 'number', description: 'The y-coordinate to drag to.' },
        },
        required: ['endX', 'endY'],
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserCursorDragToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserCursorDragToolParams, ToolResult> {
    return new BrowserCursorDragToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserCursorDragToolInvocation extends BaseToolInvocation<BrowserCursorDragToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserCursorDragToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return `Dragging cursor to (${this.params.endX}, ${this.params.endY})`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.cursorDrag(this.params.endX, this.params.endY);
    return {
      llmContent: `Dragged cursor to (${this.params.endX}, ${this.params.endY})`,
      returnDisplay: `Dragged cursor to (${this.params.endX}, ${this.params.endY})`,
    };
  }
}

// --- Browser Stop Tool ---

export interface BrowserStopToolParams {}

export class BrowserStopTool extends BaseDeclarativeTool<BrowserStopToolParams, ToolResult> {
  static readonly Name = 'browser_stop';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserStopTool.Name,
      'Stop Browser',
      'Closes the current browser session and all its pages.',
      Kind.Execute,
      {
        type: 'object',
        properties: {},
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserStopToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserStopToolParams, ToolResult> {
    return new BrowserStopToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserStopToolInvocation extends BaseToolInvocation<BrowserStopToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserStopToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return 'Stopping browser session';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    await browserService.closeBrowser();

    // [Autonomy Hook] Stop Latent Sync
    OperatorLatentSync.getInstance(this.config).stopSync();

    return {
      llmContent: 'Browser session closed.',
      returnDisplay: 'Browser session closed.',
    };
  }
}

// --- Browser Reset Tool ---

export interface BrowserResetToolParams {}

export class BrowserResetTool extends BaseDeclarativeTool<BrowserResetToolParams, ToolResult> {
  static readonly Name = 'browser_reset';

  constructor(private readonly config: Config, messageBus: MessageBus) {
    super(
      BrowserResetTool.Name,
      'Reset Browser',
      'Closes the current browser session and starts a fresh one.',
      Kind.Execute,
      {
        type: 'object',
        properties: {},
      },
      messageBus
    );
  }

  protected createInvocation(
    params: BrowserResetToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ): ToolInvocation<BrowserResetToolParams, ToolResult> {
    return new BrowserResetToolInvocation(this.config, params, messageBus, _toolName, _toolDisplayName);
  }
}

class BrowserResetToolInvocation extends BaseToolInvocation<BrowserResetToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: BrowserResetToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    return 'Resetting browser session';
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const browserService = BrowserService.getInstance(this.config);
    
    // Stop sync before reset
    OperatorLatentSync.getInstance(this.config).stopSync();
    
    await browserService.closeBrowser();
    await browserService.startBrowser();

    // Restart sync after reset
    OperatorLatentSync.getInstance(this.config).startSync();

    return {
      llmContent: 'Browser session reset (closed and restarted).',
      returnDisplay: 'Browser session reset.',
    };
  }
}
