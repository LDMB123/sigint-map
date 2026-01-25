# DMB Almanac - Debugging Setup Checklist

Quick reference for debugging infrastructure status and next steps.

---

## Current Implementation Status

### Level 1: Core Monitoring (✓ Complete)

- [x] **Console Logging**
  - Location: `/src/lib/errors/logger.ts`
  - 66 files using structured [PREFIX] format
  - Development vs. Production modes
  - Session ID correlation
  - Status: Production-ready

- [x] **Real User Monitoring (RUM)**
  - Location: `/src/lib/utils/rum.ts`
  - Core Web Vitals: LCP, INP, CLS, FCP, TTFB
  - Attribution data for each metric
  - Device info collection
  - Batching strategy (10s intervals)
  - Status: Production-ready

- [x] **Error Handling**
  - Location: `/src/lib/errors/handler.ts`
  - 6 custom error types with type guards
  - Centralized error routing
  - Recovery strategies (retry, fallback)
  - Global error listeners
  - Status: Production-ready

- [x] **Memory Management**
  - Location: `/src/lib/utils/memory-monitor.ts`
  - Heap tracking with leak detection
  - Threshold-based alerts
  - Growth rate monitoring
  - Status: Production-ready

- [x] **Performance Measurement**
  - Location: `/src/lib/utils/performance.ts`
  - Long Animation Frame monitoring (Chrome 123+)
  - Scheduler.yield() support (Chrome 129+)
  - Speculation Rules (Chrome 121+)
  - View Transitions (Chrome 111+)
  - Status: Production-ready

- [x] **INP Optimization**
  - Location: `/src/lib/utils/inpOptimization.ts`
  - Yielding handlers
  - Progressive rendering
  - Interaction measurement
  - Status: Production-ready

- [x] **Apple Silicon Detection**
  - WebGL renderer detection
  - GPU capability detection
  - UMA pressure awareness
  - Status: Production-ready

---

## Deployment Checklist

### Before Going to Production

- [ ] **1. Enable RUM Monitoring**
  ```typescript
  // In +layout.svelte or +page.ts
  import { initRUM } from '$lib/utils/rum';

  if (browser) {
    initRUM({
      batchInterval: 10000,
      endpoint: '/api/telemetry/performance',
      enableLogging: import.meta.env.DEV
    });
  }
  ```

- [ ] **2. Setup Global Error Handlers**
  ```typescript
  import { setupGlobalErrorHandlers } from '$lib/errors/handler';

  setupGlobalErrorHandlers();
  ```

- [ ] **3. Initialize Scheduler Monitoring**
  ```typescript
  import { initSchedulerMonitoring } from '$lib/utils/scheduler';

  initSchedulerMonitoring();
  ```

- [ ] **4. Verify Telemetry Endpoint**
  - [ ] `/api/telemetry/performance` endpoint is working
  - [ ] CORS headers correctly configured
  - [ ] CSRF validation enabled
  - [ ] Rate limiting applied

- [ ] **5. Test Console Logging**
  - [ ] Open DevTools Console
  - [ ] Check for [RUM], [Performance], [INP] prefixed messages
  - [ ] Verify context objects are logged

- [ ] **6. Monitor in Development**
  ```typescript
  // In development:
  // npx tsx scripts/dev-monitor.ts
  ```

- [ ] **7. Set Up Error Handler Callbacks**
  ```typescript
  import { errorLogger } from '$lib/errors/logger';

  errorLogger.onError(async (report) => {
    // Send to external service (Sentry, LogRocket, etc.)
    await fetch('/api/errors', {
      method: 'POST',
      body: JSON.stringify(report)
    });
  });
  ```

---

## Testing Checklist

### Manual Testing

- [ ] **Test LCP**
  - Load page
  - Check console for LCP metric and attribution
  - Verify element selector captured

- [ ] **Test INP**
  - Interact with page (click, type, etc.)
  - Check console for INP metric
  - Verify interaction target and timing breakdown

- [ ] **Test CLS**
  - Load page with ads/images
  - Watch for layout shifts
  - Verify CLS metric in console

- [ ] **Test Error Handling**
  - Trigger an error: `throw new Error('Test error')`
  - Verify error appears in error logger
  - Check that global handler captured it

- [ ] **Test Memory Monitoring**
  ```typescript
  // In DevTools console
  import { memoryMonitor } from '$lib/utils/memory-monitor';
  memoryMonitor.start();
  memoryMonitor.getReport();
  ```

