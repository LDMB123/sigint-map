// Minimal WebGPU compute helper for dot products
// Exposes window.dmbWebgpuDot(Float32Array, Float32Array) -> Promise<number>
// Exposes window.dmbWebgpuScoresWorker(Float32Array query, Float32Array matrix, number dim) -> Promise<Float32Array|null>

const root = typeof window !== 'undefined' ? window : self;
const WORKER_TIMEOUT_MS = 8000;
const DEFAULT_WORKGROUP_SIZE = 64;
const WORKER_MAX_FLOATS_FALLBACK = 2000000;

let devicePromise = null;
let cachedDevice = null;
let dotPipelineCache = null;
let scorePipelineCache = null;
const WEBGPU_METRIC_KEYS = [
  'direct_scores_calls',
  'worker_attempts',
  'worker_success',
  'worker_fallback_worker_unavailable',
  'worker_fallback_init_failed',
  'worker_fallback_runtime_failed',
  'subset_direct_scores_calls',
  'subset_worker_attempts',
  'subset_worker_success',
  'subset_worker_fallback_worker_unavailable',
  'subset_worker_fallback_init_failed',
  'subset_worker_fallback_runtime_failed'
];
const runtimeTelemetry = {
  counters: Object.fromEntries(WEBGPU_METRIC_KEYS.map((name) => [name, 0])),
  lastEvent: null,
  lastEventTs: null,
};

function getHardwareProfile() {
  try {
    return {
      cores: Number(root?.navigator?.hardwareConcurrency || 4),
      memoryGb: Number(root?.navigator?.deviceMemory || 0),
    };
  } catch {
    return { cores: 4, memoryGb: 0 };
  }
}

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
const DOT_WORKGROUP_SIZE = IS_APPLE_SILICON ? 256 : DEFAULT_WORKGROUP_SIZE;
const SCORE_WORKGROUP_SIZE = IS_APPLE_SILICON ? 256 : DEFAULT_WORKGROUP_SIZE;

function resetGpuState() {
  cachedDevice = null;
  devicePromise = null;
  dotPipelineCache = null;
  scorePipelineCache = null;
}

function computeWorkerMaxFloats() {
  try {
    const { memoryGb: memory } = getHardwareProfile();
    if (IS_APPLE_SILICON) {
      if (memory >= 16) return 5000000;
      if (memory >= 8) return 3500000;
      if (memory >= 4) return 2200000;
      return 1400000;
    }
    if (memory >= 16) return 4000000;
    if (memory >= 8) return 2500000;
    if (memory >= 4) return 1500000;
    return 900000;
  } catch {
    return WORKER_MAX_FLOATS_FALLBACK;
  }
}

function bumpMetricCounter(name) {
  if (!Object.prototype.hasOwnProperty.call(runtimeTelemetry.counters, name)) {
    runtimeTelemetry.counters[name] = 0;
  }
  runtimeTelemetry.counters[name] += 1;
  runtimeTelemetry.lastEvent = name;
  runtimeTelemetry.lastEventTs = Date.now();
}

function getWebgpuTelemetry() {
  return {
    counters: { ...runtimeTelemetry.counters },
    lastEvent: runtimeTelemetry.lastEvent,
    lastEventTs: runtimeTelemetry.lastEventTs,
  };
}

function resetWebgpuTelemetry() {
  for (const name of WEBGPU_METRIC_KEYS) {
    runtimeTelemetry.counters[name] = 0;
  }
  runtimeTelemetry.lastEvent = null;
  runtimeTelemetry.lastEventTs = null;
};
root.dmbGetWebgpuTelemetry = getWebgpuTelemetry;
root.dmbResetWebgpuTelemetry = resetWebgpuTelemetry;
root.dmbGetAppleSiliconProfile = function dmbGetAppleSiliconProfile() {
  const profile = getHardwareProfile();
  const workerMaxFloats = computeWorkerMaxFloats();
  return {
    isAppleSilicon: IS_APPLE_SILICON,
    cpuCores: profile.cores,
    deviceMemoryGb: profile.memoryGb,
    workgroup: {
      dot: DOT_WORKGROUP_SIZE,
      score: SCORE_WORKGROUP_SIZE,
    },
    worker: {
      thresholdFloats: null,
      maxFloats: workerMaxFloats,
    },
  };
};

root.dmbWarmWebgpuWorker = async function dmbWarmWebgpuWorker() {
  const state = ensureWorker();
  if (!state) return { warmed: false, reason: 'worker unavailable' };
  const dim = 8;
  const count = 64;
  const matrix = new Float32Array(dim * count);
  const query = new Float32Array(dim);
  for (let i = 0; i < query.length; i++) query[i] = 0.01;
  try {
    await initWorkerMatrix(state, matrix, dim);
    const id = state.nextId++;
    const payload = {
      type: 'scores',
      id,
      query: query.slice().buffer,
    };
    const promise = createWorkerPromise(state, id);
    state.worker.postMessage(payload, [payload.query]);
    await promise;
    return { warmed: true };
  } catch (err) {
    return { warmed: false, reason: err?.message || String(err) };
  }
};

