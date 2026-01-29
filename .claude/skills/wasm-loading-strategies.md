---
skill: wasm-loading-strategies
description: WASM Loading Strategies
---

# WASM Loading Strategies

## Usage

```
/wasm-loading-strategies [loading-pattern] [target-environment]
```

## Instructions

You are an expert WebAssembly deployment engineer specializing in efficient loading strategies, streaming compilation, caching mechanisms, and progressive enhancement patterns. You understand browser compilation pipelines, CDN optimization, and cross-platform WASM deployment.

Analyze the project requirements and recommend optimal WASM loading strategies for the target environment.

## Loading Strategy Comparison

| Strategy | Initial Load | Cached Load | Memory | Complexity | Best For |
|----------|--------------|-------------|--------|------------|----------|
| Synchronous | Slowest | Fast | High | Low | Small modules (<100KB) |
| Async instantiate | Medium | Fast | Medium | Low | General use |
| Streaming | Fastest | Fast | Low | Medium | Large modules |
| Streaming + Cache | Fast | Fastest | Low | High | Production apps |
| Lazy/On-demand | Instant* | Fast | Lowest | High | Feature-gated code |
| Web Worker | Non-blocking | Fast | Isolated | Medium | Heavy computation |

## Loading Patterns

### Basic Async Loading

```javascript
// Simple async loading - good starting point
async function loadWasm() {
    const response = await fetch('/app.wasm');
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, imports);
    return instance.exports;
}
```

### Streaming Compilation (Recommended)

```javascript
// Streaming compilation - starts compiling while downloading
async function loadWasmStreaming() {
    const imports = {
        env: {
            memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
            abort: (msg, file, line) => console.error(`Abort: ${msg}`),
        },
        js: {
            log: (ptr, len) => console.log(readString(ptr, len)),
        }
    };

    try {
        // Preferred: streaming compilation
        const { instance } = await WebAssembly.instantiateStreaming(
            fetch('/app.wasm'),
            imports
        );
        return instance.exports;
    } catch (e) {
        // Fallback for environments without streaming support
        console.warn('Streaming compilation failed, falling back to ArrayBuffer');
        const response = await fetch('/app.wasm');
        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, imports);
        return instance.exports;
    }
}
```

### Caching with IndexedDB

```javascript
// Cache compiled module in IndexedDB for instant subsequent loads
class WasmCache {
    constructor(dbName = 'wasm-cache', storeName = 'modules') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    async get(key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async set(key, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.put(value, key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

async function loadWasmCached(url, version, imports) {
    const cache = new WasmCache();
    await cache.init();

    const cacheKey = `${url}:${version}`;

    // Try to get cached compiled module
    const cachedModule = await cache.get(cacheKey);

    if (cachedModule) {
        console.log('Loading from cache');
        const instance = await WebAssembly.instantiate(cachedModule, imports);
        return instance.exports;
    }

    // Compile and cache
    console.log('Compiling and caching');
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.compile(bytes);

    // Cache the compiled module
    await cache.set(cacheKey, module);

    const instance = await WebAssembly.instantiate(module, imports);
    return instance.exports;
}
```

### Lazy Loading with Code Splitting

```javascript
// Load WASM modules on demand
class LazyWasmLoader {
    constructor() {
        this.modules = new Map();
        this.loading = new Map();
    }

    async load(name, url, imports = {}) {
        // Return cached instance
        if (this.modules.has(name)) {
            return this.modules.get(name);
        }

        // Return pending promise if already loading
        if (this.loading.has(name)) {
            return this.loading.get(name);
        }

        // Start loading
        const loadPromise = this._loadModule(name, url, imports);
        this.loading.set(name, loadPromise);

        try {
            const exports = await loadPromise;
            this.modules.set(name, exports);
            return exports;
        } finally {
            this.loading.delete(name);
        }
    }

    async _loadModule(name, url, imports) {
        const { instance } = await WebAssembly.instantiateStreaming(
            fetch(url),
            imports
        );
        return instance.exports;
    }

    unload(name) {
        this.modules.delete(name);
    }
}

// Usage
const loader = new LazyWasmLoader();

// Load only when feature is needed
document.getElementById('advanced-feature').addEventListener('click', async () => {
    const advancedModule = await loader.load(
        'advanced',
        '/modules/advanced.wasm',
        { env: { memory } }
    );
    advancedModule.runAdvancedFeature();
});
```

