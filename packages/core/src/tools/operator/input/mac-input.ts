/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import { debugLogger } from '../../../utils/debugLogger.js';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Handles mouse and keyboard input on macOS using tier-based fallbacks.
 * 1. cliclick (native binary, fast)
 * 2. Swift helper (compiled native, no dependency)
 * 3. AppleScript (slow, last resort)
 */

export class MacInput {
  private static instance: MacInput;
  private hasCliclick = false;
  private hasSwiftHelper = false;
  private swiftHelperPath: string;

  private constructor() {
    this.swiftHelperPath = path.join(os.homedir(), '.phill', 'bin', 'mac-input-helper');
    this.checkCapabilities();
  }

  public static getInstance(): MacInput {
    if (!MacInput.instance) {
      MacInput.instance = new MacInput();
    }
    return MacInput.instance;
  }

  private checkCapabilities() {
    try {
      execSync('which cliclick', { stdio: 'ignore' });
      this.hasCliclick = true;
    } catch {}

    if (fs.existsSync(this.swiftHelperPath)) {
      this.hasSwiftHelper = true;
    } else {
      // Attempt to compile swift helper if swiftc is available
      try {
        execSync('which swiftc', { stdio: 'ignore' });
        this.compileSwiftHelper();
      } catch {}
    }
  }

  private compileSwiftHelper() {
    // Basic Swift helper source (embedded)
    const source = `
import Cocoa
import Foundation

let args = CommandLine.arguments
if args.count < 2 { exit(1) }
let command = args[1]

switch command {
case "move":
    if args.count < 4 { exit(1) }
    let x = Double(args[2]) ?? 0
    let y = Double(args[3]) ?? 0
    let event = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)
    event?.post(tap: .cghidEventTap)
    
case "click":
    if args.count < 4 { exit(1) }
    let x = Double(args[2]) ?? 0
    let y = Double(args[3]) ?? 0
    let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)
    let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)
    down?.post(tap: .cghidEventTap)
    up?.post(tap: .cghidEventTap)

default:
    exit(1)
}
    `;
    const tmpSource = path.join(os.tmpdir(), 'mac-input.swift');
    fs.writeFileSync(tmpSource, source);
    try {
      execSync(`swiftc "${tmpSource}" -o "${this.swiftHelperPath}"`);
      this.hasSwiftHelper = true;
    } catch (e) {
      debugLogger.warn(`Failed to compile swift helper: ${e}`);
    } finally {
      fs.unlinkSync(tmpSource);
    }
  }

  async move(x: number, y: number) {
    if (this.hasCliclick) {
      execSync(`cliclick m:${x},${y}`);
    } else if (this.hasSwiftHelper) {
      execSync(`${this.swiftHelperPath} move ${x} ${y}`);
    } else {
      // AppleScript Fallback
      execSync(`osascript -e 'tell application "System Events" to click at {${x}, ${y}}'`); // Does click, but moves cursor
    }
  }

  async click(x: number, y: number) {
    if (this.hasCliclick) {
      execSync(`cliclick c:${x},${y}`);
    } else if (this.hasSwiftHelper) {
      execSync(`${this.swiftHelperPath} click ${x} ${y}`);
    } else {
      execSync(`osascript -e 'tell application "System Events" to click at {${x}, ${y}}'`);
    }
  }
}
