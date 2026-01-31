---
name: dmb-almanac-rum
version: 1.0.0
description: npm install
recommended_tier: sonnet
author: Claude Code
created: 2026-01-25
updated: 2026-01-25
category: scraping
complexity: intermediate
tags:
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/RUM_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# RUM Quick Reference Card


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Installation & Setup

```bash
# Already installed!
npm install
npm run dev
```

## Files to Know

| File | Purpose |
|------|---------|
| `src/lib/utils/rum.ts` | Core RUM implementation |
| `src/routes/api/telemetry/performance/+server.ts` | Metrics endpoint |
| `src/routes/+layout.svelte` | RUM initialization |
| `docs/RUM.md` | Full documentation |

## API

### Initialize
```typescript
import { initRUM } from '$lib/utils/rum';

// Basic
initRUM();

// Custom
initRUM({
  batchInterval: 10000,    // 10 seconds
  maxBatchSize: 10,        // 10 metrics
  endpoint: '/api/...',
  enableLogging: true,
  sendImmediately: false,
  onMetric: (metric) => { /* ... */ }
});
```

### Get Session ID
```typescript
import { getRUMSessionId } from '$lib/utils/rum';
console.log(getRUMSessionId());
```

### Force Flush
```typescript
import { flushRUMMetrics } from '$lib/utils/rum';
await flushRUMMetrics();
```

## Metrics Tracked

| Metric | Target | What It Measures |
|--------|--------|------------------|
| **LCP** | < 1.0s | Largest content paint |
| **INP** | < 100ms | Interaction latency |
| **CLS** | < 0.05 | Layout shift |
| **FCP** | < 1.0s | First content paint |
| **TTFB** | < 400ms | Server response time |

## Attribution Data

### LCP
- Element selector
- Resource URL
- Timing breakdown

### INP
- Event type
- Target element
- Long Animation Frames

### CLS
- Largest shifting element
- Shift value/timing

## Console Output

Look for these logs in DevTools:

```
[RUM] Starting Web Vitals tracking
[RUM] LCP: 892.30ms (good)
[RUM] INP: 45.20ms (good)
[RUM] CLS: 0.02 (good)
[RUM] Flushing metrics batch
[RUM] Performance Metrics Batch (table view)
```

## Testing

### Browser
```bash
npm run dev
# Open http://localhost:5173
# Check DevTools Console for [RUM] logs
```

### Endpoint
```bash
curl -X POST http://localhost:5173/api/telemetry/performance \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","metrics":[],"device":{},"timestamp":123}'
```

### Tests
```bash
npm test src/lib/utils/rum.test.ts
```

## Integration Examples

### Google Analytics
```typescript
initRUM({
  onMetric: (metric) => {
    gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating
    });
  }
});
```

### Custom Endpoint
Update `src/routes/api/telemetry/performance/+server.ts`:
```typescript
export const POST: RequestHandler = async ({ request }) => {
  const payload = await request.json();
  // Send to your analytics service
  await yourAnalytics.track(payload);
  return json({ success: true });
};
```

## Device Info Collected

- User agent
- Viewport size
- Network connection (type, speed, RTT)
- Memory usage
- Hardware cores
- GPU renderer (Apple Silicon detection)

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `batchInterval` | 10000 | Batch flush interval (ms) |
| `maxBatchSize` | 10 | Max metrics per batch |
| `endpoint` | `/api/telemetry/performance` | API endpoint |
| `enableLogging` | dev: true, prod: false | Console logging |
| `sendImmediately` | false | Send without batching |
| `onMetric` | undefined | Custom callback |

## Debugging

### No logs?
1. Wait for data to load (status === 'ready')
2. Check `enableLogging` is true
3. Refresh browser fully (not HMR)

### Wrong metrics?
1. Use Chrome DevTools Performance Insights
2. Check attribution data
3. Compare with Lighthouse

### Endpoint issues?
1. Check network tab
2. Verify endpoint exists
3. Check server logs

## Browser Console Snippets

```javascript
// Get session ID
const { getRUMSessionId } = await import('/src/lib/utils/rum.ts');
console.log(getRUMSessionId());

// Force flush
const { flushRUMMetrics } = await import('/src/lib/utils/rum.ts');
await flushRUMMetrics();
```

## Performance Impact

- **Init**: < 5ms
- **Per-metric**: < 1ms
- **Network**: 1 req/10s
- **Memory**: ~100KB

## Browser Support

- Chrome 143+: Full support
- Chrome 123+: Long Animation Frames
- Chrome 109+: Prerendering
- Chrome 96+: Attribution
- Chrome 77+: Basic web-vitals

## Common Issues

| Issue | Solution |
|-------|----------|
| "Already initialized" | Expected during HMR, full refresh to reset |
| No metrics | Wait for page load, check enableLogging |
| Failed to send | Endpoint may not exist, falls back to console |

## Documentation

- **Full Docs**: `docs/RUM.md`
- **Implementation**: `RUM_IMPLEMENTATION.md`
- **Testing**: `TESTING_RUM.md`
- **Complete**: `RUM_COMPLETE.md`

## Quick Checklist

- [x] web-vitals installed
- [x] rum.ts implemented
- [x] API endpoint created
- [x] Layout integration
- [x] Tests passing
- [ ] Test in browser
- [ ] Verify metrics
- [ ] Check endpoint
- [ ] Deploy to production

---

**Status**: Ready to test!

**Next Step**: Run `npm run dev` and open DevTools Console
