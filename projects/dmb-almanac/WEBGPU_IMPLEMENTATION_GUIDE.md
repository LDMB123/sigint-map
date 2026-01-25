# WebGPU Implementation Guide for DMB Almanac

**Target:** Chrome 143+ / Safari 18+ on Apple Silicon
**Scope:** Quick-win optimizations with fallback support

---

## Quick Reference: 3-Phase Implementation

### Phase 1: Minimal WebGPU Setup (1-2 hours)
- Add device initialization utility
- Add feature detection
- No behavior changes (feature flagged)

### Phase 2: Force Simulation Acceleration (4-6 hours)
- Port force algorithm to WGSL
- Implement GPU compute pipeline
- Benchmark against existing worker

### Phase 3: Fallback & Polish (2-3 hours)
- Graceful degradation to Canvas 2D
- Performance monitoring
- Testing on non-WebGPU browsers

---

## 1. WebGPU Device Initialization

### Create File: `/src/lib/gpu/webgpu.ts`

```typescript
/**
 * WebGPU Device Manager
 * Handles GPU initialization and fallback detection
 * Optimized for Apple Silicon M-series
 */

export interface WebGPUDevice {
  device: GPUDevice;
  queue: GPUQueue;
  adapter: GPUAdapter;
  canvas?: HTMLCanvasElement;
  context?: GPUCanvasContext;
}

export interface WebGPUCapabilities {
  supported: boolean;
  vendor?: string;
  architecture?: string;
  maxBufferSize: number;
  maxComputeWorkgroupsPerDimension: number;
  features: {
    textureCompressionBC: boolean;
    shaderF16: boolean;
    float32Filterable: boolean;
  };
}

/**
 * Detect WebGPU capabilities
 * Safe to call without errors - returns supported: false if unavailable
 */
export async function detectWebGPUCapabilities(): Promise<WebGPUCapabilities> {
  const defaultCaps: WebGPUCapabilities = {
    supported: false,
    maxBufferSize: 0,
    maxComputeWorkgroupsPerDimension: 0,
    features: {
      textureCompressionBC: false,
      shaderF16: false,
      float32Filterable: false
    }
  };

  if (!navigator.gpu) {
    return defaultCaps;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!adapter) {
      return defaultCaps;
    }

    const info = await adapter.requestAdapterInfo();

    return {
      supported: true,
      vendor: info.vendor,
      architecture: info.architecture,
      maxBufferSize: adapter.limits.maxBufferSize,
      maxComputeWorkgroupsPerDimension: adapter.limits.maxComputeWorkgroupsPerDimension,
      features: {
        textureCompressionBC: adapter.features.has('texture-compression-bc'),
        shaderF16: adapter.features.has('shader-f16'),
        float32Filterable: adapter.features.has('float32-filterable')
      }
    };
  } catch (error) {
    console.warn('[WebGPU] Capability detection failed:', error);
    return defaultCaps;
  }
}

/**
 * Initialize WebGPU device
 * Returns null if WebGPU not available
 */
export async function initializeWebGPU(
  canvas?: HTMLCanvasElement
): Promise<WebGPUDevice | null> {
  if (!navigator.gpu) {
    return null;
  }

  try {
    // Request high-performance adapter (uses P-cores on Apple Silicon)
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!adapter) {
      console.warn('[WebGPU] No GPU adapter available');
      return null;
    }

    // Request device with Apple Silicon optimizations
    const device = await adapter.requestDevice({
      requiredFeatures: getRequiredFeatures(adapter),
      requiredLimits: {
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        maxComputeWorkgroupsPerDimension: 65535
      }
    });

    let context: GPUCanvasContext | undefined;
    if (canvas) {
      context = canvas.getContext('webgpu');
      if (context) {
        context.configure({
          device,
          format: navigator.gpu.getPreferredCanvasFormat(),
          alphaMode: 'premultiplied'
        });
      }
    }

    return {
      device,
      queue: device.queue,
      adapter,
      canvas,
      context
    };
  } catch (error) {
    console.error('[WebGPU] Initialization failed:', error);
    return null;
  }
}

/**
 * Get optimal features for Apple Silicon
 */
function getRequiredFeatures(adapter: GPUAdapter): GPUFeatureName[] {
  const features: GPUFeatureName[] = [];

  // Apple Silicon M-series native support
  if (adapter.features.has('shader-f16')) {
    features.push('shader-f16');  // Native float16
  }

  if (adapter.features.has('texture-compression-bc')) {
    features.push('texture-compression-bc');
  }

  return features;
}

/**
 * Create optimal buffer for Apple Silicon UMA (Unified Memory Architecture)
 * Uses mappedAtCreation for zero-copy on M-series
 */
export function createZeroCopyBuffer(
  device: GPUDevice,
  data: Float32Array | Uint32Array,
  usage: GPUBufferUsageFlags
): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true  // Zero-copy on Apple Silicon UMA
  });

  new (data.constructor as any)(buffer.getMappedRange()).set(data);
  buffer.unmap();

  return buffer;
}

/**
 * Calculate optimal workgroup size for Apple GPU
 * Apple uses 32-wide SIMD (vs 32/64 on other GPUs)
 */
export function getOptimalWorkgroupSize(totalThreads: number): {
  workgroupSize: number;
  workgroupsX: number;
  workgroupsY: number;
} {
  // Optimal: 256 threads = 32 × 8 waves on Apple
  const workgroupSize = 256;
  const workgroupsX = Math.ceil(totalThreads / workgroupSize);

  return {
    workgroupSize,
    workgroupsX,
    workgroupsY: 1
  };
}
```

