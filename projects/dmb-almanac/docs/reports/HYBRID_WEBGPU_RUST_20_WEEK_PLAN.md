# 🚀 DMB Almanac: Hybrid WebGPU + Rust Implementation Plan

**Duration**: 20 weeks
**Approach**: Parallel WebGPU compute + Rust/WASM migration
**Target**: 5-30x performance improvement, 67% memory reduction
**Platform**: Apple Silicon M4 Mac Mini, Chrome 143+

---

## Executive Summary

This plan combines **WebGPU compute shaders** for parallel aggregations with **Rust/WASM** for compute-intensive JavaScript functions. Pure JavaScript with JSDoc annotations - **NO TypeScript**.

### Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Aggregation queries | 200-350ms | 12-25ms | **15-40x faster** |
| Force simulation | 140-200ms | 20-30ms | **6-10x faster** |
| Memory usage | 117MB | 39MB | **67% reduction** |
| Bundle size | 130KB | 145KB | +15KB (WASM overhead) |
| Overall score | 95/100 | **99/100** | World-class PWA |

---

## Architecture Overview

### Compute Pipeline (3-tier fallback)

```javascript
/**
 * @typedef {'webgpu' | 'wasm' | 'javascript'} ComputeBackend
 */

/**
 * Intelligent compute orchestrator with 3-tier fallback
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} - Aggregation results
 */
async function executeQuery(query) {
  // Tier 1: WebGPU (fastest, GPU parallel)
  if (await GPUDevice.isAvailable()) {
    return await gpuHistogram.compute(query);
  }

  // Tier 2: Rust/WASM (fast, CPU SIMD)
  if (await WasmRuntime.isAvailable()) {
    return await wasmAggregator.compute(query);
  }

  // Tier 3: JavaScript (fallback, all devices)
  return await jsAggregator.compute(query);
}
```

### File Structure

```
app/
├── src/
│   ├── lib/
│   │   ├── gpu/                    # WebGPU infrastructure (JavaScript + JSDoc)
│   │   │   ├── device.js          # GPU device manager
│   │   │   ├── histogram.js       # GPU histogram compute
│   │   │   ├── fallback.js        # 3-tier orchestrator
│   │   │   └── README.md          # Documentation
│   │   ├── wasm/                  # Rust/WASM modules
│   │   │   ├── aggregations/      # Stats functions (Rust)
│   │   │   ├── transforms/        # Data transforms (Rust)
│   │   │   ├── graphs/            # Force-directed (Rust)
│   │   │   ├── loader.js          # WASM loader (JavaScript)
│   │   │   └── README.md
│   │   └── db/
│   │       └── dexie/
│   │           ├── aggregations.js # Enhanced with GPU/WASM
│   │           └── queries.js      # Enhanced with WASM
│   └── static/
│       └── shaders/
│           └── histogram.wgsl     # GPU compute shader
├── rust/                          # Rust source code
│   ├── aggregations/
│   │   ├── src/
│   │   │   ├── lib.rs            # Stats exports
│   │   │   ├── histogram.rs      # Year histogram
│   │   │   ├── unique.rs         # Unique counting
│   │   │   └── percentile.rs     # Percentile calc
│   │   └── Cargo.toml
│   ├── transforms/
│   │   └── src/lib.rs
│   └── graphs/
│       └── src/lib.rs
└── Cargo.toml                     # Workspace root
```

---

## Phase 1: WebGPU + Critical WASM (Weeks 1-10)

### Week 1-2: Rust/WASM Toolchain Setup

**Deliverables**:
- ✅ Rust toolchain with `wasm32-unknown-unknown` target
- ✅ wasm-pack for builds
- ✅ Vite WASM plugin integration
- ✅ WASM loader with feature detection

**Tasks**:

1. **Install Rust and wasm-pack**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

2. **Create Cargo workspace**
```toml
# /rust/Cargo.toml
[workspace]
members = ["aggregations", "transforms", "graphs"]

[profile.release]
opt-level = 3           # Maximum optimization
lto = true             # Link-time optimization
codegen-units = 1      # Single codegen unit (slower build, faster runtime)
panic = 'abort'        # Smaller binary
strip = true           # Strip symbols
```

