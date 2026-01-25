# Testing RUM Implementation

## Quick Start

1. **Start the dev server**
   ```bash
   npm run dev
   ```

2. **Open Chrome DevTools**
   - Navigate to http://localhost:5173
   - Open DevTools (F12 or Cmd+Option+I)
   - Go to Console tab

3. **Watch for RUM logs**
   You should see:
   ```
   [RUM] Starting Web Vitals tracking {
     sessionId: "...",
     pageLoadId: "...",
     device: { ... }
   }
   ```

## What to Expect

### On Page Load

Within a few seconds, you'll see metrics appear:

```
[RUM] FCP: 425.30ms (good)
[RUM] LCP: 892.30ms (good)
[RUM] CLS: 0.02 (good)
```

### After Interactions

Click buttons, navigate links:

```
[RUM] INP: 45.20ms (good)
```

### Every 10 Seconds (Batch Flush)

```
[RUM] Flushing metrics batch { count: 4, isFinal: false }
[RUM] Performance Metrics Batch
├─ Session: 1737568245123-abc123def
├─ Page Load: 1737568245123-xyz789uvw
│
├─ Metrics:
│  ┌────────┬────────────┬────────────────┬─────────────────┐
│  │ Metric │ Value      │ Rating         │ URL             │
│  ├────────┼────────────┼────────────────┼─────────────────┤
│  │ FCP    │ 425.30ms   │ good           │ /               │
│  │ LCP    │ 892.30ms   │ good           │ /               │
│  │ CLS    │ 0.02       │ good           │ /               │
│  │ INP    │ 45.20ms    │ good           │ /               │
│  └────────┴────────────┴────────────────┴─────────────────┘
│
└─ Device Info: {
    gpu: { renderer: "Apple M4 Pro", isAppleSilicon: true },
    connection: { effectiveType: "4g", downlink: 50, rtt: 20 },
    viewport: { width: 1920, height: 1080, devicePixelRatio: 2 }
  }
```

## Manual Testing Scenarios

### 1. Test LCP Attribution

Navigate to a page with a large image:
1. Go to http://localhost:5173/songs
2. Wait for LCP metric
3. Expand "LCP Attribution" in console
4. Check `elementSelector` and `url` fields

Expected:
```javascript
{
  elementSelector: "img.hero-image",
  url: "/images/hero.webp",
  timeToFirstByte: 120.5,
  resourceLoadDuration: 450.2,
  elementRenderDelay: 321.6
}
```

### 2. Test INP Attribution

Click interactive elements:
1. Click a show link
2. Wait for INP metric
3. Expand "INP Attribution"
4. Check interaction details

Expected:
```javascript
{
  interactionTarget: "a.show-link:nth-of-type(3)",
  interactionType: "pointer",
  inputDelay: 2.1,
  processingDuration: 35.8,
  presentationDelay: 7.3,
  longAnimationFrameEntries: []
}
```

### 3. Test CLS Attribution

Look for layout shifts:
1. Navigate to a data-heavy page
2. Wait for images/content to load
3. Check CLS metric
4. Expand "CLS Attribution"

Expected (good):
```javascript
{
  largestShiftTarget: "unknown",  // No shifts!
  largestShiftValue: 0,
  largestShiftTime: 0
}
```

Expected (needs improvement):
```javascript
{
  largestShiftTarget: "div.card-grid",
  largestShiftValue: 0.15,
  largestShiftTime: 1234.5
}
```

### 4. Test Batching

1. Navigate between several pages quickly
2. Wait 10 seconds
3. Check console for batch flush

Expected:
- One batch with multiple metrics
- All metrics from different pages included
- Device info sent once

### 5. Test Prerendering

If you have speculation rules enabled:
1. Hover over a link for 200ms+ (triggers prerender)
2. Click the link
3. Check `wasPrerendered` field in metrics

Expected:
```javascript
{
  name: "LCP",
  value: 50.2,  // Much faster!
  wasPrerendered: true
}
```

### 6. Test Endpoint