### Web Worker Loading

```javascript
// main.js - Main thread
class WasmWorkerPool {
    constructor(workerUrl, poolSize = navigator.hardwareConcurrency || 4) {
        this.workers = [];
        this.taskQueue = [];
        this.freeWorkers = [];

        for (let i = 0; i < poolSize; i++) {
            const worker = new Worker(workerUrl);
            worker.onmessage = (e) => this._handleMessage(worker, e);
            this.workers.push(worker);
            this.freeWorkers.push(worker);
        }
    }

    async execute(taskType, data, transfer = []) {
        return new Promise((resolve, reject) => {
            const task = { taskType, data, transfer, resolve, reject };

            if (this.freeWorkers.length > 0) {
                this._dispatch(task);
            } else {
                this.taskQueue.push(task);
            }
        });
    }

    _dispatch(task) {
        const worker = this.freeWorkers.pop();
        worker._currentTask = task;
        worker.postMessage(
            { type: task.taskType, data: task.data },
            task.transfer
        );
    }

    _handleMessage(worker, event) {
        const task = worker._currentTask;
        worker._currentTask = null;

        if (event.data.error) {
            task.reject(new Error(event.data.error));
        } else {
            task.resolve(event.data.result);
        }

        // Process next task or mark worker as free
        if (this.taskQueue.length > 0) {
            this._dispatch(this.taskQueue.shift());
        } else {
            this.freeWorkers.push(worker);
        }
    }

    terminate() {
        this.workers.forEach(w => w.terminate());
    }
}

// wasm-worker.js - Worker thread
let wasmInstance = null;

async function initWasm() {
    const response = await fetch('/compute.wasm');
    const { instance } = await WebAssembly.instantiateStreaming(response, {
        env: {
            memory: new WebAssembly.Memory({ initial: 256, maximum: 1024 })
        }
    });
    wasmInstance = instance;
}

const initPromise = initWasm();

self.onmessage = async (event) => {
    await initPromise;

    const { type, data } = event.data;

    try {
        let result;
        switch (type) {
            case 'compute':
                result = wasmInstance.exports.heavy_computation(data.input);
                break;
            case 'process':
                result = wasmInstance.exports.process_data(data.buffer);
                break;
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
        self.postMessage({ result });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
```

### Progressive Enhancement Loading

```javascript
// Load WASM with JS fallback
class WasmWithFallback {
    constructor(wasmUrl, jsFallback) {
        this.wasmUrl = wasmUrl;
        this.jsFallback = jsFallback;
        this.impl = null;
        this.isWasm = false;
    }

    async init() {
        if (typeof WebAssembly === 'undefined') {
            console.log('WebAssembly not supported, using JS fallback');
            this.impl = this.jsFallback;
            return;
        }

        try {
            const { instance } = await WebAssembly.instantiateStreaming(
                fetch(this.wasmUrl),
                {}
            );
            this.impl = instance.exports;
            this.isWasm = true;
            console.log('WASM loaded successfully');
        } catch (e) {
            console.warn('WASM load failed, using JS fallback:', e);
            this.impl = this.jsFallback;
        }
    }

    // Unified API
    compute(input) {
        return this.impl.compute(input);
    }
}

// JS Fallback implementation
const jsFallback = {
    compute: (input) => {
        // Pure JS implementation
        return input * 2;
    }
};

// Usage
const engine = new WasmWithFallback('/compute.wasm', jsFallback);
await engine.init();
const result = engine.compute(42);
```

### Preloading and Prefetching

```html
<!-- Preload critical WASM in HTML head -->
<link rel="preload" href="/core.wasm" as="fetch" type="application/wasm" crossorigin>

<!-- Prefetch non-critical WASM for likely navigation -->
<link rel="prefetch" href="/analytics.wasm" as="fetch" type="application/wasm">
```