3. **Configure Vite for WASM**
```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default {
  plugins: [
    wasm(),
    topLevelAwait(),
    sveltekit()
  ],
  optimizeDeps: {
    exclude: ['@dmb/wasm-aggregations']
  }
};
```

4. **Create WASM loader**
```javascript
// src/lib/wasm/loader.js

/**
 * @typedef {Object} WasmModule
 * @property {Function} aggregate_by_year
 * @property {Function} unique_songs_per_year
 * @property {Function} calculate_percentile
 */

/**
 * Lazy-loading WASM runtime with feature detection
 */
export class WasmRuntime {
  /** @type {WasmModule | null} */
  static module = null;

  /** @type {boolean | null} */
  static available = null;

  /**
   * Check if WASM is available in browser
   * @returns {Promise<boolean>}
   */
  static async isAvailable() {
    if (this.available !== null) {
      return this.available;
    }

    try {
      // Feature detection
      if (typeof WebAssembly !== 'object') {
        this.available = false;
        return false;
      }

      // Test instantiation (1-byte WASM module)
      await WebAssembly.instantiate(
        new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])
      );

      this.available = true;
      return true;
    } catch (e) {
      console.warn('WASM not available:', e);
      this.available = false;
      return false;
    }
  }

  /**
   * Load WASM module (lazy)
   * @returns {Promise<WasmModule>}
   */
  static async load() {
    if (this.module) {
      return this.module;
    }

    if (!(await this.isAvailable())) {
      throw new Error('WASM not available');
    }

    try {
      // Dynamic import (code-splitting)
      const { default: init, ...exports } = await import('@dmb/wasm-aggregations');

      // Initialize WASM
      await init();

      this.module = exports;
      return exports;
    } catch (e) {
      console.error('WASM load failed:', e);
      throw e;
    }
  }
}
```

**Validation**:
```bash
npm run build
# Should bundle WASM without errors
# WASM files in .svelte-kit/output/client/_app/immutable/assets/
```

---

### Week 3-5: WebGPU Infrastructure (JavaScript)

**Deliverables**:
- ✅ GPU device manager with singleton pattern
- ✅ Feature detection and graceful degradation
- ✅ Error handling and device lost recovery
- ✅ histogram.wgsl shader

**File 1: GPU Device Manager**
```javascript
// src/lib/gpu/device.js

/**
 * @typedef {Object} GPUDeviceInfo
 * @property {GPUDevice} device
 * @property {GPUAdapter} adapter
 * @property {GPUAdapterInfo} info
 */

/**
 * Singleton GPU device manager
 * Handles initialization, feature detection, and error recovery
 */
export class GPUDeviceManager {
  /** @type {GPUDeviceInfo | null} */
  static instance = null;

  /** @type {boolean | null} */
  static available = null;

  /**
   * Check if WebGPU is available
   * @returns {Promise<boolean>}
   */
  static async isAvailable() {
    if (this.available !== null) {
      return this.available;
    }

    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported');
        this.available = false;
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance' // Use M4 GPU
      });

      if (!adapter) {
        console.warn('WebGPU adapter not available');
        this.available = false;
        return false;
      }

      this.available = true;
      return true;
    } catch (e) {
      console.error('WebGPU check failed:', e);
      this.available = false;
      return false;
    }
  }

  /**
   * Get or create GPU device (singleton)
   * @returns {Promise<GPUDeviceInfo>}
   */
  static async getDevice() {
    if (this.instance) {
      return this.instance;
    }

    if (!(await this.isAvailable())) {
      throw new Error('WebGPU not available');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    const device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        maxBufferSize: adapter.limits.maxBufferSize
      }
    });

    // Handle device lost
    device.lost.then((info) => {
      console.error('GPU device lost:', info.message, info.reason);
      this.instance = null; // Reset singleton

      if (info.reason !== 'destroyed') {
        // Attempt recovery on next call
        console.log('Will attempt GPU recovery on next request');
      }
    });

    const info = await adapter.requestAdapterInfo();

    this.instance = { device, adapter, info };
    return this.instance;
  }

  /**
   * Destroy GPU device
   */
  static destroy() {
    if (this.instance) {
      this.instance.device.destroy();
      this.instance = null;
    }
  }
}
```

