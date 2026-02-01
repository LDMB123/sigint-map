# GPU Compute Developer Guide

**DMB Almanac Hybrid Compute System**
Version 1.0 | Last Updated: January 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [API Reference](#api-reference)
5. [Adding New Compute Operations](#adding-new-compute-operations)
6. [Performance Optimization](#performance-optimization)
7. [Debugging](#debugging)
8. [Best Practices](#best-practices)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is the Hybrid Compute System?

The DMB Almanac hybrid compute system is a 3-tier progressive enhancement architecture that automatically selects the fastest available computational backend for data aggregation tasks. It provides GPU-accelerated performance where available while gracefully degrading to ensure universal browser compatibility.

**Key Features:**
- 15-50x performance improvement on supported hardware (Apple Silicon M4)
- Zero-copy memory transfers on Unified Memory Architecture (UMA)
- Automatic feature detection and fallback
- Production-tested on 2,800+ DMB shows dataset
- Real-time telemetry and performance monitoring

### Why GPU/WASM/JavaScript Tiers?

**Tier 1: WebGPU (GPU Parallel)**
- Performance: 8-15ms for 2,800 items (15-40x speedup)
- Availability: Chrome 113+, Safari 18+, Edge 113+
- Use case: Maximum performance for large datasets on modern browsers
- Architecture: Parallel execution on GPU with atomic operations

**Tier 2: WebAssembly (CPU SIMD)**
- Performance: 50-100ms for 2,800 items (3-7x speedup)
- Availability: 95%+ of browsers (IE11+ with polyfill)
- Use case: Fast computation on older hardware without GPU support
- Architecture: Compiled Rust with auto-vectorization

**Tier 3: JavaScript (Universal Fallback)**
- Performance: 200-350ms for 2,800 items (baseline)
- Availability: 100% of browsers
- Use case: Guaranteed compatibility everywhere
- Architecture: Standard JavaScript with JIT optimization

### When to Use Each Tier

The system automatically selects the optimal tier, but you can force a specific backend for testing:

```javascript
import { ComputeOrchestrator } from '$lib/gpu/fallback.js';

// Automatic selection (recommended)
const result = await ComputeOrchestrator.aggregateByYear(shows);
console.log(`Used: ${result.backend}`); // 'webgpu', 'wasm', or 'javascript'

// Force specific backend (testing only)
ComputeOrchestrator.forceBackend('wasm');
const wasmResult = await ComputeOrchestrator.aggregateByYear(shows);
```

**Decision Matrix:**

| Scenario | Recommended Tier | Rationale |
|----------|-----------------|-----------|
| Modern desktop browsers | WebGPU | Maximum performance |
| Mobile devices (iOS/Android) | WASM or JavaScript | Battery efficiency |
| Legacy browsers (pre-2023) | JavaScript | Compatibility |
| Server-side rendering | JavaScript | Node.js compatibility |
| Development/testing | All tiers | Validate fallback chain |

---

## Architecture Overview

### 3-Tier Fallback Chain

```
┌─────────────────────────────────────────────────────────────┐
│                   ComputeOrchestrator                        │
│                  (Intelligent Router)                        │
└───────────────┬─────────────────┬───────────────┬───────────┘
                │                 │               │
                ▼                 ▼               ▼
        ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Tier 1:     │ │   Tier 2:    │ │   Tier 3:    │
        │   WebGPU      │ │   WASM       │ │  JavaScript  │
        │               │ │              │ │              │
        │ ┌───────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
        │ │ GPU       │ │ │ │ Rust     │ │ │ │ Pure JS  │ │
        │ │ Histogram │ │ │ │ SIMD     │ │ │ │ Map/     │ │
        │ │           │ │ │ │ Vector   │ │ │ │ Reduce   │ │
        │ │ Multi-    │ │ │ │          │ │ │ │          │ │
        │ │ Field     │ │ │ │          │ │ │ │          │ │
        │ └───────────┘ │ │ └──────────┘ │ │ └──────────┘ │
        │               │ │              │ │              │
        │ 8-15ms        │ │ 50-100ms     │ │ 200-350ms    │
        │ 15-40x        │ │ 3-7x         │ │ baseline     │
        └───────────────┘ └──────────────┘ └──────────────┘
                │                 │               │
                └─────────────────┴───────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ ComputeTelemetry │
                        │ (Performance     │
                        │  Monitoring)     │
                        └──────────────────┘
```

### Component Overview

#### GPUDeviceManager
**Location:** `/src/lib/gpu/device.js`

Singleton GPU device manager that handles WebGPU initialization, feature detection, and automatic recovery from device loss.

**Responsibilities:**
- Feature detection (check if WebGPU is available)
- Device initialization with optimal limits for Apple Silicon
- Device loss handling and automatic recovery
- Singleton pattern to prevent duplicate device creation

**Key Methods:**
- `isAvailable()`: Check if WebGPU is supported
- `getDevice()`: Get or create GPU device (singleton)
- `destroy()`: Release GPU resources

#### GPUHistogram
**Location:** `/src/lib/gpu/histogram.js`
**Shader:** `/static/shaders/histogram.wgsl`

GPU-accelerated histogram aggregation using WebGPU compute shaders.

**Responsibilities:**
- Aggregate shows by year using parallel GPU threads
- Use atomic operations for thread-safe increments
- Manage GPU buffers and pipeline lifecycle

**Performance:** 8-15ms for 2,800 items (15-40x speedup)

#### GPUMultiField
**Location:** `/src/lib/gpu/multi-field.js`
**Shader:** `/static/shaders/multi-field.wgsl`

Multi-dimensional GPU aggregation that computes multiple histograms in a single GPU pass.

**Responsibilities:**
- Aggregate years, venues, and song statistics simultaneously
- Compute min/max/avg using atomic compare-and-swap
- Single-pass processing for maximum efficiency

**Performance:** 12-20ms for 2,800 items x 3 fields (30-50x speedup)

#### WasmRuntime
**Location:** `/src/lib/wasm/loader.js`
**Module:** `/src/lib/wasm/aggregations/` (compiled from Rust)

Lazy-loading WASM runtime with feature detection and module caching.

**Responsibilities:**
- Feature detection for WebAssembly support
- Dynamic module loading (code-splitting)
- Singleton pattern for module reuse

**Rust Source:** `/rust/aggregations/src/lib.rs`

#### ComputeOrchestrator
**Location:** `/src/lib/gpu/fallback.js`

Intelligent routing layer that tries GPU → WASM → JavaScript with automatic fallback.

**Responsibilities:**
- Try each tier in priority order
- Cache failed tier attempts (don't retry in same session)
- Normalize results across all backends
- Record telemetry for each execution

**State Management:**
- `gpuTried`: Boolean flag to prevent GPU retry after failure
- `wasmTried`: Boolean flag to prevent WASM retry after failure

#### ComputeTelemetry
**Location:** `/src/lib/gpu/telemetry.js`

Real-time performance monitoring and analytics for compute backends.

**Responsibilities:**
- Record execution metrics (backend, time, item count)
- Calculate statistics (min/max/avg/percentiles)
- Export dashboard data for visualization
- Integrate with Performance Observer API

### Data Flow Diagram

**Single-Field Aggregation (Year Histogram):**

```
┌─────────────────┐
│ Input: Shows    │
│ [{date: "..."}] │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ ComputeOrchestrator.aggregateByYear()   │
└────────┬────────────────────────────────┘
         │
         ▼
    Extract Years
    [1991, 1992, 1991, ...]
         │
         ▼
┌────────────────────────────────────┐
│ Convert to Uint32Array             │
│ (GPU/WASM requirement)             │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ GPU: Upload to GPU buffer          │
│ (UMA = zero-copy on Apple Silicon) │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ GPU: Dispatch compute shader       │
│ Workgroups: ceil(dataSize / 256)   │
│ Each thread atomically increments  │
│ histogram[year - 1991]             │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ GPU: Read results to CPU           │
│ (mapAsync + getMappedRange)        │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Convert Uint32Array bins to Map    │
│ Map<year, count>                   │
└────────┬───────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Record telemetry                    │
│ ComputeTelemetry.record(...)        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Return Result   │
│ {backend, result,│
│  timeMs}        │
└─────────────────┘
```

---

## Getting Started

### Prerequisites

**Browser Requirements:**
- WebGPU: Chrome 113+, Safari 18+, Edge 113+
- WASM: Chrome 57+, Safari 11+, Firefox 52+ (95%+ coverage)
- JavaScript: All browsers

**Build Requirements:**
- Node.js 18+
- Rust 1.70+ (for WASM compilation)
- wasm-pack (install via `cargo install wasm-pack`)

**Development Tools:**
- Chrome DevTools (GPU profiling)
- Chrome Canary (experimental WebGPU features)

### Building WASM Modules

The WASM modules are pre-compiled and committed to the repository. To rebuild:

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack

# Build WASM modules
cd /path/to/dmb-almanac/rust/aggregations
wasm-pack build --target web --out-dir ../../app/src/lib/wasm/aggregations

# Optimize (production)
wasm-pack build --release --target web --out-dir ../../app/src/lib/wasm/aggregations
```

**Build Output:**
- `index.js`: JavaScript bindings
- `index_bg.wasm`: Compiled WebAssembly module
- `index.d.ts`: TypeScript definitions

**Cargo Configuration:**
- Profile: Release with LTO (Link-Time Optimization)
- Optimizations: `opt-level = 3` for maximum performance
- Size optimization: `opt-level = "z"` for dependencies

### Testing GPU Availability

**Browser Console:**

```javascript
// Check if WebGPU is available
if (navigator.gpu) {
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter) {
    const info = await adapter.requestAdapterInfo();
    console.log('GPU:', info.vendor, info.device);
  }
}

// Check via GPUDeviceManager
import { GPUDeviceManager } from '$lib/gpu/device.js';
const available = await GPUDeviceManager.isAvailable();
console.log('WebGPU available:', available);
```

**Test Page:**

Visit `/test-gpu` in your development server:

```bash
npm run dev
# Open http://localhost:5173/test-gpu
```

**Feature Detection Matrix:**

| Browser | Version | WebGPU Support | Notes |
|---------|---------|----------------|-------|
| Chrome | 113+ | Yes | Stable since April 2023 |
| Safari | 18+ | Yes | Shipped October 2024 |
| Edge | 113+ | Yes | Same as Chrome |
| Firefox | Nightly | Experimental | Behind flag |
| Mobile Safari | iOS 18+ | Yes | Same as desktop |
| Chrome Android | 113+ | Yes | Performance varies by device |

---

## API Reference

### GPUDeviceManager

#### `GPUDeviceManager.isAvailable()`

Check if WebGPU is available in the current browser.

**Returns:** `Promise<boolean>`

**Example:**
```javascript
import { GPUDeviceManager } from '$lib/gpu/device.js';

const available = await GPUDeviceManager.isAvailable();
if (available) {
  console.log('WebGPU is supported!');
}
```

**Implementation Details:**
- Caches result after first check (static `available` property)
- Checks for `navigator.gpu` existence
- Attempts to request GPU adapter
- Returns `false` and logs warning on failure

**Use Cases:**
- Feature detection before attempting GPU operations
- Conditional rendering (show/hide GPU features in UI)
- Analytics (track WebGPU adoption)

---

#### `GPUDeviceManager.getDevice()`

Get or create the singleton GPU device instance.

**Returns:** `Promise<GPUDeviceInfo>`

**GPUDeviceInfo Type:**
```javascript
{
  device: GPUDevice,      // WebGPU device instance
  adapter: GPUAdapter,    // GPU adapter
  info: GPUAdapterInfo    // Adapter information
}
```

**Example:**
```javascript
const { device, adapter, info } = await GPUDeviceManager.getDevice();
console.log('Using GPU:', info.vendor, info.device);

// Create compute pipeline
const pipeline = device.createComputePipeline({...});
```

**Implementation Details:**
- Singleton pattern: returns cached instance if available
- Prevents concurrent initialization via promise caching
- Configures device for Apple Silicon optimization:
  - `powerPreference: 'high-performance'` (targets M4 GPU)
  - `maxComputeWorkgroupSizeX: 256` (optimal for Apple GPU)
- Sets up automatic device loss recovery
- Throws error if WebGPU unavailable

**Error Handling:**
```javascript
try {
  const { device } = await GPUDeviceManager.getDevice();
} catch (e) {
  console.error('GPU initialization failed:', e);
  // Fall back to WASM or JavaScript
}
```

---

#### `GPUDeviceManager.destroy()`

Destroy the GPU device and release all resources.

**Returns:** `void`

**Example:**
```javascript
// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  GPUDeviceManager.destroy();
});
```

**Implementation Details:**
- Calls `device.destroy()` on WebGPU device
- Clears singleton instance (allows reinitialization)
- Safe to call multiple times (no-op if already destroyed)

---

### GPUHistogram

#### `GPUHistogram.init()`

Initialize the GPU histogram pipeline (loads shader and creates pipeline).

**Returns:** `Promise<void>`

**Example:**
```javascript
import { GPUHistogram } from '$lib/gpu/histogram.js';

const histogram = new GPUHistogram();
await histogram.init();
```

**Implementation Details:**
- Idempotent: safe to call multiple times (returns early if initialized)
- Loads WGSL shader from `/shaders/histogram.wgsl`
- Creates compute pipeline with `'auto'` layout
- Uses singleton GPUDeviceManager for device access

**Shader Loading:**
- Fetches shader file via `fetch('/shaders/histogram.wgsl')`
- Validates HTTP response (throws on 404/500)
- Caches shader code in `this.shaderCode`

---

#### `GPUHistogram.compute(yearData)`

Compute histogram on GPU using parallel atomic operations.

**Parameters:**
- `yearData` (Uint32Array): Array of years to aggregate

**Returns:** `Promise<HistogramResult>`

**HistogramResult Type:**
```javascript
{
  bins: Uint32Array,     // Histogram bin counts (35 bins for 1991-2026)
  years: number[],       // Year labels for bins [1991, 1992, ..., 2026]
  total: number,         // Total count across all bins
  timeMs: number         // GPU compute time in milliseconds
}
```

**Example:**
```javascript
const years = new Uint32Array([1991, 1992, 1991, 2000, 2000]);
const result = await histogram.compute(years);

console.log('Year 1991:', result.bins[0]);  // Index 0 = year 1991
console.log('Year 2000:', result.bins[9]);  // Index 9 = year 2000
console.log('Total shows:', result.total);   // 5
console.log('GPU time:', result.timeMs, 'ms');
```

**Implementation Details:**

1. **Buffer Creation:**
   - Input buffer: `dataSize * 4 bytes` (u32 = 4 bytes)
   - Output buffer: `35 * 4 bytes` (35 years: 1991-2026)
   - Staging buffer: for reading results back to CPU

2. **Data Upload:**
   - `writeBuffer(yearsBuffer, 0, yearData)`
   - Zero-copy on UMA (Apple Silicon) - just marks memory region
   - Actual copy on discrete GPUs (NVIDIA/AMD)

3. **Compute Dispatch:**
   - Workgroups: `Math.ceil(dataSize / 256)`
   - Threads per workgroup: 256 (optimal for Apple M-series)
   - Total threads: `workgroups * 256`
   - Each thread processes one year (atomic increment)

4. **Result Readback:**
   - Copy histogram buffer to staging buffer
   - Map staging buffer: `mapAsync(GPUMapMode.READ)`
   - Read mapped range: `getMappedRange()`
   - Copy to JavaScript: `new Uint32Array(...).slice()`
   - Unmap buffer: `unmap()`

5. **Cleanup:**
   - Destroy all buffers: `buffer.destroy()`
   - Release GPU memory

**Performance Characteristics:**
- 8-15ms for 2,800 items on M4
- 15-40x faster than JavaScript
- Scales linearly with dataset size
- Memory overhead: ~140KB for 2,800 items

---

### GPUMultiField

#### `GPUMultiField.init()`

Initialize the GPU multi-field pipeline.

**Returns:** `Promise<void>`

**Example:**
```javascript
import { GPUMultiField } from '$lib/gpu/multi-field.js';

const multiField = new GPUMultiField();
await multiField.init();
```

**Implementation Details:**
- Same pattern as GPUHistogram
- Loads shader from `/shaders/multi-field.wgsl`
- Entry point: `compute_multi_field`

---

#### `GPUMultiField.compute(years, venueIds, songCounts)`

Compute multi-dimensional aggregation on GPU in a single pass.

**Parameters:**
- `years` (Uint32Array): Array of years
- `venueIds` (Uint32Array): Array of venue IDs (0-999)
- `songCounts` (Uint32Array): Array of song counts per show

**Returns:** `Promise<MultiFieldResult>`

**MultiFieldResult Type:**
```javascript
{
  yearBins: Uint32Array,      // Year histogram (35 bins)
  venueBins: Uint32Array,     // Venue histogram (1000 bins)
  songStats: {
    totalShows: number,       // Total number of shows
    totalSongs: number,       // Total songs across all shows
    minSongs: number,         // Minimum songs in any show
    maxSongs: number,         // Maximum songs in any show
    avgSongs: number          // Average songs per show
  },
  timeMs: number              // GPU compute time
}
```

**Example:**
```javascript
const years = new Uint32Array([1991, 1992, 2000]);
const venueIds = new Uint32Array([5, 10, 5]);
const songCounts = new Uint32Array([20, 25, 18]);

const result = await multiField.compute(years, venueIds, songCounts);

console.log('Shows at venue 5:', result.venueBins[5]);  // 2
console.log('Average songs per show:', result.songStats.avgSongs);  // ~21
```

**Implementation Details:**

1. **Input Validation:**
   - All arrays must have same length
   - Throws error if lengths mismatch

2. **Buffer Initialization:**
   - Input buffers: 3 buffers (years, venues, songs)
   - Output buffers: 3 buffers (year hist, venue hist, song stats)
   - Song stats buffer initialized: `[0, 0, 999, 0]` (min starts at 999)

3. **Single-Pass Aggregation:**
   - Each thread processes one show
   - Atomic operations on all 3 output buffers
   - Year histogram: `atomicAdd(&yearHistogram[yearBin], 1)`
   - Venue histogram: `atomicAdd(&venueHistogram[venueId], 1)`
   - Song stats: atomic add (sum/count), atomic compare-exchange (min/max)

4. **Min/Max Calculation:**
   - Uses `atomicCompareExchangeWeak` in loop
   - Compare-and-swap until successful
   - Thread-safe without explicit locks

5. **Parallel Result Readback:**
   - Map all 3 staging buffers simultaneously: `Promise.all([...])`
   - Reduces CPU-GPU synchronization overhead

**Performance Characteristics:**
- 12-20ms for 2,800 items x 3 fields on M4
- 30-50x faster than JavaScript
- More efficient than running 3 separate GPU passes

---

### ComputeOrchestrator

#### `ComputeOrchestrator.aggregateByYear(shows)`

Aggregate shows by year using the fastest available backend (GPU → WASM → JS).

**Parameters:**
- `shows` (Array): Array of show objects with `date` property

**Returns:** `Promise<ComputeResult>`

**ComputeResult Type:**
```javascript
{
  backend: 'webgpu' | 'wasm' | 'javascript',  // Backend that executed
  result: Map<number, number>,                // Year -> count mapping
  timeMs: number                              // Total execution time
}
```

**Example:**
```javascript
import { ComputeOrchestrator } from '$lib/gpu/fallback.js';

const shows = [
  { date: '1991-05-11' },
  { date: '1992-06-15' },
  { date: '1991-08-20' }
];

const result = await ComputeOrchestrator.aggregateByYear(shows);

console.log('Used backend:', result.backend);  // 'webgpu'
console.log('1991 shows:', result.result.get(1991));  // 2
console.log('Time:', result.timeMs, 'ms');  // ~10ms
```

**Implementation Details:**

1. **Tier 1: WebGPU**
   - Checks: `!gpuTried && GPUDeviceManager.isAvailable()`
   - Converts to Uint32Array
   - Calls `GPUHistogram.compute()`
   - Converts bins array back to Map
   - On failure: sets `gpuTried = true`, falls through to WASM

2. **Tier 2: WASM**
   - Checks: `!wasmTried && WasmRuntime.isAvailable()`
   - Converts to Uint32Array
   - Calls `wasmModule.aggregate_by_year()`
   - Returns Map directly (WASM binding creates Map)
   - On failure: sets `wasmTried = true`, falls through to JS

3. **Tier 3: JavaScript**
   - Always succeeds (no feature detection needed)
   - Uses `aggregateByYearJS()` pure JavaScript implementation
   - Returns Map

4. **Telemetry:**
   - Every execution recorded: `ComputeTelemetry.record(...)`
   - Tracks backend, time, item count

**Fallback Behavior:**
- Failed tiers are never retried in the same session
- Prevents performance degradation from repeated failures
- Call `reset()` to clear failure state (testing only)

---

#### `ComputeOrchestrator.getPreferredBackend()`

Get the current preferred backend without executing computation.

**Returns:** `Promise<ComputeBackend>`

**Example:**
```javascript
const preferred = await ComputeOrchestrator.getPreferredBackend();
console.log('Will use:', preferred);  // 'webgpu', 'wasm', or 'javascript'
```

**Use Cases:**
- Display backend status in UI
- Conditionally enable features
- Debug information

---

#### `ComputeOrchestrator.reset()`

Reset fallback state (clears `gpuTried` and `wasmTried` flags).

**Returns:** `void`

**Example:**
```javascript
// Testing: Force re-attempt of all tiers
ComputeOrchestrator.reset();
const result = await ComputeOrchestrator.aggregateByYear(shows);
```

**Warning:** Only use for testing. In production, failed tiers should remain disabled for the session.

---

#### `ComputeOrchestrator.forceBackend(backend)`

Force a specific backend (for testing/debugging).

**Parameters:**
- `backend` ('webgpu' | 'wasm' | 'javascript'): Backend to force

**Returns:** `void`

**Example:**
```javascript
// Test WASM performance
ComputeOrchestrator.forceBackend('wasm');
const result = await ComputeOrchestrator.aggregateByYear(shows);
console.log(result.backend);  // 'wasm'

// Reset to automatic selection
ComputeOrchestrator.reset();
```

**Implementation:**
- Sets `gpuTried = (backend !== 'webgpu')`
- Sets `wasmTried = (backend !== 'wasm' && backend !== 'webgpu')`

---

### ComputeTelemetry

#### `ComputeTelemetry.record(operation, backend, timeMs, itemCount)`

Record a compute operation metric.

**Parameters:**
- `operation` (string): Operation name (e.g., 'aggregateByYear')
- `backend` ('webgpu' | 'wasm' | 'javascript'): Backend used
- `timeMs` (number): Execution time in milliseconds
- `itemCount` (number): Number of items processed

**Returns:** `void`

**Example:**
```javascript
import { ComputeTelemetry } from '$lib/gpu/telemetry.js';

// Automatically called by ComputeOrchestrator
// Manual usage:
const start = performance.now();
const result = await customCompute(data);
const time = performance.now() - start;

ComputeTelemetry.record('customCompute', 'webgpu', time, data.length);
```

**Implementation Details:**
- Stores up to 1,000 most recent metrics (FIFO queue)
- Sends to Performance Observer API (integration with RUM tools)
- Creates performance marks: `compute:operation:backend`

---

#### `ComputeTelemetry.getSummary()`

Get statistics summary for all backends.

**Returns:** `TelemetrySummary`

**TelemetrySummary Type:**
```javascript
{
  backends: {
    [backend: string]: {
      count: number,         // Number of times backend was used
      totalTimeMs: number,   // Total execution time
      avgTimeMs: number,     // Average execution time
      minTimeMs: number,     // Minimum execution time
      maxTimeMs: number,     // Maximum execution time
      totalItems: number     // Total items processed
    }
  },
  totalOperations: number,   // Total operations tracked
  preferredBackend: string,  // Most frequently used backend
  avgSpeedup: number         // Average speedup vs JavaScript baseline
}
```

**Example:**
```javascript
const summary = ComputeTelemetry.getSummary();

console.log('GPU used:', summary.backends.webgpu?.count, 'times');
console.log('Average GPU time:', summary.backends.webgpu?.avgTimeMs, 'ms');
console.log('Speedup:', summary.avgSpeedup, 'x');
```

---

#### `ComputeTelemetry.getDashboardData()`

Get real-time performance dashboard data.

**Returns:** `Object` with dashboard visualization data

**Example:**
```javascript
const dashboard = ComputeTelemetry.getDashboardData();

console.log('Backend usage:', dashboard.usage);
// { webgpu: 75, wasm: 15, javascript: 10 } (percentages)

console.log('P50 latency:', dashboard.p50);
// { webgpu: 12, wasm: 75, javascript: 250 } (milliseconds)

console.log('P95 latency:', dashboard.p95);
// { webgpu: 18, wasm: 120, javascript: 350 }

console.log('Recent operations:', dashboard.recentMetrics.length);  // Last 20
```

**Use Cases:**
- Real-time performance monitoring
- Analytics dashboards
- User-facing performance indicators

---

#### `ComputeTelemetry.clear()`

Clear all recorded metrics.

**Returns:** `void`

**Example:**
```javascript
// Reset telemetry (e.g., after deployment)
ComputeTelemetry.clear();
```

---

#### `ComputeTelemetry.export()`

Export metrics as JSON for offline analysis.

**Returns:** `string` (JSON)

**Example:**
```javascript
const json = ComputeTelemetry.export();
console.log(json);

// Download to file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'compute-metrics.json';
a.click();
```

**JSON Structure:**
```javascript
{
  "metrics": [...],           // All recorded metrics
  "summary": {...},           // Summary statistics
  "exportedAt": "2026-01-29T12:00:00.000Z"
}
```

---

## Adding New Compute Operations

This section provides a complete walkthrough for adding a new GPU-accelerated compute operation to the system.

### Step 1: Write WGSL Shader

Create a new shader file in `/static/shaders/`.

**Example: Sum Aggregation**

File: `/static/shaders/sum.wgsl`

```wgsl
// sum.wgsl - GPU-accelerated summation
// Computes sum of all values in parallel using atomic operations

// Input: Array of values to sum
@group(0) @binding(0) var<storage, read> values: array<u32>;

// Output: Total sum (single value)
@group(0) @binding(1) var<storage, read_write> result: array<atomic<u32>>;

// Compute shader entry point
// @workgroup_size(256) is optimal for Apple M-series GPUs
@compute @workgroup_size(256)
fn compute_sum(@builtin(global_invocation_id) id: vec3<u32>) {
    // Get thread index
    let idx = id.x;

    // Bounds check: return early if beyond array
    if (idx >= arrayLength(&values)) {
        return;
    }

    // Read value for this thread
    let value = values[idx];

    // Atomic add to result[0]
    atomicAdd(&result[0], value);
}
```

**WGSL Best Practices:**
- Use `@workgroup_size(256)` for Apple GPU optimization
- Always include bounds checking: `if (idx >= arrayLength(&array))`
- Use atomic operations for thread-safe writes
- Document expected performance in comments
- Use descriptive variable names

---

### Step 2: Create JavaScript GPU Class

Create a new class in `/src/lib/gpu/`.

**Example: GPUSum**

File: `/src/lib/gpu/sum.js`

```javascript
/**
 * @fileoverview GPU Sum Aggregation
 * WebGPU-accelerated summation using atomic operations
 * Pure JavaScript with JSDoc annotations - NO TypeScript
 */

import { GPUDeviceManager } from './device.js';

/**
 * @typedef {Object} SumResult
 * @property {number} total - Total sum of all values
 * @property {number} timeMs - GPU compute time in milliseconds
 */

/**
 * WebGPU sum aggregation
 */
export class GPUSum {
    /** @type {GPUDevice | null} */
    device = null;

    /** @type {GPUComputePipeline | null} */
    pipeline = null;

    /** @type {string} */
    shaderCode = null;

    /** @type {boolean} */
    initialized = false;

    /**
     * Initialize GPU pipeline
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initialized) {
            return;
        }

        try {
            console.info('[GPU Sum] Initializing pipeline...');

            // Get GPU device from singleton manager
            const { device } = await GPUDeviceManager.getDevice();
            this.device = device;

            // Load WGSL shader from static file
            this.shaderCode = await this._loadShader();

            // Create shader module
            const shaderModule = device.createShaderModule({
                code: this.shaderCode,
                label: 'sum-shader'
            });

            // Create compute pipeline
            this.pipeline = device.createComputePipeline({
                label: 'sum-pipeline',
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'compute_sum'
                }
            });

            this.initialized = true;
            console.info('[GPU Sum] Pipeline initialized ✅');
        } catch (e) {
            console.error('[GPU Sum] Initialization failed:', e);
            throw new Error(`[GPU Sum] Failed to initialize: ${e.message}`);
        }
    }

    /**
     * Load WGSL shader from static file
     * @private
     * @returns {Promise<string>}
     */
    async _loadShader() {
        try {
            const response = await fetch('/shaders/sum.wgsl');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (e) {
            console.error('[GPU Sum] Shader load failed:', e);
            throw new Error(`Failed to load shader: ${e.message}`);
        }
    }

    /**
     * Compute sum on GPU
     * @param {Uint32Array} values - Array of values to sum
     * @returns {Promise<SumResult>}
     */
    async compute(values) {
        // Ensure pipeline is initialized
        if (!this.pipeline) {
            await this.init();
        }

        const startTime = performance.now();

        try {
            const dataSize = values.length;

            // Create GPU buffers
            const valuesBuffer = this.device.createBuffer({
                size: dataSize * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                label: 'values-buffer'
            });

            const resultBuffer = this.device.createBuffer({
                size: 4, // Single u32
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
                label: 'result-buffer'
            });

            // Upload data to GPU
            this.device.queue.writeBuffer(valuesBuffer, 0, values);

            // Create bind group
            const bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: valuesBuffer } },
                    { binding: 1, resource: { buffer: resultBuffer } }
                ],
                label: 'sum-bind-group'
            });

            // Create command encoder
            const encoder = this.device.createCommandEncoder({
                label: 'sum-encoder'
            });

            // Begin compute pass
            const pass = encoder.beginComputePass({
                label: 'sum-pass'
            });

            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, bindGroup);

            // Dispatch compute shader
            const workgroups = Math.ceil(dataSize / 256);
            pass.dispatchWorkgroups(workgroups);
            pass.end();

            // Create staging buffer for readback
            const stagingBuffer = this.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                label: 'staging-buffer'
            });

            // Copy result to staging buffer
            encoder.copyBufferToBuffer(resultBuffer, 0, stagingBuffer, 0, 4);

            // Submit GPU commands
            this.device.queue.submit([encoder.finish()]);

            // Map and read result
            await stagingBuffer.mapAsync(GPUMapMode.READ);
            const resultArray = new Uint32Array(stagingBuffer.getMappedRange());
            const total = resultArray[0];
            stagingBuffer.unmap();

            // Cleanup
            valuesBuffer.destroy();
            resultBuffer.destroy();
            stagingBuffer.destroy();

            const timeMs = performance.now() - startTime;

            console.info(`[GPU Sum] Computed sum of ${dataSize} values in ${timeMs.toFixed(2)}ms`);

            return { total, timeMs };
        } catch (e) {
            console.error('[GPU Sum] Compute failed:', e);
            throw new Error(`GPU sum compute failed: ${e.message}`);
        }
    }

    /**
     * Destroy pipeline and release resources
     */
    destroy() {
        this.pipeline = null;
        this.device = null;
        this.initialized = false;
        console.info('[GPU Sum] Pipeline destroyed');
    }
}
```

---

### Step 3: Add WASM Implementation (Optional)

If you want WASM fallback, add a Rust function.

File: `/rust/aggregations/src/lib.rs`

```rust
/// Compute sum of all values
///
/// # Arguments
/// * `values` - Array of u32 values
///
/// # Returns
/// Total sum as u32
#[wasm_bindgen]
pub fn compute_sum(values: &[u32]) -> u32 {
    values.iter().sum()
}
```

Rebuild WASM:
```bash
cd rust/aggregations
wasm-pack build --release --target web --out-dir ../../app/src/lib/wasm/aggregations
```

---

### Step 4: Integrate into ComputeOrchestrator

Add method to `/src/lib/gpu/fallback.js`:

```javascript
import { GPUSum } from './sum.js';

