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

export class OSAccessibilityService {
  private static instance: OSAccessibilityService;

  private constructor(private config: Config) {}
 
  public static getInstance(config: Config): OSAccessibilityService {
    if (!OSAccessibilityService.instance) {
      OSAccessibilityService.instance = new OSAccessibilityService(config);
    }
    return OSAccessibilityService.instance;
  }
 
  private async runPowerShell(script: string): Promise<string> {
    const tempDir = this.config.storage.getProjectTempDir();
    const scriptPath = path.join(tempDir, `os_ground_${Date.now()}_${Math.floor(Math.random() * 1000)}.ps1`);
    
    try {
      await fs.writeFile(scriptPath, script, 'utf8');
      const { stdout } = await execPromise(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`);
      return stdout;
    } catch (error) {
      debugLogger.error(`PowerShell execution failed: ${error}`);
      return '';
    } finally {
      try { await fs.unlink(scriptPath); } catch (e) {}
    }
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
        
        return monitors.map((m: any) => ({
          name: m.DeviceName,
          isPrimary: m.Primary,
          bounds: { x: m.X, y: m.Y, width: m.Width, height: m.Height }
        }));
      } catch (e) {
        debugLogger.error(`Failed to parse monitor layout JSON: ${e}`);
        return [];
      }
    }
    return [];
  }

  /**
   * Retrieves a native accessibility tree of top-level windows (Windows only).
   */
  async getNativeAccessibilityTree(): Promise<any[]> {
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
        const data = JSON.parse(stdout);
        return {
          title: data.title,
          processName: data.processName,
          bounds: { left: data.left, top: data.top, right: data.right, bottom: data.bottom }
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