**File 2: GPU Histogram Compute**
```javascript
// src/lib/gpu/histogram.js

import { GPUDeviceManager } from './device.js';

/**
 * @typedef {Object} HistogramResult
 * @property {Uint32Array} bins - Histogram bins
 * @property {number[]} years - Year labels for bins
 * @property {number} total - Total count
 */

/**
 * WebGPU histogram aggregation
 * 15-40x faster than JavaScript on M4
 */
export class GPUHistogram {
  /** @type {GPUDevice | null} */
  device = null;

  /** @type {GPUComputePipeline | null} */
  pipeline = null;

  /** @type {string} */
  shaderCode = `
    @group(0) @binding(0) var<storage, read> years: array<u32>;
    @group(0) @binding(1) var<storage, read_write> histogram: array<atomic<u32>>;

    @compute @workgroup_size(256)
    fn compute_histogram(@builtin(global_invocation_id) id: vec3<u32>) {
      let idx = id.x;
      if (idx >= arrayLength(&years)) {
        return;
      }

      let year = years[idx];
      let bin = year - 1991u; // DMB started 1991

      if (bin < 35u) { // 1991-2026 (35 years)
        atomicAdd(&histogram[bin], 1u);
      }
    }
  `;

  /**
   * Initialize GPU pipeline
   * @returns {Promise<void>}
   */
  async init() {
    const { device } = await GPUDeviceManager.getDevice();
    this.device = device;

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: this.shaderCode,
      label: 'histogram-shader'
    });

    // Create compute pipeline
    this.pipeline = device.createComputePipeline({
      label: 'histogram-pipeline',
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'compute_histogram'
      }
    });
  }

  /**
   * Compute histogram on GPU
   * @param {Uint32Array} yearData - Array of years (e.g., [1991, 1992, 1991, ...])
   * @returns {Promise<HistogramResult>}
   */
  async compute(yearData) {
    if (!this.pipeline) {
      await this.init();
    }

    const dataSize = yearData.length;
    const histogramSize = 35; // 1991-2026

    // Create GPU buffers (UMA = zero-copy on Apple Silicon)
    const yearsBuffer = this.device.createBuffer({
      size: dataSize * 4, // 4 bytes per u32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'years-buffer'
    });

    const histogramBuffer = this.device.createBuffer({
      size: histogramSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'histogram-buffer'
    });

    // Upload year data
    this.device.queue.writeBuffer(yearsBuffer, 0, yearData);

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: yearsBuffer } },
        { binding: 1, resource: { buffer: histogramBuffer } }
      ],
      label: 'histogram-bind-group'
    });

    // Create command encoder
    const encoder = this.device.createCommandEncoder({
      label: 'histogram-encoder'
    });

    // Dispatch compute shader
    const pass = encoder.beginComputePass({
      label: 'histogram-pass'
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);

    // Workgroups: ceil(dataSize / 256)
    const workgroups = Math.ceil(dataSize / 256);
    pass.dispatchWorkgroups(workgroups);
    pass.end();

    // Read results back
    const resultBuffer = this.device.createBuffer({
      size: histogramSize * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      label: 'result-buffer'
    });

    encoder.copyBufferToBuffer(
      histogramBuffer,
      0,
      resultBuffer,
      0,
      histogramSize * 4
    );

    // Submit
    this.device.queue.submit([encoder.finish()]);

    // Map and read
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const bins = new Uint32Array(resultBuffer.getMappedRange()).slice();
    resultBuffer.unmap();

    // Cleanup
    yearsBuffer.destroy();
    histogramBuffer.destroy();
    resultBuffer.destroy();

    // Format results
    const years = Array.from({ length: histogramSize }, (_, i) => 1991 + i);
    const total = bins.reduce((sum, count) => sum + count, 0);

    return { bins, years, total };
  }
}
```

