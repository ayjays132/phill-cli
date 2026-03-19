/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FC } from 'react';
import { render, Box, Text } from 'ink';
import type { CommandModule, Argv } from 'yargs';
import { AxiomService, AxiomErrorSeverity, debugLogger } from 'phill-cli-core';
import type { AxiomError } from 'phill-cli-core';
import { loadCliConfig, parseArguments } from '../config/config.js';
import type { CliArgs } from '../config/config.js';
import { loadSettings } from '../config/settings.js';
import { initializeOutputListenersAndFlush } from '../phill.js';
import { exitCli } from './utils.js';

interface AxiomDisplayProps {
  errors: AxiomError[];
}

/**
 * AxiomDisplay component for rendering errors in a premium Metropolis style.
 */
const AxiomDisplay: FC<AxiomDisplayProps> = ({ errors }) => {
  if (errors.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green" bold>✓ AXIOM: No errors detected in workspace.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold underline>
        AXIOM Error Intelligence Report
      </Text>
      {errors.map((error, index) => (
        <Box key={index} flexDirection="column" marginTop={1} borderStyle="round" borderColor={error.severity === AxiomErrorSeverity.ERROR ? 'red' : 'yellow'}>
          <Box justifyContent="space-between">
            <Text color={error.severity === AxiomErrorSeverity.ERROR ? 'red' : 'yellow'} bold>
              [{error.severity}] {error.source.toUpperCase()}
            </Text>
            <Text dimColor>{new Date(error.timestamp).toLocaleTimeString()}</Text>
          </Box>
          <Text>{error.message}</Text>
          <Text dimColor>
            File: {error.filePath}:{error.line}:{error.column}
          </Text>
          {error.fixSuggestion && (
              <Box marginTop={1} paddingLeft={2}>
                  <Text color="green" italic>Suggested Fix: {error.fixSuggestion}</Text>
              </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export const axiomCommand: CommandModule = {
  command: 'axiom',
  describe: 'Adaptive eXecution Intelligence & Omnibus Monitor',
  builder: (yargs: Argv) =>
    yargs
      .middleware((argv) => {
        initializeOutputListenersAndFlush();
        argv['isCommand'] = true;
      })
      .command('scan', 'Perform a full workspace intelligence scan', {}, async (argv) => {
        try {
          const settings = loadSettings();
          const cliArgs = await parseArguments(settings.merged);
          // Pass any overrides from argv to cliArgs
          const config = await loadCliConfig(
            settings.merged,
            'axiom-scan',
            { ...cliArgs, ...argv } as CliArgs,
          );
          
          const axiom = AxiomService.getInstance();
          await axiom.initialize(config);
          
          debugLogger.log('\n[AXIOM] Starting workspace scan...');
          await axiom.scanWorkspace(config);
          
          const errors = axiom.getErrors();
          render(<AxiomDisplay errors={errors} />);
          
          await exitCli();
        } catch (e: unknown) {
          debugLogger.error('[AXIOM] Scan failed:', e);
          process.exit(1);
        }
      })
      .command('fix', 'Identify and apply automated fixes for known errors', {}, async (_argv) => {
          // Placeholder for fix command
          debugLogger.log('[AXIOM] Searching for high-confidence fixes...');
          await exitCli();
      })
      .demandCommand(1, 'You need to specify a subcommand: scan, fix, etc.')
      .version(false),
  handler: () => {},
};
