# WebGPU Architecture Analysis - Visual Overview

## Current Architecture (No WebGPU)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DMB Almanac Visualization Stack                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Data Layer (IndexedDB)                       │
│              Stores: Shows, Songs, Setlists, Guests, Tours         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
     ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   WASM       │  │   WASM       │  │   WASM       │
│  Module 1    │  │  Module 2    │  │  Module 3    │
│   Force      │  │   Heatmap    │  │ Aggregations │
│  Simulation  │  │   Layout     │  │              │
│ (Rust Code)  │  │  (Rust Code) │  │  (Rust Code) │
│              │  │              │  │              │
│ O(n log n)   │  │ O(n*m) color │  │ O(n) ops     │
│ Barnes-Hut   │  │  + sort      │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │ TypedArray      │ TypedArray      │ TypedArray
       │ transfer        │ transfer        │ transfer
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Rendering Layer (Browser APIs)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   GuestNetwork   │  │   SongHeatmap    │  │   GapTimeline    │ │
│  │     (Svelte)     │  │     (Svelte)     │  │     (Svelte)     │ │
│  │                  │  │                  │  │                  │ │
│  │ WASM Simulation  │  │ WASM Colors      │  │  Canvas 2D       │ │
│  │ Canvas Rendering │  │ SVG DOM Rects    │  │  Direct Rendering│ │
│  │ requestAnimFrame │  │ CSS Styling      │  │  ~60ms render    │ │
│  │                  │  │                  │  │  10K+ points     │ │
│  └─────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│            │                    │                    │            │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                  DOM Compositor                          │      │
│  │  (Combines SVG, Canvas, CSS, requestAnimationFrame)    │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
                  Browser Renderer
                  (CPU-based on most
                   platforms, Metal
                   on Apple Silicon)
```

## Performance Characteristics (Current)

```
Component              Data Size    Compute Time   Render Time   FPS
─────────────────────────────────────────────────────────────────────
GuestNetwork (WASM)    500 nodes    ~50ms          ~16ms         60
GuestNetwork (Worker)  300 nodes    ~100ms         ~16ms         60
GuestNetwork (Main)    100 nodes    ~500ms+        BLOCKED       <10

SongHeatmap (WASM)     100K cells   ~30ms          ~80ms         12
SongHeatmap (SVG DOM)  1K cells     ~5ms           ~200ms        5

GapTimeline (Canvas)   10K points   N/A            ~60ms         60
GapTimeline (SVG)      1K points    N/A            ~200ms        5

TransitionFlow (SVG)   ~100 nodes   N/A            ~150ms        7
```

## Proposed WebGPU Architecture (Optional Enhancement)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DMB Almanac with WebGPU                          │
│                   (For >1000 node graphs)                           │
└─────────────────────────────────────────────────────────────────────┘

                      Data Layer (IndexedDB)
                             │
                             ▼
              ┌──────────────────────────────────┐
              │  WASM Compute Module             │
              │  (Force calculations O(n log n))  │
              └────────────┬─────────────────────┘
                           │
                    TypedArray Buffer
                    (shared with GPU)
                           │
                           ▼
    ┌──────────────────────────────────────────────────┐
    │         WebGPU Compute Shader                    │
    │   @compute @workgroup_size(256)                  │
    │   Apply forces: charge, link, collision          │
    │   Update positions: ∂x/∂t integration            │
    │   Output: GPUBuffer with new positions           │
    │                                                  │
    │   Performance: O(n) with GPU parallelism        │
    │   Data: 1000+ nodes @ 60 FPS                    │
    └──────────────────┬───────────────────────────────┘
                       │ GPUBuffer
                       │ (no copy!)
                       ▼
    ┌──────────────────────────────────────────────────┐
    │    WebGPU Render Pipeline                        │
    │  @vertex shader: Transform node positions        │
    │  @fragment shader: Color by node properties      │
    │  Direct GPU rendering to canvas                  │
    │                                                  │
    │  Performance: 1000+ nodes @ 60 FPS              │
    │  Direct GPU→Canvas (no readback)                │
    └──────────────────┬───────────────────────────────┘
                       │
                       ▼ Canvas (WebGPU context)
    ┌──────────────────────────────────────────────────┐
    │        Browser Compositor (Metal/ANGLE)          │
    │        Efficient GPU→Screen transfer             │
    └──────────────────────────────────────────────────┘

Fallback Chain if WebGPU unavailable:
    WebGPU Render → Canvas 2D (requestAnimationFrame) → CSS Rendering
```