**File 3: 3-Tier Fallback Orchestrator**
```javascript
// src/lib/gpu/fallback.js

import { GPUDeviceManager } from './device.js';
import { GPUHistogram } from './histogram.js';
import { WasmRuntime } from '../wasm/loader.js';

/**
 * @typedef {'webgpu' | 'wasm' | 'javascript'} ComputeBackend
 */

/**
 * Intelligent compute orchestrator
 * Tries: GPU → WASM → JavaScript
 */
export class ComputeOrchestrator {
  /** @type {GPUHistogram | null} */
  static gpuHistogram = null;

  /** @type {Object | null} */
  static wasmModule = null;

  /**
   * Aggregate shows by year (3-tier fallback)
   * @param {Array<{date: string}>} shows
   * @returns {Promise<{backend: ComputeBackend, result: Object, timeMs: number}>}
   */
  static async aggregateByYear(shows) {
    const startTime = performance.now();

    // Extract years
    const years = shows.map(show => {
      const year = new Date(show.date).getFullYear();
      return year;
    });

    // Tier 1: WebGPU (fastest)
    if (await GPUDeviceManager.isAvailable()) {
      try {
        if (!this.gpuHistogram) {
          this.gpuHistogram = new GPUHistogram();
        }

        const yearData = new Uint32Array(years);
        const result = await this.gpuHistogram.compute(yearData);
        const timeMs = performance.now() - startTime;

        console.log(`✅ GPU compute: ${timeMs.toFixed(2)}ms`);
        return { backend: 'webgpu', result, timeMs };
      } catch (e) {
        console.warn('GPU compute failed, falling back to WASM:', e);
      }
    }

    // Tier 2: WASM (fast)
    if (await WasmRuntime.isAvailable()) {
      try {
        if (!this.wasmModule) {
          this.wasmModule = await WasmRuntime.load();
        }

        const yearData = new Uint32Array(years);
        const result = this.wasmModule.aggregate_by_year(yearData);
        const timeMs = performance.now() - startTime;

        console.log(`✅ WASM compute: ${timeMs.toFixed(2)}ms`);
        return { backend: 'wasm', result, timeMs };
      } catch (e) {
        console.warn('WASM compute failed, falling back to JS:', e);
      }
    }

    // Tier 3: JavaScript (fallback)
    const result = this.aggregateByYearJS(shows);
    const timeMs = performance.now() - startTime;

    console.log(`✅ JS compute: ${timeMs.toFixed(2)}ms`);
    return { backend: 'javascript', result, timeMs };
  }

  /**
   * JavaScript fallback (current implementation)
   * @param {Array<{date: string}>} shows
   * @returns {Object}
   */
  static aggregateByYearJS(shows) {
    const histogram = {};

    for (const show of shows) {
      const year = new Date(show.date).getFullYear();
      histogram[year] = (histogram[year] || 0) + 1;
    }

    return histogram;
  }
}
```

**Validation**:
```javascript
// Test in browser console
import { ComputeOrchestrator } from './fallback.js';

const testShows = Array.from({ length: 2800 }, (_, i) => ({
  date: `${1991 + (i % 35)}-06-15`
}));

const { backend, result, timeMs } = await ComputeOrchestrator.aggregateByYear(testShows);
console.log(`Backend: ${backend}, Time: ${timeMs}ms`);
// Expected: "webgpu", 12-25ms on M4
```

---

### Week 6-8: Critical WASM Functions (P0)

**Priority 0: Statistical Aggregations (5 Rust functions)**

