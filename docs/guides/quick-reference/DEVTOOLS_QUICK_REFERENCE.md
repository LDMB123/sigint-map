# Chrome DevTools MCP Integration - Quick Reference Guide
## DMB Almanac PWA

---

## 1. Initialize DevTools Features

```javascript
// In your layout or startup hook
import { initPerformanceMonitoring } from '$lib/utils/performance';
import { initEnhancedRUM } from '$lib/monitoring/rum';
import { initErrorMonitoring } from '$lib/monitoring/errors';
import { initPerformanceMonitoring as initPerfMonitoring } from '$lib/monitoring/performance';

// Call these once on app startup
initPerformanceMonitoring();           // LoAF + scheduler.yield() detection
initEnhancedRUM({ enabled: true });    // Business metrics + RUM
initErrorMonitoring();                 // Global error handlers
initPerfMonitoring();                  // Performance observer setup
```

---

## 2. Error Monitoring

### Capture Errors with Context
```javascript
import { captureError, addBreadcrumb, setUser, setTags } from '$lib/monitoring/errors';

try {
  await riskyOperation();
} catch (error) {
  captureError(error, {
    tags: { operation: 'risky_operation', severity: 'high' },
    extra: { userId: user.id, context: 'payment' }
  });
}
```

### Add Breadcrumbs Manually
```javascript
addBreadcrumb({
  category: 'user',
  level: 'info',
  message: 'User navigated to settings',
  data: { route: '/settings' }
});
```

### Set User Context
```javascript
setUser({ id: '12345', sessionId: 'abc-def' });
setTags({ environment: 'production', version: '1.2.3' });
```

---

## 3. Performance Measurement

### Track Operations
```javascript
import { mark, measure, timeAsync, timeSync } from '$lib/monitoring/performance';

// Sync operation
const result = timeSync('parse-json', () => {
  return JSON.parse(largeString);
});

// Async operation
const data = await timeAsync('fetch-songs', async () => {
  return fetch('/api/songs').then(r => r.json());
});

// Manual marks
mark('operation-start', { table: 'songs' });
// ... do work ...
mark('operation-end');
const measure = measure('operation', 'operation-start', 'operation-end');
console.log(`Operation took ${measure.duration}ms`);
```

### Get Performance Metrics
```javascript
import { getPerformanceMetrics, detectChromiumCapabilities } from '$lib/utils/performance';

const metrics = await getPerformanceMetrics();
// {
//   lcp: 2450,
//   fcp: 1200,
//   ttfb: 600,
//   longAnimationFrames: 3,
//   appleGPU: true
// }

const caps = detectChromiumCapabilities();
// {
//   speculationRules: true,
//   schedulerYield: true,
//   longAnimationFrames: true,
//   viewTransitions: true,
//   isAppleSilicon: true,
//   gpuRenderer: "Apple M2"
// }
```

---

## 4. Long Animation Frame (LoAF) Monitoring

### Monitor LoAF Issues
```javascript
import { setupLoAFMonitoring } from '$lib/utils/performance';

setupLoAFMonitoring((issue) => {
  console.warn('Long Animation Frame', {
    duration: issue.duration,
    blockingDuration: issue.blockingDuration,
    scripts: issue.scripts.map(s => ({
      function: s.sourceFunctionName,
      source: s.sourceURL,
      duration: s.duration
    }))
  });
});
```

**Chrome DevTools:**
- Performance tab → Long Tasks section shows LoAF entries
- Each entry shows script attribution and blocking time
- Source maps work automatically

---

## 5. INP Optimization

### Break Long Tasks
```javascript
import {
  yieldingHandler,
  progressiveRender,
  debouncedYieldingHandler,
  throttledYieldingHandler
} from '$lib/utils/inpOptimization';

// For click handlers
button.addEventListener('click', yieldingHandler(async (event) => {
  await expensiveOperation();
}));

// For render-heavy operations
await progressiveRender(items, (item) => {
  appendToDOM(item);
}, { batchSize: 20, priority: 'user-visible' });

// For search input
const handleSearch = debouncedYieldingHandler(
  async (query) => {
    const results = await search(query);
    updateUI(results);
  },
  300  // 300ms debounce
);

input.addEventListener('input', (e) => {
  handleSearch(e.target.value);
});
```

---

## 6. Memory Monitoring

### Monitor Heap Usage
```javascript
import { memoryMonitor } from '$lib/utils/memory-monitor';

// Start monitoring (5s intervals)
memoryMonitor.start({ interval: 5000 });

// Get report
const report = memoryMonitor.getReport();
console.log(`
  Current: ${(report.currentHeap / 1048576).toFixed(2)}MB
  Trend: ${report.trend}
  Leak Risk: ${report.leakRisk}
  Growth Rate: ${report.averageGrowthPerSecond.toFixed(3)}MB/s
