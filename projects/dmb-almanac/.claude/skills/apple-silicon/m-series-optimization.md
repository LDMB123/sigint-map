# Skill: M-Series Optimization

**ID**: `m-series-optimization`
**Category**: Apple Silicon
**Agent**: Apple Silicon Optimizer

---

## When to Use
- Optimizing for Apple Silicon Macs
- Leveraging unified memory architecture
- Using Metal GPU acceleration
- Improving energy efficiency

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| target | string | yes | Code or app to optimize |
| chip_family | string | no | M1, M2, M3, M4 |

## Key Optimizations

### 1. Unified Memory Architecture (UMA)
```typescript
// Avoid: Copying data between CPU and GPU
const cpuBuffer = new ArrayBuffer(size);
const gpuBuffer = device.createBuffer({ mappedAtCreation: true });
// This copies data

// Better: Use shared memory when possible
const sharedBuffer = device.createBuffer({
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  mappedAtCreation: true,
});
// Direct access without copy on Apple Silicon
```

### 2. Metal GPU Acceleration (via WebGPU)
```typescript
// Leverage WebGPU for compute-intensive tasks
const adapter = await navigator.gpu.requestAdapter({
  powerPreference: 'high-performance', // Use performance cores
});

const device = await adapter.requestDevice({
  requiredLimits: {
    maxComputeWorkgroupSizeX: 1024,
    maxComputeWorkgroupSizeY: 1024,
  },
});
```

### 3. Energy Efficiency
```typescript
// Use efficiency cores for background tasks
if ('scheduler' in window) {
  scheduler.postTask(() => {
    // Background work
  }, { priority: 'background' });
}

// Batch operations to avoid waking high-performance cores
const batchSize = 100;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await processBatch(batch);
  // Small delay to allow power management
  await new Promise(r => setTimeout(r, 10));
}
```

### 4. Memory Bandwidth Optimization
```typescript
// Structure data for cache efficiency
// Bad: Array of Structures (AoS)
const particles = [
  { x: 0, y: 0, vx: 1, vy: 1 },
  { x: 1, y: 1, vx: 2, vy: 2 },
];

// Good: Structure of Arrays (SoA)
const particles = {
  x: new Float32Array([0, 1]),
  y: new Float32Array([0, 1]),
  vx: new Float32Array([1, 2]),
  vy: new Float32Array([1, 2]),
};
```

## Profiling Tools
```bash
# Instruments (Xcode)
xcrun xctrace record --template 'Time Profiler' --launch -- ./app

# powermetrics for energy
sudo powermetrics --samplers cpu_power -i 1000
```
