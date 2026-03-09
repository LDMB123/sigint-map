import { test, expect } from '@playwright/test';
import { skipUnlessRust } from './_rust_test_utils.js';

const GPU_BUFFER_USAGE = {
  STORAGE: 1,
  COPY_SRC: 2,
  COPY_DST: 4,
  MAP_READ: 8,
  UNIFORM: 16,
};

async function installFakeWebgpu(page) {
  await page.addInitScript(({ bufferUsage }) => {
    const state = {
      requestAdapterCalls: [],
      requestDeviceCalls: 0,
      createBufferCalls: [],
      submitCalls: 0,
    };

    class FakeBuffer {
      constructor(descriptor) {
        this.size = descriptor.size;
        this.usage = descriptor.usage;
        this.mappedAtCreation = Boolean(descriptor.mappedAtCreation);
        this._data = new ArrayBuffer(descriptor.size);
      }

      getMappedRange(offset = 0, size = this.size - offset) {
        if (offset === 0 && size === this.size) {
          return this._data;
        }
        return this._data.slice(offset, offset + size);
      }

      unmap() {}

      mapAsync() {
        return Promise.resolve();
      }

      destroy() {
        this.destroyed = true;
      }
    }

    class FakeDevice {
      constructor() {
        this.lost = new Promise(() => {});
        this.queue = {
          submit: (commands) => {
            state.submitCalls += 1;
            for (const command of commands) {
              for (const copy of command.copies) {
                const src = new Uint8Array(copy.src._data, copy.srcOffset, copy.size);
                const dst = new Uint8Array(copy.dst._data, copy.dstOffset, copy.size);
                dst.set(src);
              }
            }
          },
        };
      }

      createBuffer(descriptor) {
        state.createBufferCalls.push({
          size: descriptor.size,
          usage: descriptor.usage,
          mappedAtCreation: Boolean(descriptor.mappedAtCreation),
        });
        return new FakeBuffer(descriptor);
      }

      createShaderModule(descriptor) {
        return { code: descriptor.code };
      }

      createComputePipeline() {
        return {
          getBindGroupLayout() {
            return {};
          },
        };
      }

      createBindGroup(descriptor) {
        return descriptor;
      }

      createCommandEncoder() {
        const copies = [];
        return {
          beginComputePass() {
            return {
              setPipeline() {},
              setBindGroup() {},
              dispatchWorkgroups() {},
              end() {},
            };
          },
          copyBufferToBuffer(src, srcOffset, dst, dstOffset, size) {
            copies.push({ src, srcOffset, dst, dstOffset, size });
          },
          finish() {
            return { copies };
          },
        };
      }
    }

    const fakeGpu = {
      requestAdapter: async (options = {}) => {
        state.requestAdapterCalls.push({ powerPreference: options.powerPreference ?? null });
        return {
          requestDevice: async () => {
            state.requestDeviceCalls += 1;
            return new FakeDevice();
          },
        };
      },
    };

    globalThis.GPUBufferUsage = bufferUsage;
    globalThis.GPUMapMode = { READ: 1 };
    Object.defineProperty(globalThis.navigator, 'gpu', {
      configurable: true,
      value: fakeGpu,
    });
    globalThis.__DMB_FAKE_WEBGPU_STATE = state;
  }, { bufferUsage: GPU_BUFFER_USAGE });
}

