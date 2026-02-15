importScripts('/webgpu.js');

let matrix = null;
let dim = 0;
const MAX_MATRIX_BYTES = 256 * 1024 * 1024;

self.onmessage = async (event) => {
  const { id, type, query, matrix: matrixBuffer, dim: nextDim } = event.data || {};
  try {
    if (type === 'init') {
      if (!matrixBuffer || !nextDim) {
        self.postMessage({ id, error: 'Missing matrix or dim' });
        return;
      }
      if (matrixBuffer.byteLength > MAX_MATRIX_BYTES) {
        self.postMessage({ id, error: 'Matrix exceeds worker memory cap' });
        return;
      }
      matrix = new Float32Array(matrixBuffer);
      dim = nextDim;
      self.postMessage({ id, ok: true });
      return;
    }

    if (type === 'scores') {
      if (!matrix || !dim) {
        self.postMessage({ id, error: 'Worker not initialized' });
        return;
      }
      if (!query) {
        self.postMessage({ id, error: 'Missing query buffer' });
        return;
      }
      const queryVec = new Float32Array(query);
      const scores = await self.dmbWebgpuScores(queryVec, matrix, dim);
      if (!scores) {
        self.postMessage({ id, error: 'WebGPU scoring unavailable' });
        return;
      }
      self.postMessage({ id, scores: scores.buffer }, [scores.buffer]);
      return;
    }

    if (type === 'scores_subset') {
      if (!matrix || !dim) {
        self.postMessage({ id, error: 'Worker not initialized' });
        return;
      }
      if (!query || !event.data?.indices) {
        self.postMessage({ id, error: 'Missing query or indices' });
        return;
      }
      const queryVec = new Float32Array(query);
      const indices = new Uint32Array(event.data.indices);
      if (!self.dmbWebgpuScoresSubset) {
        self.postMessage({ id, error: 'Subset scoring unavailable' });
        return;
      }
      const scores = await self.dmbWebgpuScoresSubset(queryVec, matrix, dim, indices);
      if (!scores) {
        self.postMessage({ id, error: 'WebGPU subset scoring unavailable' });
        return;
      }
      self.postMessage({ id, scores: scores.buffer }, [scores.buffer]);
      return;
    }

    self.postMessage({ id, error: 'Unknown worker message' });
  } catch (err) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
//# sourceMappingURL=webgpu-worker.js.map
