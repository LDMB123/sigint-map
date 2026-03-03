importScripts('/webgpu.js');

let matrix = null;
let dim = 0;
const MAX_MATRIX_BYTES = 256 * 1024 * 1024;

function postError(id, message) {
  self.postMessage({ id, error: message });
}

function hasInitializedMatrix(id) {
  if (matrix && dim) {
    return true;
  }
  postError(id, 'Worker not initialized');
  return false;
}

async function postScores({ id, queryBuffer, scorer, unavailableError }) {
  if (!queryBuffer) {
    postError(id, 'Missing query buffer');
    return;
  }
  const queryVec = new Float32Array(queryBuffer);
  const scores = await scorer(queryVec);
  if (!scores) {
    postError(id, unavailableError);
    return;
  }
  self.postMessage({ id, scores: scores.buffer }, [scores.buffer]);
}

self.onmessage = async (event) => {
  const { id, type, query, matrix: matrixBuffer, dim: nextDim, indices } = event.data || {};
  try {
    if (type === 'init') {
      if (!matrixBuffer || !nextDim) {
        postError(id, 'Missing matrix or dim');
        return;
      }
      if (matrixBuffer.byteLength > MAX_MATRIX_BYTES) {
        postError(id, 'Matrix exceeds worker memory cap');
        return;
      }
      matrix = new Float32Array(matrixBuffer);
      dim = nextDim;
      self.postMessage({ id, ok: true });
      return;
    }

    if (type === 'scores') {
      if (!hasInitializedMatrix(id)) {
        return;
      }
      await postScores({
        id,
        queryBuffer: query,
        scorer: (queryVec) => self.dmbWebgpuScores(queryVec, matrix, dim),
        unavailableError: 'WebGPU scoring unavailable',
      });
      return;
    }

    if (type === 'scores_subset') {
      if (!hasInitializedMatrix(id)) {
        return;
      }
      if (!query || !indices) {
        postError(id, 'Missing query or indices');
        return;
      }
      if (!self.dmbWebgpuScoresSubset) {
        postError(id, 'Subset scoring unavailable');
        return;
      }
      const subsetIndices = new Uint32Array(indices);
      await postScores({
        id,
        queryBuffer: query,
        scorer: (queryVec) => self.dmbWebgpuScoresSubset(queryVec, matrix, dim, subsetIndices),
        unavailableError: 'WebGPU subset scoring unavailable',
      });
      return;
    }

    postError(id, 'Unknown worker message');
  } catch (err) {
    postError(id, err?.message || String(err));
  }
};
//# sourceMappingURL=webgpu-worker.js.map