Test the API endpoint directly:
```bash
curl -X POST http://localhost:5173/api/telemetry/performance \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "pageLoadId": "test-load-456",
    "metrics": [
      {
        "name": "LCP",
        "value": 892.3,
        "rating": "good",
        "delta": 892.3,
        "id": "v1-123",
        "navigationType": "navigate",
        "attribution": {},
        "url": "/test",
        "timestamp": 1234567890,
        "wasPrerendered": false
      }
    ],
    "device": {
      "userAgent": "Test",
      "viewport": { "width": 1920, "height": 1080, "devicePixelRatio": 2 }
    },
    "timestamp": 1234567890
  }'
```

Expected server console output:
```
[Performance Telemetry] 2025-01-22T10:30:45.123Z
├─ Session: test-session-123
├─ Page Load: test-load-456
└─ LCP: 892.30ms (good)
```

## Testing in Production

### 1. Build and Preview

```bash
npm run build
npm run preview
```

Then test at http://localhost:4173

### 2. Expected Differences

- `enableLogging` will be `false` (no console logs)
- Metrics still sent to endpoint
- Check server logs for telemetry

### 3. Verify Endpoint

```bash
# Check server logs for:
[Performance Telemetry] ...
```

## Chrome DevTools Integration

### 1. Performance Insights

1. Open DevTools > Performance Insights
2. Click "Record"
3. Navigate/interact
4. Stop recording
5. Check "Core Web Vitals" section

Compare DevTools metrics with RUM console logs - they should match!

### 2. Lighthouse

```bash
# Run Lighthouse audit
npx lighthouse http://localhost:5173 --view
```

Compare Lighthouse scores with RUM metrics.

## Debugging Issues

### No RUM logs appearing?

Check:
1. Is data loaded? (wait for loading screen to finish)
2. Is `enableLogging` true? (default in dev mode)
3. Is RUM initialized? (look for "RUM tracking initialized" log)
4. Check browser console for errors

### Metrics seem wrong?

1. Use Chrome DevTools Performance Insights to verify
2. Check attribution data for clues
3. Compare with Lighthouse audit
4. Look for Long Animation Frames in INP attribution

### Endpoint not receiving data?

1. Check network tab in DevTools
2. Verify endpoint exists: http://localhost:5173/api/telemetry/performance
3. Check server logs
4. Try curl test (see above)

## Force Flush for Debugging

In browser console:
```javascript
// Import and flush immediately
const { flushRUMMetrics } = await import('/src/lib/utils/rum.ts');
await flushRUMMetrics();
```

## Browser Console Snippets

### Get current session ID
```javascript
const { getRUMSessionId } = await import('/src/lib/utils/rum.ts');
console.log('Session ID:', getRUMSessionId());
```

### Re-initialize with different config
```javascript
const { initRUM } = await import('/src/lib/utils/rum.ts');

// Note: Already initialized, but you can see the config
initRUM({
  enableLogging: true,
  sendImmediately: true  // Send each metric immediately
});
```

## Expected Timeline

```
0ms    - Page load starts
100ms  - RUM initialized
200ms  - TTFB metric
400ms  - FCP metric
900ms  - LCP metric (if good)
2000ms - CLS metric (after load)
[user interaction] - INP metric
10000ms - First batch flush
20000ms - Second batch flush
...
```

## Performance Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB | ≤ 800ms | ≤ 1800ms | > 1800ms |

**Note**: DMB Almanac targets are more aggressive (listed in RUM.md).

## Next Steps After Testing

1. **Verify metrics are accurate** - Compare with DevTools/Lighthouse
2. **Tune batch settings** - Adjust interval/size as needed
3. **Set up real endpoint** - Replace console logging with analytics
4. **Monitor in production** - Track trends over time
5. **Set up alerts** - Notify on regressions

## Common Issues

### "RUM Already initialized"
- Normal if you refresh page with hot reload
- RUM singleton persists across HMR updates
- Refresh page fully to reset

### "Failed to send metrics"
- Endpoint may not be running in test environment
- Falls back to console logging automatically
- Check network tab for details

### Metrics not batching
- Check `batchInterval` config
- Verify 10 seconds has passed
- Force flush with `flushRUMMetrics()`

## Success Criteria

✅ RUM logs appear on page load
✅ Metrics collected for all Core Web Vitals
✅ Attribution data provides useful debugging info
✅ Batches flush every 10 seconds
✅ Endpoint receives metrics (or logs to console)
✅ Device info collected correctly
✅ Apple Silicon detected (if applicable)
✅ Prerendering respected (metrics delayed until visible)

If all above pass, RUM is working correctly!