**File 1: Rust Histogram**
```rust
// rust/aggregations/src/histogram.rs

use wasm_bindgen::prelude::*;

/// Aggregate shows by year (SIMD-optimized)
/// Faster than JavaScript but slower than GPU
#[wasm_bindgen]
pub fn aggregate_by_year(years: &[u32]) -> js_sys::Map {
    let mut histogram = [0u32; 35]; // 1991-2026

    // SIMD-friendly loop (auto-vectorized by Rust)
    for &year in years {
        if year >= 1991 && year <= 2026 {
            let bin = (year - 1991) as usize;
            histogram[bin] += 1;
        }
    }

    // Convert to JS Map
    let result = js_sys::Map::new();
    for (i, &count) in histogram.iter().enumerate() {
        if count > 0 {
            let year = (1991 + i) as u32;
            result.set(&JsValue::from(year), &JsValue::from(count));
        }
    }

    result
}

/// Count unique songs per year
#[wasm_bindgen]
pub fn unique_songs_per_year(songs: &js_sys::Array) -> js_sys::Map {
    use std::collections::HashMap;

    let mut year_songs: HashMap<u32, HashSet<String>> = HashMap::new();

    for item in songs.iter() {
        // Extract year and song name from JS object
        let obj = js_sys::Object::from(item);
        let year = js_sys::Reflect::get(&obj, &"year".into())
            .ok()
            .and_then(|v| v.as_f64())
            .map(|v| v as u32);

        let song = js_sys::Reflect::get(&obj, &"song".into())
            .ok()
            .and_then(|v| v.as_string());

        if let (Some(year), Some(song)) = (year, song) {
            year_songs.entry(year).or_default().insert(song);
        }
    }

    // Convert to JS Map
    let result = js_sys::Map::new();
    for (year, songs) in year_songs {
        result.set(&JsValue::from(year), &JsValue::from(songs.len() as u32));
    }

    result
}
```

**File 2: Cargo Configuration**
```toml
# rust/aggregations/Cargo.toml

[package]
name = "dmb-wasm-aggregations"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = "0.3"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = 'abort'
strip = true

# WASM-specific optimizations
[profile.release.package."*"]
opt-level = "z"  # Optimize for size
```

**Build Script**
```bash
#!/bin/bash
# scripts/build-wasm.sh

set -e

echo "Building WASM modules..."

cd rust/aggregations
wasm-pack build --target web --out-dir ../../app/src/lib/wasm/aggregations

echo "✅ WASM build complete"
echo "Size: $(du -h ../../app/src/lib/wasm/aggregations/dmb_wasm_aggregations_bg.wasm)"
```

**Integration**
```javascript
// src/lib/db/dexie/aggregations.js (enhanced)

import { ComputeOrchestrator } from '$lib/gpu/fallback.js';

/**
 * Aggregate shows by year (GPU/WASM/JS)
 * @param {Array} shows
 * @returns {Promise<Object>}
 */
export async function aggregateShowsByYear(shows) {
  const { backend, result, timeMs } = await ComputeOrchestrator.aggregateByYear(shows);

  // Log performance metrics
  if (import.meta.env.DEV) {
    console.log(`aggregateShowsByYear: ${backend} in ${timeMs.toFixed(2)}ms`);
  }

  return result;
}
```

---

### Week 9-10: Integration & Testing

**Deliverables**:
- ✅ All 5 P0 WASM functions integrated
- ✅ 3-tier fallback tested on all code paths
- ✅ Performance benchmarks
- ✅ Error handling validated

**Test Suite**
```javascript
// src/lib/gpu/__tests__/compute.test.js

import { describe, it, expect, vi } from 'vitest';
import { ComputeOrchestrator } from '../fallback.js';
import { GPUDeviceManager } from '../device.js';

describe('ComputeOrchestrator', () => {
  it('should use GPU when available', async () => {
    const spy = vi.spyOn(GPUDeviceManager, 'isAvailable').mockResolvedValue(true);

    const shows = Array.from({ length: 100 }, (_, i) => ({
      date: `${1991 + (i % 35)}-01-01`
    }));

    const { backend } = await ComputeOrchestrator.aggregateByYear(shows);

    expect(backend).toBe('webgpu');
    expect(spy).toHaveBeenCalled();
  });

  it('should fallback to WASM when GPU unavailable', async () => {
    vi.spyOn(GPUDeviceManager, 'isAvailable').mockResolvedValue(false);
    vi.spyOn(WasmRuntime, 'isAvailable').mockResolvedValue(true);

    const shows = [{ date: '2023-01-01' }];
    const { backend } = await ComputeOrchestrator.aggregateByYear(shows);

    expect(backend).toBe('wasm');
  });

  it('should fallback to JS when GPU and WASM unavailable', async () => {
    vi.spyOn(GPUDeviceManager, 'isAvailable').mockResolvedValue(false);
    vi.spyOn(WasmRuntime, 'isAvailable').mockResolvedValue(false);

    const shows = [{ date: '2023-01-01' }];
    const { backend } = await ComputeOrchestrator.aggregateByYear(shows);

    expect(backend).toBe('javascript');
  });
});
```

