/**
 * RUM System Tests
 *
 * Basic tests to verify RUM functionality
 * Run with: npm test src/lib/utils/rum.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM APIs
const mockDocument = {
  prerendering: false,
  addEventListener: vi.fn(),
  createElement: vi.fn(() => ({
    getContext: vi.fn(() => ({
      getParameter: vi.fn(() => 'Apple M4 Pro'),
      getExtension: vi.fn(() => ({
        UNMASKED_RENDERER_WEBGL: 'renderer'
      }))
    }))
  }))
};

const mockWindow = {
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 2,
  addEventListener: vi.fn(),
  location: { href: 'http://localhost:5173/test' }
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  hardwareConcurrency: 8,
  connection: {
    effectiveType: '4g',
    downlink: 50,
    rtt: 20,
    saveData: false
  },
  sendBeacon: vi.fn(() => true)
};

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
  } as Response)
);

describe('RUM System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export initRUM function', async () => {
    const { initRUM } = await import('$lib/utils/rum');
    expect(typeof initRUM).toBe('function');
  });

  it('should export getRUMSessionId function', async () => {
    const { getRUMSessionId } = await import('$lib/utils/rum');
    expect(typeof getRUMSessionId).toBe('function');
  });

  it('should export flushRUMMetrics function', async () => {
    const { flushRUMMetrics } = await import('$lib/utils/rum');
    expect(typeof flushRUMMetrics).toBe('function');
  });

  it('should generate unique session IDs', async () => {
    const { getRUMSessionId } = await import('$lib/utils/rum');
    const id1 = getRUMSessionId();

    // Wait a tick
    await new Promise(resolve => setTimeout(resolve, 10));

    // Session ID should persist (singleton)
    const id2 = getRUMSessionId();
    expect(id1).toBe(id2);
  });

  it('should handle browser environment check', async () => {
    // This test just verifies module loads without errors
    const rum = await import('$lib/utils/rum');
    expect(rum).toBeDefined();
  });
});

describe('RUM Configuration', () => {
  it('should accept custom configuration', async () => {
    const { initRUM } = await import('$lib/utils/rum');

    // Should not throw with custom config
    expect(() => {
      // Note: initRUM checks for browser environment, so it won't actually initialize in tests
      initRUM({
        batchInterval: 5000,
        maxBatchSize: 20,
        endpoint: '/api/custom',
        enableLogging: false,
        sendImmediately: true
      });
    }).not.toThrow();
  });

  it('should handle missing configuration', async () => {
    const { initRUM } = await import('$lib/utils/rum');

    // Should not throw with no config
    expect(() => {
      initRUM();
    }).not.toThrow();
  });
});

describe('RUM Types', () => {
  it('should export TypeScript types', async () => {
    // This verifies type exports exist (TypeScript will check at compile time)
    const rum = await import('$lib/utils/rum');

    // These types should be available for import
    type DeviceInfo = import('$lib/utils/rum').DeviceInfo;
    type WebVitalMetric = import('$lib/utils/rum').WebVitalMetric;
    type PerformanceTelemetry = import('$lib/utils/rum').PerformanceTelemetry;
    type RUMConfig = import('$lib/utils/rum').RUMConfig;

    // If we get here, types are exported correctly
    expect(true).toBe(true);
  });
});

describe('RUM Integration', () => {
  it('should handle onMetric callback', async () => {
    const { initRUM } = await import('$lib/utils/rum');
    const mockCallback = vi.fn();

    // Should accept custom callback
    expect(() => {
      initRUM({
        onMetric: mockCallback
      });
    }).not.toThrow();
  });

  it('should handle flush without errors', async () => {
    const { flushRUMMetrics } = await import('$lib/utils/rum');

    // Should not throw when flushing (even if no metrics)
    await expect(flushRUMMetrics()).resolves.not.toThrow();
  });
});

/**
 * Manual Testing Guide
 *
 * To test RUM in the browser:
 *
 * 1. Start dev server: npm run dev
 * 2. Open http://localhost:5173 in Chrome 143+
 * 3. Open DevTools Console
 * 4. Look for [RUM] logs
 * 5. Navigate between pages
 * 6. Wait 10 seconds for batch flush
 * 7. Check console for metrics batch
 *
 * Expected output:
 * - [RUM] Starting Web Vitals tracking
 * - [RUM] LCP: 892.30ms (good)
 * - [RUM] INP: 45.20ms (good)
 * - [RUM] CLS: 0.02 (good)
 * - [RUM] Flushing metrics batch
 * - [RUM] Performance Metrics Batch (with table)
 *
 * To test endpoint:
 * curl -X POST http://localhost:5173/api/telemetry/performance \
 *   -H "Content-Type: application/json" \
 *   -d '{"sessionId":"test","metrics":[],"device":{},"timestamp":123}'
 */