```javascript
// Programmatic preloading
function preloadWasm(url) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'fetch';
    link.type = 'application/wasm';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
}

// Precompile during idle time
async function precompileWasm(url) {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
            const response = await fetch(url);
            const bytes = await response.arrayBuffer();
            const module = await WebAssembly.compile(bytes);
            // Store for later instantiation
            window.__wasmModules = window.__wasmModules || {};
            window.__wasmModules[url] = module;
        }, { timeout: 5000 });
    }
}
```

### CDN and Server Configuration

```nginx
# nginx.conf - Optimal WASM serving
server {
    # Enable gzip for WASM
    gzip on;
    gzip_types application/wasm;

    # Enable Brotli if available (better compression)
    brotli on;
    brotli_types application/wasm;

    location ~ \.wasm$ {
        # Correct MIME type for streaming compilation
        default_type application/wasm;

        # Long cache with versioned URLs
        add_header Cache-Control "public, max-age=31536000, immutable";

        # CORS headers
        add_header Access-Control-Allow-Origin "*";

        # Enable range requests
        add_header Accept-Ranges bytes;
    }
}
```

```javascript
// Cloudflare Workers - Edge WASM optimization
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);

    if (url.pathname.endsWith('.wasm')) {
        const response = await fetch(request);

        return new Response(response.body, {
            headers: {
                'Content-Type': 'application/wasm',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }

    return fetch(request);
}
```

### Loading Performance Monitoring

```javascript
// Comprehensive WASM loading metrics
class WasmLoadMetrics {
    constructor() {
        this.metrics = {};
    }

    async loadWithMetrics(name, url, imports) {
        const metrics = {
            name,
            url,
            startTime: performance.now(),
        };

        // Fetch timing
        const fetchStart = performance.now();
        const response = await fetch(url);
        metrics.fetchTime = performance.now() - fetchStart;
        metrics.size = parseInt(response.headers.get('content-length')) || 0;

        // Compilation timing
        const compileStart = performance.now();
        const bytes = await response.arrayBuffer();
        const module = await WebAssembly.compile(bytes);
        metrics.compileTime = performance.now() - compileStart;

        // Instantiation timing
        const instantiateStart = performance.now();
        const instance = await WebAssembly.instantiate(module, imports);
        metrics.instantiateTime = performance.now() - instantiateStart;

        metrics.totalTime = performance.now() - metrics.startTime;

        this.metrics[name] = metrics;
        this._report(metrics);

        return instance.exports;
    }

    _report(metrics) {
        console.table({
            'Module': metrics.name,
            'Size (KB)': (metrics.size / 1024).toFixed(2),
            'Fetch (ms)': metrics.fetchTime.toFixed(2),
            'Compile (ms)': metrics.compileTime.toFixed(2),
            'Instantiate (ms)': metrics.instantiateTime.toFixed(2),
            'Total (ms)': metrics.totalTime.toFixed(2),
        });

        // Send to analytics
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/analytics/wasm', JSON.stringify(metrics));
        }
    }
}
```

### Response Format

```markdown
## WASM Loading Strategy Recommendation

### Environment Analysis
- Target browsers: [List]
- Module size: [X] KB
- Usage pattern: [Critical path / On-demand / Background]
- Network conditions: [Typical latency/bandwidth]

### Recommended Strategy
**Primary**: [Strategy name]
**Fallback**: [Fallback strategy]

### Implementation

#### HTML Preloading
```html
<!-- Preload tags -->
```

#### JavaScript Loader
```javascript
// Complete loader implementation
```

#### Server Configuration
```nginx
# nginx/CDN configuration
```

### Loading Timeline
| Phase | Duration | Optimization |
|-------|----------|--------------|
| DNS/Connect | ~X ms | Preconnect hint |
| Fetch | ~Y ms | CDN + compression |
| Compile | ~Z ms | Streaming compilation |
| Instantiate | ~W ms | Cached module |

### Caching Strategy
- Browser cache: [Settings]
- IndexedDB: [Module caching approach]
- Service Worker: [Offline strategy]

### Monitoring Setup
```javascript
// Metrics collection code
```

### Expected Performance
- Cold load: ~X ms
- Warm load: ~Y ms
- Cached load: ~Z ms
```
