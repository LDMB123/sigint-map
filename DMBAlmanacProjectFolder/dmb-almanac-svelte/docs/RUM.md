# Real User Monitoring (RUM) System

## Overview

The DMB Almanac implements comprehensive Real User Monitoring (RUM) using the `web-vitals` library to track Core Web Vitals and performance metrics. This system is optimized for Chromium 143+ on Apple Silicon (macOS 26.2).

## Features

- **Core Web Vitals Tracking**: LCP, INP, CLS, FCP, TTFB
- **Attribution Data**: Detailed debugging information for each metric
- **Batching Strategy**: Efficient metric collection with configurable intervals
- **Prerendering Support**: Respects prerendered pages (no metrics for unseen pages)
- **Device Context**: Collects device, connection, and GPU information
- **Apple Silicon Detection**: Identifies M-series chips for platform-specific insights
- **Flexible Endpoint**: Console logging with easy swap to real analytics provider

## Implementation

### 1. Core Files

#### `src/lib/utils/rum.ts`
Main RUM implementation with web-vitals integration:
- `initRUM(config)` - Initialize tracking
- `getRUMSessionId()` - Get current session ID
- `flushRUMMetrics()` - Force immediate flush

#### `src/routes/api/telemetry/performance/+server.ts`
Simple API endpoint for receiving metrics:
- Currently logs to console with structured format
- Easy to swap for real analytics provider (GA4, New Relic, etc.)

#### `src/routes/+layout.svelte`
Root layout integration:
- Initializes RUM after data loads (not during loading screen)
- Respects prerendering state
- Configures batching and endpoint

### 2. Usage

#### Basic Initialization
```typescript
import { initRUM } from '$lib/utils/rum';

// Default config
initRUM();
```

#### Custom Configuration
```typescript
initRUM({
  batchInterval: 5000,        // Batch every 5 seconds
  maxBatchSize: 20,           // Max 20 metrics per batch
  endpoint: '/api/metrics',   // Custom endpoint
  enableLogging: true,        // Console logging
  sendImmediately: false      // Batch for efficiency
});
```

#### With External Analytics
```typescript
initRUM({
  onMetric: (metric) => {
    // Send to Google Analytics
    if ('gtag' in window) {
      gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_rating: metric.rating,
        metric_id: metric.id
      });
    }

    // Or send to custom analytics
    analytics.track('web_vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating
    });
  }
});
```

## Metrics Tracked

### LCP (Largest Contentful Paint)
**Target**: < 1.0s

**Attribution Data**:
- Element selector (e.g., `img.hero-image`)
- Resource URL
- Time to First Byte
- Resource load delay/duration
- Element render delay

**Use Case**: Identify slow-loading hero images or content blocks

### INP (Interaction to Next Paint)
**Target**: < 100ms

**Attribution Data**:
- Event type (click, keydown, etc.)
- Target element selector
- Input delay
- Processing duration
- Presentation delay
- Long Animation Frames (with script details)

**Use Case**: Debug slow interactions, identify blocking scripts

### CLS (Cumulative Layout Shift)
**Target**: < 0.05

**Attribution Data**:
- Largest shifting element selector
- Shift value
- Shift timing
- Load state (loading vs. loaded)

**Use Case**: Find elements causing layout shifts (images without dimensions, dynamic content)

### FCP (First Contentful Paint)
**Target**: < 1.0s

**Attribution Data**:
- Time to First Byte
- Time from TTFB to FCP
- Navigation entry details

**Use Case**: Measure initial rendering speed

### TTFB (Time to First Byte)
**Target**: < 400ms

**Attribution Data**:
- DNS duration
- Connection duration
- Request duration
- Cache duration
- Waiting duration

**Use Case**: Identify server or network issues

## Device Information

Each metric batch includes comprehensive device context:

```typescript
{
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  connection: {
    effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
    downlink: number;      // Mbps
    rtt: number;           // ms
    saveData: boolean;
  };
  memory: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  hardware: {
    hardwareConcurrency: number;
    deviceMemory: number;
  };
  gpu: {
    renderer: string;
    isAppleSilicon: boolean;
  };
}
```

## Batching Strategy

### Default Behavior
- **Batch Interval**: 10 seconds
- **Max Batch Size**: 10 metrics
- **Method**: Automatic flush on interval or when batch is full

### Why Batching?
- Reduces network overhead (fewer requests)
- Minimizes impact on performance
- Groups related metrics together

### Manual Flush
```typescript
import { flushRUMMetrics } from '$lib/utils/rum';

// Force immediate flush (useful for debugging)
await flushRUMMetrics();
```

### Automatic Flush Triggers
1. Batch interval reached (10s default)
2. Batch size limit reached (10 metrics default)
3. Page unload (`beforeunload` event)
4. Page hide (`pagehide` event - more reliable on mobile)

## Prerendering Support

The RUM system respects Chrome's prerendering feature:

```typescript
// Check prerendering state
if (document.prerendering) {
  // Wait for page to become visible
  document.addEventListener('prerenderingchange', () => {
    // Now start tracking metrics
    initRUM();
  });
}
```

**Why This Matters**:
- Prerendered pages may never be seen by the user
- Tracking metrics for unseen pages skews data
- Respecting prerendering improves accuracy

## Integration Examples

### Google Analytics 4