`);

// Compare to checkpoint
const checkpoint = memoryMonitor.checkpoint();
// ... do stuff ...
const comparison = memoryMonitor.compareToCheckpoint(checkpoint);
console.log(`Growth: ${comparison.heapGrowthMB.toFixed(2)}MB`);
```

### Detect Memory Leaks (Dev Only)
```javascript
import { detectMemoryLeak } from '$lib/utils/memory-monitor';

detectMemoryLeak('component-render', () => {
  createComponent();
  // ... render ...
  destroyComponent();
}, { iterations: 10, expectedGrowthMB: 5 });
```

---

## 7. Business Metrics

### Track Custom Metrics
```javascript
import {
  trackBusinessMetric,
  trackDatabaseQuery,
  trackAPICall,
  trackSearch,
  trackWasmOperation,
  trackInteraction
} from '$lib/monitoring/rum';

// Database queries
trackDatabaseQuery('songs', 'read', 45);

// API calls
trackAPICall('/api/search', 'POST', 200, 156);

// Search operations
trackSearch('crash into me', 15, 234);

// WASM operations
trackWasmOperation('fuzzy_match', 'search', 12);

// User interactions
trackInteraction({
  type: 'search',
  action: 'query_submitted',
  duration: 250,
  metadata: { query: 'warehouse', resultsCount: 45 }
});

// Custom metrics
trackBusinessMetric({
  name: 'custom_operation',
  value: 100,
  unit: 'count',
  tags: { feature: 'visualization', type: 'render' }
});
```

---

## 8. Structured Logging

### Development Logging
```javascript
import { createDevLogger } from '$lib/utils/dev-logger';
import { dbLogger, swLogger, wasmLogger, perfLogger } from '$lib/utils/dev-logger';

const logger = createDevLogger('myfeature');
logger.log('message');      // No-op in production
logger.info('info');
logger.warn('warning');
logger.error('error');
logger.debug('debug');
logger.success('done');

// Pre-configured loggers
dbLogger.log('Query executed');
swLogger.log('Service Worker installed');
wasmLogger.log('WASM module loaded');
perfLogger.log('Metric collected');

// Console groups
logger.group('Loading data');
logger.log('Step 1');
logger.log('Step 2');
logger.groupEnd();

// Timing
logger.time('operation');
// ... work ...
logger.timeEnd('operation');
```

### Structured Error Logging
```javascript
import { errorLogger } from '$lib/errors/logger';

errorLogger.debug('Cache hit', { key: 'songs', size: 1024 });
errorLogger.info('Data loaded', { count: 100 });
errorLogger.warn('Slow query', undefined, { duration: 5000 });
errorLogger.error('Database error', error, { table: 'shows' });
errorLogger.fatal('Critical failure', error);

// Get diagnostic info
const logs = errorLogger.getLogs(50);
const errorLogs = errorLogger.getErrorLogs(20);
const diagnostic = getDiagnosticReport();
```

---

## 9. Chrome DevTools Protocol Integration

### Connect via Puppeteer
```javascript
import puppeteer from 'puppeteer';

async function debugWithDevTools() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222'
  });

  const page = await browser.pages()[0];
  const client = await page.target().createCDPSession();

  // Enable domains
  await client.send('Debugger.enable');
  await client.send('Profiler.enable');
  await client.send('Performance.enable');
  await client.send('Network.enable');

  // Capture performance trace
  await client.send('Tracing.start', {
    categories: ['v8', 'blink', 'devtools.timeline']
  });

  // Navigate and interact
  await page.goto('http://localhost:5173');
  await page.click('button');

  // Get trace
  await client.send('Tracing.end');

  // All metrics available
  const metrics = await page.metrics();
  console.log('Metrics:', metrics);

  await browser.close();
}
```

### Access Performance Data
```javascript
// In browser console (after running initPerformanceMonitoring)
const metrics = await window.getPerformanceMetrics?.();
console.log(metrics);

const timing = window.getNavigationTiming?.();
console.log(timing);

const entries = performance.getEntries();
console.log(entries);
```

---

## 10. Telemetry

### RUM Metrics Auto-Sent
```javascript
// Automatically tracked and sent every 30s:
// - Web Vitals (LCP, FID, CLS, FCP, TTFB)
// - Business metrics (queries, API calls, searches)
// - Service Worker lifecycle
// - User interactions
// - Memory usage

// Manual flush before navigation
import { getEnhancedRUMSessionId } from '$lib/monitoring/rum';

beforeNavigate(() => {
  const sessionId = getEnhancedRUMSessionId();
  console.log('Session:', sessionId);
});
```

### Offline Queue Support
All telemetry has automatic offline persistence:
- Errors queue when offline
- Metrics batch and retry
- Sync on connection restored

---

## 11. Chrome DevTools Features Available

