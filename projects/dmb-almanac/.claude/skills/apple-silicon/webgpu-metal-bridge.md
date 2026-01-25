# Skill: WebGPU Metal Bridge

**ID**: `webgpu-metal-bridge`
**Category**: Apple Silicon
**Agent**: WebGPU Metal Bridge

---

## When to Use
- GPU-accelerated web applications
- Machine learning in the browser
- Graphics-intensive applications
- Compute workloads

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| use_case | string | yes | compute, graphics, ml |
| target_chip | string | no | M1, M2, M3 capabilities |

## WebGPU Setup for Apple Silicon

### 1. Check Support and Create Device
```typescript
async function initWebGPU(): Promise<GPUDevice> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });

  if (!adapter) {
    throw new Error('No GPU adapter found');
  }

  // Check Apple Silicon features
  const features = adapter.features;
  console.log('Available features:', [...features]);

  return adapter.requestDevice({
    requiredFeatures: [
      // Apple Silicon supports these
      'texture-compression-bc',
    ],
  });
}
```

### 2. Compute Shader for ML
```wgsl
// Compute shader optimized for Apple Silicon
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256) // Optimal for Apple GPUs
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= arrayLength(&input)) {
        return;
    }

    // Matrix multiplication kernel
    output[idx] = input[idx] * 2.0; // Replace with actual computation
}
```

### 3. Efficient Buffer Management
```typescript
// Use mapped buffers for CPU-GPU data sharing
const stagingBuffer = device.createBuffer({
  size: dataSize,
  usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
  mappedAtCreation: true,
});

// Write data directly (no copy on Apple Silicon UMA)
new Float32Array(stagingBuffer.getMappedRange()).set(inputData);
stagingBuffer.unmap();

// Copy to GPU buffer
const gpuBuffer = device.createBuffer({
  size: dataSize,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const commandEncoder = device.createCommandEncoder();
commandEncoder.copyBufferToBuffer(stagingBuffer, 0, gpuBuffer, 0, dataSize);
```

### 4. Workgroup Size Optimization
```typescript
// Apple Silicon optimal workgroup sizes
const WORKGROUP_SIZES = {
  M1: { compute: 256, graphics: 32 },
  M2: { compute: 256, graphics: 32 },
  M3: { compute: 512, graphics: 64 },
  M4: { compute: 1024, graphics: 64 },
};
```

## Best Practices
- Use 256 as default workgroup size
- Minimize buffer copies (UMA advantage)
- Batch draw calls and dispatches
- Use texture compression when possible