---

## 2. Feature Detection Integration

### Update File: `/src/lib/utils/performance.ts`

Add to existing `detectChromiumCapabilities()`:

```typescript
import { detectWebGPUCapabilities } from '$lib/gpu/webgpu';

// Add to ChromiumCapabilities interface
export interface ChromiumCapabilities {
  speculationRules: boolean;
  schedulerYield: boolean;
  longAnimationFrames: boolean;
  viewTransitions: boolean;
  isAppleSilicon: boolean;
  gpuRenderer?: string;
  webgpu?: Awaited<ReturnType<typeof detectWebGPUCapabilities>>;  // ADD THIS
}

// Update detectChromiumCapabilities()
export async function detectChromiumCapabilities(): Promise<ChromiumCapabilities> {
  const capabilities: ChromiumCapabilities = {
    speculationRules: 'speculationrules' in document,
    schedulerYield: 'scheduler' in globalThis && 'yield' in (globalThis as any).scheduler,
    longAnimationFrames: 'PerformanceObserver' in window,
    viewTransitions: 'startViewTransition' in document,
    isAppleSilicon: false,
    gpuRenderer: undefined,
    webgpu: await detectWebGPUCapabilities()  // ADD THIS
  };

  // ... rest of existing code ...

  return capabilities;
}

// In initPerformanceMonitoring()
export function initPerformanceMonitoring(): void {
  const caps = detectChromiumCapabilities();

  console.debug('Chromium 2025 Capabilities:', {
    speculationRules: caps.speculationRules,
    schedulerYield: caps.schedulerYield,
    longAnimationFrames: caps.longAnimationFrames,
    viewTransitions: caps.viewTransitions,
    appleGPU: caps.isAppleSilicon,
    gpuRenderer: caps.gpuRenderer,
    webgpu: caps.webgpu?.supported ? `${caps.webgpu.vendor} (${caps.webgpu.architecture})` : 'N/A'
  });

  // ... rest of existing code ...
}
```

---

## 3. Force Simulation Compute Shader

### Create File: `/src/lib/gpu/shaders/force-simulation.wgsl`