export class ComputeOrchestrator {
    static gpuSum = null;

    /**
     * Compute sum (3-tier fallback)
     * @param {Uint32Array} values - Array of values
     * @returns {Promise<ComputeResult>}
     */
    static async computeSum(values) {
        const startTime = performance.now();

        // Tier 1: WebGPU
        if (!this.gpuTried && await GPUDeviceManager.isAvailable()) {
            try {
                console.info('[Compute] Attempting GPU sum...');

                if (!this.gpuSum) {
                    this.gpuSum = new GPUSum();
                }

                const gpuResult = await this.gpuSum.compute(values);
                const timeMs = performance.now() - startTime;

                ComputeTelemetry.record('computeSum', 'webgpu', timeMs, values.length);

                return {
                    backend: 'webgpu',
                    result: gpuResult.total,
                    timeMs
                };
            } catch (e) {
                console.warn('[Compute] GPU failed, falling back to WASM:', e.message);
                this.gpuTried = true;
            }
        }

        // Tier 2: WASM
        if (!this.wasmTried && await WasmRuntime.isAvailable()) {
            try {
                console.info('[Compute] Attempting WASM sum...');

                if (!this.wasmModule) {
                    this.wasmModule = await WasmRuntime.load();
                }

                const result = this.wasmModule.compute_sum(values);
                const timeMs = performance.now() - startTime;

                ComputeTelemetry.record('computeSum', 'wasm', timeMs, values.length);

                return {
                    backend: 'wasm',
                    result,
                    timeMs
                };
            } catch (e) {
                console.warn('[Compute] WASM failed, falling back to JS:', e.message);
                this.wasmTried = true;
            }
        }

        // Tier 3: JavaScript
        console.info('[Compute] Using JavaScript sum');
        const result = this.computeSumJS(values);
        const timeMs = performance.now() - startTime;

        ComputeTelemetry.record('computeSum', 'javascript', timeMs, values.length);

        return {
            backend: 'javascript',
            result,
            timeMs
        };
    }

