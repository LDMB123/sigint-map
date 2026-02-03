# GPU Compute Reference

WebGPU 3-tier system (GPU -> WASM -> JS) for histogram/aggregation on Apple Silicon M4.

## Quick Start

```typescript
import { initGPUDevice, computeHistogram } from '$lib/gpu';
await initGPUDevice({ powerPreference: 'high-performance' });
const result = await computeHistogram({ data: new Float32Array([...]), binCount: 20 });
// result.engine: 'gpu' | 'wasm' | 'javascript'
// result.gpuTimeMs: execution time
```

## Architecture

- **Tier 1 (GPU)**: 8-15ms (15-40x), Chrome 113+/Safari 18+, Apple Silicon optimized
- **Tier 2 (WASM)**: 50-100ms (3-7x), 95%+ browsers, Rust SIMD
- **Tier 3 (JS)**: 200-350ms (baseline), universal fallback
- Auto-select: GPU -> WASM -> JS, state cached (no retry after fail)

## Performance (2,800 shows, M4)

| Operation | WebGPU | WASM | JS | Speedup |
|-----------|--------|------|----|---------|
| Year histogram | 8-15ms | 50-100ms | 200-350ms | 15-40x |
| Multi-field | 12-20ms | 120-200ms | 600-1000ms | 30-50x |
| Scaling (10K) | 25ms | 100ms | 900ms | 36x |

## API

### Device Management

```typescript
isWebGPUSupported()
await initGPUDevice(config?)
const caps = await getGPUCapabilities()  // caps.isAppleSilicon
gpuDeviceManager.getState()
gpuDeviceManager.getMetrics()
gpuDeviceManager.on('ready' | 'lost' | 'recovered' | 'failed', cb)
```

### Aggregations

```typescript
// Histogram (auto-fallback)
await computeHistogram(input, forceEngine?)

// Year aggregation
import { ComputeOrchestrator } from '$lib/gpu/fallback.js';
await ComputeOrchestrator.aggregateByYear(shows)

// Multi-field (years + venues + song stats)
import { GPUMultiField } from '$lib/gpu/multi-field.js';
const mf = new GPUMultiField();
await mf.init();
await mf.compute(years, venueIds, songCounts)

// Manual control
ComputeOrchestrator.forceBackend('wasm')
ComputeOrchestrator.reset()
```

### Constants

```typescript
APPLE_GPU_CONSTANTS.SIMD_WIDTH       // 32
APPLE_GPU_CONSTANTS.WORKGROUP_SIZE   // 256
APPLE_GPU_CONSTANTS.MAX_BUFFER_SIZE  // 1GB
```

## Implementation Guide

### 1. WGSL Shader (`/static/shaders/myshader.wgsl`)

```wgsl
@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<atomic<u32>>;

@compute @workgroup_size(256)  // Optimal for Apple M-series
fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= arrayLength(&input)) { return; }
    let value = input[idx];
    atomicAdd(&output[0], value);
}
```

- Workgroup size 256, atomic ops, bounds check required

### 2. GPU Class Pattern

```typescript
export class GPUSum {
    device: GPUDevice | null = null;
    pipeline: GPUComputePipeline | null = null;
    initialized = false;

    async init() {
        if (this.initialized) return;
        const { device } = await GPUDeviceManager.getDevice();
        this.device = device;
        const response = await fetch('/shaders/sum.wgsl');
        const shaderModule = device.createShaderModule({ code: await response.text() });
        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'compute_main' }
        });
        this.initialized = true;
    }

    async compute(data: Uint32Array) {
        if (!this.pipeline) await this.init();
        const startTime = performance.now();
        // Create input/output/staging buffers, bind group, dispatch, read result
        // Always destroy buffers in finally block
        return { result, timeMs: performance.now() - startTime };
    }
}
```

### 3. WASM Fallback

```rust
// rust/aggregations/src/lib.rs
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub fn compute_sum(values: &[u32]) -> u32 { values.iter().sum() }
```

Build: `wasm-pack build --release --target web --out-dir ../../app/src/lib/wasm/aggregations`

### 4. ComputeOrchestrator Integration

- Tier 1: try GPU, set `gpuTried=true` on fail
- Tier 2: try WASM, set `wasmTried=true` on fail
- Tier 3: JS fallback (always works)
- Record telemetry for each path