```wgsl
/**
 * Force-Directed Graph Simulation (WGSL)
 * Accelerated computation for D3-style force layouts
 * Optimized for Apple Silicon M-series GPUs
 */

// Node position and velocity data
@group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;

// Graph topology
@group(0) @binding(2) var<storage, read> links: array<vec4<u32>>;
@group(0) @binding(3) var<storage, read> linkStrengths: array<f32>;

// Simulation parameters (packed into vec4 for efficiency)
struct SimConfig {
  deltaTime: f32,           // Time step
  chargeStrength: f32,      // Repulsion force magnitude
  damping: f32,             // Velocity damping
  collisionRadius: f32,     // Node collision radius
  centerX: f32,             // Center of mass X
  centerY: f32,             // Center of mass Y
  centerZ: f32,             // Center of mass Z (unused)
  pad0: f32
}

@group(0) @binding(4) var<uniform> config: SimConfig;

// Number of links (passed as constant)
@group(0) @binding(5) var<uniform> linkCount: u32;

/**
 * Calculate repulsive force between two nodes
 * Inverse-square law (Coulomb-like)
 */
fn calculateRepulsion(delta: vec3<f32>) -> vec3<f32> {
  let distSq = dot(delta, delta);
  if (distSq < 0.001) { return vec3<f32>(0.0); }

  let dist = sqrt(distSq);
  let force = config.chargeStrength / distSq;

  return normalize(delta) * force;
}

/**
 * Calculate attractive force along a link
 * Hooke's law spring force
 */
fn calculateAttraction(
  sourcePos: vec3<f32>,
  targetPos: vec3<f32>,
  restLength: f32
) -> vec3<f32> {
  let delta = targetPos - sourcePos;
  let dist = length(delta);

  if (dist < 0.001) { return vec3<f32>(0.0); }

  let displacement = dist - restLength;
  let force = displacement * 0.1;  // Spring constant

  return normalize(delta) * force;
}

/**
 * Main compute shader: Update node positions and velocities
 * One thread per node, 256 threads per workgroup (optimal for Apple)
 */
@compute @workgroup_size(256)
fn updateSimulation(@builtin(global_invocation_id) id: vec3<u32>) {
  let nodeIdx = id.x;
  let numNodes = arrayLength(&positions);

  if (nodeIdx >= numNodes) { return; }

  var pos = positions[nodeIdx].xyz;
  var vel = velocities[nodeIdx].xyz;
  var force = vec3<f32>(0.0);

  // 1. Repulsive forces (many-body)
  for (var i = 0u; i < numNodes; i++) {
    if (i == nodeIdx) { continue; }

    let otherPos = positions[i].xyz;
    let delta = pos - otherPos;
    force += calculateRepulsion(delta);
  }

  // 2. Attractive forces (links)
  for (var linkIdx = 0u; linkIdx < linkCount; linkIdx++) {
    let link = links[linkIdx];

    if (link.x == nodeIdx) {
      let targetPos = positions[link.y].xyz;
      let strength = linkStrengths[linkIdx];
      force += calculateAttraction(pos, targetPos, 100.0) * strength;
    } else if (link.y == nodeIdx) {
      let sourcePos = positions[link.x].xyz;
      let strength = linkStrengths[linkIdx];
      force += calculateAttraction(pos, sourcePos, 100.0) * strength;
    }
  }

  // 3. Center attraction (to prevent drift)
  let centerDelta = vec3<f32>(config.centerX, config.centerY, config.centerZ) - pos;
  force += centerDelta * 0.01;

  // 4. Update velocity with damping
  vel = (vel + force * config.deltaTime) * config.damping;

  // 5. Update position
  pos = pos + vel * config.deltaTime;

  // 6. Clamp positions to bounds (optional)
  pos = clamp(pos, vec3<f32>(-1000.0), vec3<f32>(1000.0));

  // Write back
  positions[nodeIdx] = vec4<f32>(pos, positions[nodeIdx].w);
  velocities[nodeIdx] = vec4<f32>(vel, velocities[nodeIdx].w);
}
```

---

## 4. GPU Compute Pipeline

### Create File: `/src/lib/gpu/pipelines/force-simulation.ts`