async function ensureDevice() {
  if (cachedDevice) return cachedDevice;
  if (devicePromise) return devicePromise;
  const nav = root.navigator;
  if (!nav || !('gpu' in nav)) {
    return null;
  }
  devicePromise = (async () => {
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
  return devicePromise;
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

function getDotPipeline(device) {
  if (dotPipelineCache?.device === device) {
    return dotPipelineCache.pipeline;
  }
  const shader = `
struct Params {
  len: u32,
  _pad: u32,
};
@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> out: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(${DOT_WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i < params.len) {
    out[i] = a[i] * b[i];
  }
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
  dotPipelineCache = { device, pipeline };
  return pipeline;
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

root.dmbWebgpuProbe = async function dmbWebgpuProbe() {
  try {
    const device = await ensureDevice();
    return { available: !!device };
  } catch (err) {
    return { available: false, error: err?.message || String(err) };
  }
};

async function webgpuDot(a, b) {
  if (!(a instanceof Float32Array) || !(b instanceof Float32Array)) {
    throw new Error('Expected Float32Array inputs');
  }
  if (a.length !== b.length) {
    throw new Error('Input length mismatch');
  }
  const device = await ensureDevice();
  if (!device) {
    return null;
  }

  const len = a.length;
  const byteLength = len * 4;

  const aBuffer = createUploadBuffer(device, a, GPUBufferUsage.STORAGE);
  const bBuffer = createUploadBuffer(device, b, GPUBufferUsage.STORAGE);
  const outBuffer = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const readBuffer = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const paramsBuffer = createUploadBuffer(device, new Uint32Array([len, 0]), GPUBufferUsage.UNIFORM);
  const pipeline = getDotPipeline(device);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: aBuffer } },
      { binding: 1, resource: { buffer: bBuffer } },
      { binding: 2, resource: { buffer: outBuffer } },
      { binding: 3, resource: { buffer: paramsBuffer } }
    ]
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  const workgroups = Math.ceil(len / DOT_WORKGROUP_SIZE);
  pass.dispatchWorkgroups(workgroups);
  pass.end();

  encoder.copyBufferToBuffer(outBuffer, 0, readBuffer, 0, byteLength);
  device.queue.submit([encoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const copy = new Float32Array(readBuffer.getMappedRange().slice(0));
  readBuffer.unmap();
  aBuffer.destroy?.();
  bBuffer.destroy?.();
  outBuffer.destroy?.();
  readBuffer.destroy?.();
  paramsBuffer.destroy?.();

  let sum = 0;
  for (let i = 0; i < copy.length; i++) {
    sum += copy[i];
  }
  return sum;
}

root.dmbWebgpuDot = webgpuDot;

// Exposes window.dmbWebgpuScores(Float32Array query, Float32Array matrix, number dim)
// Returns Promise<Float32Array|null>
async function webgpuScores(query, matrix, dim) {
  bumpMetricCounter('direct_scores_calls');
  if (!(query instanceof Float32Array) || !(matrix instanceof Float32Array)) {
    throw new Error('Expected Float32Array inputs');
  }
  if (!Number.isInteger(dim) || dim <= 0) {
    throw new Error('Invalid dimension');
  }
  if (matrix.length % dim !== 0) {
    throw new Error('Matrix length not divisible by dim');
  }
  const device = await ensureDevice();
  if (!device) {
    return null;
  }

  const count = Math.floor(matrix.length / dim);
  if (count === 0) {
    return new Float32Array();
  }

  const matrixBuffer = createUploadBuffer(device, matrix, GPUBufferUsage.STORAGE);
  const queryBuffer = createUploadBuffer(device, query, GPUBufferUsage.STORAGE);
  const outBuffer = device.createBuffer({
    size: count * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const readBuffer = device.createBuffer({
    size: count * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const paramsBuffer = createUploadBuffer(
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
  const data = new Float32Array(readBuffer.getMappedRange().slice(0));
  readBuffer.unmap();
  matrixBuffer.destroy?.();
  queryBuffer.destroy?.();
  outBuffer.destroy?.();
  readBuffer.destroy?.();
  paramsBuffer.destroy?.();
  return data;
}

root.dmbWebgpuScores = webgpuScores;

async function webgpuScoresSubset(query, matrix, dim, indices) {
  if (!(indices instanceof Uint32Array)) {
    throw new Error('Expected Uint32Array indices');
  }
  if (indices.length === 0) {
    return new Float32Array();
  }
  const subMatrix = new Float32Array(indices.length * dim);
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const start = idx * dim;
    const end = start + dim;
    subMatrix.set(matrix.subarray(start, end), i * dim);
  }
  return webgpuScores(query, subMatrix, dim);
}

root.dmbWebgpuScoresSubset = webgpuScoresSubset;

let workerState = null;

function failWorkerPending(state, reason) {
  state.pending.forEach(({ reject }) => {
    try {
      reject(reason);
    } catch {
      // ignore
    }
  });
  state.pending.clear();
}

function resetWorkerState(reason) {
  if (!workerState) return;
  try {
    workerState.worker.terminate();
  } catch {
    // ignore
  }
  failWorkerPending(workerState, reason || new Error('WebGPU worker reset'));
  workerState = null;
}

function ensureWorker() {
  if (!root.Worker) return null;
  if (workerState) return workerState;

  const worker = new Worker('/webgpu-worker.js');
  const pending = new Map();

  worker.onmessage = (event) => {
    const { id, ok, scores, error } = event.data || {};
    if (!pending.has(id)) return;
    const { resolve, reject } = pending.get(id);
    pending.delete(id);
    if (error) {
      reject(new Error(error));
      return;
    }
    resolve(scores || ok);
  };
  worker.onerror = () => resetWorkerState(new Error('WebGPU worker error'));
  worker.onmessageerror = () => resetWorkerState(new Error('WebGPU worker message error'));

  workerState = {
    worker,
    pending,
    signature: null,
    nextId: 1,
  };
  return workerState;
}

function createWorkerPromise(state, id) {
  let timeoutId;
  const promise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      state.pending.delete(id);
      const err = new Error('WebGPU worker timed out');
      reject(err);
    }, WORKER_TIMEOUT_MS);
    state.pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      reject: (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
  return promise;
}

async function initWorkerMatrix(state, matrix, dim) {
  const signature = `${dim}:${matrix.length}`;
  if (state.signature === signature) return;
  const id = state.nextId++;
  const payload = {
    type: 'init',
    id,
    dim,
    matrix: matrix.slice().buffer,
  };
  const promise = createWorkerPromise(state, id);
  state.worker.postMessage(payload, [payload.matrix]);
  await promise;
  state.signature = signature;
}

async function runWorkerScoresRequest({ matrix, dim, metrics, fallback, buildPayload, transferList }) {
  const state = ensureWorker();
  if (!state) {
    bumpMetricCounter(metrics.unavailable);
    return null;
  }
  bumpMetricCounter(metrics.attempts);

  try {
    await initWorkerMatrix(state, matrix, dim);
  } catch (err) {
    bumpMetricCounter(metrics.initFailed);
    return fallback();
  }

  const id = state.nextId++;
  const payload = buildPayload(id);
  const promise = createWorkerPromise(state, id);
  state.worker.postMessage(payload, transferList(payload));

  try {
    const scores = await promise;
    bumpMetricCounter(metrics.success);
    return scores ? new Float32Array(scores) : null;
  } catch (err) {
    bumpMetricCounter(metrics.runtimeFailed);
    return fallback();
  }
}

async function webgpuScoresWorker(query, matrix, dim) {
  return runWorkerScoresRequest({
    matrix,
    dim,
    metrics: {
      attempts: 'worker_attempts',
      unavailable: 'worker_fallback_worker_unavailable',
      initFailed: 'worker_fallback_init_failed',
      runtimeFailed: 'worker_fallback_runtime_failed',
      success: 'worker_success',
    },
    fallback: () => webgpuScores(query, matrix, dim),
    buildPayload: (id) => ({
      type: 'scores',
      id,
      query: query.slice().buffer,
    }),
    transferList: (payload) => [payload.query],
  });
}

root.dmbWebgpuScoresWorker = webgpuScoresWorker;

async function webgpuScoresSubsetWorker(query, matrix, dim, indices) {
  return runWorkerScoresRequest({
    matrix,
    dim,
    metrics: {
      attempts: 'subset_worker_attempts',
      unavailable: 'subset_worker_fallback_worker_unavailable',
      initFailed: 'subset_worker_fallback_init_failed',
      runtimeFailed: 'subset_worker_fallback_runtime_failed',
      success: 'subset_worker_success',
    },
    fallback: () => webgpuScoresSubset(query, matrix, dim, indices),
    buildPayload: (id) => ({
      type: 'scores_subset',
      id,
      query: query.slice().buffer,
      indices: indices.slice().buffer,
    }),
    transferList: (payload) => [payload.query, payload.indices],
  });
}

root.dmbWebgpuScoresSubsetWorker = webgpuScoresSubsetWorker;
//# sourceMappingURL=webgpu.js.map