- [ ] **Test Network**
  - Simulate offline: DevTools > Network > Offline
  - Make request
  - Verify error handling works

### Performance Testing

- [ ] **Lighthouse Audit**
  ```bash
  npm run build
  npm run preview
  # Run Lighthouse from Chrome DevTools
  ```

- [ ] **Memory Leak Testing**
  ```typescript
  import { detectMemoryLeak } from '$lib/utils/memory-monitor';

  detectMemoryLeak('Operation name', () => {
    // Test operation
  }, { iterations: 10, expectedGrowthMB: 5 });
  ```

- [ ] **INP Testing**
  - Use Web Vitals extension
  - Interact and measure response time
  - Should be < 100ms

- [ ] **Apple Silicon Specific**
  - Run on actual Apple Silicon Mac
  - Check GPU detection: `detectChromiumCapabilities()`
  - Monitor E-core vs P-core distribution

---

## Monitoring Dashboard

### Key Metrics to Watch

**Real-Time (Console)**
```javascript
// In Chrome DevTools Console
sessionStorage.setItem('RUM_DEBUG', 'true');  // Enable verbose RUM logging
```

**Health Checks**
- [ ] RUM metrics flowing: Check `/api/telemetry/performance` requests
- [ ] No error spikes: Watch error logger for patterns
- [ ] Memory stable: Check heap size in DevTools Memory tab
- [ ] Network healthy: Check Network tab for failures

### Metrics to Track

| Metric | Target | Alert Level | File |
|--------|--------|-------------|------|
| LCP | < 1.0s | > 2.5s | rum.ts |
| INP | < 100ms | > 200ms | inpOptimization.ts |
| CLS | < 0.05 | > 0.1 | performance.ts |
| FCP | < 1.0s | > 1.8s | rum.ts |
| Heap Growth | < 1MB/s | > 5MB/s | memory-monitor.ts |
| Long Tasks | 0/page | > 5/page | performance.ts |
| Error Rate | < 0.1% | > 1% | handler.ts |

---

## API Integration

### Telemetry Endpoint

**POST /api/telemetry/performance**

```typescript
// Request
{
  sessionId: string,
  pageLoadId: string,
  metrics: WebVitalMetric[],
  device: DeviceInfo,
  timestamp: number
}

// Response
{
  success: true,
  received: number,
  skipped: number
}
```

**Color-coded output (dev mode):**
- Green: Good rating (< 75th percentile)
- Yellow: Needs improvement (75-90th percentile)
- Red: Poor (> 90th percentile)

---

## Troubleshooting

### Issue: No metrics in console

**Solution:**
```typescript
// Check if RUM is initialized
import { getRUMSessionId } from '$lib/utils/rum';
console.log('RUM Session:', getRUMSessionId());

// Check if enabled
import { initRUM } from '$lib/utils/rum';
initRUM({ enableLogging: true });
```

### Issue: High memory usage

**Solution:**
```typescript
// Start memory monitor to identify leaks
import { memoryMonitor, detectMemoryLeak } from '$lib/utils/memory-monitor';

memoryMonitor.start();

// Test specific operation
detectMemoryLeak('ComponentName', () => {
  // Operation that might leak
}, { expectedGrowthMB: 5 });
```

### Issue: High INP

**Solution:**
1. Check console for [INP] warnings
2. Look for long-running handlers
3. Use `measureInteractionTime()` to identify bottleneck
4. Apply `yieldingHandler()` or `progressiveRender()`

### Issue: Endpoint not receiving metrics

**Solution:**
```typescript
// Metrics fallback to console logging if endpoint unavailable
// Check browser console for [RUM] JSON Payload
// Verify endpoint: curl -X OPTIONS http://localhost:5173/api/telemetry/performance

// In production, verify:
// 1. Endpoint exists
// 2. CORS headers correct
// 3. CSRF token validation
// 4. Rate limits not exceeded
```

### Issue: Prerendered pages showing wrong metrics

**Solution:**
```typescript
// RUM automatically detects prerendering
// If document.prerendering === true, waits for 'prerenderingchange'
// This prevents tracking prerendered pages user never views

// Verify in console:
console.log('Prerendering:', document.prerendering);
```

---

## Files Reference

### Core Debugging Files
- `/src/lib/utils/rum.ts` - Real User Monitoring (753 lines)
- `/src/lib/utils/performance.ts` - Performance utilities (459 lines)
- `/src/lib/utils/scheduler.ts` - Scheduler API (653 lines)
- `/src/lib/utils/inpOptimization.ts` - INP utilities (404 lines)
- `/src/lib/utils/memory-monitor.ts` - Memory tracking (451 lines)
- `/src/lib/errors/logger.ts` - Error logging (327 lines)
- `/src/lib/errors/handler.ts` - Error handling (379 lines)

