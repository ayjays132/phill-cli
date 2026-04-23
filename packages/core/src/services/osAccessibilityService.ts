/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { Config } from '../config/config.js';
import { debugLogger } from '../utils/debugLogger.js';

const execPromise = promisify(exec);

export interface MonitorInfo {
  name: string;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface WindowInfo {
  title: string;
  processName: string;
  bounds: { left: number; top: number; right: number; bottom: number };
}

export function parseXrandrMonitors(stdout: string): MonitorInfo[] {
  return stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^\d+:\s+([+*]*)([^\s]+)\s+(\d+)\/\d+x(\d+)\/\d+\+(-?\d+)\+(-?\d+)/,
      );
      if (!match) {
        return undefined;
      }

      const [, flags, name, width, height, x, y] = match;
      return {
        name,
        isPrimary: flags.includes('*'),
        bounds: {
          x: Number(x),
          y: Number(y),
          width: Number(width),
          height: Number(height),
        },
      } satisfies MonitorInfo;
    })
    .filter((monitor): monitor is MonitorInfo => Boolean(monitor));
}

export function parseWmctrlWindows(stdout: string): WindowInfo[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(0x[0-9a-f]+)\s+\S+\s+(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/i,
      );
      if (!match) {
        return undefined;
      }

      const [, , x, y, width, height, processName, title] = match;
      return {
        title,
        processName,
        bounds: {
          left: Number(x),
          top: Number(y),
          right: Number(x) + Number(width),
          bottom: Number(y) + Number(height),
        },
      } satisfies WindowInfo;
    })
    .filter((window): window is WindowInfo => Boolean(window));
}

export class OSAccessibilityService {
  private static instance: OSAccessibilityService;

  private constructor(private config: Config) {}

  static getInstance(config: Config): OSAccessibilityService {
    if (!OSAccessibilityService.instance) {
      OSAccessibilityService.instance = new OSAccessibilityService(config);
    }
    return OSAccessibilityService.instance;
  }

  private async runPowerShell(script: string): Promise<string> {
    const tempDir = this.config.storage.getProjectTempDir();
    const scriptPath = path.join(
      tempDir,
      `os_ground_${Date.now()}_${Math.floor(Math.random() * 1000)}.ps1`,
    );

    try {
      await fs.writeFile(scriptPath, script, 'utf8');
      const { stdout } = await execPromise(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
      );
      return stdout;
    } catch (error) {
      debugLogger.error(`PowerShell execution failed: ${error}`);
      return '';
    } finally {
      try {
        await fs.unlink(scriptPath);
      } catch {
        // Ignore cleanup failures.
      }
    }
  }

  private async runCommand(command: string): Promise<string> {
    try {
      const { stdout } = await execPromise(command);
      return stdout;
    } catch (error) {
      debugLogger.debug(`OS command failed (${command}): ${error}`);
      return '';
    }
  }

  private async commandExists(command: string): Promise<boolean> {
    const probe =
      os.platform() === 'win32' ? `where ${command}` : `command -v ${command}`;
    const stdout = await this.runCommand(probe);
    return stdout.trim().length > 0;
  }

  /**
   * Detects all monitors and their layout coordinates.
   */
  async getMonitorLayout(): Promise<MonitorInfo[]> {
    const platform = os.platform();
    if (platform === 'win32') {
      const psScript = `
        [void][Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
        $screens = [System.Windows.Forms.Screen]::AllScreens;
        $screens | ForEach-Object {
            [PSCustomObject]@{
                DeviceName = $_.DeviceName
                Primary    = $_.Primary
                X          = $_.Bounds.X
                Y          = $_.Bounds.Y
                Width      = $_.Bounds.Width
                Height     = $_.Bounds.Height
            }
        } | ConvertTo-Json
      `.trim();

      const stdout = await this.runPowerShell(psScript);
      if (!stdout) return [];
      try {
        const data = JSON.parse(stdout);
        const monitors = Array.isArray(data) ? data : [data];

        return monitors.map((m: Record<string, number | string | boolean>) => ({
          name: String(m['DeviceName']),
          isPrimary: Boolean(m['Primary']),
          bounds: {
            x: Number(m['X']),
            y: Number(m['Y']),
            width: Number(m['Width']),
            height: Number(m['Height']),
          },
        }));
      } catch (e) {
        debugLogger.error(`Failed to parse monitor layout JSON: ${e}`);
        return [];
      }
    }

    if (platform === 'linux' && (await this.commandExists('xrandr'))) {
      return parseXrandrMonitors(await this.runCommand('xrandr --listmonitors'));
    }

    if (platform === 'darwin' && (await this.commandExists('osascript'))) {
      const stdout = await this.runCommand(
        `osascript -e 'tell application "Finder" to get bounds of window of desktop'`,
      );
      const bounds = stdout
        .trim()
        .split(',')
        .map((part) => Number(part.trim()));
      if (bounds.length === 4 && bounds.every((value) => Number.isFinite(value))) {
        const [x1, y1, x2, y2] = bounds;
        return [
          {
            name: 'MainDisplay',
            isPrimary: true,
            bounds: {
              x: x1,
              y: y1,
              width: x2 - x1,
              height: y2 - y1,
            },
          },
        ];
      }
    }

    return [];
  }

