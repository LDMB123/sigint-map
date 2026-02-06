// Minimal WebGPU compute helper for dot products
// Exposes window.dmbWebgpuDot(Float32Array, Float32Array) -> Promise<number>
// Exposes window.dmbWebgpuScoresWorker(Float32Array query, Float32Array matrix, number dim) -> Promise<Float32Array|null>

const root = typeof window !== 'undefined' ? window : self;
const DEFAULT_WORKER_MIN_FLOATS = 20000;
const WORKER_TIMEOUT_MS = 8000;
const WORKER_FAIL_COOLDOWN_MS = 10 * 60 * 1000;
const WORKER_THRESHOLD_MIN = 5000;
const WORKER_THRESHOLD_MAX = 1000000;
const WORKER_MAX_FLOATS_FALLBACK = 2000000;
let workerThresholdFloats = DEFAULT_WORKER_MIN_FLOATS;
let workerMaxFloats = WORKER_MAX_FLOATS_FALLBACK;
let workerFailureUntil = 0;
const WORKER_FAILURE_REASON_KEY = 'dmb-webgpu-worker-failure-reason';
const WORKER_FAILURE_UNTIL_KEY = 'dmb-webgpu-worker-failure-until';

let devicePromise = null;
let cachedDevice = null;

function computeDefaultWorkerThreshold() {
  try {
    const cores = root?.navigator?.hardwareConcurrency || 4;
    const memory = root?.navigator?.deviceMemory || 0;
    if (memory >= 16 || cores >= 12) return 15000;
    if (memory <= 4 || cores <= 4) return 60000;
    if (memory >= 8 || cores >= 8) return 25000;
    return 35000;
  } catch (err) {
    return DEFAULT_WORKER_MIN_FLOATS;
  }
}

function computeWorkerMaxFloats() {
  try {
    const memory = root?.navigator?.deviceMemory || 0;
    if (memory >= 16) return 4000000;
    if (memory >= 8) return 2500000;
    if (memory >= 4) return 1500000;
    return 900000;
  } catch (err) {
    return WORKER_MAX_FLOATS_FALLBACK;
  }
}

function clampWorkerThreshold(value) {
  if (!Number.isFinite(value)) return DEFAULT_WORKER_MIN_FLOATS;
  return Math.min(Math.max(Math.floor(value), WORKER_THRESHOLD_MIN), WORKER_THRESHOLD_MAX);
}

function loadWorkerThreshold() {
  try {
    if (!root.localStorage) return DEFAULT_WORKER_MIN_FLOATS;
    const raw = root.localStorage.getItem('dmb-webgpu-worker-threshold');
    const value = raw ? Number(raw) : computeDefaultWorkerThreshold();
    return clampWorkerThreshold(value);
  } catch (err) {
    return clampWorkerThreshold(computeDefaultWorkerThreshold());
  }
}

