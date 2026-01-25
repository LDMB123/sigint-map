# Bundler Integration for WASM

## Overview
Comprehensive guide to integrating WebAssembly modules with modern JavaScript bundlers including Webpack, Vite, Rollup, and ESBuild, covering configuration, optimization, and best practices.

## Webpack Configuration

### Basic WASM Setup

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    webassemblyModuleFilename: 'wasm/[hash].wasm'
  },

  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true
  },

  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'webassembly/async'
      }
    ]
  },

  resolve: {
    extensions: ['.js', '.wasm', '.ts']
  }
};
```

### Advanced Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    webassemblyModuleFilename: 'wasm/[modulehash].wasm',
    clean: true
  },

  experiments: {
    asyncWebAssembly: true,
    // Enable for synchronous WASM (not recommended for web)
    // syncWebAssembly: true,
    topLevelAwait: true
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
        // Optional: custom loader for preprocessing
        use: [
          {
            loader: 'wasm-loader',
            options: {
              optimize: true
            }
          }
        ]
      }
    ]
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.wasm'],
    alias: {
      '@wasm': path.resolve(__dirname, 'src/wasm')
    }
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/wasm/**/*.wasm',
          to: 'wasm/[name][ext]'
        }
      ]
    })
  ],

  optimization: {
    moduleIds: 'deterministic',
    splitChunks: {
      cacheGroups: {
        wasm: {
          test: /\.wasm$/,
          name: 'wasm-modules',
          chunks: 'all'
        }
      }
    }
  },

  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    compress: true,
    port: 3000,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
};
```

### Custom WASM Loader

```javascript
// loaders/wasm-loader.js
const { optimize } = require('wasm-opt');

module.exports = function(source) {
  const callback = this.async();
  const options = this.getOptions();

  if (options.optimize) {
    // Optimize WASM binary
    optimize(source, {
      optimizationLevel: 3,
      shrinkLevel: 2
    })
      .then(optimized => {
        callback(null, optimized);
      })
      .catch(err => {
        callback(err);
      });
  } else {
    callback(null, source);
  }
};

module.exports.raw = true;
```

### Webpack Plugin for WASM Types

```javascript
// plugins/WasmTypesPlugin.js
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

class WasmTypesPlugin {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './src/types',
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('WasmTypesPlugin', (compilation, callback) => {
      // Find all WASM assets
      const wasmAssets = Object.keys(compilation.assets).filter(name =>
        name.endsWith('.wasm')
      );

      wasmAssets.forEach(assetName => {
        const asset = compilation.assets[assetName];
        const source = asset.source();

        // Generate types (simplified)
        const moduleName = assetName.replace(/\.wasm$/, '');
        const types = this.generateTypes(moduleName, source);

        const typeFilePath = join(
          this.options.outputDir,
          `${moduleName}.wasm.d.ts`
        );

        writeFileSync(typeFilePath, types);
      });

      callback();
    });
  }

  generateTypes(moduleName, wasmBuffer) {
    // Simplified type generation
    return `
export interface ${moduleName}Exports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
}

export interface ${moduleName}Instance extends WebAssembly.Instance {
  exports: ${moduleName}Exports;
}
    `.trim();
  }
}

module.exports = WasmTypesPlugin;
```

## Vite WASM Plugin

### Basic Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],

  build: {
    target: 'esnext'
  },

  optimizeDeps: {
    exclude: ['@wasm-modules']
  }
});
```

### Advanced Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),

    // Custom plugin for WASM processing
    {
      name: 'wasm-loader',
      async transform(code, id) {
        if (id.endsWith('.wasm')) {
          // Custom transformation
          return {
            code: `export default "${id}"`,
            map: null
          };
        }
      }
    }
  ],

  resolve: {
    alias: {
      '@wasm': resolve(__dirname, './src/wasm')
    }
  },

  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'wasm/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },

  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },

  optimizeDeps: {
    exclude: ['*.wasm']
  }
});
```

### Custom Vite WASM Plugin

```typescript
// plugins/vite-wasm-advanced.ts
import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { basename } from 'path';

interface WasmPluginOptions {
  generateTypes?: boolean;
  optimize?: boolean;
  inline?: boolean;
}

export function wasmPlugin(options: WasmPluginOptions = {}): Plugin {
  const {
    generateTypes = true,
    optimize = false,
    inline = false
  } = options;

  return {
    name: 'vite-plugin-wasm-advanced',

    // Handle WASM imports
    async load(id) {
      if (!id.endsWith('.wasm')) return null;

      const wasmBuffer = readFileSync(id);

      if (inline) {
        // Inline WASM as base64
        const base64 = wasmBuffer.toString('base64');
        return {
          code: `