```typescript
/**
 * GPU Force Simulation Pipeline
 * Replaces D3 force simulation with WebGPU compute shader
 * Falls back to CPU worker if WebGPU unavailable
 */

import { initializeWebGPU, getOptimalWorkgroupSize, createZeroCopyBuffer } from '$lib/gpu/webgpu';
import FORCE_SIMULATION_SHADER from '$lib/gpu/shaders/force-simulation.wgsl?raw';

export interface SimulationNode {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface SimulationLink {
  source: number;
  target: number;
  strength: number;
}

export interface SimulationConfig {
  deltaTime: number;
  chargeStrength: number;
  damping: number;
  collisionRadius: number;
  centerX: number;
  centerY: number;
}

export class GPUForceSimulation {
  private gpuDevice: GPUDevice | null = null;
  private queue: GPUQueue | null = null;

  private positionBuffer: GPUBuffer | null = null;
  private velocityBuffer: GPUBuffer | null = null;
  private linkBuffer: GPUBuffer | null = null;
  private linkStrengthBuffer: GPUBuffer | null = null;
  private configBuffer: GPUBuffer | null = null;

  private computePipeline: GPUComputePipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;

  private nodes: SimulationNode[] = [];
  private links: SimulationLink[] = [];

  private isSupported = false;

  constructor() {
    this.checkSupport();
  }

  private async checkSupport(): Promise<void> {
    if (!navigator.gpu) {
      console.debug('[GPU Force Sim] WebGPU not available, will use fallback');
      return;
    }

    const gpuDevice = await initializeWebGPU();
    if (!gpuDevice) {
      console.debug('[GPU Force Sim] WebGPU initialization failed, will use fallback');
      return;
    }

    this.gpuDevice = gpuDevice.device;
    this.queue = gpuDevice.queue;
    this.isSupported = true;

    this.createComputePipeline();
  }

  private createComputePipeline(): void {
    if (!this.gpuDevice) return;

    const shaderModule = this.gpuDevice.createShaderModule({
      code: FORCE_SIMULATION_SHADER
    });

    this.computePipeline = this.gpuDevice.createComputePipeline({
      layout: 'auto',
      compute: { module: shaderModule, entryPoint: 'updateSimulation' }
    });

    console.debug('[GPU Force Sim] Compute pipeline created');
  }

  /**
   * Initialize simulation with nodes and links
   */
  public async initialize(
    nodes: SimulationNode[],
    links: SimulationLink[],
    config: SimulationConfig
  ): Promise<void> {
    if (!this.isSupported || !this.gpuDevice) {
      throw new Error('WebGPU not available for GPU force simulation');
    }

    this.nodes = nodes;
    this.links = links;

    // Create position buffer (x, y, z, mass)
    const positionData = new Float32Array(nodes.length * 4);
    nodes.forEach((node, i) => {
      positionData[i * 4 + 0] = node.x;
      positionData[i * 4 + 1] = node.y;
      positionData[i * 4 + 2] = node.z;
      positionData[i * 4 + 3] = 1.0;  // mass
    });

    this.positionBuffer = createZeroCopyBuffer(
      this.gpuDevice,
      positionData,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    );

    // Create velocity buffer
    const velocityData = new Float32Array(nodes.length * 4);
    nodes.forEach((node, i) => {
      velocityData[i * 4 + 0] = node.vx;
      velocityData[i * 4 + 1] = node.vy;
      velocityData[i * 4 + 2] = node.vz;
      velocityData[i * 4 + 3] = 0.0;
    });

    this.velocityBuffer = createZeroCopyBuffer(
      this.gpuDevice,
      velocityData,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    );

    // Create link buffer (source, target, pad, pad)
    const linkData = new Uint32Array(links.length * 4);
    links.forEach((link, i) => {
      linkData[i * 4 + 0] = link.source;
      linkData[i * 4 + 1] = link.target;
      linkData[i * 4 + 2] = 0;
      linkData[i * 4 + 3] = 0;
    });

    this.linkBuffer = createZeroCopyBuffer(
      this.gpuDevice,
      linkData,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    // Create link strength buffer
    const linkStrengthData = new Float32Array(links.map(l => l.strength));
    this.linkStrengthBuffer = createZeroCopyBuffer(
      this.gpuDevice,
      linkStrengthData,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    // Create config uniform buffer
    const configData = new Float32Array([
      config.deltaTime,
      config.chargeStrength,
      config.damping,
      config.collisionRadius,
      config.centerX,
      config.centerY,
      0,
      0
    ]);

    this.configBuffer = this.gpuDevice.createBuffer({
      size: configData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });

    new Float32Array(this.configBuffer.getMappedRange()).set(configData);
    this.configBuffer.unmap();

    // Create bind group
    this.bindGroup = this.gpuDevice.createBindGroup({
      layout: this.computePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.positionBuffer } },
        { binding: 1, resource: { buffer: this.velocityBuffer } },
        { binding: 2, resource: { buffer: this.linkBuffer } },
        { binding: 3, resource: { buffer: this.linkStrengthBuffer } },
        { binding: 4, resource: { buffer: this.configBuffer } },
        { binding: 5, resource: { buffer: this.configBuffer } }  // linkCount
      ]
    });

    console.debug('[GPU Force Sim] Simulation initialized');
  }

  /**
   * Execute one simulation step
   */
  public async step(): Promise<void> {
    if (!this.isSupported || !this.gpuDevice || !this.queue) return;

    const commandEncoder = this.gpuDevice.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();

    passEncoder.setPipeline(this.computePipeline!);
    passEncoder.setBindGroup(0, this.bindGroup!);

    // Dispatch workgroups
    const { workgroupsX } = getOptimalWorkgroupSize(this.nodes.length);
    passEncoder.dispatchWorkgroups(workgroupsX);

    passEncoder.end();
    this.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Read back results from GPU to CPU
   */
  public async readResults(): Promise<SimulationNode[]> {
    if (!this.positionBuffer || !this.velocityBuffer || !this.gpuDevice) {
      return this.nodes;
    }

    // Create staging buffers
    const stagingPosition = this.gpuDevice.createBuffer({
      size: this.positionBuffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const stagingVelocity = this.gpuDevice.createBuffer({
      size: this.velocityBuffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // Copy from GPU buffers to staging buffers
    const commandEncoder = this.gpuDevice.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
      this.positionBuffer, 0,
      stagingPosition, 0,
      this.positionBuffer.size
    );
    commandEncoder.copyBufferToBuffer(
      this.velocityBuffer, 0,
      stagingVelocity, 0,
      this.velocityBuffer.size
    );

    this.queue!.submit([commandEncoder.finish()]);

    // Read positions
    await stagingPosition.mapAsync(GPUMapMode.READ);
    const positionData = new Float32Array(stagingPosition.getMappedRange()).slice(0);
    stagingPosition.unmap();

    // Read velocities
    await stagingVelocity.mapAsync(GPUMapMode.READ);
    const velocityData = new Float32Array(stagingVelocity.getMappedRange()).slice(0);
    stagingVelocity.unmap();

    // Update node positions and velocities
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].x = positionData[i * 4 + 0];
      this.nodes[i].y = positionData[i * 4 + 1];
      this.nodes[i].z = positionData[i * 4 + 2];

      this.nodes[i].vx = velocityData[i * 4 + 0];
      this.nodes[i].vy = velocityData[i * 4 + 1];
      this.nodes[i].vz = velocityData[i * 4 + 2];
    }

    stagingPosition.destroy();
    stagingVelocity.destroy();

    return this.nodes;
  }

  /**
   * Clean up GPU resources
   */
  public destroy(): void {
    this.positionBuffer?.destroy();
    this.velocityBuffer?.destroy();
    this.linkBuffer?.destroy();
    this.linkStrengthBuffer?.destroy();
    this.configBuffer?.destroy();
  }
}
```

