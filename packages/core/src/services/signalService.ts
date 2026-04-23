/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { debugLogger } from '../utils/debugLogger.js';
import type { Config } from '../config/config.js';
import { coreEvents, CoreEvent } from '../utils/events.js';

export interface SignalMessage {
  sender: string;
  content: string;
  timestamp: number;
}

/**
 * SignalService provides a bridge between Phill CLI and the Signal messaging app.
 * It manages the `signal-cli` daemon in JSON-RPC mode.
 */
export class SignalService {
  private static instance: SignalService;
  private config: Config;
  private signalProcess: ChildProcess | null = null;
  private initialized = false;

  private constructor(config: Config) {
    this.config = config;
  }

  static getInstance(config: Config): SignalService {
    if (!SignalService.instance) {
      SignalService.instance = new SignalService(config);
    }
    return SignalService.instance;
  }

  /**
   * Initializes the Signal daemon process.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.config.signal?.enabled) {
      debugLogger.debug('[SIGNAL] Signal support is disabled.');
      return;
    }

    const account = this.config.signal.account || process.env['SIGNAL_ACCOUNT'];
    if (!account) {
      debugLogger.debug('[SIGNAL] No Signal account configured. Set "signal.account" in settings.');
      return;
    }

    debugLogger.debug(`[SIGNAL] Starting Signal daemon for ${account}...`);

    try {
      this.signalProcess = spawn('signal-cli', [
        '-u',
        account,
        'daemon',
        '--jsonrpc',
      ]);

      this.signalProcess.stdout?.on('data', (data: Buffer) => {
        this.handleIncomingData(data);
      });

      this.signalProcess.stderr?.on('data', (data: Buffer) => {
        const error = data.toString();
        if (error.includes('Error')) {
          debugLogger.error(`[SIGNAL] Daemon Error: ${error}`);
        }
      });

      this.signalProcess.on('close', (code) => {
        debugLogger.debug(`[SIGNAL] Daemon process exited with code ${code}`);
        this.initialized = false;
      });

      this.initialized = true;
      debugLogger.debug('[SIGNAL] Service initialized and listening.');
    } catch (e: unknown) {
      debugLogger.error(`[SIGNAL] Failed to start signal-cli: ${e}`);
    }
  }

  /**
   * Sends a message to a Signal recipient.
   */
  async sendMessage(recipient: string, message: string): Promise<void> {
    if (!this.signalProcess || !this.signalProcess.stdin) {
      debugLogger.error('[SIGNAL] Cannot send message: Service not initialized.');
      return;
    }

    const request = {
      jsonrpc: '2.0',
      method: 'send',
      params: {
        recipient: [recipient],
        message,
      },
      id: `send-${Date.now()}`,
    };

    this.signalProcess.stdin.write(JSON.stringify(request) + '\n');
  }

  private handleIncomingData(data: Buffer) {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const payload = JSON.parse(line);
        
        if (payload.method === 'receive' && payload.params?.envelope?.dataMessage) {
          const envelope = payload.params.envelope;
          const dataMessage = envelope.dataMessage;
          
          if (dataMessage.message) {
            const msg: SignalMessage = {
              sender: envelope.sourceNumber || envelope.sourceUuid,
              content: dataMessage.message,
              timestamp: envelope.timestamp,
            };

            this.onMessageReceived(msg);
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  private onMessageReceived(msg: SignalMessage) {
    const trustedNumbers = this.config.signal?.trustedNumbers || [];
    if (trustedNumbers.length > 0 && !trustedNumbers.includes(msg.sender)) {
      debugLogger.debug(`[SIGNAL] Ignored message from untrusted sender: ${msg.sender}`);
      return;
    }

    debugLogger.debug(`[SIGNAL] Incoming from ${msg.sender}: ${msg.content}`);
    
    // Emit the message so that NexusService can listen and solve it
    coreEvents.emit(CoreEvent.SignalMessageReceived, msg);
  }

  shutdown() {
    if (this.signalProcess) {
      this.signalProcess.kill();
      this.signalProcess = null;
      this.initialized = false;
    }
  }
}