import { instantiate } from './wasm-runtime';

const wasmBase64 = "${base64}";
const wasmBinary = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));

export default async function(imports) {
  const { instance } = await WebAssembly.instantiate(wasmBinary, imports);
  return instance.exports;
}
          `.trim(),
          map: null
        };
      } else {
        // Emit as separate file
        const fileName = basename(id);
        const referenceId = this.emitFile({
          type: 'asset',
          name: fileName,
          source: wasmBuffer
        });

        return {
          code: `
export default async function(imports) {
  const response = await fetch(import.meta.ROLLUP_FILE_URL_${referenceId});
  const { instance } = await WebAssembly.instantiateStreaming(response, imports);
  return instance.exports;
}
          `.trim(),
          map: null
        };
      }
    },

    // Generate TypeScript types
    async buildEnd() {
      if (generateTypes) {
        // Type generation logic
      }
    },

    // Configure dev server
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    }
  };
}
```

### Vite Environment Configuration

```typescript
// vite.config.ts - Multiple environments
import { defineConfig, loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      wasm()
    ],

    define: {
      'import.meta.env.WASM_OPTIMIZE': JSON.stringify(
        mode === 'production'
      )
    },

    build: {
      target: mode === 'production' ? 'esnext' : 'modules',
      minify: mode === 'production',
      sourcemap: mode !== 'production',

      rollupOptions: {
        output: {
          manualChunks: {
            'wasm-runtime': ['./src/wasm/runtime.ts']
          }
        }
      }
    }
  };
});
```

## Rollup Setup

### Basic Rollup Configuration

```javascript
// rollup.config.js
import { wasm } from '@rollup/plugin-wasm';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',

  output: {
    file: 'dist/bundle.js',
    format: 'esm',
    sourcemap: true
  },

  plugins: [
    wasm({
      // Inline WASM as base64
      targetEnv: 'auto-inline'
    }),
    nodeResolve(),
    commonjs(),
    typescript()
  ]
};
```

### Advanced Rollup Configuration

```javascript
// rollup.config.js
import { wasm } from '@rollup/plugin-wasm';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.ts',

  output: [
    {
      file: 'dist/bundle.esm.js',
      format: 'esm',
      sourcemap: true,
      assetFileNames: 'assets/[name]-[hash][extname]'
    },
    {
      file: 'dist/bundle.cjs.js',
      format: 'cjs',
      sourcemap: true
    }
  ],

  plugins: [
    wasm({
      // Copy WASM files instead of inlining
      targetEnv: 'auto',
      fileName: '[name]-[hash][extname]',
      publicPath: '/wasm/'
    }),

    nodeResolve({
      extensions: ['.js', '.ts', '.wasm']
    }),

    typescript({
      declaration: true,
      declarationDir: 'dist/types'
    }),

    copy({
      targets: [
        {
          src: 'src/wasm/**/*.wasm',
          dest: 'dist/wasm'
        }
      ]
    }),

    production && terser({
      compress: {
        module: true
      }
    })
  ],

  external: ['fs', 'path']
};
```

### Custom Rollup WASM Plugin

```javascript
// plugins/rollup-wasm-custom.js
import { readFileSync } from 'fs';
import { extname, basename } from 'path';

export function customWasmPlugin(options = {}) {
  const {
    inline = false,
    optimize = false,
    publicPath = '/wasm/'
  } = options;

  return {
    name: 'custom-wasm',

    load(id) {
      if (extname(id) !== '.wasm') return null;

      const buffer = readFileSync(id);

      if (inline) {
        // Inline as base64
        const base64 = buffer.toString('base64');
        return {
          code: `
const wasmBytes = Uint8Array.from(
  atob("${base64}"),
  c => c.charCodeAt(0)
);

export default async function init(imports) {
  const { instance } = await WebAssembly.instantiate(
    wasmBytes,
    imports
  );
  return instance.exports;
}
          `.trim(),
          map: { mappings: '' }
        };
      } else {
        // Emit as asset
        const fileName = basename(id);
        const referenceId = this.emitFile({
          type: 'asset',
          name: fileName,
          source: buffer
        });

        return {
          code: `
const wasmUrl = new URL(
  '${publicPath}' + import.meta.ROLLUP_FILE_URL_${referenceId},
  import.meta.url
).href;

export default async function init(imports) {
  const response = await fetch(wasmUrl);
  const { instance } = await WebAssembly.instantiateStreaming(
    response,
    imports
  );
  return instance.exports;
}
          `.trim(),
          map: { mappings: '' }
        };
      }
    },

    resolveFileUrl({ fileName }) {
      return `'${publicPath}${fileName}'`;
    }
  };
}
```

