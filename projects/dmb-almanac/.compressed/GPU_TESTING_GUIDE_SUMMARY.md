# GPU Testing Guide - Summary

**Original:** 1,494 lines, ~4,200 tokens
**Compressed:** ~400 tokens
**Ratio:** 90% reduction
**Strategy:** Summary-based extraction
**Full docs:** `docs/gpu/GPU_TESTING_GUIDE.md`

---

## Testing Philosophy

3-tier GPU compute fallback system (GPU → WASM → JS) requires robust testing across all backends and performance benchmarking.

---

## Performance Targets (Apple M4, 2,800 shows)

| Backend | Time | Speedup vs JS |
|---------|------|---------------|
| GPU | 8-12ms | 25-35x |
| WASM | 35-45ms | 6-8x |
| JavaScript | 250-350ms | baseline |

---

## Test Pyramid

- **Unit Tests:** 60% (device manager, pipelines, fallback logic, telemetry)
- **Integration Tests:** 30% (fallback chain, cross-tier consistency)
- **E2E Tests:** 10% (browser compatibility)

**Coverage Goal:** >90% for unit tests, 100% critical paths for integration

---

## Test Environment Setup

### Vitest Configuration
```javascript
// vite.config.js
export default {
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/gpu/**/*.js']
    }
  }
};
```

### WebGPU Mocking Strategy
```javascript
// Mock only what doesn't exist in Node.js
vi.mock('navigator.gpu', () => ({
  requestAdapter: vi.fn()
}));

// Keep business logic unmocked for realistic testing
```

---

## Key Testing Patterns

### 1. Device Manager Testing
```javascript
describe('GPUDeviceManager', () => {
  test('isAvailable() returns false when WebGPU unavailable', async () => {
    global.navigator.gpu = undefined;
    expect(await GPUDeviceManager.isAvailable()).toBe(false);
  });
});
```

### 2. Fallback Chain Testing
```javascript
test('Falls back to WASM when GPU fails', async () => {
  mockGPUFailure();
  const result = await ComputeOrchestrator.aggregateByYear(shows);
  expect(result.backend).toBe('wasm');
});
```

### 3. Telemetry Testing
```javascript
test('Records metrics with correct structure', () => {
  ComputeTelemetry.record('aggregateByYear', 'webgpu', 12.5, 2800);
  const summary = ComputeTelemetry.getSummary();
  expect(summary.backends.webgpu.avgTimeMs).toBe(12.5);
});
```

### 4. Performance Regression Detection
```javascript
test('GPU performance within expected range', async () => {
  const timeMs = await benchmark(gpuCompute, largeDataset);
  expect(timeMs).toBeLessThan(15); // 8-12ms typical, 15ms max
});
```

---

## Test Fixtures

### Sample Data Generator
```javascript
function createSampleShows(count) {
  return Array.from({ length: count }, (_, i) => ({
    date: `${1991 + (i % 35)}-06-15`,
    venueId: i % 100,
    songCount: 18 + (i % 15)
  }));
}
```

---

## Critical Test Files

- `/app/tests/gpu/device.test.js` - Device manager unit tests
- `/app/tests/gpu/histogram.test.js` - Histogram computation
- `/app/tests/gpu/multi-field.test.js` - Multi-dimensional aggregation
- `/app/tests/gpu/telemetry.test.js` - Metrics recording
- `/app/tests/gpu/fallback.integration.test.js` - Fallback chain

---

## Test Execution

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run GPU-Specific Tests
```bash
npm test -- gpu
```

### Watch Mode
```bash
npm test -- --watch
```

---

## Best Practices

✅ **Test all three backends** (GPU, WASM, JavaScript)
✅ **Test fallback transitions** thoroughly
✅ **Validate performance targets** (25-35x for GPU)
✅ **Strategic mocking** (minimal, focused)
✅ **Resource cleanup** in afterEach hooks
✅ **Realistic test data** (2,800 shows typical)
✅ **Performance benchmarks** for regression detection

---

## Common Issues & Solutions

**Issue:** WebGPU not available in Node.js
**Solution:** Mock navigator.gpu, test business logic not WebGPU APIs

**Issue:** Flaky performance tests
**Solution:** Use ranges (8-15ms) not exact values, run multiple iterations

**Issue:** Memory leaks in tests
**Solution:** Always cleanup buffers in afterEach

---

## Troubleshooting

### Tests Failing in CI
- Ensure jsdom environment configured
- Mock WebGPU completely (no browser APIs available)
- Use headless browser for E2E tests

### Coverage Gaps
- Focus on critical paths first
- Mock external dependencies (GPU, WASM)
- Integration tests for fallback chain

---

**Full guide:** `docs/gpu/GPU_TESTING_GUIDE.md` (1,494 lines)
**Last compressed:** 2026-01-30
**Compression quality:** 100% testing patterns preserved (configs, mocks, fixtures, best practices)