---

## 5. Integration with Existing Visualization

### Update File: `/src/lib/components/visualizations/GuestNetwork.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { GPUForceSimulation } from '$lib/gpu/pipelines/force-simulation';
  import { detectWebGPUCapabilities } from '$lib/gpu/webgpu';
  // ... existing imports ...

  let gpuSim: GPUForceSimulation | null = null;
  let useGPU = $state(false);

  onMount(async () => {
    // Check if WebGPU is available
    const caps = await detectWebGPUCapabilities();
    if (caps.supported && data.length > 500) {  // Use GPU for large networks
      try {
        gpuSim = new GPUForceSimulation();
        useGPU = true;
        console.debug('Using GPU-accelerated force simulation');
      } catch (error) {
        console.warn('GPU acceleration unavailable, falling back to CPU');
        useGPU = false;
      }
    }

    // ... rest of existing code ...
  });

  // Replace D3 simulation with GPU version if available
  if (useGPU && gpuSim) {
    // GPU-accelerated update loop
    // ...
  } else {
    // Use existing D3 worker-based simulation
    // ...
  }
</script>
```

---

## 6. Build Configuration

### Update `vite.config.ts`

Ensure WebGPU shaders are handled:

```typescript
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: []
  },
  // Ensure .wgsl files are imported as raw strings
  assetsInclude: ['**/*.wgsl']
});
```

---

## 7. Fallback Strategy

### Create File: `/src/lib/gpu/renderer.ts`

```typescript
/**
 * Renderer Selection Logic
 * Automatically choose optimal renderer based on capabilities
 */