```typescript
initRUM({
  onMetric: (metric) => {
    gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_delta: metric.delta,
      metric_id: metric.id,
      non_interaction: true
    });
  }
});
```

### Custom Database (Server-Side)

Update `src/routes/api/telemetry/performance/+server.ts`:

```typescript
import db from '$lib/db/server';

export const POST: RequestHandler = async ({ request }) => {
  const payload: PerformanceTelemetry = await request.json();

  // Insert into SQLite
  const stmt = db.prepare(`
    INSERT INTO performance_metrics (
      session_id, metric_name, metric_value, metric_rating,
      url, attribution, device_info, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const metric of payload.metrics) {
    stmt.run(
      payload.sessionId,
      metric.name,
      metric.value,
      metric.rating,
      metric.url,
      JSON.stringify(metric.attribution),
      JSON.stringify(payload.device),
      metric.timestamp
    );
  }

  return json({ success: true });
};
```

### Third-Party APM (New Relic, Datadog, etc.)

```typescript
import { newrelic } from '@newrelic/browser-agent';

initRUM({
  onMetric: (metric) => {
    newrelic.addPageAction('WebVital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      url: metric.url
    });
  }
});
```

### IndexedDB Queue (Offline Support)

```typescript
import { db } from '$lib/db/dexie';

initRUM({
  endpoint: '/api/telemetry/performance',
  onMetric: async (metric) => {
    // Queue for offline sync
    await db.performanceQueue.add({
      metric,
      createdAt: Date.now(),
      synced: false
    });
  }
});

// Sync when online
window.addEventListener('online', async () => {
  const pending = await db.performanceQueue.where('synced').equals(false).toArray();

  for (const item of pending) {
    await fetch('/api/telemetry/performance', {
      method: 'POST',
      body: JSON.stringify(item.metric)
    });

    await db.performanceQueue.update(item.id, { synced: true });
  }
});
```

## Console Output Format

When logging to console (dev mode or endpoint unavailable):

```
[RUM] Performance Metrics Batch
├─ Session: abc123-def456
├─ Page Load: xyz789-uvw012
├─ Timestamp: 2025-01-22T10:30:45.123Z
│
├─ Metrics Table:
│  ┌────────┬────────────┬────────────────┬─────────────────┬──────────────┐
│  │ Metric │ Value      │ Rating         │ URL             │ Prerendered  │
│  ├────────┼────────────┼────────────────┼─────────────────┼──────────────┤
│  │ LCP    │ 892.30ms   │ good           │ /songs/ants     │ false        │
│  │ INP    │ 45.20ms    │ good           │ /songs/ants     │ false        │
│  │ CLS    │ 0.02       │ good           │ /songs/ants     │ false        │
│  └────────┴────────────┴────────────────┴─────────────────┴──────────────┘
│
├─ Device Info:
│  ├─ GPU: Apple M4 Pro (Apple Silicon)
│  ├─ Connection: 4g (50 Mbps, 20ms RTT)
│  └─ Viewport: 1920x1080 @2x
│
└─ [Expand for attribution details]
```

## Performance Best Practices

### 1. Initialize After Data Loads
```typescript
// Wait for data to be ready
$effect(() => {
  if ($dataState.status === 'loaded') {
    initRUM();
  }
});
```

### 2. Use Batching (Default)
```typescript
// Good - batches metrics
initRUM({ sendImmediately: false });

// Avoid - sends every metric individually
initRUM({ sendImmediately: true });
```

### 3. Respect Prerendering
```typescript
// Handled automatically by RUM system
// Metrics only collected when page becomes visible
```

### 4. Send Beacons on Unload
```typescript
// Handled automatically by RUM system
// Uses sendBeacon API for reliable final flush
```

## Debugging

### View Metrics in Console
```typescript
initRUM({
  enableLogging: true  // Always log to console
});
```

### Force Immediate Flush
```typescript
import { flushRUMMetrics } from '$lib/utils/rum';

// In browser console
await flushRUMMetrics();
```

### Check Attribution Data
```typescript
initRUM({
  onMetric: (metric) => {
    console.log(`${metric.name}:`, metric.attribution);
  }
});
```

### Test Endpoint
```bash
# Send test payload
curl -X POST http://localhost:5173/api/telemetry/performance \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "pageLoadId": "test-456",
    "metrics": [],
    "device": {},
    "timestamp": 1234567890
  }'
```

## Performance Impact

The RUM system is designed for minimal performance overhead:

- **Initialization**: < 5ms
- **Metric Collection**: < 1ms per metric
- **Batching**: No blocking operations
- **Network**: 1 request per 10 seconds (default)
- **Memory**: ~100KB for tracking state

## Browser Support

- **Core Web Vitals**: Chrome 77+ (full support in 143+)
- **Attribution API**: Chrome 96+
- **Long Animation Frames**: Chrome 123+
- **Prerendering Detection**: Chrome 109+

Gracefully degrades on older browsers.

## Roadmap

- [ ] Real-time dashboard for metrics visualization
- [ ] Alerting for performance regressions
- [ ] Percentile aggregations (p50, p75, p95, p99)
- [ ] Segmentation by device, connection, route
- [ ] A/B test integration for performance experiments
- [ ] Synthetic monitoring integration (Lighthouse CI)

## References

- [Web Vitals Documentation](https://web.dev/vitals/)
- [web-vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames/)
