/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';

/**
 * Retrieves the accessibility tree for a specific process ID on macOS.
 * Uses JXA (JavaScript for Automation) to bridge with the Accessibility API.
 */
export function getMacAXTree(pid?: number): any[] {
  const script = `
    ObjC.import('AppKit');
    ObjC.import('Accessibility');
    
    function getAXChildren(element, depth) {
      if (depth > 5) return []; // Depth limit
      
      var role = "";
      try { role = element.role(); } catch(e) {}
      
      var title = ""; 
      try { title = element.title(); } catch(e) {}
      
      var value = "";
      try { value = element.value(); } catch(e) {}
      
      var frame = null;
      try { frame = element.position() ? { x: element.position()[0], y: element.position()[1], w: element.size()[0], h: element.size()[1] } : null; } catch(e) {}

      var children = [];
      try {
        var childElems = element.uiElements();
        for (var i = 0; i < childElems.length; i++) {
           children.push(getAXChildren(childElems[i], depth + 1));
        }
      } catch(e) {}

      return {
        role: role,
        title: title,
        value: value,
        frame: frame,
        children: children
      };
    }
    
    var app = Application("System Events");
    var process = ${pid ? `app.processes.whose({ unixId: ${pid} })[0]` : `app.processes.whose({ frontmost: true })[0]`};
    
    if (process) {
       var window = process.windows[0]; 
       if (window) {
         JSON.stringify(getAXChildren(window, 0));
       } else {
         "[]";
       }
    } else {
       "[]";
    }
  `;

  try {
    // Escaping the script for shell execution is tricky. 
    // We'll use a safer approach if possible, but for now standard escaping.
    // Ideally, write to a temp file and execute.
    const output = execSync(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(output.trim());
  } catch (error) {
    console.warn(`[MacAXBridge] Failed to get AX tree: ${error}`);
    return [];
  }
}