  /**
   * Retrieves a native accessibility tree of top-level windows (Windows only).
   */
  async getNativeAccessibilityTree(): Promise<unknown[]> {
    const platform = os.platform();
    if (platform !== 'win32') return [];

    const psScript = `
      [void][Reflection.Assembly]::LoadWithPartialName("UIAutomationClient");
      [void][Reflection.Assembly]::LoadWithPartialName("UIAutomationTypes");
      $condition = [Windows.Automation.Condition]::TrueCondition;
      $elements = [Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children, $condition);
      $elements | ForEach-Object {
          $rect = $_.Current.BoundingRectangle;
          if ($rect.Width -gt 5 -and $rect.Height -gt 5 -and $_.Current.Name) {
              [PSCustomObject]@{
                  name = $_.Current.Name
                  role = $_.Current.ControlType.ProgrammaticName.Replace("ControlType.", "")
                  x = [Math]::Round($rect.X)
                  y = [Math]::Round($rect.Y)
                  width = [Math]::Round($rect.Width)
                  height = [Math]::Round($rect.Height)
              }
          }
      } | ConvertTo-Json
    `.trim();

    const stdout = await this.runPowerShell(psScript);
    if (!stdout) return [];
    try {
      const data = JSON.parse(stdout);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      debugLogger.error(`Failed to parse accessibility tree JSON: ${error}`);
      return [];
    }
  }

  /**
   * Finds a window by title pattern and returns its location.
   */
  async findWindow(titlePattern: string): Promise<WindowInfo | null> {
    const platform = os.platform();
    if (platform === 'win32') {
      const psScript = `
        Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class WindowUtils {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
                public int Left; public int Top; public int Right; public int Bottom;
            }
        }';
        $proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*${titlePattern}*' } | Select-Object -First 1;
        if ($proc) {
            $rect = New-Object WindowUtils+RECT;
            [WindowUtils]::GetWindowRect($proc.MainWindowHandle, [ref]$rect);
            @{
                title = $proc.MainWindowTitle;
                processName = $proc.ProcessName;
                left = $rect.Left;
                top = $rect.Top;
                right = $rect.Right;
                bottom = $rect.Bottom;
            } | ConvertTo-Json
        }
      `.trim();

      const stdout = await this.runPowerShell(psScript);
      if (!stdout) return null;
      try {
        const data = JSON.parse(stdout) as Record<string, number | string>;
        return {
          title: String(data['title']),
          processName: String(data['processName']),
          bounds: {
            left: Number(data['left']),
            top: Number(data['top']),
            right: Number(data['right']),
            bottom: Number(data['bottom']),
          },
        };
      } catch {
        return null;
      }
    }

    if (platform === 'linux' && (await this.commandExists('wmctrl'))) {
      const windows = parseWmctrlWindows(await this.runCommand('wmctrl -lxG'));
      const lowerPattern = titlePattern.toLowerCase();
      return (
        windows.find((window) =>
          window.title.toLowerCase().includes(lowerPattern),
        ) ?? null
      );
    }

    if (platform === 'darwin' && (await this.commandExists('osascript'))) {
      const escapedPattern = titlePattern.replace(/"/g, '\\"');
      const stdout = await this.runCommand(`
        osascript -e 'tell application "System Events"
          repeat with proc in (application processes whose background only is false)
            repeat with win in windows of proc
              try
                set winName to name of win
                if winName contains "${escapedPattern}" then
                  set {xPos, yPos} to position of win
                  set {winWidth, winHeight} to size of win
                  return (name of proc) & "||" & winName & "||" & xPos & "||" & yPos & "||" & winWidth & "||" & winHeight
                end if
              end try
            end repeat
          end repeat
        end tell'`);
      const parts = stdout.trim().split('||');
      if (parts.length === 6) {
        const [processName, title, x, y, width, height] = parts;
        return {
          title,
          processName,
          bounds: {
            left: Number(x),
            top: Number(y),
            right: Number(x) + Number(width),
            bottom: Number(y) + Number(height),
          },
        };
      }
    }

    return null;
  }
}