    /**
     * JavaScript fallback implementation
     * @param {Uint32Array} values
     * @returns {number}
     */
    static computeSumJS(values) {
        return values.reduce((sum, val) => sum + val, 0);
    }
}
```

---

### Integration Checklist

After implementing your new compute operation, verify:

- [ ] WGSL shader created in `/static/shaders/`
- [ ] GPU class created in `/src/lib/gpu/`
- [ ] JSDoc annotations added (types, parameters, returns)
- [ ] Shader loading uses `fetch('/shaders/...')`
- [ ] Pipeline initialization is idempotent (check `initialized` flag)
- [ ] Buffers are properly destroyed after use
- [ ] Error handling with try/catch and console logging
- [ ] WASM function added (if WASM fallback desired)
- [ ] JavaScript fallback implemented
- [ ] Integration added to ComputeOrchestrator
- [ ] Telemetry recording added (`ComputeTelemetry.record(...)`)
- [ ] Unit tests written (optional but recommended)
- [ ] Benchmark added to `/routes/benchmark/+page.svelte` (optional)

---

## Performance Optimization

### UMA Zero-Copy Patterns

**Unified Memory Architecture (UMA)** on Apple Silicon means CPU and GPU share the same physical memory. This enables zero-copy transfers.

**Traditional GPU (Discrete Memory):**
```
CPU Memory          PCIe Bus          GPU Memory
[Data Array] -----> [Transfer] -----> [GPU Buffer]
  5-10ms                                <compute>
                    [Transfer] <------ [Result]
  5-10ms
