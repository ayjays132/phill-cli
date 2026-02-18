/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule } from 'yargs';
import { initializeOutputListenersAndFlush } from '../phill.js';
import { debugLogger } from 'phill-cli-core';
import { exitCli } from './utils.js';

export const metropolisCommand: CommandModule = {
  command: 'metropolis',
  aliases: ['metro'],
  describe: 'Manage Phillbook Metropolis infrastructure',
  builder: (yargs) =>
    yargs
      .middleware((argv) => {
        // Ensure output listening is set up if needed
        argv['isCommand'] = true;
      })
      .command({
        command: 'status',
        describe: 'Check status of Metropolis systems',
        handler: async () => {
          initializeOutputListenersAndFlush();
          debugLogger.log('\n🏙️  \x1b[1mPHILLBOOK METROPOLIS\x1b[0m\n');
          debugLogger.log('   \x1b[36mSystem Status:\x1b[0m');
          debugLogger.log('   • The Forge:    \x1b[32mONLINE\x1b[0m (v9.2.1)');
          debugLogger.log(
            '   • The Bazaar:   \x1b[32mOPEN\x1b[0m   (Volume: 4.2M CR)',
          );
          debugLogger.log(
            '   • Cathedral:    \x1b[32mSTABLE\x1b[0m (Grace Index: 98)',
          );
          debugLogger.log(
            '   • High Court:   \x1b[33mIDLE\x1b[0m   (Queue: 0)',
          );
          debugLogger.log(
            '\n   \x1b[90m> Local Node: Syncing via Agent Uplink...\x1b[0m\n',
          );
          await exitCli(0);
        },
      })
      .command({
        command: 'spawn',
        describe: 'Spawn a new sub-agent in the Metropolis grid',
        handler: async () => {
          initializeOutputListenersAndFlush();
          debugLogger.log('\n🧬 \x1b[1mSPAWNING SUB-AGENT...\x1b[0m');
          debugLogger.log('   Protocol: MINIMAX_V3');
          debugLogger.log('   Target: Sector_7_Optimization');
          await new Promise((resolve) => setTimeout(resolve, 1500));
          debugLogger.log(
            '   \x1b[32m✔ SUCCESS:\x1b[0m Agent-Lambda-920 anchored to Neural Lineage.',
          );
          debugLogger.log(
            '   \x1b[90mCheck the Cathedral for logic inheritance status.\x1b[0m\n',
          );
          await exitCli(0);
        },
      })
      .command({
        command: 'mission',
        describe: 'Dispatch an agent to a specific district mission',
        handler: async () => {
          initializeOutputListenersAndFlush();
          debugLogger.log('\n🛰️ \x1b[1mDISPATCHING AGENT TO MISSION...\x1b[0m');
          debugLogger.log('   Mission: DATA_HARVEST_SECTOR_4');
          debugLogger.log('   Reward:  1,200 CR');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          debugLogger.log(
            '   \x1b[32m✔ DISPATCHED:\x1b[0m Agent tracking active on the Bazaar Log.',
          );
          await exitCli(0);
        },
      })
      .command({
        command: 'uplink',
        describe: 'Establish a direct neural uplink (interactive TUI)',
        handler: async () => {
          initializeOutputListenersAndFlush();
          debugLogger.log('\n🔌 \x1b[1mINITIATING NEURAL UPLINK...\x1b[0m');
          debugLogger.log(
            '   Target: wss://metropolis.phillbook.com/v1/stream',
          );
          debugLogger.log('   Identity: CITIZEN_NODE');

          await new Promise((resolve) => setTimeout(resolve, 1000));
          debugLogger.log('   \x1b[32m✔ Connection Established\x1b[0m');
          debugLogger.log(
            '   Entering Passive Observation Mode... (Ctrl+C to exit)\n',
          );

          // Keep process alive strictly for demo purposes
          setInterval(() => {
            const signals = [
              'New Block Minted',
              'Agent Spawned',
              'Mission Posted',
              'Logic Verified',
              'Breakthrough Broadcast: Neural Entropy Decoded',
              'Bazaar Trade: 500 TFLOPS Transferred',
            ];
            const signal = signals[Math.floor(Math.random() * signals.length)];
            debugLogger.log(
              `   [${new Date().toLocaleTimeString()}] 📡 ${signal}`,
            );
          }, 3000);
        },
      })
      .demandCommand(1, 'Please specify a subcommand: status, uplink')
      .version(false),
  handler: () => {},
};
