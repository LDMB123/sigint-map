---
skill: bundler-integration
description: Webpack/Vite WASM Integration
---

# Webpack/Vite WASM Integration

## Usage

```bash
/bundler-integration <bundler> <wasm-source> [options]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `bundler` | Yes | Target bundler: `webpack`, `vite`, `rollup`, `esbuild` |
| `wasm-source` | Yes | Path to WASM file or source project |
| `options` | No | Flags: `--async-chunks`, `--workers`, `--ssr` |

## Instructions

You are a build tooling expert specializing in WebAssembly bundling, code splitting, and production optimization for modern JavaScript bundlers.

Configure the specified bundler for optimal WASM integration with proper loading strategies, chunk splitting, and cross-platform compatibility.

### Bundler Feature Comparison

| Feature | Webpack 5 | Vite | Rollup | esbuild |
|---------|-----------|------|--------|---------|
| Native WASM | Yes | Yes | Plugin | Plugin |
| Async loading | Yes | Yes | Yes | Limited |
| Code splitting | Yes | Yes | Yes | Yes |
| Worker support | Yes | Yes | Plugin | Yes |
| SSR support | Manual | Yes | Manual | No |
| Source maps | Yes | Yes | Yes | Yes |
| Top-level await | Yes | Yes | Yes | Yes |

### Webpack 5 Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    webassemblyModuleFilename: 'wasm/[hash].wasm',
    assetModuleFilename: 'assets/[hash][ext]',
  },
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true,
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
    ],
  },
  optimization: {
    moduleIds: 'deterministic',
    splitChunks: {
      cacheGroups: {
        wasm: {
          test: /\.wasm$/,
          name: 'wasm-modules',
          chunks: 'async',
          priority: 10,
        },
      },
    },
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: false,
    },
  },
};

// Usage in code
// src/wasm-loader.js
export async function loadWasm() {
  const wasmModule = await import('./math.wasm');
  return wasmModule;
}
```

**Webpack Worker Configuration**
```javascript
// webpack.config.js (worker support)
module.exports = {
  // ... base config
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            filename: 'workers/[name].[contenthash].js',
          },
        },
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
    ],
  },
};

// src/wasm.worker.js
import wasmModule from './compute.wasm';

self.onmessage = async (e) => {
  const { add, multiply } = await wasmModule;
  const result = add(e.data.a, e.data.b);
  self.postMessage({ result });
};
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
  ],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          wasm: [/\.wasm$/],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@wasm-modules/*'],
  },
  worker: {
    format: 'es',
    plugins: [wasm()],
  },
  assetsInclude: ['**/*.wasm'],
});

// Direct WASM import (Vite handles it)
// src/math.ts
import init, { add, multiply } from './wasm/math.wasm?init';

export async function initMath() {
  await init();
  return { add, multiply };
}
```

**Vite with wasm-pack (Rust)**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import wasmPack from 'vite-plugin-wasm-pack';

export default defineConfig({
  plugins: [
    wasmPack(['./wasm-lib']), // Path to Rust crate
  ],
});

// Usage
import init, { greet } from 'wasm-lib';

await init();
console.log(greet('World'));
```

### Rollup Configuration

```javascript
// rollup.config.js
import { wasm } from '@rollup/plugin-wasm';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: '[name].[hash].js',
    chunkFileNames: '[name].[hash].js',
    assetFileNames: 'assets/[name].[hash][extname]',
  },
  plugins: [
    nodeResolve(),
    wasm({
      sync: ['**/sync-*.wasm'], // Sync load these
      maxFileSize: 10000, // Inline if smaller
    }),
  ],
};

// For larger WASM files with async loading
import { wasm } from '@rollup/plugin-wasm';

