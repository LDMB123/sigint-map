import { webgpuScores } from '/webgpu.js';

let matrix = null;
let dim = 0;

function isTransferBuffer(value) {
  return value instanceof ArrayBuffer;
}

async function postScores(id, queryBuffer) {
  const queryVec = new Float32Array(queryBuffer);
  const scores = await webgpuScores(queryVec, matrix, dim);
  if (!scores) {
    self.postMessage({ id });
    return;
  }
  self.postMessage({ id, scores: scores.buffer }, [scores.buffer]);
}

self.onmessage = async (event) => {
  const { id, query, matrix: nextMatrixBuffer, dim: nextDim } = event.data || {};
  if (isTransferBuffer(nextMatrixBuffer)) {
    matrix = new Float32Array(nextMatrixBuffer);
    dim = nextDim;
    self.postMessage({ id, ok: true });
    return;
  }

  if (isTransferBuffer(query)) {
    await postScores(id, query);
  }
};
//# sourceMappingURL=webgpu-worker.js.map