test.describe('Rust WebGPU helper cache behavior', () => {
  skipUnlessRust(test);

  test('reuses matrix uploads and result buffers for repeated scores', async ({ page }) => {
    await installFakeWebgpu(page);
    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async ({ bufferUsage }) => {
      const module = await import('/webgpu.js');
      const dim = 3;
      const matrix = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
        1, 1, 1,
      ]);

      await module.webgpuScores(new Float32Array([1, 2, 3]), matrix, dim);
      await module.webgpuScores(new Float32Array([0.5, 0.25, -1]), matrix, dim);

      const state = globalThis.__DMB_FAKE_WEBGPU_STATE;
      return {
        matrixUploadCount: state.createBufferCalls.filter(
          (entry) =>
            entry.mappedAtCreation &&
            entry.usage === bufferUsage.STORAGE &&
            entry.size === matrix.byteLength
        ).length,
        queryUploadCount: state.createBufferCalls.filter(
          (entry) =>
            entry.mappedAtCreation &&
            entry.usage === bufferUsage.STORAGE &&
            entry.size === dim * Float32Array.BYTES_PER_ELEMENT
        ).length,
        outBufferCount: state.createBufferCalls.filter(
          (entry) =>
            !entry.mappedAtCreation &&
            entry.usage === (bufferUsage.STORAGE | bufferUsage.COPY_SRC)
        ).length,
        readBufferCount: state.createBufferCalls.filter(
          (entry) =>
            !entry.mappedAtCreation &&
            entry.usage === (bufferUsage.COPY_DST | bufferUsage.MAP_READ)
        ).length,
        requestAdapterCount: state.requestAdapterCalls.length,
        requestDeviceCalls: state.requestDeviceCalls,
        submitCalls: state.submitCalls,
      };
    }, { bufferUsage: GPU_BUFFER_USAGE });

    expect(result.matrixUploadCount).toBe(1);
    expect(result.queryUploadCount).toBe(2);
    expect(result.outBufferCount).toBe(1);
    expect(result.readBufferCount).toBe(1);
    expect(result.requestAdapterCount).toBe(1);
    expect(result.requestDeviceCalls).toBe(1);
    expect(result.submitCalls).toBe(2);
  });

  test('power preference changes invalidate the cached device', async ({ page }) => {
    await installFakeWebgpu(page);
    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async () => {
      const module = await import('/webgpu.js');
      const dim = 2;
      const matrix = new Float32Array([1, 0, 0, 1]);
      const query = new Float32Array([1, 0]);

      await module.webgpuScores(query, matrix, dim);
      module.setWebgpuRuntimeConfig({ powerPreference: 'low-power' });
      await module.webgpuScores(query, matrix, dim);

      return globalThis.__DMB_FAKE_WEBGPU_STATE.requestAdapterCalls;
    });

    expect(result).toEqual([
      { powerPreference: 'high-performance' },
      { powerPreference: 'low-power' },
    ]);
  });

  test('cache limits can disable hot buffer retention for constrained profiles', async ({ page }) => {
    await installFakeWebgpu(page);
    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async ({ bufferUsage }) => {
      const module = await import('/webgpu.js');
      const dim = 3;
      const matrix = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
        1, 1, 1,
      ]);

      module.setWebgpuRuntimeConfig({
        matrixCacheMaxBytes: matrix.byteLength - 4,
        resultCacheMaxBytes: 8,
        cacheIdleMs: 30_000,
      });

      await module.webgpuScores(new Float32Array([1, 2, 3]), matrix, dim);
      await module.webgpuScores(new Float32Array([0.5, 0.25, -1]), matrix, dim);

      const state = globalThis.__DMB_FAKE_WEBGPU_STATE;
      return {
        matrixUploadCount: state.createBufferCalls.filter(
          (entry) =>
            entry.mappedAtCreation &&
            entry.usage === bufferUsage.STORAGE &&
            entry.size === matrix.byteLength
        ).length,
        outBufferCount: state.createBufferCalls.filter(
          (entry) =>
            !entry.mappedAtCreation &&
            entry.usage === (bufferUsage.STORAGE | bufferUsage.COPY_SRC)
        ).length,
        readBufferCount: state.createBufferCalls.filter(
          (entry) =>
            !entry.mappedAtCreation &&
            entry.usage === (bufferUsage.COPY_DST | bufferUsage.MAP_READ)
        ).length,
        requestAdapterCount: state.requestAdapterCalls.length,
      };
    }, { bufferUsage: GPU_BUFFER_USAGE });

    expect(result.matrixUploadCount).toBe(2);
    expect(result.outBufferCount).toBe(2);
    expect(result.readBufferCount).toBe(2);
    expect(result.requestAdapterCount).toBe(1);
  });

  test('eager warmup acquires the device before the first score without priming uploads', async ({ page }) => {
    await installFakeWebgpu(page);
    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async ({ bufferUsage }) => {
      const module = await import('/webgpu.js');
      const dim = 2;
      const matrix = new Float32Array([1, 0, 0, 1]);
      const query = new Float32Array([1, 0]);

      module.setWebgpuRuntimeConfig({ eagerWarmup: true, primeMatrixOnWorkerInit: false });
      await Promise.resolve();
      await Promise.resolve();

      const stateAfterWarmup = {
        requestAdapterCount: globalThis.__DMB_FAKE_WEBGPU_STATE.requestAdapterCalls.length,
        requestDeviceCalls: globalThis.__DMB_FAKE_WEBGPU_STATE.requestDeviceCalls,
        matrixUploadCount: globalThis.__DMB_FAKE_WEBGPU_STATE.createBufferCalls.filter(
          (entry) =>
            entry.mappedAtCreation &&
            entry.usage === bufferUsage.STORAGE &&
            entry.size === matrix.byteLength
        ).length,
      };

      await module.webgpuScores(query, matrix, dim);

      const finalState = globalThis.__DMB_FAKE_WEBGPU_STATE;
      return {
        stateAfterWarmup,
        finalRequestAdapterCount: finalState.requestAdapterCalls.length,
        finalRequestDeviceCalls: finalState.requestDeviceCalls,
        finalMatrixUploadCount: finalState.createBufferCalls.filter(
          (entry) =>
            entry.mappedAtCreation &&
            entry.usage === bufferUsage.STORAGE &&
            entry.size === matrix.byteLength
        ).length,
      };
    }, { bufferUsage: GPU_BUFFER_USAGE });

    expect(result.stateAfterWarmup).toEqual({
      requestAdapterCount: 1,
      requestDeviceCalls: 1,
      matrixUploadCount: 0,
    });
    expect(result.finalRequestAdapterCount).toBe(1);
    expect(result.finalRequestDeviceCalls).toBe(1);
    expect(result.finalMatrixUploadCount).toBe(1);
  });

  test('matrix priming uploads the matrix before the first score', async ({ page }) => {
    await installFakeWebgpu(page);
    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(async ({ bufferUsage }) => {
      const module = await import('/webgpu.js');
      const dim = 3;
      const matrix = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
        1, 1, 1,
      ]);

      const primed = await module.primeWebgpuMatrix(matrix, dim);
      const afterPrime = {
        matrixUploadCount: globalThis.__DMB_FAKE_WEBGPU_STATE.createBufferCalls.filter(
          (entry) =>
            entry.mappedAtCreation &&
            entry.usage === bufferUsage.STORAGE &&
            entry.size === matrix.byteLength
        ).length,
        requestAdapterCount: globalThis.__DMB_FAKE_WEBGPU_STATE.requestAdapterCalls.length,
      };

      await module.webgpuScores(new Float32Array([1, 2, 3]), matrix, dim);

      const finalState = globalThis.__DMB_FAKE_WEBGPU_STATE;
      return {
        primed,
        afterPrime,
        finalMatrixUploadCount: finalState.createBufferCalls.filter(
          (entry) =>
            entry.mappedAtCreation &&
            entry.usage === bufferUsage.STORAGE &&
            entry.size === matrix.byteLength
        ).length,
        finalRequestAdapterCount: finalState.requestAdapterCalls.length,
      };
    }, { bufferUsage: GPU_BUFFER_USAGE });

    expect(result.primed).toBe(true);
    expect(result.afterPrime).toEqual({
      matrixUploadCount: 1,
      requestAdapterCount: 1,
    });
    expect(result.finalMatrixUploadCount).toBe(1);
    expect(result.finalRequestAdapterCount).toBe(1);
  });
});