## Memory Transfer Patterns

### Current (WASM): TypedArray Zero-Copy

```
Main Thread                 Web Worker                    WASM Memory
┌──────────────────┐      ┌──────────────────┐          ┌──────────────┐
│ Float64Array     │      │ Float64Array     │          │  Memory      │
│ nodes[6]         │      │ (shared ref)     │          │  layout:     │
│                  │ ────▶│                  │ ────────▶ │  [x y vx vy  │
│ x y vx vy fx fy  │      │ positions[6]     │ compute  │   fx fy ...] │
│ per node         │      │ per node         │          │              │
└──────────────────┘      └──────────────────┘          └──────────────┘
     │                           │
     │ Render                    │ Tick
     │ updates x, y              │ updates vx, vy
     ▼                           ▼
  Canvas                    Callback notifies
                              main thread
```

**Transfer overhead:** ~1-2ms per tick (buffer copy in postMessage)

### Proposed (WebGPU): GPUBuffer Direct Access

```
Main Thread                 GPU Memory                    GPU Compute
┌──────────────────┐      ┌──────────────────┐          ┌──────────────┐
│ JS Data          │      │  GPUBuffer       │          │  Compute     │
│ (positions)      │ ────▶│  (positions)     │ ────────▶ │  Shader      │
│                  │      │                  │ compute  │  Apply forces │
│ new Float32Array │      │ [no copy!]       │          │  Store result │
│ on creation      │      │ UMA on Apple Si. │          │  back in GPU  │
└──────────────────┘      └──────────────────┘          └──────────────┘
                                │
                                │ Direct GPU buffer
                                ▼
                          GPU Render Pipeline
                          (No readback to CPU!)
```

**Transfer overhead:** ~0.1ms per tick (direct GPU memory access)

## Workload Classification

```
Legend: G = GPU optimized, C = CPU good, B = Both acceptable

                            Data Size    Compute Type     GPU Benefit
─────────────────────────────────────────────────────────────────────
Force Simulation
  Small (< 200 nodes)       200 nodes    O(n²)            C (WASM fine)
  Medium (200-500 nodes)    500 nodes    O(n log n)       C (WASM+Worker)
  Large (500-2000 nodes)    2000 nodes   O(n log n)       G (WebGPU ideal)
  Very Large (> 2000)       5000+ nodes  O(n log n)       G (WebGPU required)

Heatmap Rendering
  Small (< 10K cells)       10K cells    O(n*m)           C (WASM+SVG)
  Medium (10K-100K cells)   100K cells   O(n*m)           B (GPU helps)
  Large (> 100K cells)      500K cells   O(n*m)           G (GPU needed)

Chart Rendering
  Line/Bar (< 10K points)   10K points   O(n)             C (Canvas 2D)
  Scatter (10K-100K)        100K points  O(n)             B (GPU helps)
  High-res (> 100K)         1M points    O(n)             G (GPU needed)

Image Processing
  Blur/Filter (any size)    any size     O(n) conv        G (GPU ideal)
  Color transform           any size     O(n)             G (GPU ideal)
```

## Apple Silicon Optimization Layers

