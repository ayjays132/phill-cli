/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { Clarifier } from './clarifier.js';
import { SessionManager } from './session-manager.js';
import { StateController } from './state-controller.js';

const sessionManager = SessionManager.getInstance();
const stateController = new StateController(sessionManager);
const clarifier = Clarifier.getInstance();

const server = new Server(
  {
    name: 'lyria-music-skill',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'generate',
                description: 'Generate music based on a natural language description. Will ask clarifying questions if needed.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Description of the music to generate' }
                    },
                    required: ['prompt']
                }
            },
            {
                name: 'preview',
                description: 'Quickly preview a music idea (streams 10s to speakers, no export).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Music description' }
                    },
                    required: ['prompt']
                }
            },
            {
                name: 'adaptive_setup',
                description: 'Set up an adaptive music session with multiple states.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        description: { type: 'string', description: 'Overall description (e.g. "stealth game")' },
                        states: { type: 'array', items: { type: 'string' }, description: 'List of state names (e.g. ["stealth", "combat"])' }
                    },
                    required: ['description', 'states']
                }
            },
            {
                name: 'steer',
                description: 'Transition the current music session to a new state or mood.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        target: { type: 'string', description: 'New state name (if adaptive) or mood description' }
                    },
                    required: ['target']
                }
            },
            {
                name: 'export',
                description: 'Save the currently playing stream to a file.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Target file path' },
                        format: { type: 'string', enum: ['wav', 'mp3', 'ogg'] }
                    },
                    required: ['path']
                }
            },
            {
                name: 'stop',
                description: 'Stop music generation.',
                inputSchema: { type: 'object', properties: {} }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'generate': {
                const prompt = args?.['prompt'] as string;
                // 1. Clarify
                const intent = await clarifier.clarify(prompt);
                
                // 2. Start
                await sessionManager.startGeneration(intent);
                
                return {
                    content: [{ type: 'text', text: `Started generating music: ${JSON.stringify(intent, null, 2)}` }]
                };
            }

            case 'preview': {
                const prompt = args?.['prompt'] as string;
                const intent = await clarifier.clarify(prompt);
                intent.previewFirst = true;
                intent.outputFormat = 'stream';
                intent.duration = 10;
                
                await sessionManager.startGeneration(intent);
                return { content: [{ type: 'text', text: "Previewing music..." }] };
            }

            case 'adaptive_setup': {
                // description is optional/decorative for now
                const states = args?.['states'] as string[];
                
                // Load states into controller
                // In a real flow we'd clarify each state. Here we assume presets or simple derivation.
                stateController.loadStates(states);
                
                // Initialize default state
                if (states.length > 0) {
                    stateController.setCurrentState(states[0]);
                }
                
                return { content: [{ type: 'text', text: `Adaptive session initialized with states: ${states.join(', ')}` }] };
            }

            case 'steer': {
                const target = args?.['target'] as string;
                // Check if it's a known state
                // If not, treat as a partial mood update
                
                // Ideally StateController handles this check
                // For MVP, if target matches a loaded state, switch. Else remix.
                stateController.setCurrentState(target); // This logs warning if state not found
                
                // If simple remix (steering by mood description)
                // sessionManager.steer({ mood: [target] });
                
                return { content: [{ type: 'text', text: `Steering to: ${target}` }] };
            }

            case 'stop': {
                await sessionManager.stop();
                return { content: [{ type: 'text', text: "Music stopped." }] };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Lyria Music Skill Server running on stdio');
}

main().catch(console.error);
