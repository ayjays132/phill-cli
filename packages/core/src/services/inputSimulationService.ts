/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Config } from '../config/config.js';
import { debugLogger } from '../utils/debugLogger.js';

const execPromise = promisify(exec);

export class InputSimulationService {
  private static instance: InputSimulationService;

  private constructor(private config: Config) {}
 
  public static getInstance(config: Config): InputSimulationService {
    if (!InputSimulationService.instance) {
      InputSimulationService.instance = new InputSimulationService(config);
    }
    return InputSimulationService.instance;
  }
 
  private async logAction(action: string) {
    debugLogger.log(`[InputSimulation] ${action}`);
  }
 
  private async runPowerShell(script: string): Promise<void> {
    const tempDir = this.config.storage.getProjectTempDir();
    const scriptPath = path.join(tempDir, `input_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}.ps1`);
    
    try {
      await fs.writeFile(scriptPath, script, 'utf8');
      await execPromise(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`);
    } catch (error) {
      debugLogger.error(`PowerShell simulation failed: ${error}`);
    } finally {
      try { await fs.unlink(scriptPath); } catch (e) {}
    }
  }

  async moveCursor(x: number, y: number): Promise<void> {
    await this.logAction(`Moving cursor to ${x}, ${y}`);
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        const psScript = `
          [void][Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
          [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
        `.trim();
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
        await execPromise(`cliclick move ${x},${y}`).catch(async () => {
             const appleScript = `tell application "System Events" to click at {${x}, ${y}}`;
             await execPromise(`osascript -e '${appleScript}'`);
        });
      } else if (platform === 'linux') {
        await execPromise(`xdotool mousemove ${x} ${y}`);
      }
    } catch (error) {
      throw new Error(`Failed to move cursor: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async click(x?: number, y?: number): Promise<void> {
    const platform = os.platform();
    if (x !== undefined && y !== undefined) {
      await this.moveCursor(x, y);
    }

    try {
      if (platform === 'win32') {
        const psScript = `
          $sig = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);';
          $type = Add-Type -MemberDefinition $sig -Name "Win32MouseEvent" -Namespace "Win32" -PassThru;
          $type::mouse_event(0x0002, 0, 0, 0, 0); // Down
          $type::mouse_event(0x0004, 0, 0, 0, 0); // Up
        `.trim();
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
        await execPromise(`cliclick c:.`).catch(async () => {
             const appleScript = `tell application "System Events" to click`;
             await execPromise(`osascript -e '${appleScript}'`);
        });
      } else if (platform === 'linux') {
        await execPromise(`xdotool click 1`);
      }
    } catch (error) {
      throw new Error(`Failed to click: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async type(text: string): Promise<void> {
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        const psScript = `
          [void][Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
          [System.Windows.Forms.SendKeys]::SendWait("${text.replace(/"/g, '""')}");
        `.trim();
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
        await execPromise(`osascript -e 'tell application "System Events" to keystroke "${text.replace(/"/g, '\\"')}"'`);
      } else if (platform === 'linux') {
        await execPromise(`xdotool type "${text.replace(/"/g, '\\"')}"`);
      }
    } catch (error) {
       throw new Error(`Failed to type: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async drag(endX: number, endY: number): Promise<void> {
    await this.logAction(`Dragging cursor to ${endX}, ${endY}`);
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        const psScript = `
          $sig = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);';
          $type = Add-Type -MemberDefinition $sig -Name "Win32Drag" -Namespace "Win32" -PassThru;
          $type::mouse_event(0x0002, 0, 0, 0, 0);
          [void][Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
          [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${endX}, ${endY});
          Start-Sleep -m 100;
          $type::mouse_event(0x0004, 0, 0, 0, 0);
        `.trim();
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
        await execPromise(`cliclick dd:. m:${endX},${endY} du:.`);
      } else if (platform === 'linux') {
        await execPromise(`xdotool mousedown 1 mousemove ${endX} ${endY} mouseup 1`);
      }
    } catch (error) {
      throw new Error(`Failed to drag: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Focuses a window matching the title pattern.
   */
  async focusWindow(titlePattern: string): Promise<void> {
    await this.logAction(`Focusing window matching "${titlePattern}"`);
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        const psScript = `
          $wshell = New-Object -ComObject WScript.Shell;
          $proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*${titlePattern}*' } | Select-Object -First 1;
          if ($proc) { $wshell.AppActivate($proc.Id) }
        `.trim();
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
        await execPromise(`osascript -e 'tell application "System Events" to set frontmost of every process whose name contains "${titlePattern}" to true'`);
      }
    } catch (error) {
       debugLogger.warn(`Failed to focus window: ${error}`);
    }
  }

  /**
   * Sets the window state (minimize, maximize, restore).
   */
  async setWindowState(titlePattern: string, state: 'minimize' | 'maximize' | 'restore'): Promise<void> {
    await this.logAction(`${state} window matching "${titlePattern}"`);
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        const stateMap = { 'restore': 1, 'maximize': 3, 'minimize': 6 };
        const psScript = `
          Add-Type -TypeDefinition '
          using System;
          using System.Runtime.InteropServices;
          public class WindowUtils {
              [DllImport("user32.dll")]
              public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }';
          $proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*${titlePattern}*' } | Select-Object -First 1;
          if ($proc) { [WindowUtils]::ShowWindow($proc.MainWindowHandle, ${stateMap[state]}) }
        `.trim();
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
          const script = state === 'minimize' 
            ? `tell application "System Events" to set miniaturized of window 1 of (first process whose name contains "${titlePattern}") to true`
            : `tell application "System Events" to set zoomed of window 1 of (first process whose name contains "${titlePattern}") to true`;
          await execPromise(`osascript -e '${script}'`);
      }
    } catch (error) {
       debugLogger.warn(`Failed to set window state: ${error}`);
    }
  }

  /**
   * Closes a window matching the title pattern.
   */
  async closeWindow(titlePattern: string): Promise<void> {
    await this.logAction(`Closing window matching "${titlePattern}"`);
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -like '*${titlePattern}*' } | Stop-Process -Force`;
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
        await execPromise(`osascript -e 'tell application "${titlePattern}" to quit'`);
      }
    } catch (error) {
       debugLogger.warn(`Failed to close window: ${error}`);
    }
  }

  /**
   * Launches an application.
   */
  async launchApp(appNameOrPath: string): Promise<void> {
    await this.logAction(`Launching application: ${appNameOrPath}`);
    const platform = os.platform();
    try {
      if (platform === 'win32') {
        const psScript = `Start-Process "${appNameOrPath.replace(/"/g, '""')}"`;
        await this.runPowerShell(psScript);
      } else if (platform === 'darwin') {
        await execPromise(`open -a "${appNameOrPath}"`);
      } else {
        await execPromise(`xdg-open "${appNameOrPath}"`);
      }
    } catch (error) {
       throw new Error(`Failed to launch app: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