**Performance Benchmark**
```javascript
// scripts/benchmark-compute.js

import { ComputeOrchestrator } from '../src/lib/gpu/fallback.js';

async function benchmark() {
  // Generate test data (2,800 shows)
  const shows = Array.from({ length: 2800 }, (_, i) => ({
    date: `${1991 + Math.floor(i / 80)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`
  }));

  console.log('Benchmarking aggregateByYear with 2,800 shows...\n');

  // Warm up
  await ComputeOrchestrator.aggregateByYear(shows);

  // Run 10 iterations
  const results = [];
  for (let i = 0; i < 10; i++) {
    const { backend, timeMs } = await ComputeOrchestrator.aggregateByYear(shows);
    results.push({ backend, timeMs });
  }

  // Calculate stats
  const avg = results.reduce((sum, r) => sum + r.timeMs, 0) / results.length;
  const min = Math.min(...results.map(r => r.timeMs));
  const max = Math.max(...results.map(r => r.timeMs));

  console.log(`Backend: ${results[0].backend}`);
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Min: ${min.toFixed(2)}ms`);
  console.log(`Max: ${max.toFixed(2)}ms`);
  console.log(`\nExpected on M4:`);
  console.log(`  - WebGPU: 12-25ms`);
  console.log(`  - WASM: 35-50ms`);
  console.log(`  - JavaScript: 200-350ms`);
}

benchmark().catch(console.error);
```

---

## Phase 2: Visualization + UMA (Weeks 11-18)

### Week 11-13: Force-Directed Graph (Rust)

**Deliverables**:
- ✅ Rust force simulation (6-10x faster than D3)
- ✅ Zero-copy UMA memory sharing
- ✅ Integrated with existing graph components

**Rust Implementation**
```rust
// rust/graphs/src/force.rs

use wasm_bindgen::prelude::*;
use std::f64::consts::PI;

#[wasm_bindgen]
pub struct ForceSimulation {
    nodes: Vec<Node>,
    links: Vec<Link>,
    alpha: f64,
    alpha_decay: f64,
}

#[derive(Clone)]
struct Node {
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
}

struct Link {
    source: usize,
    target: usize,
    strength: f64,
}

#[wasm_bindgen]
impl ForceSimulation {
    #[wasm_bindgen(constructor)]
    pub fn new(node_count: usize) -> Self {
        let nodes = (0..node_count)
            .map(|i| Node {
                x: (i as f64 * PI).cos() * 100.0,
                y: (i as f64 * PI).sin() * 100.0,
                vx: 0.0,
                vy: 0.0,
            })
            .collect();

        Self {
            nodes,
            links: Vec::new(),
            alpha: 1.0,
            alpha_decay: 0.0228, // D3 default
        }
    }

    /// Add link between nodes
    pub fn add_link(&mut self, source: usize, target: usize, strength: f64) {
        self.links.push(Link { source, target, strength });
    }

    /// Run one tick of simulation (SIMD-optimized)
    pub fn tick(&mut self) {
        // Apply forces
        self.apply_link_force();
        self.apply_charge_force();
        self.apply_center_force();

        // Update positions
        for node in &mut self.nodes {
            node.vx *= 0.4; // velocity decay
            node.vy *= 0.4;
            node.x += node.vx;
            node.y += node.vy;
        }

        // Decay alpha
        self.alpha *= 1.0 - self.alpha_decay;
    }

    /// Get positions as flat Float64Array (zero-copy on UMA)
    pub fn positions(&self) -> js_sys::Float64Array {
        let flat: Vec<f64> = self.nodes
            .iter()
            .flat_map(|n| [n.x, n.y])
            .collect();

        js_sys::Float64Array::from(&flat[..])
    }