function loadWorkerFailureUntil() {
  try {
    if (!root.localStorage) return 0;
    const raw = root.localStorage.getItem(WORKER_FAILURE_UNTIL_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch (err) {
    return 0;
  }
}

function markWorkerFailure(reason) {
  const next = Date.now() + WORKER_FAIL_COOLDOWN_MS;
  workerFailureUntil = next;
  try {
    if (root.localStorage) {
      root.localStorage.setItem(WORKER_FAILURE_UNTIL_KEY, String(next));
      if (reason && reason.message) {
        root.localStorage.setItem(WORKER_FAILURE_REASON_KEY, String(reason.message));
      } else if (reason) {
        root.localStorage.setItem(WORKER_FAILURE_REASON_KEY, String(reason));
      }
    }
  } catch (err) {
    // ignore
  }
  if (reason) {
    console.warn('WebGPU worker disabled temporarily:', reason);
  }
}

function clearWorkerFailure() {
  workerFailureUntil = 0;
  try {
    if (root.localStorage) {
      root.localStorage.removeItem(WORKER_FAILURE_UNTIL_KEY);
      root.localStorage.removeItem(WORKER_FAILURE_REASON_KEY);
    }
  } catch (err) {
    // ignore
  }
}

function getWorkerFailureStatus() {
  let lastError = null;
  try {
    if (root.localStorage) {
      lastError = root.localStorage.getItem(WORKER_FAILURE_REASON_KEY);
    }
  } catch (err) {
    lastError = null;
  }
  const remaining = workerFailureUntil > 0 ? Math.max(workerFailureUntil - Date.now(), 0) : 0;
  return {
    cooldownUntil: workerFailureUntil || null,
    cooldownRemainingMs: remaining || null,
    lastError: lastError || null,
  };
}

function setWorkerThreshold(value) {
  if (!Number.isFinite(value) || value <= 0) return;
  workerThresholdFloats = clampWorkerThreshold(value);
  try {
    if (root.localStorage) {
      root.localStorage.setItem('dmb-webgpu-worker-threshold', String(workerThresholdFloats));
    }
  } catch (err) {
    // ignore storage failures
  }
}

workerThresholdFloats = loadWorkerThreshold();
workerMaxFloats = computeWorkerMaxFloats();
workerFailureUntil = loadWorkerFailureUntil();
root.dmbSetWorkerThreshold = setWorkerThreshold;
root.dmbGetWorkerFailureStatus = getWorkerFailureStatus;
root.dmbClearWorkerFailureStatus = clearWorkerFailure;
root.dmbGetWorkerLimits = function dmbGetWorkerLimits() {
  return {
    threshold: workerThresholdFloats,
    maxFloats: workerMaxFloats
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
    markWorkerFailure(err);
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
      cachedDevice = null;
      devicePromise = null;
    }).catch(() => {
      cachedDevice = null;
      devicePromise = null;
    });
    cachedDevice = device;
    return device;
  })();
  return devicePromise;
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

  const aBuffer = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const bBuffer = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const outBuffer = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const readBuffer = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const paramsBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  device.queue.writeBuffer(aBuffer, 0, a);
  device.queue.writeBuffer(bBuffer, 0, b);
  const params = new Uint32Array([len, 0]);
  device.queue.writeBuffer(paramsBuffer, 0, params);

  const shader = `
struct Params {
  len: u32,
  _pad: u32,
};
@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> out: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(64)
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
  const workgroups = Math.ceil(len / 64);
  pass.dispatchWorkgroups(workgroups);
  pass.end();

  encoder.copyBufferToBuffer(outBuffer, 0, readBuffer, 0, byteLength);
  device.queue.submit([encoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const copy = new Float32Array(readBuffer.getMappedRange().slice(0));
  readBuffer.unmap();

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

  const matrixBuffer = device.createBuffer({
    size: matrix.length * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const queryBuffer = device.createBuffer({
    size: query.length * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const outBuffer = device.createBuffer({
    size: count * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const readBuffer = device.createBuffer({
    size: count * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const paramsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  device.queue.writeBuffer(matrixBuffer, 0, matrix);
  device.queue.writeBuffer(queryBuffer, 0, query);
  device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([dim, count, 0, 0]));

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

@compute @workgroup_size(64)
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
  pass.dispatchWorkgroups(Math.ceil(count / 64));
  pass.end();

  encoder.copyBufferToBuffer(outBuffer, 0, readBuffer, 0, count * 4);
  device.queue.submit([encoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(readBuffer.getMappedRange().slice(0));
  readBuffer.unmap();
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
    subMatrix.set(matrix.slice(start, end), i * dim);
  }
  return webgpuScores(query, subMatrix, dim);
}

root.dmbWebgpuScoresSubset = webgpuScoresSubset;

let workerState = null;

function failWorkerPending(state, reason) {
  state.pending.forEach(({ reject }) => {
    try {
      reject(reason);
    } catch (err) {
      // ignore
    }
  });
  state.pending.clear();
}

function resetWorkerState(reason) {
  if (!workerState) return;
  try {
    workerState.worker.terminate();
  } catch (err) {
    // ignore
  }
  failWorkerPending(workerState, reason || new Error('WebGPU worker reset'));
  workerState = null;
  markWorkerFailure(reason);
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
      markWorkerFailure(err);
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

async function webgpuScoresWorker(query, matrix, dim) {
  if (workerFailureUntil && Date.now() >= workerFailureUntil) {
    clearWorkerFailure();
  }
  if (Date.now() < workerFailureUntil) {
    return webgpuScores(query, matrix, dim);
  }
  if (matrix.length > workerMaxFloats) {
    return webgpuScores(query, matrix, dim);
  }
  if (matrix.length < workerThresholdFloats) {
    return webgpuScores(query, matrix, dim);
  }
  const state = ensureWorker();
  if (!state) return null;
  try {
    await initWorkerMatrix(state, matrix, dim);
  } catch (err) {
    markWorkerFailure(err);
    return webgpuScores(query, matrix, dim);
  }
  const id = state.nextId++;
  const payload = {
    type: 'scores',
    id,
    query: query.slice().buffer,
  };
  const promise = createWorkerPromise(state, id);
  state.worker.postMessage(payload, [payload.query]);
  try {
    const scores = await promise;
    clearWorkerFailure();
    return scores ? new Float32Array(scores) : null;
  } catch (err) {
    markWorkerFailure(err);
    return webgpuScores(query, matrix, dim);
  }
}

root.dmbWebgpuScoresWorker = webgpuScoresWorker;

async function webgpuScoresSubsetWorker(query, matrix, dim, indices) {
  if (workerFailureUntil && Date.now() >= workerFailureUntil) {
    clearWorkerFailure();
  }
  if (Date.now() < workerFailureUntil) {
    return webgpuScoresSubset(query, matrix, dim, indices);
  }
  if (matrix.length > workerMaxFloats) {
    return webgpuScoresSubset(query, matrix, dim, indices);
  }
  if (matrix.length < workerThresholdFloats) {
    return webgpuScoresSubset(query, matrix, dim, indices);
  }
  const state = ensureWorker();
  if (!state) return null;
  try {
    await initWorkerMatrix(state, matrix, dim);
  } catch (err) {
    markWorkerFailure(err);
    return webgpuScoresSubset(query, matrix, dim, indices);
  }
  const id = state.nextId++;
  const payload = {
    type: 'scores_subset',
    id,
    query: query.slice().buffer,
    indices: indices.slice().buffer,
  };
  const promise = createWorkerPromise(state, id);
  state.worker.postMessage(payload, [payload.query, payload.indices]);
  try {
    const scores = await promise;
    clearWorkerFailure();
    return scores ? new Float32Array(scores) : null;
  } catch (err) {
    markWorkerFailure(err);
    return webgpuScoresSubset(query, matrix, dim, indices);
  }
}

root.dmbWebgpuScoresSubsetWorker = webgpuScoresSubsetWorker;