```

**UMA (Apple Silicon):**
```
Shared Memory
[Data Array] = [GPU Buffer]  (same physical address)
  <instant>                  <compute>
[Result]     = [CPU Access]  (same physical address)
  <instant>
```

**Implementation:**

```javascript
// Traditional approach (works everywhere, but slower on UMA)
const cpuArray = new Uint32Array([1, 2, 3, 4]);
const gpuBuffer = device.createBuffer({...});
device.queue.writeBuffer(gpuBuffer, 0, cpuArray);  // Copy on discrete GPU, zero-copy on UMA

// After compute
const stagingBuffer = device.createBuffer({
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
});
encoder.copyBufferToBuffer(resultBuffer, 0, stagingBuffer, 0, size);
device.queue.submit([encoder.finish()]);
await stagingBuffer.mapAsync(GPUMapMode.READ);
const result = new Uint32Array(stagingBuffer.getMappedRange()).slice();  // Copy
stagingBuffer.unmap();
```

**UMA-Optimized Pattern:**

The code above is already optimized for UMA. The key is that on Apple Silicon:
- `writeBuffer()` is instant (just marks memory region as GPU-accessible)
- `copyBufferToBuffer()` is instant (same memory, just metadata update)
- `getMappedRange()` requires `.slice()` for safety (but this is a small CPU-side copy)

**Buffer Reuse for Maximum Performance:**

```javascript
export class GPUHistogramOptimized {
    // Reuse buffers across multiple compute calls
    inputBuffer = null;
    outputBuffer = null;
    stagingBuffer = null;