### Rollup Multi-entry Configuration

```javascript
// rollup.config.js
import { wasm } from '@rollup/plugin-wasm';
import multi from '@rollup/plugin-multi-entry';

export default {
  input: 'src/**/*.ts',

  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    assetFileNames: 'assets/[name]-[hash][extname]'
  },

  plugins: [
    multi(),
    wasm({
      targetEnv: 'auto',
      maxFileSize: 0 // Never inline
    })
  ],

  preserveModules: true
};
```

## ESBuild Considerations

### Basic ESBuild Setup

```javascript
// build.js
const esbuild = require('esbuild');
const wasmLoader = require('esbuild-plugin-wasm');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'esm',
  target: 'esnext',

  plugins: [
    wasmLoader()
  ],

  loader: {
    '.wasm': 'file'
  }
}).catch(() => process.exit(1));
```

### Advanced ESBuild Configuration

```javascript
// build.js
const esbuild = require('esbuild');
const { readFileSync } = require('fs');
const { resolve } = require('path');

// Custom WASM plugin
const wasmPlugin = {
  name: 'wasm',
  setup(build) {
    // Handle .wasm imports
    build.onResolve({ filter: /\.wasm$/ }, args => {
      return {
        path: resolve(args.resolveDir, args.path),
        namespace: 'wasm'
      };
    });

    build.onLoad({ filter: /.*/, namespace: 'wasm' }, async (args) => {
      const wasmBuffer = readFileSync(args.path);

      // Option 1: Inline as base64
      if (process.env.INLINE_WASM === 'true') {
        const base64 = wasmBuffer.toString('base64');
        return {
          contents: `
            const wasmBytes = Uint8Array.from(
              atob("${base64}"),
              c => c.charCodeAt(0)
            );
            export default wasmBytes.buffer;
          `,
          loader: 'js'
        };
      }

      // Option 2: Copy to output and reference
      const fileName = args.path.split('/').pop();
      const outputPath = `wasm/${fileName}`;

      return {
        contents: `
          export default async function(imports) {
            const response = await fetch('/${outputPath}');
            const { instance } = await WebAssembly.instantiateStreaming(
              response,
              imports
            );
            return instance.exports;
          }
        `,
        loader: 'js'
      };
    });
  }
};

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'esm',
  target: 'esnext',
  minify: true,
  sourcemap: true,

  plugins: [wasmPlugin],

  define: {
    'process.env.NODE_ENV': '"production"'
  },

  external: ['fs', 'path']
}).catch(() => process.exit(1));
```

### ESBuild Watch Mode

```javascript
// watch.js
const esbuild = require('esbuild');
const wasmPlugin = require('./plugins/wasm-plugin');

async function watch() {
  const ctx = await esbuild.context({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/bundle.js',
    format: 'esm',
    plugins: [wasmPlugin],
    sourcemap: 'inline'
  });

  await ctx.watch();

  console.log('Watching for changes...');
}

watch();
```

### ESBuild with TypeScript

```typescript
// build.ts
import * as esbuild from 'esbuild';
import type { Plugin } from 'esbuild';

const wasmPlugin: Plugin = {
  name: 'wasm-loader',
  setup(build) {
    build.onResolve({ filter: /\.wasm$/ }, (args) => ({
      path: require.resolve(args.path, { paths: [args.resolveDir] }),
      namespace: 'wasm-stub'
    }));

    build.onLoad({ filter: /.*/, namespace: 'wasm-stub' }, (args) => ({
      contents: `export default ${JSON.stringify(args.path)}`,
      loader: 'json'
    }));
  }
};

async function build() {
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/bundle.js',
    format: 'esm',
    target: 'esnext',
    plugins: [wasmPlugin],
    logLevel: 'info'
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

## Dynamic Imports

### Lazy Loading WASM

```typescript
// lazy-wasm.ts
export class LazyWasmLoader {
  private cache = new Map<string, Promise<WebAssembly.Exports>>();

  async load(
    url: string,
    imports?: WebAssembly.Imports
  ): Promise<WebAssembly.Exports> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const promise = this.loadModule(url, imports);
    this.cache.set(url, promise);

    return promise;
  }

  private async loadModule(
    url: string,
    imports?: WebAssembly.Imports
  ): Promise<WebAssembly.Exports> {
    const response = await fetch(url);
    const { instance } = await WebAssembly.instantiateStreaming(
      response,
      imports
    );
    return instance.exports;
  }

  clear(): void {
    this.cache.clear();
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }
}

// Usage
const loader = new LazyWasmLoader();

