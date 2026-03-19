/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Captures a screenshot of a specific window by its process PID.
 * Supports Windows (PowerShell), macOS (screencapture), and Linux (xdotool).
 */
export async function captureByPID(pid: number): Promise<Buffer | null> {
  const platform = os.platform();
  const tempFile = path.join(os.tmpdir(), `window_capture_${pid}_${Date.now()}.png`);

  try {
    if (platform === 'win32') {
      return await captureWindows(pid, tempFile);
    } else if (platform === 'darwin') {
      return await captureMacOS(pid, tempFile);
    } else if (platform === 'linux') {
      return await captureLinux(pid, tempFile);
    }
  } catch (error) {
    console.error(`Failed to capture window for PID ${pid}:`, error);
  } finally {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Cleanup failed
      }
    }
  }
  return null;
}

async function captureWindows(pid: number, tempFile: string): Promise<Buffer | null> {
  // PowerShell script to find the window handle of a PID and capture it via GDI
  const script = `
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    using System.Drawing;
    using System.Drawing.Imaging;

    public class WindowCapture {
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        [DllImport("user32.dll")]
        public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        public static void CaptureWindow(IntPtr hWnd, string filePath) {
            RECT rect;
            if (GetWindowRect(hWnd, out rect)) {
                int width = rect.Right - rect.Left;
                int height = rect.Bottom - rect.Top;
                
                if (width <= 0 || height <= 0) return;

                using (Bitmap bmp = new Bitmap(width, height)) {
                    using (Graphics g = Graphics.FromImage(bmp)) {
                        IntPtr hdc = g.GetHdc();
                        PrintWindow(hWnd, hdc, 0);
                        g.ReleaseHdc(hdc);
                    }
                    bmp.Save(filePath, ImageFormat.Png);
                }
            }
        }
    }
"@ -ReferencedAssemblies System.Drawing

    function Get-WindowHandle($pId) {
        $p = Get-Process -Id $pId -ErrorAction SilentlyContinue
        if ($p -and $p.MainWindowHandle -ne [IntPtr]::Zero) { return $p.MainWindowHandle }
        # Check kids
        $kids = Get-CimInstance Win32_Process -Filter "ParentProcessId = $pId"
        foreach ($k in $kids) {
            $h = Get-WindowHandle $k.ProcessId
            if ($h -ne [IntPtr]::Zero) { return $h }
        }
        return [IntPtr]::Zero
    }

    $handle = Get-WindowHandle ${pid}
    if ($handle -ne [IntPtr]::Zero) {
        [WindowCapture]::CaptureWindow($handle, "${tempFile.replace(/\\/g, '\\\\')}")
    }
  `;

  try {
    execSync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { stdio: 'ignore' });
    if (fs.existsSync(tempFile)) {
      return fs.readFileSync(tempFile);
    }
  } catch (e) {
    // PowerShell failed
  }
  return null;
}

async function captureMacOS(pid: number, tempFile: string): Promise<Buffer | null> {
  // macOS 'screencapture -l' requires a window ID, which we get via osascript
  try {
    const windowId = execSync(`osascript -e 'tell application "System Events" to get id of window 1 of every process whose unix id is ${pid}'`).toString().trim().split(',')[0];
    if (windowId) {
      execSync(`screencapture -l ${windowId} ${tempFile}`);
      if (fs.existsSync(tempFile)) {
        return fs.readFileSync(tempFile);
      }
    }
  } catch (e) {}
  return null;
}

async function captureLinux(pid: number, tempFile: string): Promise<Buffer | null> {
  // Linux requires xdotool to find window and import (ImageMagick) to capture
  try {
    const windowId = execSync(`xdotool search --pid ${pid} | head -n 1`).toString().trim();
    if (windowId) {
      execSync(`import -window ${windowId} ${tempFile}`);
      if (fs.existsSync(tempFile)) {
        return fs.readFileSync(tempFile);
      }
    }
  } catch (e) {}
  return null;
}