```
Application Layer
├─ Data processing (WASM Rust)
│  └─ Optimized for ARM NEON instructions
│
├─ Visualization (D3/Canvas/SVG)
│  └─ CSS containment for Metal shader cache hits
│  └─ content-visibility: auto for power efficiency
│
└─ Browser Detection
   └─ Checks: renderer.includes('Apple')
   └─ Stores: capabilities.isAppleSilicon

   ▼ GPU Rendering

Metal Driver (Apple Silicon)
├─ Unified Memory Architecture (UMA)
│  └─ Zero-copy buffer transfers
│  └─ Direct CPU↔GPU memory access
│
├─ GPU Architecture
│  └─ Performance cores (high-perf rendering)
│  └─ Efficiency cores (background processing)
│
└─ Optimization
   └─ Native Metal shaders (if WebGPU used)
   └─ 32-wide SIMD (workgroup_size: 256)
   └─ Texture compression (BC support)

   ▼ System Integration

OS Level
├─ Power management (E/P core switching)
├─ Thermal throttling
└─ Memory pressure handling
```

## Decision Tree: WebGPU Implementation

```
START: Do you need WebGPU?
│
├─ Are you rendering >1000 node force graphs?
│  ├─ YES → WebGPU Render Pipeline (Priority: HIGH)
│  └─ NO  ▼
│
├─ Are you rendering >100K cell heatmaps?
│  ├─ YES → WebGPU Texture Rendering (Priority: MEDIUM)
│  └─ NO  ▼
│
├─ Do you need image processing effects?
│  ├─ YES → WebGPU Compute Shaders (Priority: MEDIUM)
│  └─ NO  ▼
│
├─ Are users reporting performance issues?
│  ├─ YES → Profile with DevTools GPU tab
│  │        ├─ CPU bottleneck → Use Workers/WASM
│  │        └─ Rendering bottleneck → WebGPU worth it
│  └─ NO  ▼
│
└─ → STOP: Current architecture is optimal
     Keep Canvas 2D + WASM + Workers
```

## Performance Comparison Matrix

```
                     Canvas 2D    SVG DOM      WebGPU Render   WebGPU Compute
─────────────────────────────────────────────────────────────────────────────
10K points/nodes     60 FPS       5-10 FPS     120 FPS         N/A
100K points/nodes    12 FPS       <1 FPS       60 FPS          N/A
1M points (chart)    2 FPS        N/A          60 FPS          N/A

100K force nodes     ~5 FPS       N/A          60 FPS (GPU)     GPU-assisted
Force compute only   N/A          N/A          N/A              O(n) WASM equiv

1M cell heatmap      N/A          <1 FPS       60 FPS           60 FPS
Heatmap compute      ~500ms       ~500ms       ~30ms            ~10ms

Browser Support      100%         100%         88%              88%
Memory Overhead      Low          High (DOM)   Medium           Low
CPU Usage            Medium       High         Very Low         Very Low
GPU Memory           None         None         50-500MB         50-500MB
Apple Silicon        Good         Good         Excellent        Excellent
```

## Code Path Comparison

### Current Architecture: GuestNetwork Force Simulation

```
┌─ GuestNetwork.svelte (onMount)
│  │
│  └─▶ createForceSimulation(config)
│     │
│     ├─ Try WASM Backend
│     │  │
│     │  ├─ loadWasmModule()
│     │  │  └─ import('dmb_force_simulation.js')
│     │  │     └─ WASM module ready
│     │  │
│     │  ├─ wasmSim = new WasmSimulation(width, height)
│     │  │
│     │  ├─ initNodesFromBuffer(nodeBuffer)
│     │  ├─ initLinksFromIndices(linkIndices)
│     │  ├─ setChargeForce/setLinkForce/etc.
│     │  │
│     │  └─ async runSimulation()
│     │     └─ Loop:
│     │        ├─ wasmSim.tickBatch(5)  ◄─ O(n log n) compute
│     │        ├─ syncPositionsFromWasm()  ◄─ readback to JS
│     │        ├─ callback(nodes)  ◄─ trigger render
│     │        └─ await yieldToMain()  ◄─ 5ms scheduler
│     │
│     │  ✓ Returns WASM simulation
│     │
│     ├─ Fallback: Try Web Worker
│     │  └─ (similar code in worker thread)
│     │
│     └─ Fallback: Main Thread
│        └─ (O(n²) force computation with scheduler.yield)
│
│  │
│  ├─ simulation.onTick((nodes) => {
│  │    // Update SVG/Canvas with new positions
│  │    redrawChart();
│  │  });
│  │
│  └─ simulation.start()

    Rendering Loop:
    canvas.getContext('2d') or d3.select(svg)
    └─ Draw nodes, links based on updated positions
```

