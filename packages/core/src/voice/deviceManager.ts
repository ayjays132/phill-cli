import ffmpeg from 'ffmpeg-static';
import { spawn } from 'child_process';
import os from 'os';
import { existsSync } from 'node:fs';
import si from 'systeminformation';
import { debugLogger } from '../utils/debugLogger.js';

export interface AudioDevice {
  name: string;
  id: string; // On Windows, name is ID for dshow. On others, it might differ.
}

export class DeviceManager {
  private static instance: DeviceManager;

  private constructor() {}

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  private resolveFfmpegPath(): string {
    const isWin = os.platform() === 'win32';
    const binaryName = 'ffmpeg' + (isWin ? '.exe' : '');
    
    // 1. Try to find it next to the current script (in the bundle directory)
    try {
      const bundleDir = (globalThis as any).__dirname || (typeof __dirname !== 'undefined' ? __dirname : null);
      if (bundleDir) {
        const localPath = os.platform() === 'win32' ? `${bundleDir}\\${binaryName}` : `${bundleDir}/${binaryName}`;
        if (existsSync(localPath)) {
          return localPath;
        }
      }
    } catch (e) { /* ignore */ }

    // 2. Try the imported ffmpeg-static path
    const pkgPath = ffmpeg as unknown as string;
    if (pkgPath && typeof pkgPath === 'string' && existsSync(pkgPath)) {
      return pkgPath;
    }

    return 'ffmpeg';
  }

  async getInputDevices(): Promise<AudioDevice[]> {
    const platform = os.platform();
    const ffmpegPath = this.resolveFfmpegPath();
    const devices: AudioDevice[] = [];

    if (platform === 'win32') {
      // On Windows, try two different ways to list dshow devices
      const listCmds = [
        ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'],
        ['-f', 'dshow', '-list_devices', 'true', '-i', '""']
      ];

      for (const args of listCmds) {
        await new Promise<void>((resolve) => {
          const child = spawn(ffmpegPath, args);
          let output = '';
          child.stderr?.on('data', (data) => output += data.toString());
          child.on('close', () => {
             const lines = output.split('\n');
             let inAudio = false;
             let currentFriendlyName = '';
             lines.forEach(line => {
               const trimmed = line.trim();
               
               // Detect device type suffixes if headers are missing
               const isAudioLine = trimmed.toLowerCase().includes('(audio)');
               const isVideoLine = trimmed.toLowerCase().includes('(video)');

               if (trimmed.toLowerCase().includes('directshow audio devices')) {
                 inAudio = true;
               } else if (trimmed.toLowerCase().includes('directshow video devices') || trimmed.toLowerCase().includes('output devices')) {
                 inAudio = false;
               }
               
               // If we see an explicit type suffix, it gives us a clear signal
               if (isAudioLine) inAudio = true;
               if (isVideoLine) inAudio = false;

               if (!inAudio) return;

               const nameMatch = line.match(/"([^"]+)"/);
               const altMatch = line.match(/Alternative name "([^"]+)"/);

               if (nameMatch && !altMatch) {
                  currentFriendlyName = nameMatch[1];
                  if (!devices.find(d => d.name === currentFriendlyName)) {
                    devices.push({ name: currentFriendlyName, id: currentFriendlyName });
                  }
               } else if (altMatch && currentFriendlyName) {
                  // Use the unique 'Alternative name' as the ID for robustness on Windows
                  const lastDev = devices.find(d => d.name === currentFriendlyName);
                  if (lastDev) {
                    lastDev.id = altMatch[1];
                    // Clean up the friendly name check
                    currentFriendlyName = ''; 
                  }
               }
             });
             resolve();
          });
          child.on('error', () => resolve());
        });
        if (devices.length > 0) break;
      }
    } else {
      // Standard Unix paths
      const args = platform === 'darwin' 
        ? ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']
        : ['-f', 'alsa', '-list_devices', 'true', '-i', ''];
      
      await new Promise<void>((resolve) => {
        const child = spawn(ffmpegPath, args);
        let output = '';
        child.stderr?.on('data', (data) => output += data.toString());
        child.on('close', () => {
          const lines = output.split('\n');
          if (platform === 'darwin') {
              let inAudio = false;
              lines.forEach(line => {
                  if (line.includes('AVFoundation audio devices')) inAudio = true;
                  else if (line.includes('AVFoundation video devices')) inAudio = false;
                  else if (inAudio) {
                      const match = line.match(/\[(\d+)\]\s+(.*)/);
                      if (match) devices.push({ name: match[2].trim(), id: match[1] });
                  }
              });
          }
          resolve();
        });
        child.on('error', () => resolve());
      });
    }

    // Supplement with systeminformation (Crucial for when FFmpeg's dshow listing fails)
    try {
      const siAudio = await si.audio();
      const siInputs = siAudio
        .filter(d => {
          const s = (d.status || '').toLowerCase();
          const n = (d.name || '').toLowerCase();
          const isOutputOnly = n.includes('speaker') || n.includes('headphone') || n.includes('echo dot');
          if (isOutputOnly) return false;
          return s.includes('in') || s.includes('active') || n.includes('mic') || n.includes('input') || n.includes('recording') || n.includes('analogue');
        })
        .map(d => ({ name: d.name, id: d.name }));

      for (const siDev of siInputs) {
        if (!devices.find(d => d.name.toLowerCase() === siDev.name.toLowerCase())) {
          devices.push(siDev);
        }
      }
    } catch (e) {
      debugLogger.debug('DeviceManager: systeminformation failed to supplement audio devices.');
    }

    if (devices.length === 0) {
      devices.push({ name: 'Default Device', id: 'default' });
    }
    return devices;
  }

  async getOutputDevices(): Promise<AudioDevice[]> {
    try {
      const siAudio = await si.audio();
      const outputs = siAudio
        .filter(d => !d.status.toLowerCase().includes('in') && !d.name.toLowerCase().includes('mic'))
        .map(d => ({ name: d.name, id: d.name }));

      if (outputs.length === 0) {
        // Fallback for some environments where it's hard to tell
        return [{ name: 'Default Output', id: 'default' }];
      }
      
      // Ensure unique names
      return outputs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    } catch (error) {
      return [{ name: 'Default Output', id: 'default' }];
    }
  }
}