### Performance Tab
- **Long Tasks** - see LoAF entries with script attribution
- **Performance Monitor** - real-time INP, CLS, LCP, FCP
- **Main Thread** - timeline shows blocking operations

### Console
- **Error messages** - all errors logged with context
- **Warnings** - performance warnings (high memory, slow tasks)
- **Custom logs** - namespaced dev logs in development

### Application Tab
- **Local Storage** - RUM session data
- **Service Worker** - lifecycle events
- **Cache** - performance cache

### Network Tab
- **XHR/Fetch** - request breadcrumbs captured
- **Timing** - resource timing tracked
- **Resources** - slow resources (>1s) monitored

### Memory Tab
- **Heap snapshots** - available via performance.memory
- **Allocations** - tracked at 30s intervals
- **Leak detection** - memory trends analyzed

---

## 12. Debugging Workflow

### 1. Identify INP Issue
```javascript
// Chrome DevTools → Performance → Record interaction
// Look for Long Tasks in timeline
// INP shown at top of recording
```

### 2. Find Root Cause
```javascript
// Long Animation Frame shows script attribution
// Check console for [INP] warnings
// Look for specific function in warning
```

### 3. Fix with Yielding
```javascript
// Wrap in yieldingHandler or progressiveRender
// Add scheduler.yield() calls
// Break into smaller batches
```

### 4. Verify Fix
```javascript
// Re-record in DevTools
// Check LoAF entries reduced
// Verify INP < 100ms
```

---

## 13. Apple Silicon Optimization

### GPU Detection
```javascript
const caps = detectChromiumCapabilities();
console.log('Apple GPU:', caps.isAppleSilicon);
console.log('Renderer:', caps.gpuRenderer);  // "Apple M2 GPU"
```

### P-Core vs E-Core
- Long tasks on P-cores impact INP
- Long tasks on E-cores less problematic
- Use scheduler.yield({ priority: 'background' }) for E-core work

### Unified Memory
```javascript
// Monitor combined JS heap + GPU memory pressure
const metrics = await getPerformanceMetrics();
// On UMA, both compete for 8GB (M1) or 16GB (M2)
```

---

## 14. Common Debugging Tasks

### Find Memory Leak
```javascript
memoryMonitor.start();
// Use app normally for 5 min
const report = memoryMonitor.getReport();
if (report.leakRisk === 'high' || report.leakRisk === 'critical') {
  // Memory leak detected
  console.log(`Leak risk: ${report.leakRisk}`);
  console.log(`Growth: ${report.averageGrowthPerSecond.toFixed(3)}MB/s`);
}
```

### Measure Operation Time
```javascript
const duration = await timeAsync('operation', async () => {
  return await expensiveOperation();
});
console.log(`Operation took ${duration}ms`);
```

### Track User Action Performance
```javascript
const handleClick = yieldingHandler(async (event) => {
  const start = performance.now();
  await processUserAction(event);
  const duration = performance.now() - start;

  trackInteraction({
    type: 'action',
    action: 'click',
    duration,
    metadata: { target: event.target.id }
  });
});
```

### Debug Error Pattern
```javascript
// Errors auto-grouped by fingerprint
// Check DevTools Console for:
// [ERROR] Error captured: {message, fingerprint, count}
//
// Multiple occurrences indicate same root cause
// Check breadcrumbs before error for context
```

---

## 15. Monitoring Checklist

- [x] LoAF monitoring active (initPerformanceMonitoring)
- [x] Error handlers global (initErrorMonitoring)
- [x] RUM enabled (initEnhancedRUM)
- [x] Memory monitoring available
- [x] INP optimization in place
- [x] Telemetry endpoints connected
- [x] Offline queue configured
- [x] Apple Silicon detected
- [x] Performance metrics collection
- [x] Business metrics tracking

---

## Reference Files

| Feature | File | Key Function |
|---------|------|--------------|
| LoAF & Perf | `/lib/utils/performance.js` | `setupLoAFMonitoring()` |
| INP Optimization | `/lib/utils/inpOptimization.js` | `yieldingHandler()` |
| Error Monitoring | `/lib/monitoring/errors.js` | `initErrorMonitoring()` |
| Error Logging | `/lib/errors/logger.js` | `errorLogger.error()` |
| Memory Monitor | `/lib/utils/memory-monitor.js` | `memoryMonitor.start()` |
| Perf Monitor | `/lib/monitoring/performance.js` | `initPerformanceMonitoring()` |
| RUM | `/lib/monitoring/rum.js` | `initEnhancedRUM()` |
| Dev Logger | `/lib/utils/dev-logger.js` | `createDevLogger()` |

---

**Status:** Production-Ready ✅
**Chrome Version:** 121+
**Browsers:** Chromium-based (Chrome, Edge, Brave)
**Mobile:** iOS 18.2+ (limited), Android 14+
