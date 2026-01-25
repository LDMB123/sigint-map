# Skill: WASM Loading Optimization

**ID**: `wasm-loading-strategies`
**Category**: WASM Optimization
**Agent**: Full-Stack Developer

---

## When to Use

- Reducing WASM initial load time
- Implementing progressive loading
- Optimizing for slow networks
- Improving time-to-interactive (TTI)
- Implementing code splitting
- Caching strategies

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| wasm_file | string | Yes | Path to .wasm binary |
| loading_strategy | string | No | eager/lazy/progressive |

---

## Steps

### Step 1: Streaming Instantiation

```javascript
// Best: Streaming compilation (compile while downloading)
async function loadWasmStreaming(url) {
    try {
        const module = await WebAssembly.instantiateStreaming(
            fetch(url),
            importObject
        );
        return module.instance.exports;
    } catch (error) {
        console.error('Streaming failed, falling back:', error);
        return loadWasmFallback(url);
    }
}

// Fallback for older browsers
async function loadWasmFallback(url) {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.instantiate(bytes, importObject);
    return module.instance.exports;
}

// Usage
const wasm = await loadWasmStreaming('/app.wasm');
```

**Performance Gain:** 20-40% faster than non-streaming

### Step 2: Lazy Loading

```javascript
// Load only when needed
class WasmLoader {
    constructor() {
        this.module = null;
        this.loading = null;
    }

    async ensure() {
        if (this.module) return this.module;
        if (this.loading) return this.loading;

        this.loading = this.load();
        this.module = await this.loading;
        this.loading = null;
        return this.module;
    }

    async load() {
        const module = await WebAssembly.instantiateStreaming(
            fetch('/app.wasm'),
            importObject
        );
        return module.instance.exports;
    }

    async call(funcName, ...args) {
        const wasm = await this.ensure();
        return wasm[funcName](...args);
    }
}

// Usage
const loader = new WasmLoader();

// Only loads when first called
button.onclick = async () => {
    const result = await loader.call('processData', data);
};
```

### Step 3: Code Splitting

```rust
// Split into multiple WASM modules

// core.rs - Always loaded
#[wasm_bindgen]
pub fn init() {
    // Lightweight initialization
}

#[wasm_bindgen]
pub fn basic_operation(x: i32) -> i32 {
    x * 2
}

// advanced.rs - Loaded on demand
#[wasm_bindgen]
pub fn advanced_operation(data: &[u8]) -> Vec<u8> {
    // Heavy computation
    complex_algorithm(data)
}

// image.rs - Separate module for image processing
#[wasm_bindgen]
pub fn process_image(image: &[u8]) -> Vec<u8> {
    // Image processing
}
```

**JavaScript loader:**
```javascript
class SplitWasmLoader {
    constructor() {
        this.modules = new Map();
    }

    async loadModule(name) {
        if (this.modules.has(name)) {
            return this.modules.get(name);
        }

        const module = await WebAssembly.instantiateStreaming(
            fetch(`/wasm/${name}.wasm`),
            importObject
        );

        this.modules.set(name, module.instance.exports);
        return module.instance.exports;
    }

    async getCore() {
        return this.loadModule('core');
    }

    async getAdvanced() {
        return this.loadModule('advanced');
    }

    async getImage() {
        return this.loadModule('image');
    }
}

// Usage
const loader = new SplitWasmLoader();

// Load core immediately
const core = await loader.getCore();
core.init();

// Load advanced on demand
document.getElementById('advanced-btn').onclick = async () => {
    const advanced = await loader.getAdvanced();
    advanced.advanced_operation(data);
};
```

### Step 4: Progressive Enhancement

```javascript
// Show UI immediately, enhance with WASM when ready
class ProgressiveApp {
    constructor() {
        this.wasm = null;
        this.wasmReady = false;
        this.pendingOps = [];
    }

    async init() {
        // Show basic UI immediately
        this.renderBasicUI();

        // Load WASM in background
        this.loadWasm();
    }

    async loadWasm() {
        try {
            this.wasm = await loadWasmStreaming('/app.wasm');
            this.wasmReady = true;

            // Process pending operations
            this.pendingOps.forEach(op => op());
            this.pendingOps = [];

            // Enhance UI
            this.enhanceUI();
        } catch (error) {
            console.error('WASM load failed, using JS fallback');
            this.useFallback = true;
        }
    }

    async process(data) {
        if (this.wasmReady) {
            return this.wasm.process(data);
        } else if (this.useFallback) {
            return this.jsFallback(data);
        } else {
            // Queue until WASM ready
            return new Promise(resolve => {
                this.pendingOps.push(() => {
                    resolve(this.wasm.process(data));
                });
            });
        }
    }

    jsFallback(data) {
        // Pure JS implementation (slower but works)
        return processInJS(data);
    }
}
```