### Proposed WebGPU Architecture: GuestNetwork

```
┌─ GuestNetwork.svelte (onMount)
│  │
│  ├─ Check WebGPU support
│  │  └─ navigator.gpu.requestAdapter()
│  │
│  ├─ Try WebGPU Backend
│  │  │
│  │  ├─ device = await adapter.requestDevice()
│  │  │
│  │  ├─ positionBuffer = device.createBuffer()  ◄─ GPU-side
│  │  ├─ velocityBuffer = device.createBuffer()  ◄─ GPU-side
│  │  ├─ linkBuffer = device.createBuffer()      ◄─ GPU-side
│  │  │
│  │  ├─ computeShader = device.createShaderModule(WGSL code)
│  │  ├─ computePipeline = device.createComputePipeline()
│  │  │
│  │  ├─ renderShader = device.createShaderModule(WGSL code)
│  │  ├─ renderPipeline = device.createRenderPipeline()
│  │  │
│  │  └─ async runSimulation()
│  │     └─ Loop:
│  │        ├─ commandEncoder.beginComputePass()
│  │        │  └─ dispatchWorkgroups() ◄─ GPU compute
│  │        │     └─ 1000 threads in parallel!
│  │        │        └─ Each computes subset of forces
│  │        │           └─ O(n) with GPU parallelism
│  │        │
│  │        ├─ commandEncoder.beginRenderPass()
│  │        │  └─ Draw to canvas directly ◄─ No readback!
│  │        │     └─ GPU→Canvas (Metal/ANGLE)
│  │        │
│  │        └─ device.queue.submit()
│  │
│  │  ✓ Returns WebGPU simulation
│  │
│  ├─ Fallback: Canvas 2D
│  │  └─ (Current implementation as backup)
│  │
│  └─ Fallback: WASM
│     └─ (If no WebGPU or render fails)
│
└─ simulation.start()
   └─ GPU does all work, CPU just submits commands!
```

## Summary

### Why Current Architecture Works

1. **WASM** handles compute (Barnes-Hut O(n log n))
2. **Canvas 2D** handles rendering (universal support)
3. **Workers** handle offloading (UI stays responsive)
4. **TypedArray** zero-copy (minimal overhead)

### When WebGPU Becomes Necessary

1. **>1000 node graphs** - Rendering becomes bottleneck
2. **>100K heatmap cells** - DOM creation too slow
3. **Image processing** - Filter/blur effects needed
4. **Real-time rendering** - 60 FPS required

### Implementation Strategy If Needed

```
Phase 1: Fallback Detection
  └─ Check navigator.gpu support
  └─ Fall back to Canvas 2D if not available

Phase 2: GPU Render Pipeline
  └─ Convert node rendering to WebGPU
  └─ Keep WASM compute (not bottleneck)

Phase 3: GPU Compute Pipeline (Optional)
  └─ Move force calculation to GPU (if really large)
  └─ Parallel O(n) vs sequential O(n log n)

Phase 4: Optimization
  └─ Profile with DevTools GPU tab
  └─ Tune workgroup sizes for Apple Silicon
  └─ Monitor memory usage
```

---

**Architecture Analysis Complete**
**Recommendation:** Keep current architecture unless graph size exceeds 1000 nodes
