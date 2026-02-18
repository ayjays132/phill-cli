/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const isWatchMode = process.argv.includes('--watch');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

let esbuild;
try {
  esbuild = (await import('esbuild')).default;
} catch (_error) {
  // Fallback to cli package node_modules if root install is broken
  try {
    const cliEsbuildPath = require.resolve('esbuild', {
      paths: [path.join(__dirname, 'packages/cli')],
    });
    esbuild = (await import(`file://${cliEsbuildPath}`)).default;
  } catch (__error) {
    console.error('esbuild not available - cannot build bundle');
    process.exit(1);
  }
}

const pkg = require(path.resolve(__dirname, 'package.json'));

function createBuildSignalPlugin(outfile) {
  return {
    name: 'build-signal',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) {
          if (existsSync(outfile)) {
            const bundleContent = readFileSync(outfile);
            const hash = createHash('sha256')
              .update(bundleContent)
              .digest('hex');
            writeFileSync('.build_success', hash);
          } else {
            // If outfile doesn't exist but build was successful, still signal a change
            // This might happen for empty builds or if outfile is not directly written by esbuild
            writeFileSync('.build_success', Date.now().toString());
          }
        }
      });
    },
  };
}

const external = [
  'node-pty',
  '@lydell/node-pty',
  '@lydell/node-pty-darwin-arm64',
  '@lydell/node-pty-darwin-x64',
  '@lydell/node-pty-linux-x64',
  '@lydell/node-pty-win32-arm64',
  '@lydell/node-pty-win32-x64',
  'onnxruntime-node',
  'keytar',
  'speaker',
  'node-audiorecorder',
  'ws',
  'playwright',
  'playwright-core',
  'fsevents', // Explicitly externalize fsevents to avoid bundling issues
  'tree-sitter-bash',
  'web-tree-sitter',
  '@xenova/transformers',
];

// Plugin to mark all non-relative imports as external to avoid bundling node_modules.
// EXCEPT for pure-JS packages we want to bundle for a robust binary.
function createAutoExternalPlugin() {
  return {
    name: 'auto-external',
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        // 1. Force external for native/binary packages
        if (
          external.some(
            (pkg) => args.path === pkg || args.path.startsWith(pkg + '/'),
          )
        ) {
          return { path: args.path, external: true };
        }

        // 2. Bundle internal workspace packages
        if (
          args.path.startsWith('phill-cli') ||
          args.path.startsWith('@ayjays132/phill-cli')
        ) {
          return undefined; // bundle it
        }

        // 3. For all other node_modules, we prefer to BUNDLE them unless they are special.
        // This makes the CLI much more robust as it doesn't depend on the user's environment.
        // We only externalize known problematic or huge packages that shouldn't be bundled.
        const dontBundle = ['ffmpeg-static', 'ffplay-static'];

        if (dontBundle.includes(args.path)) {
          return { path: args.path, external: true };
        }

        // Default: Bundle everything else for a "batteries-included" JS file.
        return undefined;
      });
    },
  };
}

// Plugin to handle optional native modules that may not be installed.
// Instead of failing at bundle time or runtime, resolve them to empty stubs.
function createOptionalExternalsPlugin() {
  const optionalPackages = [
    'node-pty',
    '@lydell/node-pty',
    'onnxruntime-node',
    'keytar',
    'speaker',
    'node-audiorecorder',
    'fsevents',
  ];
  return {
    name: 'optional-externals',
    setup(build) {
      if (optionalPackages.length === 0) return;
      const filter = new RegExp(`^(${optionalPackages.join('|')})$`);
      build.onResolve({ filter }, (args) => ({
        path: args.path,
        namespace: 'optional-external',
      }));
      build.onLoad({ filter: /.*/, namespace: 'optional-external' }, () => ({
        contents:
          'export default {}; export const spawn = () => { throw new Error("Native module not available"); };',
        loader: 'js',
      }));
    },
  };
}

const baseConfig = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  external,
  loader: { '.node': 'file', '.toml': 'text', '.wasm': 'file' },
  write: true,
};

const commonAliases = {
  // Use shim for ffmpeg/ffplay to avoid runtime require() failures if not installed,
  // while relying on local binary discovery in DeviceManager.
  'ffmpeg-static': path.resolve(
    __dirname,
    'packages/cli/src/patches/ffmpeg-static-shim.js',
  ),
  'ffplay-static': path.resolve(
    __dirname,
    'packages/cli/src/patches/ffplay-static-shim.js',
  ),
};

const cliConfig = {
  ...baseConfig,
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url); globalThis.__filename = require('url').fileURLToPath(import.meta.url); globalThis.__dirname = require('path').dirname(globalThis.__filename);`,
  },
  entryPoints: ['packages/cli/index.ts'],
  outfile: 'bundle/phill.js',
  define: {
    'process.env.CLI_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [createOptionalExternalsPlugin(), createAutoExternalPlugin()],
  alias: {
    'is-in-ci': path.resolve(__dirname, 'packages/cli/src/patches/is-in-ci.ts'),
    ...commonAliases,
  },
  metafile: true,
};
cliConfig.plugins.push(createBuildSignalPlugin(cliConfig.outfile));

const a2aServerConfig = {
  ...baseConfig,
  banner: {
    js: `const require = (await import('module')).createRequire(import.meta.url); globalThis.__filename = require('url').fileURLToPath(import.meta.url); globalThis.__dirname = require('path').dirname(globalThis.__filename);`,
  },
  entryPoints: ['packages/a2a-server/src/http/server.ts'],
  outfile: 'packages/a2a-server/dist/a2a-server.mjs',
  define: {
    'process.env.CLI_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [createOptionalExternalsPlugin(), createAutoExternalPlugin()],
  alias: {
    ...commonAliases,
  },
};
a2aServerConfig.plugins.push(createBuildSignalPlugin(a2aServerConfig.outfile));

const engineConfig = {
  ...baseConfig,
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url); globalThis.__filename = require('url').fileURLToPath(import.meta.url); globalThis.__dirname = require('path').dirname(globalThis.__filename);`,
  },
  entryPoints: ['packages/core/src/cognitive-engine/engine-process.ts'],
  outfile: 'bundle/engine-process.js',
  define: {
    'process.env.CLI_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [createOptionalExternalsPlugin(), createAutoExternalPlugin()],
  alias: {
    ...commonAliases,
  },
};

async function buildWithWatch(config) {
  if (isWatchMode) {
    const context = await esbuild.context(config);
    await context.watch();
    return { metafile: null };
  } else {
    return await esbuild.build(config);
  }
}

Promise.allSettled([
  buildWithWatch(cliConfig).then(({ metafile }) => {
    if (process.env.DEV === 'true' && metafile) {
      writeFileSync('./bundle/esbuild.json', JSON.stringify(metafile, null, 2));
    }
  }),
  buildWithWatch(a2aServerConfig),
  buildWithWatch(engineConfig),
]).then((results) => {
  const [cliResult, a2aResult, engineResult] = results;
  if (cliResult.status === 'rejected') {
    console.error('phill.js build failed:', cliResult.reason);
    process.exit(1);
  }
  if (a2aResult.status === 'rejected') {
    console.warn('a2a-server build failed:', a2aResult.reason);
  }
  if (engineResult.status === 'rejected') {
    console.warn('engine-process build failed:', engineResult.reason);
  }
  if (isWatchMode) {
    console.log('Watching for changes...');
  }
});