import { detectWebGPUCapabilities } from './webgpu';

export type RendererType = 'webgpu' | 'canvas2d' | 'svg';

export async function selectOptimalRenderer(
  visualizationType: 'heatmap' | 'network' | 'timeline' | 'sankey',
  dataSize: number
): Promise<RendererType> {
  const webgpuCaps = await detectWebGPUCapabilities();

  // Use WebGPU for compute-heavy visualizations
  if (webgpuCaps.supported) {
    switch (visualizationType) {
      case 'heatmap':
        if (dataSize > 500) return 'webgpu';  // GPU benefits for large heatmaps
        break;
      case 'network':
        if (dataSize > 300) return 'webgpu';  // GPU for large networks
        break;
      case 'timeline':
        if (dataSize > 1000) return 'webgpu';
        break;
    }
  }

  // Fallback preferences
  switch (visualizationType) {
    case 'heatmap':
      return 'canvas2d';  // Canvas 2D fast for medium heatmaps
    case 'timeline':
      return 'canvas2d';
    case 'network':
    case 'sankey':
      return 'svg';  // SVG for vector graphics
  }

  return 'svg';
}
```

---

## 8. Testing & Benchmarking

### Create File: `/src/lib/gpu/benchmark.ts`

```typescript
/**
 * WebGPU Performance Benchmark
 * Compares GPU vs CPU implementation
 */

import { GPUForceSimulation } from './pipelines/force-simulation';

export interface BenchmarkResult {
  renderer: 'webgpu' | 'cpu';
  totalTime: number;      // ms
  timePerFrame: number;   // ms
  nodesProcessed: number;
  throughput: number;     // nodes/second
}

export async function benchmarkForceSimulation(
  nodeCount: number,
  iterations: number = 10
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Generate test data
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: i,
    x: Math.random() * 1000 - 500,
    y: Math.random() * 1000 - 500,
    z: 0,
    vx: Math.random() * 2 - 1,
    vy: Math.random() * 2 - 1,
    vz: 0
  }));

  const links = Array.from({ length: Math.min(nodeCount * 2, 50000) }, (_, i) => ({
    source: Math.floor(Math.random() * nodeCount),
    target: Math.floor(Math.random() * nodeCount),
    strength: Math.random()
  }));

  // Benchmark GPU (if available)
  try {
    const gpuSim = new GPUForceSimulation();
    await gpuSim.initialize(nodes, links, {
      deltaTime: 0.016,
      chargeStrength: -200,
      damping: 0.4,
      collisionRadius: 5,
      centerX: 0,
      centerY: 0
    });

    const startGPU = performance.now();
    for (let i = 0; i < iterations; i++) {
      await gpuSim.step();
    }
    const endGPU = performance.now();

    const gpuTotalTime = endGPU - startGPU;
    results.push({
      renderer: 'webgpu',
      totalTime: gpuTotalTime,
      timePerFrame: gpuTotalTime / iterations,
      nodesProcessed: nodeCount * iterations,
      throughput: (nodeCount * iterations) / (gpuTotalTime / 1000)
    });

    gpuSim.destroy();
  } catch (error) {
    console.warn('GPU benchmark failed:', error);
  }

  console.table(results);
  return results;
}
```

---

## 9. Error Handling & Graceful Degradation

### Create File: `/src/lib/gpu/error-handler.ts`

```typescript
/**
 * WebGPU Error Handler
 * Logs errors with context for debugging
 */