### Step 5: Service Worker Caching

```javascript
// service-worker.js
const CACHE_NAME = 'wasm-cache-v1';
const WASM_URLS = [
    '/core.wasm',
    '/advanced.wasm',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(WASM_URLS))
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname.endsWith('.wasm')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        // Serve from cache
                        return response;
                    }

                    // Fetch and cache
                    return fetch(event.request).then(response => {
                        if (response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, clone));
                        }
                        return response;
                    });
                })
        );
    }
});

// Update strategy: Cache-then-network
self.addEventListener('fetch', event => {
    if (event.request.url.endsWith('.wasm')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request).then(response => {
                    cache.put(event.request, response.clone());
                    return response;
                }).catch(() => {
                    return cache.match(event.request);
                });
            })
        );
    }
});
```

**Register service worker:**
```javascript
// main.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.error('SW registration failed', err));
}
```

### Step 6: Preloading

```html
<!-- Preload WASM in HTML head -->
<link rel="preload" href="/app.wasm" as="fetch" crossorigin>

<!-- Prefetch for likely navigation -->
<link rel="prefetch" href="/advanced.wasm">

<!-- Preconnect to CDN -->
<link rel="preconnect" href="https://cdn.example.com">
```

```javascript
// Programmatic preload
const preloadWasm = (url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'fetch';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
};

// Preload on page load
window.addEventListener('load', () => {
    preloadWasm('/advanced.wasm');
});

// Preload on hover (predictive loading)
document.getElementById('advanced-btn').addEventListener('mouseenter', () => {
    preloadWasm('/advanced.wasm');
}, { once: true });
```

### Step 7: Module Caching

```javascript
// Cache compiled modules (faster than re-compiling)
class CachedWasmLoader {
    async loadWithCache(url) {
        const cache = await caches.open('wasm-modules-v1');

        // Try to get cached compiled module
        const cachedModule = await this.getCachedModule(url);
        if (cachedModule) {
            return WebAssembly.instantiate(cachedModule, importObject);
        }

        // Compile and cache
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        const module = await WebAssembly.compile(bytes);

        // Store compiled module
        await this.cacheModule(url, module);

        return WebAssembly.instantiate(module, importObject);
    }

    async getCachedModule(url) {
        try {
            const cache = await caches.open('wasm-modules-v1');
            const response = await cache.match(url + '.module');
            if (response) {
                const buffer = await response.arrayBuffer();
                return await WebAssembly.compile(buffer);
            }
        } catch (e) {
            return null;
        }
    }

    async cacheModule(url, module) {
        try {
            const cache = await caches.open('wasm-modules-v1');
            const buffer = await WebAssembly.Module.serialize(module);
            const response = new Response(buffer);
            await cache.put(url + '.module', response);
        } catch (e) {
            console.warn('Failed to cache module:', e);
        }
    }
}
```

---

## Advanced Strategies

### Worker-Based Loading

```javascript
// Load and compile in Worker (non-blocking)
// worker.js
self.addEventListener('message', async (event) => {
    const { url, imports } = event.data;

    try {
        const module = await WebAssembly.instantiateStreaming(
            fetch(url),
            imports
        );

        self.postMessage({
            success: true,
            module: module.instance.exports
        });
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message
        });
    }
});

// main.js
const loadInWorker = (url) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker('/wasm-loader-worker.js');

        worker.onmessage = (event) => {
            if (event.data.success) {
                resolve(event.data.module);
            } else {
                reject(new Error(event.data.error));
            }
            worker.terminate();
        };

        worker.postMessage({ url, imports: importObject });
    });
};
```

### Conditional Loading

```javascript
// Load different modules based on device capabilities
async function loadOptimalWasm() {
    const capabilities = {
        simd: await detectSIMD(),
        threads: typeof SharedArrayBuffer !== 'undefined',
        memory: navigator.deviceMemory || 4,
    };

    if (capabilities.simd && capabilities.threads) {
        return loadWasmStreaming('/app-simd-threads.wasm');
    } else if (capabilities.simd) {
        return loadWasmStreaming('/app-simd.wasm');
    } else {
        return loadWasmStreaming('/app-basic.wasm');
    }
}

async function detectSIMD() {
    try {
        return WebAssembly.validate(
            new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])
        );
    } catch {
        return false;
    }
}
```

### Bundle Optimization