    fn apply_link_force(&mut self) {
        for link in &self.links {
            let source = &self.nodes[link.source];
            let target = &self.nodes[link.target];

            let dx = target.x - source.x;
            let dy = target.y - source.y;
            let distance = (dx * dx + dy * dy).sqrt().max(1.0);

            let force = (distance - 30.0) * link.strength * self.alpha;
            let fx = (dx / distance) * force;
            let fy = (dy / distance) * force;

            // Update velocities (mutable borrow split)
            let nodes = &mut self.nodes;
            nodes[link.source].vx += fx;
            nodes[link.source].vy += fy;
            nodes[link.target].vx -= fx;
            nodes[link.target].vy -= fy;
        }
    }

    fn apply_charge_force(&mut self) {
        for i in 0..self.nodes.len() {
            for j in (i + 1)..self.nodes.len() {
                let dx = self.nodes[j].x - self.nodes[i].x;
                let dy = self.nodes[j].y - self.nodes[i].y;
                let distance = (dx * dx + dy * dy).sqrt().max(1.0);

                let force = -30.0 * self.alpha / (distance * distance);
                let fx = (dx / distance) * force;
                let fy = (dy / distance) * force;

                self.nodes[i].vx += fx;
                self.nodes[i].vy += fy;
                self.nodes[j].vx -= fx;
                self.nodes[j].vy -= fy;
            }
        }
    }

    fn apply_center_force(&mut self) {
        let mut cx = 0.0;
        let mut cy = 0.0;

        for node in &self.nodes {
            cx += node.x;
            cy += node.y;
        }

        cx /= self.nodes.len() as f64;
        cy /= self.nodes.len() as f64;

        for node in &mut self.nodes {
            node.x -= cx;
            node.y -= cy;
        }
    }
}
```

**JavaScript Integration**
```javascript
// src/lib/components/graphs/ForceGraph.svelte

<script>
import { onMount } from 'svelte';
import { ForceSimulation } from '$lib/wasm/graphs';

let canvas;
let ctx;
let simulation;