### API & Endpoints
- `/src/routes/api/telemetry/performance/+server.ts` - Telemetry endpoint (286 lines)
- `/src/routes/api/analytics/+server.ts` - Analytics endpoint

### Supporting Files
- `/src/lib/errors/types.ts` - Error type definitions
- `/src/lib/security/csrf.ts` - CSRF protection

---

## Advanced Configuration

### Custom RUM Configuration

```typescript
import { initRUM } from '$lib/utils/rum';

initRUM({
  batchInterval: 5000,           // Batch every 5s instead of 10s
  maxBatchSize: 20,              // More metrics per batch
  endpoint: '/api/metrics',      // Custom endpoint
  enableLogging: true,           // Always log (override dev check)
  sendImmediately: false,        // Use batching
  onMetric: (metric) => {
    // Send to custom analytics
    console.log(`Metric: ${metric.name} = ${metric.value}ms`);
  }
});
```

### Custom Error Handlers

```typescript
import { errorLogger } from '$lib/errors/logger';

// Send errors to external service
errorLogger.onError(async (report) => {
  await fetch('https://sentry.io/api/events/', {
    method: 'POST',
    body: JSON.stringify({
      message: report.message,
      level: report.level,
      tags: {
        sessionId: report.sessionId,
        url: report.url
      }
    })
  });
});
```

### Memory Monitoring Thresholds

```typescript
import { memoryMonitor } from '$lib/utils/memory-monitor';

memoryMonitor.setThresholds({
  warnThreshold: 150,           // Warn at 150MB (default 100MB)
  criticalThreshold: 300,       // Critical at 300MB (default 200MB)
  growthRateWarn: 2,            // 2MB/s (default 1MB/s)
  growthRateCritical: 10        // 10MB/s (default 5MB/s)
});
```

---

## Performance Targets

### Core Web Vitals Goals

| Metric | Good | Needs Improvement | Poor |
|--------|------|------------------|------|
| LCP | ≤ 1.0s | ≤ 2.5s | > 2.5s |
| INP | ≤ 100ms | ≤ 200ms | > 200ms |
| CLS | ≤ 0.05 | ≤ 0.1 | > 0.1 |
| FCP | ≤ 1.0s | ≤ 1.8s | > 1.8s |
| TTFB | ≤ 400ms | ≤ 800ms | > 800ms |

### Apple Silicon Targets

- P-core utilization: < 80% during user interaction
- E-core for background tasks: > 50%
- GPU utilization: < 70%
- Memory pressure: < 70% of UMA

---

## Quick Start Commands

### Development

```bash
# Start dev server with monitoring
npm run dev

# Watch console for [RUM], [Performance], [INP] logs
# Open http://localhost:5173

# Test memory monitoring
# In console: memoryMonitor.start()
```

### Production Build

```bash
# Build with RUM enabled
npm run build

# Preview production build
npm run preview

# Metrics will post to /api/telemetry/performance
```

### Testing

```bash
# Type check
npm run check

# Run tests
npm run test

# Generate coverage
npm run test -- --coverage
```

---

## Support & Resources

### Documentation
- `/DEVTOOLS_DEBUGGING_ANALYSIS.md` - Comprehensive analysis
- `/DEVTOOLS_IMPLEMENTATION_GUIDE.md` - CDP integration examples
- `CLAUDE.md` - Project runbook

### External Resources
- [Web Vitals Documentation](https://web.dev/vitals/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Long Animation Frames API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [Scheduler API](https://developer.chrome.com/blog/scheduler-api/)

### Key Contact Points
- Error Logging: `errorLogger` singleton
- RUM Metrics: `initRUM()` function
- Memory Monitoring: `memoryMonitor` singleton
- Performance: `detectChromiumCapabilities()`

---

## Sign-Off Checklist

- [ ] All core debugging systems enabled
- [ ] Telemetry endpoint tested
- [ ] Error handling verified
- [ ] Memory monitoring baseline established
- [ ] Performance targets documented
- [ ] Team trained on metrics
- [ ] Alerting configured (if applicable)
- [ ] Documentation reviewed
- [ ] Ready for production deployment

---

**Last Updated:** 2026-01-23
**Status:** Complete and Production-Ready
**Next Step:** Deploy to production with monitoring enabled
