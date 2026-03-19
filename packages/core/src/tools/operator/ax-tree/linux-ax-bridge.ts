/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Retrieves the Linux Accessibility Tree using AT-SPI2 bridge via Python or xdotool fallback.
 */
export function getLinuxAXTree(pid?: number): any[] {
  // Strategy A: Python AT-SPI2 Bridge
  try {
     const tempDir = os.tmpdir();
     const scriptPath = path.join(tempDir, `linux_ax_${Date.now()}.py`);
     
     const pyScript = `
import pyatspi
import json, sys

def walk(node, depth=0):
    if depth > 5: return None
    try:
        frame = node.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
        children = []
        for c in node:
            child = walk(c, depth + 1)
            if child: children.append(child)
            
        return {
            'role': node.getRoleName(),
            'name': node.name,
            'value': str(node.queryValue().currentValue) if pyatspi.STATE_FOCUSABLE in node.getState() else '',
            'frame': { 'x': frame.x, 'y': frame.y, 'w': frame.width, 'h': frame.height },
            'children': children
        }
    except: return None

desktop = pyatspi.Registry.getDesktop(0)
target = None
if ${pid ? 'True' : 'False'}:
    for a in desktop:
        try:
            if a.get_process_id() == ${pid}:
                target = a
                break
        except: pass
else:
    for a in desktop:
        try:
            if pyatspi.STATE_ACTIVE in a.getState():
                target = a
                break
        except: pass

if target:
    print(json.dumps(walk(target)))
else:
    print("[]")
     `;

    fs.writeFileSync(scriptPath, pyScript);
    const output = execSync(`python3 "${scriptPath}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    fs.unlinkSync(scriptPath);
    return JSON.parse(output.trim());
  } catch (pyError) {
    console.warn(`[LinuxAXBridge] AT-SPI2 failed: ${pyError}. Trying simple window info.`);
    
    // Strategy B: xdotool + wmctrl (Basic info only)
    try {
      const windowId = execSync(`xdotool getactivewindow`).toString().trim();
      const geometry = execSync(`xdotool getwindowgeometry ${windowId}`).toString();
      // Parse geometry roughly
      const posMatch = geometry.match(/Position: (\d+),(\d+)/);
      const sizeMatch = geometry.match(/Geometry: (\d+)x(\d+)/);
      
      if (posMatch && sizeMatch) {
         return [{
           role: 'window',
           title: 'Active Window (Fallback)',
           frame: { 
             x: parseInt(posMatch[1]), 
             y: parseInt(posMatch[2]), 
             w: parseInt(sizeMatch[1]), 
             h: parseInt(sizeMatch[2]) 
           },
           children: []
         }];
      }
    } catch (e) {
      console.warn(`[LinuxAXBridge] Fallback failed: ${e}`);
    }
  }
  return [];
}