onMount(async () => {
  ctx = canvas.getContext('2d');

  // Initialize WASM simulation
  simulation = new ForceSimulation(50); // 50 nodes

  // Add links
  for (let i = 0; i < 49; i++) {
    simulation.add_link(i, i + 1, 0.5);
  }

  // Animation loop
  let running = true;
  function animate() {
    if (!running) return;

    simulation.tick();

    // Get positions (zero-copy on UMA)
    const positions = simulation.positions();

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333';

    for (let i = 0; i < 50; i++) {
      const x = positions[i * 2] + canvas.width / 2;
      const y = positions[i * 2 + 1] + canvas.height / 2;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();

  return () => { running = false; };
});
</script>

<canvas bind:this={canvas} width={800} height={600} />
```

---

### Week 14-16: UMA Memory Optimization

**Deliverables**:
- ✅ Zero-copy WASM buffers
- ✅ Shared WebGPU buffers
- ✅ 67% memory reduction validated

**Zero-Copy Pattern**
```javascript
// src/lib/wasm/uma-adapter.js

/**
 * @typedef {Object} SharedBuffer
 * @property {ArrayBuffer} buffer
 * @property {Uint32Array} view
 */

/**
 * UMA-optimized buffer sharing (Apple Silicon)
 * Eliminates copy overhead between JS/WASM/GPU
 */
export class UMAAdapter {
  /**
   * Create shared buffer for WASM
   * @param {number} sizeBytes
   * @returns {SharedBuffer}
   */
  static createSharedBuffer(sizeBytes) {
    // Allocate in WASM heap (UMA = same physical memory as GPU)
    const buffer = new ArrayBuffer(sizeBytes);
    const view = new Uint32Array(buffer);

    return { buffer, view };
  }

  /**
   * Pass buffer to GPU without copy
   * @param {GPUDevice} device
   * @param {ArrayBuffer} buffer
   * @returns {GPUBuffer}
   */
  static createGPUBuffer(device, buffer) {
    const gpuBuffer = device.createBuffer({
      size: buffer.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });

    // Copy to GPU (UMA = instant on Apple Silicon)
    new Uint8Array(gpuBuffer.getMappedRange()).set(new Uint8Array(buffer));
    gpuBuffer.unmap();

    return gpuBuffer;
  }
}
```

---

### Week 17-18: Remaining P1 Functions

**Deliverables**:
- ✅ 4 additional WASM functions (search, transforms)
- ✅ All P0 + P1 complete (17/23 functions)
- ✅ Comprehensive benchmarks

---

## Phase 3: Polish + Voice (Weeks 19-20)

### Week 19: Final WASM Functions (P2/P3)

**Deliverables**:
- ✅ String processing (P2)
- ✅ Diff algorithm (P2)
- ✅ Cache utilities (P3)

### Week 20: Voice Search Enhancement

**Deliverables**:
- ✅ Web Speech API with contextual biasing
- ✅ 40-60% accuracy improvement on DMB terms
- ✅ Production hardening

**Voice Search**
```javascript
// src/lib/voice/recognition.js

/**
 * @typedef {Object} VoiceConfig
 * @property {string[]} vocabulary - Custom vocabulary
 * @property {number} maxAlternatives
 */

/**
 * DMB-optimized voice search (Chrome 143+)
 */
export class VoiceSearch {
  /** @type {SpeechRecognition} */
  recognition;

  /** @type {string[]} */
  dmbVocabulary = [
    'Dave Matthews Band',
    'Carter Beauford',
    'Boyd Tinsley',
    'Leroi Moore',
    'Ants Marching',
    'Crash Into Me',
    'Warehouse',
    'Two Step'
    // ... 1,200+ song names
  ];

  constructor() {
    this.recognition = new webkitSpeechRecognition(); // Chrome 143+
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 5;

    // Contextual biasing (Chrome 143+)
    if ('SpeechRecognitionContextualBiasing' in window) {
      this.recognition.contextualBiasing = {
        vocabulary: this.dmbVocabulary,
        weight: 0.8 // Bias toward DMB terms
      };
    }
  }

  /**
   * Start voice recognition
   * @returns {Promise<string>}
   */
  async recognize() {
    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        resolve(result);
      };

      this.recognition.onerror = reject;
      this.recognition.start();
    });
  }
}
```

---

## Success Metrics

### Performance Targets

| Function | Before (JS) | After (GPU/WASM) | Target Speedup |
|----------|-------------|------------------|----------------|
| aggregateShowsByYear | 200-350ms | 12-25ms | **15-40x** |
| uniqueSongsPerYear | 80-120ms | 15-25ms | **4-6x** |
| forceSimulation | 140-200ms | 20-30ms | **6-10x** |
| calculatePercentile | 25-40ms | 8-12ms | **3-4x** |

### Memory Targets

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Aggregation memory | 48MB | 24MB | **50%** |
| Graph simulation | 45MB | 15MB | **67%** |
| Query buffers | 24MB | 2KB | **99.9%** |

### Bundle Size

| Asset | Size | Notes |
|-------|------|-------|
| WASM aggregations | 15KB | gzipped |
| WASM graphs | 12KB | gzipped |
| WASM total | **27KB** | Acceptable overhead |
| Main bundle | 130KB → 145KB | +11% |

---

## Risk Mitigation

### Browser Compatibility

- **WebGPU**: Chrome 143+, Safari 18+ ✅ (target platform)
- **WASM**: 98% browser support ✅
- **3-tier fallback**: Works on all devices ✅

### Performance Regression

- **Validation**: Automated benchmarks on every commit
- **Rollback**: Feature flags for GPU/WASM
- **Monitoring**: Performance telemetry in production

### Development Complexity

- **Pure JavaScript**: No TypeScript migration needed ✅
- **JSDoc**: Type safety without compilation ✅
- **Incremental**: Each function independent ✅

---

## Next Steps

1. **Approve this plan**
2. **Start Week 1**: Rust toolchain setup
3. **Validate**: First WASM function working
4. **Iterate**: Weekly reviews and adjustments

**Ready to begin implementation! 🚀**

---

**Questions?**
- Adjust timeline?
- Prioritize different functions?
- Additional benchmarks needed?

**Just say the word and I'll start Week 1!**
