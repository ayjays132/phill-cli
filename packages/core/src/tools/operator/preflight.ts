/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { debugLogger } from '../../utils/debugLogger.js';

export interface PreflightReport {
  platform: string;
  operatorReady: boolean;
  missing: { tool: string; installCmd: string; severity: 'critical' | 'degraded' }[];
  warnings: string[];
  capabilities: {
    mouseKeyboard: boolean;
    windowFinding: boolean;
    windowControl: boolean;
    axTree: boolean;
  };
}

let cachedReport: PreflightReport | null = null;
let lastCheckTime = 0;

export function runPreflightCheck(force = false): PreflightReport {
  if (!force && cachedReport && Date.now() - lastCheckTime < 300000) { // Cache for 5 mins
    return cachedReport;
  }

  const platform = os.platform();
  const report: PreflightReport = {
    platform,
    operatorReady: true,
    missing: [],
    warnings: [],
    capabilities: {
      mouseKeyboard: false,
      windowFinding: false,
      windowControl: false,
      axTree: false,
    },
  };

  try {
    if (platform === 'darwin') {
      checkMacOS(report);
    } else if (platform === 'linux') {
      checkLinux(report);
    } else if (platform === 'win32') {
      checkWindows(report);
    } else {
      report.warnings.push(`Unsupported platform: ${platform}`);
      report.operatorReady = false;
    }
  } catch (error) {
    report.warnings.push(`Preflight check failed: ${error}`);
    report.operatorReady = false;
  }

  cachedReport = report;
  lastCheckTime = Date.now();
  
  if (report.missing.length > 0) {
    const critical = report.missing.filter(m => m.severity === 'critical');
    if (critical.length > 0) {
      debugLogger.warn(`⚠️ Operator Mode Critical Missing Tools: ${critical.map(c => c.tool).join(', ')}`);
    }
  }

  return report;
}

function checkMacOS(report: PreflightReport) {
  report.capabilities.windowControl = true; 
  report.capabilities.windowFinding = true;
  report.capabilities.axTree = true; 

  try {
    execSync('which cliclick');
    report.capabilities.mouseKeyboard = true;
  } catch (e) {
    report.warnings.push('cliclick missing: Mouse/Keyboard operations will use slower AppleScript fallback.');
    report.missing.push({
      tool: 'cliclick',
      installCmd: 'brew install cliclick',
      severity: 'degraded',
    });
    report.capabilities.mouseKeyboard = true; 
  }
}

function checkLinux(report: PreflightReport) {
  try {
    execSync('which xdotool');
    report.capabilities.mouseKeyboard = true;
    report.capabilities.windowControl = true;
  } catch (e) {
    report.missing.push({
      tool: 'xdotool',
      installCmd: 'sudo apt install xdotool',
      severity: 'critical',
    });
  }

  try {
    execSync('which wmctrl');
    report.capabilities.windowFinding = true;
  } catch (e) {
    report.missing.push({
      tool: 'wmctrl',
      installCmd: 'sudo apt install wmctrl',
      severity: 'degraded',
    });
  }

  try {
    execSync('which python3');
    try {
      execSync('python3 -c "import pyatspi"', { stdio: 'ignore' });
      report.capabilities.axTree = true;
    } catch (importErr) {
       report.missing.push({
        tool: 'python3-pyatspi',
        installCmd: 'sudo apt install python3-pyatspi',
        severity: 'degraded',
      });
    }
  } catch (e) {
    report.missing.push({
      tool: 'python3',
      installCmd: 'sudo apt install python3',
      severity: 'degraded',
    });
  }
}

function checkWindows(report: PreflightReport) {
  report.capabilities.mouseKeyboard = true;
  report.capabilities.windowFinding = true;
  report.capabilities.windowControl = true;
  report.capabilities.axTree = true;
}
