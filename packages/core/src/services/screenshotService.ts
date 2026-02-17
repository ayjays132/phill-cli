/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Config } from '../config/config.js';
import { BrowserService } from './browserService.js';

const execPromise = promisify(exec);

export class ScreenshotService {
  private static instance: ScreenshotService;
  private config: Config;

  private constructor(config: Config) {
    this.config = config;
  }

  public static getInstance(config: Config): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService(config);
    }
    return ScreenshotService.instance;
  }

  /**
   * Captures a screenshot of the entire desktop.
   * Returns the absolute path to the saved image.
   */
  public async captureDesktop(): Promise<string> {
    const platform = os.platform();
    const tempDir = this.config.storage.getProjectTempDir();
    const screenshotPath = path.join(tempDir, `desktop_${Date.now()}.png`);

    try {
      const browserService = BrowserService.getInstance(this.config);
      const vlaBuffer = await browserService.captureDesktopScreenshot();
      
      if (vlaBuffer) {
        await fs.writeFile(screenshotPath, vlaBuffer);
      } else {
        // Fallback to Shell-based methods if Browser capture fails
        if (platform === 'win32') {
          await this.captureWindows(screenshotPath);
        } else if (platform === 'darwin') {
          await this.captureMacOS(screenshotPath);
        } else if (platform === 'linux') {
          await this.captureLinux(screenshotPath);
        } else {
          throw new Error(`Unsupported platform for desktop capture: ${platform}`);
        }
      }

      // Verify file exists and has content
      const stats = await fs.stat(screenshotPath);
      if (stats.size === 0) {
        throw new Error('Captured screenshot is empty.');
      }

      return screenshotPath;
    } catch (error) {
      throw new Error(`Failed to capture desktop: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async runPowerShell(script: string): Promise<void> {
    const tempDir = this.config.storage.getProjectTempDir();
    const scriptPath = path.join(tempDir, `screenshot_${Date.now()}_${Math.floor(Math.random() * 1000)}.ps1`);
    
    try {
      await fs.writeFile(scriptPath, script, 'utf8');
      await execPromise(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`);
    } catch (error) {
      throw new Error(`PowerShell screenshot failed: ${error}`);
    } finally {
      try { await fs.unlink(scriptPath); } catch (e) {}
    }
  }

  private async captureWindows(targetPath: string): Promise<void> {
    // PowerShell script to capture the entire virtual desktop (all monitors)
    const psScript = `
      [void][Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");
      [void][Reflection.Assembly]::LoadWithPartialName("System.Drawing");
      $Screen = [System.Windows.Forms.SystemInformation]::VirtualScreen;
      $Width = $Screen.Width;
      $Height = $Screen.Height;
      $Left = $Screen.Left;
      $Top = $Screen.Top;
      $Bitmap = New-Object System.Drawing.Bitmap -ArgumentList $Width, $Height;
      $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap);
      $Graphics.CopyFromScreen($Left, $Top, 0, 0, $Bitmap.Size);
      $Bitmap.Save('${targetPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png);
      $Graphics.Dispose();
      $Bitmap.Dispose();
    `.trim();
    
    await this.runPowerShell(psScript);
  }

  private async captureMacOS(targetPath: string): Promise<void> {
    // -x: silent (no shutter sound)
    await execPromise(`screencapture -x "${targetPath}"`);
  }

  private async captureLinux(targetPath: string): Promise<void> {
    // Try gnome-screenshot first, then import (ImageMagick), then scrot
    const commands = [
      `gnome-screenshot -f "${targetPath}"`,
      `import -window root "${targetPath}"`,
      `scrot "${targetPath}"`
    ];

    for (const cmd of commands) {
      try {
        await execPromise(cmd);
        return;
      } catch (e) {
        // Continue to next command
      }
    }
    throw new Error('No supported screenshot tool found on Linux (gnome-screenshot, import, scrot).');
  }
}