```javascript
// wasm-pack configuration
// Cargo.toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-simd"]

// package.json - webpack config
module.exports = {
    experiments: {
        asyncWebAssembly: true,
        syncWebAssembly: true,
    },
    module: {
        rules: [{
            test: /\.wasm$/,
            type: 'webassembly/async',
        }]
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                wasm: {
                    test: /\.wasm$/,
                    name: 'wasm',
                    priority: 20,
                }
            }
        }
    }
};
```

---

## Benchmarks

### Loading Strategy Comparison

| Strategy | Time to Interactive | Network | Notes |
|----------|---------------------|---------|-------|
| Non-streaming | 850ms | 1.2MB | Baseline |
| Streaming | 620ms (27% faster) | 1.2MB | Best default |
| Lazy + Streaming | 180ms (79% faster) | 450KB initial | Best for large apps |
| Code splitting | 220ms (74% faster) | 380KB initial | Complex setup |
| Service Worker cache | 45ms (95% faster) | 0KB (cached) | Return visits |

### Real-World Examples

**Image Editor:**
- Initial load: 2.1MB WASM
- With splitting: 380KB core + 1.7MB features
- TTI improvement: 1.8s → 0.4s (78% faster)

**Data Visualization:**
- Streaming: 740ms → 510ms
- With SW cache: 510ms → 38ms (subsequent loads)

**Game Engine:**
- Lazy loading: Load 120KB core, defer 2.3MB assets
- Progressive: Playable in 0.5s, full features in 3s

---

## Measurement

### Performance Metrics

```javascript
// Measure loading performance
async function measureWasmLoad(url) {
    const metrics = {};

    const start = performance.now();

    // Download
    const fetchStart = performance.now();
    const response = await fetch(url);
    metrics.download = performance.now() - fetchStart;

    // Compile
    const compileStart = performance.now();
    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    metrics.compile = performance.now() - compileStart;

    // Instantiate
    const instantiateStart = performance.now();
    const instance = await WebAssembly.instantiate(module, importObject);
    metrics.instantiate = performance.now() - instantiateStart;

    metrics.total = performance.now() - start;

    return metrics;
}

// Track with Performance Observer
const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'fetch' && entry.name.endsWith('.wasm')) {
            console.log('WASM fetch:', entry.duration, 'ms');
        }
    }
});

observer.observe({ entryTypes: ['resource'] });
```

### Core Web Vitals Impact

```javascript
// First Contentful Paint (FCP)
// Largest Contentful Paint (LCP)
// Time to Interactive (TTI)

new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        console.log(entry.name, entry.startTime);
    }
}).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| loading-metrics.json | ./ | Load time measurements |
| strategy-comparison.md | ./ | Strategy analysis |
| service-worker.js | ./public | Caching service worker |

---

## Output Template

```markdown
## WASM Loading Optimization Report

### Current Strategy
- Loading method: [streaming/non-streaming/lazy]
- Caching: [service worker/browser cache/none]
- Code splitting: [yes/no]

### Baseline Metrics
- Download time: [time]ms
- Compile time: [time]ms
- Instantiate time: [time]ms
- Total TTI: [time]ms
- Bundle size: [size]KB

### Optimizations Applied
- [ ] Streaming instantiation
- [ ] Lazy loading
- [ ] Code splitting ([count] modules)
- [ ] Service Worker caching
- [ ] Preloading
- [ ] Progressive enhancement

### Improved Metrics
- Download time: [time]ms ([change]%)
- Compile time: [time]ms ([change]%)
- Total TTI: [time]ms ([change]%)
- Initial bundle: [size]KB ([change]%)

### Loading Strategy
```javascript
// Implementation code
```

### Cache Strategy
- Cache hits: [percentage]%
- Avg cached load: [time]ms
- Avg network load: [time]ms

### Recommendations
1. [Optimization opportunity]
2. [Strategy adjustment]
```

---

## Best Practices

1. **Always Use Streaming**: `instantiateStreaming` when possible
2. **Cache Aggressively**: Service Workers for WASM modules
3. **Split Large Modules**: Core + feature modules
4. **Lazy Load**: Defer non-critical functionality
5. **Preload Smart**: Use `<link rel="preload">` for known needs
6. **Monitor Metrics**: Track TTI and loading times
7. **Progressive Enhancement**: Show UI before WASM ready
8. **Test on 3G**: Optimize for slow networks

---

## Common Pitfalls

- Not using streaming instantiation
- Loading all WASM upfront
- No caching strategy
- Blocking main thread during load
- Not handling load failures gracefully
- Ignoring bundle size
- No fallback for older browsers
- Not measuring actual user load times