## Optimization Patterns

- **UMA Zero-Copy**: `writeBuffer()` instant on Apple Silicon (marks memory only). Reuse buffers via singleton pattern with 1.5x growth
- **Workgroup Sizing**: 256 threads (8 SIMD groups x 32 threads) optimal for M-series
- **Batch Transfers**: combine into single buffer instead of separate `writeBuffer()` calls
- **Persistent Staging**: reuse `MAP_READ | COPY_DST` staging buffers across compute calls

## Debugging

### Chrome DevTools

- Performance tab -> GPU Tasks -> Record
- Timeline: `writeBuffer` (0.1ms UMA / 5ms discrete) -> Compute Pass (8-15ms) -> `copyBufferToBuffer` -> `mapAsync` (1ms)

### Common Issues

- **WebGPU not supported**: Chrome 113+, Safari 18+, check `navigator.gpu !== undefined`
- **No adapter**: update GPU drivers, macOS 13+ for Safari 18
- **Validation errors**: buffer sizes multiples of 4, bindings must match shader `@binding(N)`
- **Incorrect results**: verify buffer init (zero output), compare GPU vs CPU output
- **Device lost**: auto-recovery via GPUDeviceManager, listen `on('lost')`, fallback to WASM/JS

## Testing

```typescript
// Unit: mock GPUDeviceManager.getDevice()
// Integration: test GPU -> WASM -> JS fallback chain
// Coverage: >90% unit, all fallback paths, perf targets validated
// Run: npm test tests/gpu or npm test -- --coverage
```

## Telemetry

```typescript
import { ComputeTelemetry } from '$lib/gpu/telemetry.js';
ComputeTelemetry.getSummary()    // .backends.webgpu?.avgTimeMs, .avgSpeedup
ComputeTelemetry.getDashboardData()  // .usage {webgpu:75,wasm:15,js:10}, .p50
ComputeTelemetry.export()        // JSON export
```

## Best Practices

- Singleton GPU device (prevent resource exhaustion)
- Buffer cleanup in try/finally
- Pipeline caching (check `initialized` flag)
- State caching (don't retry failed tiers)
- Resource limits: 1GB max buffer, 256 max workgroups

## Browser Support

| Browser | Version | WebGPU | Notes |
|---------|---------|--------|-------|
| Chrome | 113+ | Yes | Stable since April 2023 |
| Safari | 18+ | Yes | macOS 13+, Metal backend |
| Edge | 113+ | Yes | Same as Chrome |
| Firefox | Nightly | Partial | Behind flag |

## File Locations

```
src/lib/gpu/
  device.ts        # GPUDeviceManager singleton
  fallback.ts      # ComputeOrchestrator (3-tier)
  histogram.ts     # GPUHistogram
  multi-field.ts   # GPUMultiField
  telemetry.ts     # Performance tracking
  types.ts         # TypeScript interfaces
  index.ts         # Public API
static/shaders/    # histogram.wgsl, multi-field.wgsl
rust/aggregations/ # WASM fallback (Rust)
```

## New Compute Operation Checklist

- [ ] WGSL shader in `/static/shaders/`
- [ ] GPU class in `/src/lib/gpu/` with idempotent init
- [ ] Buffer cleanup in try/finally
- [ ] WASM function (optional) + JS fallback
- [ ] ComputeOrchestrator integration
- [ ] Telemetry recording
- [ ] Unit tests + benchmarks

## Quick Reference

- **Init**: `await initGPUDevice()`
- **Compute**: `await computeHistogram(input)`
- **Force backend**: `ComputeOrchestrator.forceBackend('wasm')`
- **Check support**: `isWebGPUSupported()`
- **Metrics**: `ComputeTelemetry.getSummary()`
- **Events**: `gpuDeviceManager.on('ready', ...)`
- **Reset**: `ComputeOrchestrator.reset()`
- **Cleanup**: `histogram.dispose()` / `GPUDeviceManager.destroy()`

## Resources

- [WebGPU Spec](https://www.w3.org/TR/webgpu/)
- [WGSL Spec](https://www.w3.org/TR/WGSL/)
- [Chrome WebGPU](https://developer.chrome.com/docs/web-platform/webgpu)
- [Safari WebGPU](https://webkit.org/blog/14879/)