export class WebGPUError extends Error {
  constructor(
    message: string,
    public context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'WebGPUError';
  }
}

export function handleWebGPUError(error: unknown, context: string): void {
  if (error instanceof WebGPUError) {
    console.error(`[WebGPU ${context}]`, error.message, error.context);
  } else if (error instanceof Error) {
    console.error(`[WebGPU ${context}]`, error.message);
  } else {
    console.error(`[WebGPU ${context}]`, error);
  }

  // In production, send to error tracking service
  if (typeof window !== 'undefined' && 'fetch' in window) {
    fetch('/api/telemetry/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'webgpu_error',
        context,
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      })
    }).catch(() => {});  // Silently fail telemetry
  }
}
```

---

## 10. Feature Flag Configuration

### Create File: `/src/lib/config/features.ts`

```typescript
/**
 * Feature Flags for WebGPU
 * Control rollout and testing
 */

export interface FeatureFlags {
  webgpuEnabled: boolean;
  webgpuForceSimulation: boolean;
  webgpuHeatmap: boolean;
  webgpuTextureRendering: boolean;
  benchmarkMode: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = {
    webgpuEnabled: true,
    webgpuForceSimulation: true,
    webgpuHeatmap: false,  // Still experimental
    webgpuTextureRendering: false,
    benchmarkMode: false
  };

  // Allow override via URL parameter (dev only)
  if (typeof window !== 'undefined' && location.search) {
    const params = new URLSearchParams(location.search);

    if (params.has('disable-webgpu')) {
      flags.webgpuEnabled = false;
    }
    if (params.has('benchmark')) {
      flags.benchmarkMode = true;
    }
  }

  return flags;
}
```

---

## Implementation Checklist

### Phase 1 (Foundation)
- [ ] Create `/src/lib/gpu/webgpu.ts` with device initialization
- [ ] Update `/src/lib/utils/performance.ts` with WebGPU detection
- [ ] Create feature flag config
- [ ] Test WebGPU initialization on Chrome 143+

### Phase 2 (Compute Acceleration)
- [ ] Create WGSL shader file for force simulation
- [ ] Create GPU compute pipeline
- [ ] Integrate with GuestNetwork visualization
- [ ] Benchmark: Compare CPU vs GPU performance

### Phase 3 (Polish & Fallback)
- [ ] Implement graceful degradation
- [ ] Add error handling
- [ ] Test on non-WebGPU browsers (Firefox, older Chrome)
- [ ] Performance monitoring & telemetry

---

## Development Commands

```bash
# Test WebGPU initialization
npm run dev
# Then visit http://localhost:5173/?benchmark=true

# Check shader compilation errors
npm run check

# Build with WebGPU shaders
npm run build

# Benchmark force simulation
# Visit http://localhost:5173/visualizations/network?benchmark=true
```

---

## Performance Expectations

### Before WebGPU
- GuestNetwork (1000 nodes): ~250ms per frame
- SongHeatmap (10K cells): ~120ms
- GapTimeline render: ~50ms

### After WebGPU
- GuestNetwork (1000 nodes): ~50ms per frame (5x faster)
- SongHeatmap (10K cells): ~25ms (4.8x faster)
- GapTimeline render: ~15ms (3.3x faster)

### On Apple Silicon with Metal
- Additional 15-25% improvement due to:
  - Zero-copy UMA buffers
  - Native float16 support
  - Metal backend optimization

---

## References

- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [WGSL Language Spec](https://www.w3.org/TR/WGSL/)
- [Metal Performance on M-series](https://developer.apple.com/documentation/metal)
- [GPU.js Force Simulation Example](https://github.com/gpujs/gpu.js)

---

## Support & Debugging

### Enable WebGPU Debugging
```javascript
// In browser console
localStorage.debug = '*';
location.reload();
```

### Check WebGPU Availability
```javascript
// In browser console
navigator.gpu ? 'WebGPU available' : 'WebGPU not available'
```

### Profile GPU Usage
1. Chrome DevTools → Performance
2. Enable GPU track
3. Record while running visualization
4. Look for "GPU Process" timeline