async function processImage(imageData: Uint8Array) {
  // Only load image processing module when needed
  const imageWasm = await loader.load('./image-processor.wasm');
  return imageWasm.processImage(imageData);
}
```

### Code Splitting with WASM

```typescript
// app.ts
export async function runComputation() {
  // Dynamic import of WASM module
  const { default: initWasm } = await import('./compute.wasm');

  const wasm = await initWasm();
  return wasm.compute();
}

// Webpack configuration for code splitting
module.exports = {
  entry: './src/index.ts',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: 'chunks/[name].[contenthash].js'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        wasm: {
          test: /\.wasm$/,
          name: 'wasm',
          priority: 10
        }
      }
    }
  }
};
```

### Route-based WASM Loading

```typescript
// routes.ts
interface Route {
  path: string;
  component: () => Promise<any>;
  wasm?: () => Promise<WebAssembly.Exports>;
}

const routes: Route[] = [
  {
    path: '/image-editor',
    component: () => import('./components/ImageEditor'),
    wasm: async () => {
      const init = await import('./wasm/image.wasm');
      return init.default();
    }
  },
  {
    path: '/3d-viewer',
    component: () => import('./components/Viewer3D'),
    wasm: async () => {
      const init = await import('./wasm/renderer.wasm');
      return init.default();
    }
  }
];

// Router
class WasmRouter {
  private wasmCache = new Map<string, WebAssembly.Exports>();

  async navigate(path: string) {
    const route = routes.find(r => r.path === path);
    if (!route) throw new Error(`Route not found: ${path}`);

    // Load component and WASM in parallel
    const [component, wasm] = await Promise.all([
      route.component(),
      route.wasm ? this.loadWasm(path, route.wasm) : Promise.resolve(null)
    ]);

    return { component, wasm };
  }

  private async loadWasm(
    path: string,
    loader: () => Promise<WebAssembly.Exports>
  ): Promise<WebAssembly.Exports> {
    if (this.wasmCache.has(path)) {
      return this.wasmCache.get(path)!;
    }

    const wasm = await loader();
    this.wasmCache.set(path, wasm);
    return wasm;
  }
}
```

### Prefetching WASM Modules

```typescript
// prefetch.ts
export class WasmPrefetcher {
  private prefetchedUrls = new Set<string>();

  prefetch(url: string): void {
    if (this.prefetchedUrls.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'fetch';
    link.type = 'application/wasm';

    document.head.appendChild(link);
    this.prefetchedUrls.add(url);
  }

  prefetchAll(urls: string[]): void {
    urls.forEach(url => this.prefetch(url));
  }

  // Preload (higher priority)
  preload(url: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'fetch';
    link.type = 'application/wasm';
    link.crossOrigin = 'anonymous';

    document.head.appendChild(link);
  }
}

// Usage
const prefetcher = new WasmPrefetcher();

// Prefetch on idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    prefetcher.prefetchAll([
      '/wasm/image-processor.wasm',
      '/wasm/audio-processor.wasm'
    ]);
  });
}

// Preload critical WASM
prefetcher.preload('/wasm/core.wasm');
```

## Best Practices

1. **Use asyncWebAssembly** in Webpack for better performance
2. **Enable top-level await** for cleaner async code
3. **Configure CORS headers** properly for streaming compilation
4. **Separate WASM chunks** for better caching
5. **Generate types** automatically in build process
6. **Use code splitting** for large WASM modules
7. **Prefetch/preload** WASM on appropriate routes
8. **Configure content types** correctly in dev server
9. **Version WASM files** with content hashes
10. **Optimize WASM** in production builds

## Common Pitfalls

- Not enabling experiments.asyncWebAssembly in Webpack
- Missing MIME type configuration for .wasm files
- Incorrect CORS headers preventing streaming compilation
- Forgetting to handle async WASM loading
- Not configuring publicPath for WASM assets
- Inlining large WASM files (increases bundle size)
- Not splitting WASM from main bundle
- Missing TypeScript declarations for WASM modules
- Incorrect file loader configuration
- Not handling WASM compilation errors

## Performance Optimization

### Compression

```javascript
// vite.config.js with compression
import compression from 'vite-plugin-compression';

export default {
  plugins: [
    compression({
      filter: /\.(js|css|html|wasm)$/,
      algorithm: 'brotliCompress',
      ext: '.br'
    })
  ]
};
```

### Caching Strategy

```javascript
// Service worker for WASM caching
self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('.wasm')) {
    event.respondWith(
      caches.open('wasm-cache-v1').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
```

### Bundle Analysis

```javascript
// webpack.config.js with bundle analyzer
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'wasm-bundle-report.html'
    })
  ]
};
```