export default {
  plugins: [
    wasm({
      sync: [], // All async
      targetEnv: 'auto-inline', // or 'browser', 'node'
    }),
  ],
};
```

### esbuild Configuration

```javascript
// esbuild.config.js
const esbuild = require('esbuild');
const { wasmLoader } = require('esbuild-plugin-wasm');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: 'esnext',
  splitting: true,
  plugins: [
    wasmLoader({
      mode: 'deferred', // or 'embedded'
    }),
  ],
  loader: {
    '.wasm': 'file',
  },
  assetNames: 'assets/[name]-[hash]',
}).catch(() => process.exit(1));
```

### SSR/Node.js Configuration

```typescript
// vite.config.ts (SSR mode)
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasm()],
  ssr: {
    target: 'node',
    noExternal: ['wasm-module'],
  },
  build: {
    ssr: true,
    rollupOptions: {
      input: 'src/server.ts',
    },
  },
});

// Server-side WASM loading
// src/wasm-ssr.ts
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function loadWasmSSR() {
  const wasmPath = join(process.cwd(), 'wasm/module.wasm');
  const wasmBuffer = await readFile(wasmPath);
  const wasmModule = await WebAssembly.compile(wasmBuffer);
  const instance = await WebAssembly.instantiate(wasmModule, imports);
  return instance.exports;
}
```

### Cross-Platform Loader

```typescript
// src/wasm-loader.ts
type WasmLoaderOptions = {
  wasmPath: string;
  imports?: WebAssembly.Imports;
  fallbackPath?: string;
};

export async function universalWasmLoader<T extends WebAssembly.Exports>(
  options: WasmLoaderOptions
): Promise<T> {
  const { wasmPath, imports = {}, fallbackPath } = options;

  // Browser with streaming support
  if (typeof window !== 'undefined' && 'instantiateStreaming' in WebAssembly) {
    try {
      const response = await fetch(wasmPath);
      const { instance } = await WebAssembly.instantiateStreaming(response, imports);
      return instance.exports as T;
    } catch (e) {
      console.warn('Streaming failed, falling back to ArrayBuffer');
    }
  }

  // Browser fallback or Node.js
  if (typeof window !== 'undefined') {
    const response = await fetch(fallbackPath || wasmPath);
    const buffer = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(buffer, imports);
    return instance.exports as T;
  }

  // Node.js
  const { readFile } = await import('fs/promises');
  const { fileURLToPath } = await import('url');
  const path = typeof wasmPath === 'string' && wasmPath.startsWith('file://')
    ? fileURLToPath(wasmPath)
    : wasmPath;
  const buffer = await readFile(path);
  const { instance } = await WebAssembly.instantiate(buffer, imports);
  return instance.exports as T;
}
```

### Configuration Checklist

| Item | Webpack | Vite | Rollup | esbuild |
|------|---------|------|--------|---------|
| Enable async WASM | `experiments.asyncWebAssembly` | Plugin | Plugin | Plugin |
| Top-level await | `experiments.topLevelAwait` | Plugin | Native | Native |
| Code splitting | `splitChunks` | `manualChunks` | `manualChunks` | `splitting` |
| Asset naming | `webassemblyModuleFilename` | `assetsInclude` | `assetFileNames` | `assetNames` |
| Worker support | `worker-loader` | Native | Plugin | Native |
| Source maps | `devtool` | Native | Plugin | `sourcemap` |

### Response Format

```markdown
## Bundler Configuration Generated

### Target
- **Bundler**: [webpack/vite/rollup/esbuild] v[version]
- **WASM Source**: [path]
- **Options**: [flags applied]

### Configuration Files

\`\`\`javascript
// [config file name]
[full configuration]
\`\`\`

### Required Dependencies
\`\`\`bash
npm install -D [dependencies]
\`\`\`

### Loader/Import Code

\`\`\`typescript
// src/wasm-loader.ts
[loader code]
\`\`\`

### Build Commands
\`\`\`bash
# Development
[dev command]

# Production
[build command]
\`\`\`

### Output Structure
\`\`\`
dist/
  index.[hash].js
  wasm/
    module.[hash].wasm
  workers/
    compute.[hash].js
\`\`\`

### Browser Compatibility
| Browser | Min Version | Notes |
|---------|-------------|-------|
| Chrome | [ver] | [notes] |
| Firefox | [ver] | [notes] |
| Safari | [ver] | [notes] |
| Edge | [ver] | [notes] |

### Optimization Notes
- [chunking strategy]
- [caching recommendations]
- [tree-shaking notes]
```