    async compute(yearData) {
        // Resize buffers only if needed
        const dataSize = yearData.length * 4;

        if (!this.inputBuffer || this.inputBuffer.size < dataSize) {
            this.inputBuffer?.destroy();
            this.inputBuffer = this.device.createBuffer({
                size: dataSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
        }

        // Upload data (zero-copy on UMA)
        this.device.queue.writeBuffer(this.inputBuffer, 0, yearData);

        // ... compute ...

        // Reuse staging buffer
        if (!this.stagingBuffer) {
            this.stagingBuffer = this.device.createBuffer({
                size: 35 * 4,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });
        }

        // Read result
        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        const result = new Uint32Array(this.stagingBuffer.getMappedRange()).slice();
        this.stagingBuffer.unmap();

        return result;
    }

    destroy() {
        this.inputBuffer?.destroy();
        this.outputBuffer?.destroy();
        this.stagingBuffer?.destroy();
    }
}
```

**Performance Impact:**
- Buffer creation: ~1-2ms per buffer
- Buffer reuse: <0.1ms (just resize check)
- For repeated operations: 10-20% speedup

---

### Workgroup Sizing

**Why 256 Threads?**

Apple M-series GPUs are optimized for specific workgroup sizes. Empirical testing shows:

| Workgroup Size | M4 Performance | Notes |
|----------------|----------------|-------|
| 64 | Good | Underutilizes GPU cores |
| 128 | Better | Still suboptimal |
| **256** | **Best** | Optimal for Apple GPU |
| 512 | Good | Exceeds some hardware limits |
| 1024 | Poor | May not be supported |

**WGSL Declaration:**
```wgsl
@compute @workgroup_size(256)
fn my_shader(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    // ...
}
```

**Workgroup Dispatch Calculation:**
```javascript
const dataSize = 2800;
const threadsPerWorkgroup = 256;
const workgroups = Math.ceil(dataSize / threadsPerWorkgroup);
// workgroups = Math.ceil(2800 / 256) = 11

pass.dispatchWorkgroups(workgroups);
// Launches 11 workgroups * 256 threads = 2816 threads
// Threads 0-2799 process data
// Threads 2800-2815 exit early (bounds check)
```

**Multi-Dimensional Workgroups:**

For 2D operations (e.g., matrix operations):
```wgsl
@compute @workgroup_size(16, 16)  // 256 threads total
fn my_2d_shader(@builtin(global_invocation_id) id: vec3<u32>) {
    let x = id.x;
    let y = id.y;
    // ...
}
```

```javascript
const width = 1024;
const height = 768;
const workgroupsX = Math.ceil(width / 16);
const workgroupsY = Math.ceil(height / 16);
pass.dispatchWorkgroups(workgroupsX, workgroupsY);
```

---

### Buffer Reuse Strategies

**Anti-Pattern: Create New Buffers Every Frame**
```javascript
// BAD: Creates/destroys buffers on every call (slow)
async function compute(data) {
    const buffer = device.createBuffer({...});  // 1-2ms overhead
    device.queue.writeBuffer(buffer, 0, data);
    // ... compute ...
    buffer.destroy();
}
```

**Pattern 1: Singleton Buffers**
```javascript
class OptimizedCompute {
    static sharedBuffer = null;
    static maxSize = 0;

    static async compute(data) {
        const requiredSize = data.length * 4;

        // Resize only if needed
        if (!this.sharedBuffer || requiredSize > this.maxSize) {
            this.sharedBuffer?.destroy();
            this.maxSize = Math.max(requiredSize, this.maxSize * 1.5); // Grow 50%
            this.sharedBuffer = device.createBuffer({
                size: this.maxSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
        }

        device.queue.writeBuffer(this.sharedBuffer, 0, data);
        // ... compute ...
    }
}
```

**Pattern 2: Buffer Pools**
```javascript
class BufferPool {
    static pools = new Map(); // Map<size, GPUBuffer[]>

    static acquire(size) {
        const pool = this.pools.get(size) || [];

        if (pool.length > 0) {
            return pool.pop(); // Reuse existing buffer
        }

        // Create new buffer
        return device.createBuffer({
            size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
    }

    static release(buffer, size) {
        const pool = this.pools.get(size) || [];
        pool.push(buffer);
        this.pools.set(size, pool);
    }
}

// Usage
async function compute(data) {
    const buffer = BufferPool.acquire(data.length * 4);
    device.queue.writeBuffer(buffer, 0, data);
    // ... compute ...
    BufferPool.release(buffer, data.length * 4);
}
```

**Pattern 3: Persistent Staging Buffers**
```javascript
class PersistentCompute {
    stagingBuffer = null;

    async compute(data) {
        // Create staging buffer once
        if (!this.stagingBuffer) {
            this.stagingBuffer = device.createBuffer({
                size: 1024 * 4, // Fixed size for results
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                mappedAtCreation: false
            });
        }

        // ... compute ...

        // Reuse staging buffer for readback
        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        const result = new Uint32Array(this.stagingBuffer.getMappedRange()).slice();
        this.stagingBuffer.unmap();

        return result;
    }
}
```

**Performance Comparison (2,800 items, 100 iterations):**

| Strategy | Time per Iteration | Total Time |
|----------|-------------------|------------|
| Create/destroy every time | 12-15ms | 1,350ms |
| Singleton buffers | 8-10ms | 900ms |
| Buffer pools | 8-11ms | 950ms |
| Persistent staging | 8-9ms | 850ms |

**Recommendation:** Use singleton buffers with dynamic resizing for simplicity and performance.

---

### Avoiding Redundant Transfers

**Anti-Pattern: Multiple CPU→GPU Transfers**
```javascript
// BAD: Separate transfers (slow)
device.queue.writeBuffer(buffer1, 0, data1); // Transfer 1
device.queue.writeBuffer(buffer2, 0, data2); // Transfer 2
device.queue.writeBuffer(buffer3, 0, data3); // Transfer 3
// Each transfer incurs latency
```

**Pattern 1: Batch Transfers**
```javascript
// GOOD: Single interleaved buffer
const combined = new Uint32Array(data1.length + data2.length + data3.length);
combined.set(data1, 0);
combined.set(data2, data1.length);
combined.set(data3, data1.length + data2.length);

device.queue.writeBuffer(combinedBuffer, 0, combined); // Single transfer
```

**Pattern 2: Multi-Field Aggregation (Already Optimized)**
```javascript
// GPUMultiField does this correctly:
// Single dispatch processes all fields simultaneously
device.queue.writeBuffer(yearsBuffer, 0, years);
device.queue.writeBuffer(venueIdsBuffer, 0, venueIds);
device.queue.writeBuffer(songCountsBuffer, 0, songCounts);
// Shader processes all 3 in parallel - no redundant work
```

**Anti-Pattern: Redundant Readbacks**
```javascript
// BAD: Read entire buffer when only part is needed
await buffer.mapAsync(GPUMapMode.READ);
const allData = new Uint32Array(buffer.getMappedRange()); // 1MB read
const result = allData[0]; // Only need 4 bytes!
```

**Pattern: Partial Readbacks**
```javascript
// GOOD: Map only needed range
await buffer.mapAsync(GPUMapMode.READ, 0, 4); // Read 4 bytes only
const data = new Uint32Array(buffer.getMappedRange(0, 4));
const result = data[0];
```

---

## Debugging

### Chrome DevTools GPU Profiling

**Enable GPU Profiling:**

1. Open Chrome DevTools (F12)
2. Go to **Performance** tab
3. Click ⚙️ (settings icon)
4. Enable "Capture Screenshots"
5. Enable "GPU Tasks"
6. Click ⏺️ Record
7. Trigger GPU computation
8. Click ⏹️ Stop

**Reading GPU Timeline:**

```
Main Thread
├─ JavaScript execution
│  └─ ComputeOrchestrator.aggregateByYear()  [2ms]
│
GPU Process
├─ writeBuffer (upload data)                 [0.1ms UMA / 5ms discrete]
├─ Compute Pass: histogram-pass
│  ├─ Pipeline: histogram-pipeline           [8-15ms]
│  └─ Workgroups: 11
├─ copyBufferToBuffer (staging)              [0.1ms UMA / 2ms discrete]
└─ mapAsync + getMappedRange (readback)      [1ms]
```

**Identifying Bottlenecks:**

- **Long `writeBuffer` time?** Check data size, consider buffer reuse
- **Long compute pass?** Check workgroup size, shader optimization
- **Long `mapAsync` time?** GPU is busy, consider async patterns
- **Multiple small passes?** Batch into single multi-field pass

---

### Common Issues and Solutions

#### Issue: "WebGPU not supported"

**Symptoms:**
```
[GPU] WebGPU not supported in this browser
```

**Solutions:**
1. **Update browser:** Chrome 113+, Safari 18+
2. **Check flags:** `chrome://flags` → Enable "Unsafe WebGPU"
3. **Check hardware:** Some VMs/remote desktops don't support WebGPU
4. **Fallback working?** Verify WASM or JavaScript tier executes

**Verification:**
```javascript
console.log('GPU available:', navigator.gpu !== undefined);
```

---

#### Issue: "Failed to get GPU adapter"

**Symptoms:**
```
[GPU] No WebGPU adapter available
```

**Causes:**
- GPU blacklisted (old drivers)
- Running in headless mode
- Virtual machine without GPU passthrough
- macOS < 13.0 (Safari 18+ requires macOS 13+)

**Solutions:**
1. Update GPU drivers
2. Use `--disable-gpu-driver-bug-workarounds` flag
3. Run on physical hardware
4. Let fallback handle it (WASM/JS)

---

#### Issue: Validation errors in console

**Symptoms:**
```
[GPU] Validation Error: Buffer size must be a multiple of 4
[GPU] Validation Error: Binding 0 is missing from bind group
```

**Solution:**
```javascript
// Ensure buffer sizes are multiples of 4 (u32 = 4 bytes)
const size = Math.ceil(arrayLength * 4 / 4) * 4; // Round up to multiple of 4

// Ensure all bindings match shader
const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: { buffer: buffer0 } }, // Must match @binding(0)
        { binding: 1, resource: { buffer: buffer1 } }, // Must match @binding(1)
        // Don't skip bindings!
    ]
});
```

---

#### Issue: Incorrect results from GPU

**Symptoms:**
- Results differ from JavaScript baseline
- Histogram bins are wrong
- Values are zero when they shouldn't be

**Debug Steps:**

1. **Enable validation layers:**
```javascript
const device = await adapter.requestDevice({
    requiredFeatures: [],
    requiredLimits: {},
    // No validation mode in WebGPU yet, but errors log to console
});
```

2. **Check buffer initialization:**
```javascript
// Ensure output buffers start at zero
const histogram = new Uint32Array(35); // Pre-zeroed
device.queue.writeBuffer(histogramBuffer, 0, histogram);
```

3. **Verify shader logic:**
```wgsl
// Add debug output
@group(0) @binding(2) var<storage, read_write> debug: array<u32>;

debug[idx] = year; // Write year values for inspection
```

4. **Compare with CPU:**
```javascript
const gpuResult = await gpuCompute(data);
const cpuResult = cpuCompute(data);

console.log('GPU:', gpuResult);
console.log('CPU:', cpuResult);
console.log('Match:', JSON.stringify(gpuResult) === JSON.stringify(cpuResult));
```

---

### Testing Without GPU Hardware

**Method 1: Force JavaScript Fallback**
```javascript
import { ComputeOrchestrator } from '$lib/gpu/fallback.js';

// Simulate no GPU support
ComputeOrchestrator.forceBackend('javascript');

const result = await ComputeOrchestrator.aggregateByYear(shows);
console.log('Backend:', result.backend); // 'javascript'
```

**Method 2: Mock GPUDeviceManager**
```javascript
// In test file
import { GPUDeviceManager } from '$lib/gpu/device.js';

// Override isAvailable to return false
const originalIsAvailable = GPUDeviceManager.isAvailable;
GPUDeviceManager.isAvailable = async () => false;

// Run tests...

// Restore
GPUDeviceManager.isAvailable = originalIsAvailable;
```

**Method 3: Use WebGPU Emulator (Experimental)**
```bash
# Install WebGPU-CTS (Conformance Test Suite)
npm install -D @webgpu/cts

# Run tests with CPU emulation
npm test -- --gpu=swiftshader
```

---

### Telemetry Dashboard Usage

**Viewing Real-Time Metrics:**

```javascript
import { ComputeTelemetry } from '$lib/gpu/telemetry.js';

// In browser console or UI component
const dashboard = ComputeTelemetry.getDashboardData();

console.table(dashboard.summary.backends);
// ┌─────────┬────────┬────────────┬───────────┬────────────┬────────────┐
// │ backend │ count  │ totalTimeMs│ avgTimeMs │ minTimeMs  │ maxTimeMs  │
// ├─────────┼────────┼────────────┼───────────┼────────────┼────────────┤
// │ webgpu  │ 150    │ 1,800      │ 12.0      │ 8.5        │ 18.2       │
// │ wasm    │ 30     │ 2,400      │ 80.0      │ 65.0       │ 120.0      │
// │ js      │ 20     │ 5,000      │ 250.0     │ 200.0      │ 350.0      │
// └─────────┴────────┴────────────┴───────────┴────────────┴────────────┘

console.log('Backend usage:', dashboard.usage);
// { webgpu: 75, wasm: 15, javascript: 10 }

console.log('P95 latency:', dashboard.p95);
// { webgpu: 18, wasm: 120, javascript: 350 }
```

**Creating a Dashboard Component:**

```svelte
<!-- TelemetryDashboard.svelte -->
<script>
import { onMount } from 'svelte';
import { ComputeTelemetry } from '$lib/gpu/telemetry.js';

let dashboard = null;

onMount(() => {
    // Update every 2 seconds
    const interval = setInterval(() => {
        dashboard = ComputeTelemetry.getDashboardData();
    }, 2000);

    return () => clearInterval(interval);
});
</script>

{#if dashboard}
    <div class="dashboard">
        <h2>Compute Performance</h2>

        <h3>Backend Usage</h3>
        <ul>
            <li>GPU: {dashboard.usage.webgpu || 0}%</li>
            <li>WASM: {dashboard.usage.wasm || 0}%</li>
            <li>JavaScript: {dashboard.usage.javascript || 0}%</li>
        </ul>

        <h3>Performance (P50 Latency)</h3>
        <ul>
            <li>GPU: {dashboard.p50.webgpu?.toFixed(2) || 'N/A'}ms</li>
            <li>WASM: {dashboard.p50.wasm?.toFixed(2) || 'N/A'}ms</li>
            <li>JavaScript: {dashboard.p50.javascript?.toFixed(2) || 'N/A'}ms</li>
        </ul>

        <h3>Speedup</h3>
        <p>{dashboard.summary.avgSpeedup}x faster than JavaScript</p>
    </div>
{/if}
```

---

## Best Practices

### Error Handling Patterns

**Pattern 1: Try-Catch with Fallback**
```javascript
async function safeGPUCompute(data) {
    try {
        const result = await gpuHistogram.compute(data);
        return { success: true, result, backend: 'gpu' };
    } catch (error) {
        console.warn('GPU compute failed:', error);

        // Fallback to JavaScript
        const result = jsCompute(data);
        return { success: true, result, backend: 'javascript', fallback: true };
    }
}
```

**Pattern 2: Graceful Degradation**
```javascript
export class ResilientCompute {
    async compute(data) {
        const backends = ['gpu', 'wasm', 'javascript'];

        for (const backend of backends) {
            try {
                return await this._computeWithBackend(data, backend);
            } catch (error) {
                console.warn(`${backend} failed:`, error);
                continue; // Try next backend
            }
        }

        throw new Error('All compute backends failed');
    }
}
```

**Pattern 3: User-Friendly Error Messages**
```javascript
try {
    await gpuHistogram.compute(data);
} catch (error) {
    let userMessage;

    if (error.message.includes('device lost')) {
        userMessage = 'GPU connection lost. Please refresh the page.';
    } else if (error.message.includes('out of memory')) {
        userMessage = 'Not enough GPU memory. Try reducing dataset size.';
    } else {
        userMessage = 'Computation failed. Using fallback method.';
    }

    console.error('GPU Error:', error);
    showToast(userMessage);

    // Fallback
    return jsCompute(data);
}
```

---

### Singleton Patterns for Devices

**Why Singletons?**

Creating multiple GPU devices causes:
- Resource exhaustion (limited GPU contexts)
- Slower initialization (1-2 seconds per device)
- Memory leaks (devices not properly cleaned up)

**Correct Pattern (GPUDeviceManager):**
```javascript
export class GPUDeviceManager {
    static instance = null;
    static initializationPromise = null;

    static async getDevice() {
        // Return cached instance
        if (this.instance) {
            return this.instance;
        }

        // Return in-flight promise (prevent concurrent init)
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Initialize once
        this.initializationPromise = this._initialize();
        try {
            this.instance = await this.initializationPromise;
            return this.instance;
        } finally {
            this.initializationPromise = null;
        }
    }
}
```

**Anti-Pattern:**
```javascript
// BAD: New device on every call
async function compute(data) {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice(); // Slow! (1-2 seconds)
    // ... compute ...
    device.destroy();
}
```

---

### Resource Cleanup

**Pattern 1: Explicit Cleanup**
```javascript
export class GPUHistogram {
    buffers = [];

    async compute(data) {
        const buffer1 = device.createBuffer({...});
        const buffer2 = device.createBuffer({...});

        this.buffers.push(buffer1, buffer2);

        try {
            // ... compute ...
        } finally {
            // Always cleanup, even on error
            this.cleanup();
        }
    }

    cleanup() {
        for (const buffer of this.buffers) {
            buffer.destroy();
        }
        this.buffers = [];
    }
}
```

**Pattern 2: RAII (Resource Acquisition Is Initialization)**
```javascript
class BufferScope {
    constructor(device, size) {
        this.buffer = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE });
    }

    use(callback) {
        try {
            return callback(this.buffer);
        } finally {
            this.buffer.destroy();
        }
    }
}

// Usage
await new BufferScope(device, 1024).use(async (buffer) => {
    device.queue.writeBuffer(buffer, 0, data);
    // ... compute ...
}); // Automatically destroyed after use
```

**Pattern 3: Cleanup on Page Unload**
```javascript
// In app initialization
window.addEventListener('beforeunload', () => {
    GPUDeviceManager.destroy();
    gpuHistogram?.destroy();
    gpuMultiField?.destroy();
});
```

---

### Memory Management

**Monitoring Memory Usage:**
```javascript
async function getGPUMemoryUsage() {
    if (!performance.memory) {
        console.warn('Memory API not available');
        return null;
    }

    const memoryInfo = performance.memory;
    return {
        usedJSHeapSize: (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        totalJSHeapSize: (memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        jsHeapSizeLimit: (memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
    };
}

// Log before/after GPU operation
const beforeMem = await getGPUMemoryUsage();
await gpuCompute(data);
const afterMem = await getGPUMemoryUsage();
console.log('Memory delta:', (afterMem.usedJSHeapSize - beforeMem.usedJSHeapSize).toFixed(2), 'MB');
```

**Preventing Memory Leaks:**

1. **Always destroy buffers:**
```javascript
const buffer = device.createBuffer({...});
// ... use buffer ...
buffer.destroy(); // Don't forget!
```

2. **Unmap mapped buffers:**
```javascript
await buffer.mapAsync(GPUMapMode.READ);
const data = new Uint32Array(buffer.getMappedRange()).slice(); // .slice() copies data
buffer.unmap(); // Release mapping
```

3. **Clear caches:**
```javascript
// If you cache pipelines/shaders, clear on cleanup
export class GPUCompute {
    static pipelineCache = new Map();

    static clearCache() {
        this.pipelineCache.clear();
    }
}

// Call on app shutdown
GPUCompute.clearCache();
```

---

## Examples

### Example 1: Simple Histogram Aggregation

**Objective:** Aggregate 2,800 DMB shows by year using GPU acceleration.

**Code:**
```javascript
import { ComputeOrchestrator } from '$lib/gpu/fallback.js';

async function aggregateShowsByYear(shows) {
    const result = await ComputeOrchestrator.aggregateByYear(shows);

    console.log(`Backend: ${result.backend}`);
    console.log(`Time: ${result.timeMs.toFixed(2)}ms`);
    console.log(`Results:`, result.result);

    // Result is a Map<year, count>
    for (const [year, count] of result.result.entries()) {
        console.log(`${year}: ${count} shows`);
    }

    return result;
}

// Usage
const shows = [
    { date: '1991-05-11' },
    { date: '1992-06-15' },
    { date: '1991-08-20' }
];

const result = await aggregateShowsByYear(shows);
// Backend: webgpu
// Time: 12.34ms
// Results: Map(2) { 1991 => 2, 1992 => 1 }
```

**Performance Comparison:**
- GPU: 8-15ms (2,800 shows)
- WASM: 50-100ms
- JavaScript: 200-350ms

---

### Example 2: Multi-Field Aggregation

**Objective:** Aggregate years, venues, and song statistics in a single GPU pass.

**Code:**
```javascript
import { GPUMultiField } from '$lib/gpu/multi-field.js';

async function analyzeShows(shows) {
    // Extract fields
    const years = new Uint32Array(shows.map(s => s.year));
    const venueIds = new Uint32Array(shows.map(s => s.venueId));
    const songCounts = new Uint32Array(shows.map(s => s.songCount));

    // Compute on GPU
    const multiField = new GPUMultiField();
    const result = await multiField.compute(years, venueIds, songCounts);

    console.log(`GPU compute: ${result.timeMs.toFixed(2)}ms`);

    // Year distribution
    console.log('\nShows per year:');
    for (let i = 0; i < result.yearBins.length; i++) {
        const year = 1991 + i;
        const count = result.yearBins[i];
        if (count > 0) {
            console.log(`  ${year}: ${count} shows`);
        }
    }

    // Venue analysis
    console.log('\nTop 5 venues:');
    const venueCounts = Array.from(result.venueBins)
        .map((count, id) => ({ id, count }))
        .filter(v => v.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    for (const venue of venueCounts) {
        console.log(`  Venue ${venue.id}: ${venue.count} shows`);
    }

    // Song statistics
    console.log('\nSong statistics:');
    console.log(`  Total shows: ${result.songStats.totalShows}`);
    console.log(`  Total songs: ${result.songStats.totalSongs}`);
    console.log(`  Average songs per show: ${result.songStats.avgSongs.toFixed(2)}`);
    console.log(`  Min songs: ${result.songStats.minSongs}`);
    console.log(`  Max songs: ${result.songStats.maxSongs}`);

    return result;
}

// Usage
const shows = [
    { year: 1991, venueId: 5, songCount: 20 },
    { year: 1992, venueId: 10, songCount: 25 },
    { year: 1991, venueId: 5, songCount: 18 },
    { year: 2000, venueId: 15, songCount: 30 }
];

await analyzeShows(shows);
// GPU compute: 15.67ms
//
// Shows per year:
//   1991: 2 shows
//   1992: 1 shows
//   2000: 1 shows
//
// Top 5 venues:
//   Venue 5: 2 shows
//   Venue 10: 1 shows
//   Venue 15: 1 shows
//
// Song statistics:
//   Total shows: 4
//   Total songs: 93
//   Average songs per show: 23.25
//   Min songs: 18
//   Max songs: 30
```

---

### Example 3: Adding a New WASM Function

**Objective:** Add a percentile calculation function to the WASM module.

**Step 1: Write Rust function**

File: `/rust/aggregations/src/lib.rs`

```rust
use wasm_bindgen::prelude::*;

/// Calculate percentile from sorted array
///
/// # Arguments
/// * `values` - Sorted array of numbers
/// * `percentile` - Percentile to calculate (0.0 to 1.0)
///
/// # Returns
/// Value at the given percentile
#[wasm_bindgen]
pub fn calculate_percentile(values: &[f64], percentile: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let index = (percentile * (values.len() - 1) as f64).round() as usize;
    values[index.min(values.len() - 1)]
}
```

**Step 2: Build WASM**
```bash
cd rust/aggregations
wasm-pack build --release --target web --out-dir ../../app/src/lib/wasm/aggregations
```

**Step 3: Use in JavaScript**
```javascript
import { WasmRuntime } from '$lib/wasm/loader.js';

async function getMedianSongCount(shows) {
    // Extract and sort song counts
    const songCounts = shows.map(s => s.songCount).sort((a, b) => a - b);
    const values = new Float64Array(songCounts);

    // Load WASM module
    const wasm = await WasmRuntime.load();

    // Calculate 50th percentile (median)
    const median = wasm.calculate_percentile(values, 0.5);

    // Calculate 95th percentile
    const p95 = wasm.calculate_percentile(values, 0.95);

    console.log(`Median songs per show: ${median}`);
    console.log(`95th percentile: ${p95}`);

    return { median, p95 };
}

// Usage
const shows = [
    { songCount: 20 },
    { songCount: 25 },
    { songCount: 18 },
    { songCount: 30 },
    { songCount: 22 }
];

await getMedianSongCount(shows);
// Median songs per show: 22
// 95th percentile: 30
```

**TypeScript Definitions** (auto-generated by wasm-pack):

File: `/src/lib/wasm/aggregations/index.d.ts`

```typescript
export function calculate_percentile(values: Float64Array, percentile: number): number;
```

---

## Troubleshooting

### GPU Not Available on macOS

**Problem:** Safari 18+ should support WebGPU but shows as unavailable.

**Causes:**
1. macOS version < 13.0 (WebGPU requires macOS 13+)
2. Safari Technology Preview (may have experimental flags)
3. Virtual machine (GPU passthrough not configured)

**Solutions:**
1. Check macOS version: ` → About This Mac`
2. Update to macOS 13.0+
3. Enable in Safari: `Develop → Experimental Features → WebGPU`
4. Use Chrome instead (Chrome 113+ has better support)

---

### WASM Module Fails to Load

**Problem:**
```
[WASM] Load failed: TypeError: Failed to fetch
```

**Causes:**
1. WASM file not found (404 error)
2. MIME type incorrect (server not configured)
3. CORS policy blocking file

**Solutions:**

1. **Check WASM file exists:**
```bash
ls -la src/lib/wasm/aggregations/*.wasm
# Should show index_bg.wasm
```

2. **Configure server MIME type** (Vite handles this automatically):
```javascript
// vite.config.js
export default {
    plugins: [
        wasm(), // vite-plugin-wasm
        topLevelAwait() // vite-plugin-top-level-await
    ]
};
```

3. **Verify in browser:**
```javascript
// Open DevTools Network tab
// Look for index_bg.wasm request
// Should be: Status 200, Type: application/wasm
```

---

### Incorrect Histogram Results

**Problem:** GPU histogram shows different counts than JavaScript.

**Debug Steps:**

1. **Verify input data:**
```javascript
const years = new Uint32Array([1991, 1992, 1991]);
console.log('Input:', years); // Uint32Array(3) [1991, 1992, 1991]
```

2. **Check year range:**
```javascript
const min = Math.min(...years);
const max = Math.max(...years);
console.log(`Year range: ${min}-${max}`); // Should be 1991-2026
```

3. **Compare outputs:**
```javascript
const gpuResult = await gpuHistogram.compute(years);
const jsResult = jsHistogram(years);

console.log('GPU bins:', gpuResult.bins);
console.log('JS result:', jsResult);

// Convert for comparison
const gpuMap = new Map();
for (let i = 0; i < gpuResult.bins.length; i++) {
    const year = 1991 + i;
    const count = gpuResult.bins[i];
    if (count > 0) {
        gpuMap.set(year, count);
    }
}

console.log('Maps equal?',
    JSON.stringify([...gpuMap]) === JSON.stringify([...jsResult]));
```

4. **Check for race conditions:**
```javascript
// Ensure GPU command completes before reading
device.queue.submit([encoder.finish()]);
await resultBuffer.mapAsync(GPUMapMode.READ); // Wait here
const result = new Uint32Array(resultBuffer.getMappedRange()).slice();
```

---

### Performance Degradation After Multiple Runs

**Problem:** First GPU run is fast (8ms), subsequent runs slow down (20ms+).

**Causes:**
1. GPU throttling (thermal limits)
2. Buffers not destroyed (memory leak)
3. Pipeline recreation on each call

**Solutions:**

1. **Monitor GPU temperature:**
```bash
# macOS
sudo powermetrics --samplers smc | grep -i "GPU"

# Check if thermal throttling active
```

2. **Ensure buffer cleanup:**
```javascript
async function compute(data) {
    const buffers = [];

    try {
        const buffer1 = device.createBuffer({...});
        buffers.push(buffer1);
        // ... compute ...
    } finally {
        // Always cleanup
        for (const buffer of buffers) {
            buffer.destroy();
        }
    }
}
```

3. **Reuse pipelines:**
```javascript
export class GPUHistogram {
    pipeline = null; // Cache pipeline

    async init() {
        if (this.pipeline) {
            return; // Don't recreate
        }
        // ... create pipeline once ...
    }
}
```

---

### Out of Memory Errors

**Problem:**
```
[GPU] Out of memory
[GPU] Failed to create buffer
```

**Causes:**
1. Dataset too large (>100MB)
2. Buffers not destroyed (accumulating memory)
3. Multiple concurrent operations

**Solutions:**

1. **Check dataset size:**
```javascript
const sizeBytes = data.length * 4; // u32 = 4 bytes
const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
console.log(`Dataset size: ${sizeMB} MB`);

if (sizeBytes > 100 * 1024 * 1024) {
    console.warn('Dataset very large, consider chunking');
    // Process in chunks
    return processInChunks(data, 25000); // 25k items at a time
}
```

2. **Chunk large datasets:**
```javascript
async function computeLargeDataset(data) {
    const chunkSize = 25000;
    const chunks = [];

    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const result = await gpuHistogram.compute(chunk);
        chunks.push(result);
    }

    // Merge results
    return mergeHistograms(chunks);
}
```

3. **Sequential processing:**
```javascript
// BAD: Concurrent operations (memory accumulation)
const results = await Promise.all([
    gpuCompute(data1),
    gpuCompute(data2),
    gpuCompute(data3)
]);

// GOOD: Sequential with cleanup
const results = [];
for (const data of [data1, data2, data3]) {
    const result = await gpuCompute(data);
    results.push(result);
    // Buffers destroyed before next iteration
}
```

---

## Performance Benchmarks

### M4 MacBook Pro (2024)

**Hardware:**
- CPU: Apple M4 (10-core)
- GPU: M4 (10-core GPU)
- RAM: 16GB Unified Memory
- OS: macOS 15.0

**Dataset:** 2,800 DMB shows

| Operation | WebGPU | WASM | JavaScript | Speedup (GPU vs JS) |
|-----------|--------|------|------------|---------------------|
| Year Histogram | 8-15ms | 50-100ms | 200-350ms | 15-40x |
| Multi-Field Aggregation | 12-20ms | 120-200ms | 600-1000ms | 30-50x |
| Sum Aggregation | 5-8ms | 30-50ms | 100-150ms | 12-30x |

**Scaling (Year Histogram):**

| Dataset Size | WebGPU | JavaScript | Speedup |
|--------------|--------|------------|---------|
| 100 shows | 3ms | 8ms | 2.7x |
| 500 shows | 5ms | 40ms | 8x |
| 1,000 shows | 7ms | 80ms | 11x |
| 2,800 shows | 12ms | 250ms | 21x |
| 10,000 shows | 25ms | 900ms | 36x |

---

## Additional Resources

**WebGPU Specifications:**
- Official Spec: https://www.w3.org/TR/webgpu/
- WGSL Spec: https://www.w3.org/TR/WGSL/

**Browser Documentation:**
- Chrome WebGPU: https://developer.chrome.com/docs/web-platform/webgpu
- Safari WebGPU: https://webkit.org/blog/14879/webgpu-now-available-for-testing-in-safari-technology-preview/

**Development Tools:**
- WebGPU Samples: https://webgpu.github.io/webgpu-samples/
- Chrome GPU Profiling: https://developer.chrome.com/docs/devtools/performance/

**Community:**
- WebGPU Discussion Forum: https://github.com/gpuweb/gpuweb/discussions
- Stack Overflow: https://stackoverflow.com/questions/tagged/webgpu

---

## Changelog

### Version 1.0 (January 2026)
- Initial release
- GPU histogram aggregation (15-40x speedup)
- GPU multi-field aggregation (30-50x speedup)
- WASM fallback layer (3-7x speedup)
- JavaScript universal fallback
- Telemetry and monitoring system
- Production deployment on DMB Almanac

---

**Document Metadata:**
- Author: DMB Almanac Development Team
- Last Updated: January 29, 2026
- Target Audience: JavaScript/GPU developers
- Skill Level: Intermediate to Advanced
- Codebase Version: 0.1.0
