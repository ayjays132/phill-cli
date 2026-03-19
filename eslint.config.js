/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';
import headers from 'eslint-plugin-headers';
import path from 'node:path';
import url from 'node:url';

// --- ESM way to get __dirname ---
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- ---

// Determine the monorepo root (assuming eslint.config.js is at the root)
const projectRoot = __dirname;

export default tseslint.config(
  {
    // Global ignores
    ignores: [
      '**/node_modules/**',
      'eslint.config.js',
      'phill-cli-site/**',
      'packages/**/dist/**',
      'bundle/**',
      '**/package/bundle/**',
      '**/.integration-tests/**',
      'dist/**',
      'evals/**',
      'packages/test-utils/**',
      'packages/core/src/skills/builtin/skill-creator/scripts/*.cjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Fix: Properly map react-hooks for flat config
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'], // Add this if you are using React 17+
  {
    // Settings for eslint-plugin-react
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Import specific config
    files: ['packages/cli/src/**/*.{ts,tsx}'], // Target only TS/TSX in the cli package
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        node: true,
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      'import/no-default-export': 'warn',
      'import/no-unresolved': 'off', // Disable for now, can be noisy with monorepos/paths
    },
  },
  {
    // General overrides and rules for the project (TS/TSX files)
    files: ['packages/*/src/**/*.{ts,tsx}'], // Target only TS/TSX in the packages
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        node: true,
      },
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: projectRoot,
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'react/prop-types': 'off',
      // General Best Practice Rules (subset adapted for flat config)
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      'arrow-body-style': ['error', 'as-needed'],
      curly: ['error', 'multi-line'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as' },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'no-public' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-inferrable-types': [
        'error',
        { ignoreParameters: true, ignoreProperties: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Prevent async errors from bypassing catch handlers
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      'import/no-internal-modules': [
        'error',
        {
          allow: [
            'react-dom/test-utils',
            'memfs/lib/volume.js',
            'yargs/**',
            'msw/node',
            // Allow any relative cross-folder imports within the UI layer.
            // The rule tests import source strings, so '../hooks/foo.js'
            // must match one of these patterns.
            '../hooks/**',
            '../contexts/**',
            '../utils/**',
            '../themes/**',
            '../components/shared/**',
            './hooks/**',
            './contexts/**',
            './utils/**',
            './themes/**',
            './components/shared/**',
            './shared/**',
            '../semantic-colors.js',
            './semantic-colors.js',
            '../voice/**',
            '../privacy/**',
            '../layouts/**',
            '../../contexts/**',
            '../../hooks/**',
            '../../utils/**',
            // Allow package index files to reach into their own subdirectories for exporting
            './services/**',
            './config/**',
            './core/**',
            './utils/**',
            './tools/**',
            './hooks/**',
            './contexts/**',
            './mcp/**',
            './voice/**',
            './telemetry/**',
            './agents/**',
            './prompts/**',
            './ide/**',
            './vision/**',
            './scheduler/**',
            './commands/**',
            './skills/**',
            './output/**',
            './policy/**',
            './confirmation-bus/**',
            './cognitive-engine/**',
            './fallback/**',
          ],
        },
      ],
      'import/no-relative-packages': 'error',
      'no-cond-assign': 'error',
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="require"]',
          message: 'Avoid using require(). Use ES6 imports instead.',
        },
        {
          selector: 'ThrowStatement > Literal:not([value=/^\\w+Error:/])',
          message:
            'Do not throw string literals or non-Error objects. Throw new Error("...") instead.',
        },
      ],
      'no-unsafe-finally': 'error',
      'no-unused-expressions': 'off', // Disable base rule
      '@typescript-eslint/no-unused-expressions': [
        // Enable TS version
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
      'no-var': 'error',
      'object-shorthand': 'error',
      'one-var': ['error', 'never'],
      'prefer-arrow-callback': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      radix: 'error',
      'no-console': 'error',
      'default-case': 'error',
      '@typescript-eslint/await-thenable': ['error'],
      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/no-unnecessary-type-assertion': ['error'],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'node:os',
              importNames: ['homedir', 'tmpdir'],
              message:
                'Please use the helpers from phill-cli-core instead of node:os homedir()/tmpdir() to ensure strict environment isolation.',
            },
            {
              name: 'os',
              importNames: ['homedir', 'tmpdir'],
              message:
                'Please use the helpers from phill-cli-core instead of os homedir()/tmpdir() to ensure strict environment isolation.',
            },
          ],
        },
      ],
    },
  },
  {
    // Allow os.homedir() in tests and paths.ts where it is used to implement the helper
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      'packages/core/src/utils/paths.ts',
      'packages/test-utils/src/**/*.ts',
      'scripts/**/*.js',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Prevent self-imports in packages
    files: ['packages/core/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Fix: Wrap custom overrides inside the 'paths' array
          paths: [
            {
              name: 'phill-cli-core',
              message: 'Please use relative imports within the phill-cli-core package.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/cli/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Fix: Wrap custom overrides inside the 'paths' array
          paths: [
            {
              name: 'phill-cli',
              message: 'Please use relative imports within the phill-cli package.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/*/src/**/*.test.{ts,tsx}'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/expect-expect': 'off',
      'vitest/no-commented-out-tests': 'off',
    },
  },
  {
    files: ['./**/*.{tsx,ts,js}'],
    plugins: {
      headers,
      import: importPlugin,
    },
    rules: {
      'headers/header-format': [
        'error',
        {
          source: 'string',
          content: [
            '@license',
            'Copyright (year) Google LLC',
            'SPDX-License-Identifier: Apache-2.0',
          ].join('\n'),
          patterns: {
            year: {
              pattern: '202[5-6]',
              defaultValue: '2026',
            },
          },
        },
      ],
      'import/enforce-node-protocol-usage': ['error', 'always'],
    },
  },
  // extra settings for scripts that we run directly with node
  {
    files: ['./scripts/**/*.js', 'esbuild.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['packages/vscode-ide-companion/esbuild.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Examples should have access to standard globals like fetch
  {
    files: ['packages/cli/src/commands/extensions/examples/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        fetch: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  // extra settings for scripts that we run directly with node
  {
    files: ['packages/vscode-ide-companion/scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['./integration-tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Node-style tooling scripts for the Lyria music tool
    files: ['tools/lyria-music/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    // Browser-based media devices test script
    files: ['test_mediadevices_6.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        console: 'readonly',
      },
    },
  },
  // Fix: Prettier config MUST be strictly last to override formatting rules
  prettierConfig
);