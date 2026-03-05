// Minimal WebGPU compute helper for score vectors.
// Exports webgpuScores(Float32Array query, Float32Array matrix, number dim) -> Promise<Float32Array|null>

const root = typeof window !== 'undefined' ? window : self;
const DEFAULT_WORKGROUP_SIZE = 64;

let devicePromise = null;
let cachedDevice = null;
let scorePipelineCache = null;

function detectAppleSilicon() {
  try {
    const platform = root?.navigator?.platform || '';
    const ua = root?.navigator?.userAgent || '';
    const isMac = /Mac/.test(platform) || /macOS/i.test(ua);
    const looksIntel = /Intel/.test(platform) || /x86_64|i[3-6]86/i.test(ua);
    return isMac && !looksIntel;
  } catch {
    return false;
  }
}

const IS_APPLE_SILICON = detectAppleSilicon();
const SCORE_WORKGROUP_SIZE = IS_APPLE_SILICON ? 256 : DEFAULT_WORKGROUP_SIZE;

function resetGpuState() {
  cachedDevice = null;
  devicePromise = null;
  scorePipelineCache = null;
}

async function ensureDevice() {
  if (cachedDevice) return cachedDevice;
  if (devicePromise) return devicePromise;
  const nav = root.navigator;
  if (!nav || !('gpu' in nav)) {
    return null;
  }
  const pending = (async () => {
    const adapter = await nav.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    device.lost.then(() => {
      resetGpuState();
    }).catch(() => {
      resetGpuState();
    });
    cachedDevice = device;
    return device;
  })();
  devicePromise = pending;
  try {
    return await pending;
  } catch (err) {
    resetGpuState();
    throw err;
  } finally {
    if (!cachedDevice) {
      devicePromise = null;
    }
  }
}

function createUploadBuffer(device, typedArray, usage) {
  const buffer = device.createBuffer({
    size: typedArray.byteLength,
    usage,
    mappedAtCreation: true,
  });
  const TypedArrayCtor = typedArray.constructor;
  new TypedArrayCtor(buffer.getMappedRange()).set(typedArray);
  buffer.unmap();
  return buffer;
}

function destroyBuffer(buffer) {
  buffer?.destroy?.();
}

function getScorePipeline(device) {
  if (scorePipelineCache?.device === device) {
    return scorePipelineCache.pipeline;
  }
  const shader = `
struct Params {
  dim: u32,
  count: u32,
  _pad1: u32,
  _pad2: u32,
};
@group(0) @binding(0) var<storage, read> matrix: array<f32>;
@group(0) @binding(1) var<storage, read> query: array<f32>;
@group(0) @binding(2) var<storage, read_write> out: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(${SCORE_WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= params.count) {
    return;
  }
  let base = idx * params.dim;
  var sum: f32 = 0.0;
  var i: u32 = 0u;
  loop {
    if (i >= params.dim) { break; }
    sum = sum + matrix[base + i] * query[i];
    i = i + 1u;
  }
  out[idx] = sum;
}
`;
  const module = device.createShaderModule({ code: shader });
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module,
      entryPoint: 'main'
    }
  });
  scorePipelineCache = { device, pipeline };
  return pipeline;
}

export async function webgpuScores(query, matrix, dim) {
  const device = await ensureDevice();
  if (!device) {
    return null;
  }

  const count = Math.floor(matrix.length / dim);
  if (count === 0) {
    return new Float32Array();
  }

  let matrixBuffer = null;
  let queryBuffer = null;
  let outBuffer = null;
  let readBuffer = null;
  let paramsBuffer = null;
  let readBufferMapped = false;

  try {
    matrixBuffer = createUploadBuffer(device, matrix, GPUBufferUsage.STORAGE);
    queryBuffer = createUploadBuffer(device, query, GPUBufferUsage.STORAGE);
    outBuffer = device.createBuffer({
      size: count * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    readBuffer = device.createBuffer({
      size: count * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    paramsBuffer = createUploadBuffer(
      device,
      new Uint32Array([dim, count, 0, 0]),
      GPUBufferUsage.UNIFORM
    );
    const pipeline = getScorePipeline(device);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: matrixBuffer } },
        { binding: 1, resource: { buffer: queryBuffer } },
        { binding: 2, resource: { buffer: outBuffer } },
        { binding: 3, resource: { buffer: paramsBuffer } }
      ]
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / SCORE_WORKGROUP_SIZE));
    pass.end();

    encoder.copyBufferToBuffer(outBuffer, 0, readBuffer, 0, count * 4);
    device.queue.submit([encoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    readBufferMapped = true;
    return new Float32Array(readBuffer.getMappedRange().slice(0));
  } finally {
    if (readBufferMapped) {
      readBuffer.unmap();
    }
    destroyBuffer(matrixBuffer);
    destroyBuffer(queryBuffer);
    destroyBuffer(outBuffer);
    destroyBuffer(readBuffer);
    destroyBuffer(paramsBuffer);
  }
}
//# sourceMappingURL=webgpu.js.map
