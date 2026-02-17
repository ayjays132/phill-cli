import {
  type SlashCommand,
  CommandKind,
  type CommandContext,
} from './types.js';

export const forgeCommand: SlashCommand = {
  name: 'forge',
  description: 'Enter The Forge - Agent Hub & Phillbook',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: async (context: CommandContext): Promise<void> => {
    // Toggle forge open
    context.ui.setForgeOpen(true);
  },
};
