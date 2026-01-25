# DMB Almanac - DevTools Debugging & Performance Analysis Report

**Project:** DMB Almanac Svelte
**Target Platform:** Chromium 143+ on macOS 26.2 / Apple Silicon
**Analysis Date:** 2026-01-23
**Focus Areas:** CDP Integration, Performance Monitoring, Error Handling, Memory Management

---

## Executive Summary

The DMB Almanac project demonstrates **excellent debugging and performance infrastructure** with comprehensive Real User Monitoring (RUM), structured error handling, and Apple Silicon-optimized performance utilities. The codebase is production-ready for Chrome DevTools integration and has thoughtful patterns for automated debugging workflows.

### Maturity Assessment
- **RUM Implementation:** 9/10 - Production-grade with attribution data
- **Error Handling:** 9/10 - Comprehensive error routing and recovery
- **Memory Management:** 8/10 - Active monitoring with leak detection
- **Long Animation Frame (LoAF) Awareness:** 9/10 - INP optimization throughout
- **DevTools Readiness:** 7/10 - Console logging ready, needs CDP session management
- **Performance Measurement:** 9/10 - web-vitals integration with granular metrics

---

## 1. Console Logging Patterns

### Summary
- **Files with logging:** 66 files across the codebase
- **Pattern:** Structured `[PREFIX] message` format with context objects
- **Approach:** Development-aware logging with environment-based output

### Implementation Details

#### Error Logger (Primary)
**File:** `/src/lib/errors/logger.ts`

```typescript
// Singleton error logging system
- Level-based logging: debug, info, warn, error, fatal
- In-memory buffer: max 100 entries
- Session ID tracking for correlation
- Structured logging with context objects
- Development vs. Production mode handling
```

**Key Features:**
- Automatic session ID generation for request correlation
- Context enrichment (URL, user agent, session ID)
- Error handler callbacks for external service integration
- Log export as JSON for debugging

#### Development Logger
**File:** `/src/lib/utils/dev-logger.ts`
- Structured console output with prefixes
- Conditional logging based on build mode
- Time-based performance annotations

#### Specialized Loggers

**RUM Logger** (`/src/lib/utils/rum.ts`):
```
[RUM] {message}
- Batched metric logging
- Attribution details grouped in console
- Device info and hardware concurrency logged
- Color-coded console.table for metrics
```

**Performance Logger** (`/src/lib/utils/performance.ts`):
```
[Performance] - used for Long Animation Frame warnings
- Logs issues with duration and script attribution
- Block detection for INP analysis
```

**Memory Monitor** (`/src/lib/utils/memory-monitor.ts`):
```
[MemoryMonitor] - Heap size and growth rate tracking
- Threshold-based warnings (100MB warn, 200MB critical)
- Growth rate alerts (1MB/s warn, 5MB/s critical)
```

**INP Optimization** (`/src/lib/utils/inpOptimization.ts`):
```
[INP] - Interaction timing measurements
- Handler duration logging
- Threshold-based warnings (>100ms)
- Event type and duration context
```

### Console Output Quality

#### Development Mode
```
[Timestamp] LEVEL message
Context: {...}
Stack trace for errors
```

#### Production Mode
- Warnings and errors only
- No debug or info logs
- Minimal performance impact

### Recommendations for CDP Integration

1. **Capture console logs via CDP:**
   ```typescript
   client.on('Runtime.consoleAPICalled', (params) => {
     // Parse [PREFIX] patterns
     // Route to CDP telemetry stream
   });
   ```

2. **Structured log export:**
   - Add `exportLogs()` method to error logger
   - Support JSON Lines format for streaming

3. **Real-time log relay:**
   - Stream logs to `/api/telemetry/logs` endpoint
   - Batch similar messages to reduce network overhead

---

## 2. Performance Measurement Code

### Summary
- **Files:** 19 files with performance.mark/measure usage
- **Primary library:** web-vitals/attribution
- **Approach:** Event-based metric collection with granular attribution

### Core Performance Tracking

#### Real User Monitoring (RUM)
**File:** `/src/lib/utils/rum.ts` (753 lines)

**Architecture:**
```
RUMManager (Singleton)
├── Device Collection
│   ├── viewport (width, height, DPR)
│   ├── hardware (cores, memory)
│   ├── network (connection type, RTT)
│   ├── memory (heap limits)
│   └── GPU (Apple Silicon detection)
├── Metric Handlers
│   ├── onLCP() - element selector, resource timing
│   ├── onINP() - interaction target, input/processing/presentation delays
│   ├── onCLS() - shift target, load state
│   ├── onFCP() - time breakdown
│   └── onTTFB() - DNS/connection/request timing
├── Batching Strategy
│   ├── 10-second batch interval (configurable)
│   ├── Max 10 metrics per batch
│   ├── Sends via fetch or sendBeacon
│   └── Fallback to console logging
└── Attribution Data
    └── Maps metrics to DOM elements and scripts
```

**Key Metrics Captured:**

| Metric | Attributes | Apple Silicon Notes |
|--------|-----------|-------------------|
| LCP (Largest Contentful Paint) | Element selector, resource URL, timing breakdown | Detects text vs. image LCP |
| INP (Interaction to Next Paint) | Interaction target, input/processing/presentation delays | Uses Long Animation Frames |
| CLS (Cumulative Layout Shift) | Largest shift target, load state | Prerendering awareness |
| FCP (First Contentful Paint) | TTFB → FCP timing | Part of loading chain |
| TTFB (Time to First Byte) | DNS → connection → request timing | Server-side optimization target |

**Prerendering Awareness:**
```typescript
// Detects if page was prerendered
document.addEventListener('prerenderingchange', () => {
  // Start tracking after page becomes visible
});

// Skips metrics for pages never shown to user
if (wasPrerendered && !isVisible) return;
```

**Device Information Collection:**
```typescript
{
  viewport: { width, height, devicePixelRatio },
  hardware: { hardwareConcurrency, deviceMemory },
  connection: { effectiveType, downlink, rtt, saveData },
  memory: { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize },
  gpu: { renderer, isAppleSilicon }
}
```

#### Performance Utilities
**File:** `/src/lib/utils/performance.ts` (459 lines)

**Capabilities Detection:**
```typescript
detectChromiumCapabilities():
- speculationRules (Chrome 121+)
- schedulerYield (Chrome 129+)
- longAnimationFrames (Chrome 123+)
- viewTransitions (Chrome 111+)
- isAppleSilicon (via WebGL renderer)
```

**Performance Monitoring Functions:**
```typescript
// Get current metrics snapshot
getPerformanceMetrics(): {
  lcp?, inp?, cls?, fcp?, ttfb?,
  longAnimationFrames, appleGPU
}

// Setup Long Animation Frame monitoring (Chrome 123+)
setupLoAFMonitoring(onIssue: (issue) => void, threshold: 50ms)

// Monitor each frame for:
- duration: total animation frame time
- blockingDuration: main thread blocking time
- scripts: Array<{ sourceURL, duration }>
```

#### Scheduler Performance Integration
**File:** `/src/lib/utils/scheduler.ts` (653 lines)

**Time-Budget Based Processing:**
```typescript
// Yield after 5ms to keep INP < 100ms
runWithYielding(tasks, { yieldAfterMs: 5 })

// Process in 10-item chunks
processInChunks(items, processor, { chunkSize: 10 })

// Time-budget aware chunking
processInChunksWithYield(items, processor, { timeBudget: 50 })
```

**Priority-Based Scheduling:**
```typescript
await yieldWithPriority('user-blocking');    // Critical for input
await yieldWithPriority('user-visible');     // Important, not immediate
await yieldWithPriority('background');       // Low priority (E-cores on Apple Silicon)
```

#### INP Optimization Utilities
**File:** `/src/lib/utils/inpOptimization.ts` (404 lines)

**Handler Wrappers:**
```typescript
yieldingHandler()             // Wrap event handlers with yield
debouncedYieldingHandler()    // Debounce + yield
throttledYieldingHandler()    // Throttle + yield
batchedEventHandler()         // Batch events before processing
progressiveRender()           // Progressive rendering with yield
measureInteractionTime()      // Measure interaction duration
```

**Example Usage:**
```typescript
const handler = yieldingHandler(expensiveOperation);
element.addEventListener('click', handler);

const measured = measureInteractionTime(() => search(query), {
  threshold: 100,
  label: 'Search click'
});
element.addEventListener('click', measured);
```

### Performance Measurement Endpoints

#### API Endpoint: `/api/telemetry/performance`
**File:** `/src/routes/api/telemetry/performance/+server.ts` (286 lines)

**Validation:**
- Session ID validation (UUID format)
- Metrics array validation (1-100 items)
- Rating validation (good/needs-improvement/poor)
- Content-Type enforcement (application/json)

**Processing:**
```typescript
// Color-coded console output based on rating
good            → Green (\x1b[32m)
needs-improvement → Yellow (\x1b[33m)
poor            → Red (\x1b[31m)

// Each metric logged with:
- URL where metric occurred
- Navigation type (navigate, reload, back-forward)
- Prerendering status
- Attribution details
```

**CORS & Security:**
- Same-origin only (no wildcard)
- CSRF token validation required
- OPTIONS preflight supported

### Recommendations for Enhanced Measurement

1. **Add CDP-based capture:**
   ```typescript
   // Capture performance.mark/measure calls
   await client.send('Profiler.startPreciseCoverage');
   await client.send('Profiler.takePreciseCoverage');
   ```

2. **Long Animation Frame correlation:**
   - Aggregate LoAF entries with INP metric
   - Link script URLs to source files
   - Build call stack for blocking scripts

3. **Apple Silicon-specific metrics:**
   - P-core vs E-core distribution (via Activity Monitor correlation)
   - GPU utilization vs CPU time
   - Unified Memory pressure (JS heap + GPU buffers)

4. **Network timing granularity:**
   - Add ResourceTiming observer
   - Correlate with INP input delay
   - Detect layout shift causes during resource load

---

## 3. Error Handling Patterns

### Summary
- **Files:** 72 files with try/catch patterns
- **Centralized routing:** `/src/lib/errors/handler.ts`
- **Error types:** 6 custom error classes with type guards
- **Recovery strategies:** Retry, fallback, user messaging

### Error Type System

**Custom Error Classes:**

```typescript
// Base class
AppError (code, statusCode, context)

// Specialized types
ComponentLoadError()        // Component import failures
AsyncError(operation)       // Async operation failures
ValidationError(fields)     // Form/data validation
NetworkError(operation)     // Connection failures
TimeoutError(operation)     // Operation timeout
ApiError(endpoint, method, status)  // API response errors
```

**Type Guards:**
```typescript
isAppError(error): error is AppError
isApiError(error): error is ApiError
```

### Centralized Error Handler

**File:** `/src/lib/errors/handler.ts` (379 lines)

**Handler Routing:**
```
handleError(error)
├── ComponentLoadError → handleComponentLoadError()
├── AsyncError → handleAsyncError()
├── ApiError → handleApiError()
├── ValidationError → handleValidationError()
├── NetworkError → handleNetworkError()
├── TimeoutError → handleTimeoutError()
└── Generic Error → Generic handler
```

**Each handler provides:**
```typescript
{
  handled: boolean,
  message: string,          // Technical message
  userMessage: string,      // User-friendly message
  canRetry: boolean,
  suggestion?: string       // Action suggestion
}
```

**API Error Routing:**
```typescript
400 → Invalid request (no retry)
401 → Not authenticated (no retry, suggest login)
403 → Forbidden (no retry, contact support)
404 → Not found (no retry)
429 → Rate limited (retry after delay)
5xx → Server error (retry with backoff)
```

### Retry Mechanism

```typescript
retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: 3,
  initialDelayMs: 1000,
  context?: Record<string, any>
): Promise<T>

// Exponential backoff: 1s, 2s, 4s
```

### Global Error Event Listeners

**File:** `/src/lib/errors/handler.ts` - `setupGlobalErrorHandlers()`

**Captures:**
1. `window.addEventListener('error')` - Uncaught errors
2. `window.addEventListener('unhandledrejection')` - Promise rejections
3. `window.addEventListener('error', ..., true)` - Resource load failures (capture phase)

**Error Information Logged:**
```typescript
{
  filename: string,
  lineno: number,
  colno: number,
  promise: PromiseRejectionEvent (for unhandled rejections)
  tag: string (for resource errors)
  src: string (for resource errors)
}
```

### Error Handler Integration Points

1. **API Routes:** Error validation and routing
2. **Store Subscriptions:** Async error capture
3. **Component Lifecycle:** Load error handling
4. **External Services:** Custom error handler callbacks

**Example Integration:**
```typescript
errorLogger.onError(async (report) => {
  // Send to Sentry, LogRocket, etc.
  await sendToExternalService(report);
});
```

### Recommendations for CDP Integration

1. **Capture Runtime.exceptionThrown:**
   ```typescript
   client.on('Runtime.exceptionThrown', async (params) => {
     const { exceptionDetails } = params;
     // Route through DMB error handler
     handleError(exceptionDetails);
   });
   ```

2. **Correlate with Long Tasks:**
   ```typescript
   // Link error to preceeding long task
   if (lastLongTask) {
     errorContext.correlatedLongTask = lastLongTask;
   }
   ```

3. **Source map integration:**
   ```typescript
   // Resolve file:line to original source
   const source = await resolveSourceMap(url, line, column);
   errorLogger.error(message, error, { source });
   ```

4. **Pattern detection:**
   ```typescript
   // Detect recurring error patterns
   const pattern = detectErrorPattern(error);
   if (pattern.autoFix) {
     pattern.autoFix(error);  // Auto-recovery for known issues
   }
   ```

---

## 4. Long Animation Frame (LoAF) Awareness

### Summary
- **Support Level:** Full awareness (Chrome 123+)
- **Integration Points:** 3 dedicated utility functions
- **INP Correlation:** Attribution data includes LoAF entries
- **Threshold:** 50ms default (customizable)

### LoAF Monitoring

**File:** `/src/lib/utils/performance.ts`

```typescript
setupLoAFMonitoring(
  onIssue: (issue: AnimationFrameIssue) => void,
  threshold: number = 50
)

// Detected issue structure:
{
  duration: number;              // Total frame time
  blockingDuration: number;      // Main thread blocked time
  renderStart: number;           // When rendering started
  scripts: Array<{               // Scripts that ran
    sourceURL: string;
    sourceFunctionName: string;
    invoker: string;
    duration: number;
  }>;
}
```

**PerformanceObserver Implementation:**
```typescript
observer.observe({ type: 'long-animation-frame', buffered: true });

// Logs to console when frame > 50ms:
// [Performance] Long Animation Frame detected: {
//   duration: 125.34ms
//   blocking: 87.20ms
//   scripts: [...]
// }
```

### INP Attribution with LoAF

**File:** `/src/lib/utils/rum.ts` - `handleINP()`

```typescript
attribution: {
  interactionTarget: selector,
  interactionType: 'click'|'keydown'|'pointerdown',
  inputDelay: number,
  processingDuration: number,
  presentationDelay: number,

  // LoAF entries that contributed to INP
  longAnimationFrameEntries: [
    {
      duration: number,
      blockingDuration: number,
      startTime: number,
      scripts: [
        {
          sourceURL: string,
          sourceFunctionName: string,
          duration: number
        }
      ]
    }
  ]
}
```

### Apple Silicon INP Optimization

**File:** `/src/lib/utils/scheduler.ts` - Priority awareness

```typescript
// User-blocking (P-cores): < 16ms
await yieldWithPriority('user-blocking');

// User-visible (P-cores): < 100ms
await yieldWithPriority('user-visible');

// Background (E-cores): deferred
await yieldWithPriority('background');
```

### INP Handler Utilities

**File:** `/src/lib/utils/inpOptimization.ts`

**Measurement:**
```typescript
measureInteractionTime(handler, {
  threshold: 100,    // Log if exceeds 100ms
  label: 'Search'
}): (event: Event) => void
```

**Progressive Rendering:**
```typescript
progressiveRender(items, renderer, {
  batchSize: 10,
  priority: 'user-visible',
  onProgress: (rendered, total) => {...}
})

// Yields between batches to process input
```

**Interaction Monitoring:**
```typescript
monitorINP(element, {
  threshold: 100,
  eventTypes: ['click', 'keydown', 'pointerdown']
}): () => void  // Returns cleanup function
```

### Recommendations for Enhanced LoAF Support

1. **Per-script analysis:**
   ```typescript
   const byScript = groupBy(loaf.scripts, s => s.sourceURL);
   console.table(byScript.map(s => ({
     script: s.sourceURL,
     duration: s.totalDuration,
     percentage: (s.totalDuration / loaf.duration * 100).toFixed(1) + '%'
   })));
   ```

2. **Call stack reconstruction:**
   ```typescript
   // Combine with sourceFunctionName for context
   const callStack = loaf.scripts.map(s =>
     `${s.sourceURL}:${s.sourceFunctionName}`
   ).join(' → ');
   ```

3. **Main thread attribution:**
   ```typescript
   // Correlate with Paint timing
   const inPaintPhase = loaf.renderStart < loaf.duration;
   const isLayoutThrasher = loaf.blockingDuration > loaf.duration * 0.8;
   ```

4. **Task breakdown:**
   ```typescript
   // Separate JavaScript execution vs rendering
   const jsTime = loaf.blockingDuration;
   const renderTime = loaf.duration - loaf.blockingDuration;
   ```

---

## 5. Memory Management Patterns

### Summary
- **Monitoring:** Active heap tracking with leak detection
- **Thresholds:** Warn at 100MB, critical at 200MB
- **Growth Rate:** Warn at 1MB/s, critical at 5MB/s
- **Apple Silicon Awareness:** UMA (Unified Memory) pressure considerations

### Memory Monitor

**File:** `/src/lib/utils/memory-monitor.ts` (451 lines)

**Singleton Instance:**
```typescript
const memoryMonitor = new MemoryMonitor();

memoryMonitor.start({ interval: 5000 });    // Sample every 5 seconds
const report = memoryMonitor.getReport();
```

**Memory Snapshot Structure:**
```typescript
{
  timestamp: number;
  usedJSHeapSize: number;     // Current heap usage
  totalJSHeapSize: number;    // Total allocated
  jsHeapSizeLimit: number;    // Max available
  external?: number;          // External (C++) objects
  delta?: number;             // Change from previous sample
}
```

**Memory Report Analysis:**

```typescript
{
  samples: MemorySnapshot[],
  currentHeap: number,
  trend: 'stable' | 'growing' | 'shrinking' | 'unknown',
  averageGrowthPerSecond: number,
  maxHeapSize: number,
  minHeapSize: number,
  leakRisk: 'low' | 'medium' | 'high' | 'critical'
}
```

**Trend Detection:**
```typescript
// Based on last 5 samples
> 15% growth    → Growing
< -15% shrink   → Shrinking
Otherwise       → Stable
```

**Leak Risk Assessment:**

| Risk | Condition |
|------|-----------|
| Critical | Heap > 200MB OR growth rate > 5MB/s |
| High | Heap > 100MB OR growth rate > 1MB/s |
| Medium | Growing trend + growth rate > 0.5MB/s |
| Low | Otherwise |

### Memory Leak Detection

**Function:** `detectMemoryLeak()`

```typescript
detectMemoryLeak('Operation name', () => {
  // Perform operation
}, {
  iterations: 10,
  expectedGrowthMB: 5
});

// Output:
// [MemoryLeakDetector] Testing: Operation name
// After 10 iterations (3.5s):
//   Heap Growth: 12.4MB
//   Growth Rate: 3.54MB/s
//   MEMORY LEAK DETECTED: Growth 12.4MB > expected 5MB
```

### RUM Memory Collection

**File:** `/src/lib/utils/rum.ts` - `collectDeviceInfo()`

```typescript
memory: {
  jsHeapSizeLimit: number,
  totalJSHeapSize: number,
  usedJSHeapSize: number
}
```

**Each metric batch includes:**
```typescript
{
  sessionId: string,
  metrics: [...],
  device: {
    memory: {...},    // Heap at time of metric
    viewport: {...},
    hardware: {...},
    connection: {...}
  }
}
```

### Event Listener Tracking

**Chrome DevTools Only:**
```typescript
getListenerEstimate(): number | null

// Uses TreeWalker instead of querySelectorAll
// for better memory efficiency
// Returns null in non-DevTools contexts
```

### Apple Silicon UMA Considerations

**Unified Memory Architecture:**
```
Total Physical Memory
├── JS Heap (grows dynamically)
├── GPU Buffers (WebGPU, canvas)
├── System Cache
└── Other processes
```

**Memory Pressure Strategy:**
```typescript
// On UMA, reduce either JS heap OR GPU buffers
// to free memory for the other

const jsHeap = metrics.jsHeapUsedSize;
const gpuMemory = estimateGPUMemory();
const totalPressure = jsHeap + gpuMemory;

if (totalPressure > 2GB) {
  // Trigger garbage collection
  // Reduce GPU buffer allocations
  // Offload to worker if needed
}
```

### Memory Checkpoint API

```typescript
const checkpoint = memoryMonitor.checkpoint();

// ... perform operation ...

const comparison = memoryMonitor.compareToCheckpoint(checkpoint);
// Returns: { heapGrowth, heapGrowthMB, percentageGrowth, growthRateMBPerSecond }
```

### Recommendations for CDP Integration

1. **HeapProfiler capture:**
   ```typescript
   await client.send('HeapProfiler.enable');
   await client.send('HeapProfiler.collectGarbage');
   const snapshot = await takeHeapSnapshot(client);
   ```

2. **Continuous monitoring:**
   ```typescript
   // Poll memory metrics every 5 seconds
   const metrics = await client.send('Memory.getMetrics');
   memoryMonitor.recordSample(metrics);
   ```

3. **Detached DOM detection:**
   ```typescript
   // Query HeapProfiler for detached nodes
   // Correlate with memory growth
   ```

4. **Retention chain analysis:**
   ```typescript
   // Use heap snapshot diff to find memory retainers
   // Build graph of object references
   ```

---

## 6. DevTools Integration Readiness

### Current State
- **CDP Session Management:** Not implemented
- **Headless Chrome Connection:** Not implemented
- **Performance Timeline Export:** Ready (performance API used)
- **Error Export:** Ready (console.group/log ready)

### Readiness Assessment

| Component | Status | Score |
|-----------|--------|-------|
| Console Logging | Ready | 10/10 |
| Performance Measurement | Ready | 9/10 |
| Error Capture | Ready | 9/10 |
| Memory Monitoring | Ready | 8/10 |
| RUM Telemetry | Ready | 9/10 |
| CDP Session Mgmt | Not Ready | 0/10 |
| Source Map Integration | Not Ready | 0/10 |
| Chrome DevTools Protocol | Not Ready | 0/10 |

### What's Ready Today

**1. Console Capture:**
```typescript
// Can be implemented with:
client.on('Runtime.consoleAPICalled', (params) => {
  // Parse [RUM], [INP], [Performance] prefixes
  // Route to telemetry endpoint
});
```

**2. Performance Timeline:**
```typescript
const entries = performance.getEntriesByType('measure');
const traces = entries.map(e => ({
  name: e.name,
  duration: e.duration,
  startTime: e.startTime
}));
```

**3. Error Correlation:**
```typescript
// errorLogger already tracks:
// - Session ID
// - Timestamp
// - Context (URL, user agent)
// - Stack trace
```

### What Needs Implementation

**1. CDP Session Management:**
```typescript
import puppeteer from 'puppeteer';

async function connectToDevTools(browserURL: string) {
  const browser = await puppeteer.connect({ browserURL });
  const page = await browser.pages()[0];
  const client = await page.target().createCDPSession();

  await client.send('Profiler.enable');
  await client.send('Debugger.enable');
  await client.send('Network.enable');

  return client;
}
```

**2. Performance Trace Capture:**
```typescript
await client.send('Tracing.start', {
  categories: [
    'disabled-by-default-gpu.device',
    'disabled-by-default-gpu.service',
    'gpu', 'viz'
  ].join(',')
});

// ... user interaction ...

await client.send('Tracing.end');
```

**3. Long Animation Frame Correlation:**
```typescript
client.on('Tracing.dataCollected', (data) => {
  const loafEvents = data.value.filter(e =>
    e.name === 'long-animation-frame' ||
    e.cat?.includes('gpu')
  );

  // Correlate with INP metrics
  loafEvents.forEach(e => {
    const correspondingINP = inpMetrics.find(m =>
      Math.abs(m.timestamp - e.startTime) < 100
    );
  });
});
```

### Recommended CDP Integration File

Create `/src/lib/devtools/cdp-manager.ts`:

```typescript
import type { CDPSession } from 'puppeteer';

export class DevToolsProfiler {
  private session: CDPSession;

  constructor(session: CDPSession) {
    this.session = session;
  }

  async startProfiling() {
    await this.session.send('Profiler.enable');
    await this.session.send('Tracing.start', {
      categories: [
        'disabled-by-default-gpu.device',
        'blink.user_timing',
        'devtools.timeline'
      ].join(',')
    });
  }

  async captureLongTasks() {
    const events: TraceEvent[] = [];

    this.session.on('Tracing.dataCollected', (data) => {
      events.push(...data.value);
    });

    return events.filter(e => e.dur > 50000); // > 50ms
  }

  async analyzeMemory() {
    await this.session.send('HeapProfiler.enable');
    const metrics = await this.session.send('Memory.getMetrics');

    return {
      jsHeapUsed: metrics.metrics.find(m => m.name === 'JSHeapUsedSize'),
      jsHeapLimit: metrics.metrics.find(m => m.name === 'JSHeapLimitSize')
    };
  }
}
```

---

## 7. RUM (Real User Monitoring) Implementation

### Summary
- **Status:** Production-grade, fully implemented
- **Library:** web-vitals/attribution v4+
- **Collection:** All Core Web Vitals + attribution data
- **Batching:** 10-second intervals, max 10 metrics per batch
- **Network:** Graceful fallback to console logging

### Architecture

**Singleton Pattern:**
```typescript
const rumManager = new RUMManager();

export function initRUM(config?: RUMConfig): void {
  rumManager.initialize(config);
}
```

**Configuration:**
```typescript
interface RUMConfig {
  batchInterval?: number;        // 10s default
  maxBatchSize?: number;         // 10 metrics default
  endpoint?: string;             // '/api/telemetry/performance'
  enableLogging?: boolean;       // true in dev, false in prod
  sendImmediately?: boolean;     // false - uses batching
  onMetric?: (metric: WebVitalMetric) => void;
}
```

### Metric Collection Pipeline

```
Core Web Vitals (web-vitals/attribution)
↓
WebVitalMetric objects with attribution data
↓
Batch aggregation (10-second intervals)
↓
Endpoint check (OPTIONS request)
↓
POST to /api/telemetry/performance
or
Console logging (fallback)
```

### Each Metric Includes

**Structure:**
```typescript
{
  name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB',
  value: number,                  // milliseconds
  rating: 'good' | 'needs-improvement' | 'poor',
  delta: number,                  // change from previous
  id: string,                     // unique metric ID
  navigationType: 'navigate' | 'reload' | 'back-forward' | ...,
  url: string,
  timestamp: number,
  wasPrerendered: boolean,
  attribution: {...}              // Metric-specific data
}
```

**LCP Attribution:**
```typescript
{
  element: DOM element,
  elementSelector: '#id' | '.class' | 'tag',
  url: resource URL (image/text),
  timeToFirstByte: number,
  resourceLoadDelay: number,
  resourceLoadDuration: number,
  elementRenderDelay: number,
  lcpResourceEntry: {
    name: string,
    startTime: number,
    duration: number
  }
}
```

**INP Attribution:**
```typescript
{
  interactionTarget: DOM element selector,
  interactionType: 'click' | 'keydown' | 'pointerdown',
  interactionTime: number,
  inputDelay: number,              // Event processing start delay
  processingDuration: number,      // Handler execution time
  presentationDelay: number,       // Rendering time
  longAnimationFrameEntries: [     // LoAF that contributed to INP
    {
      duration: number,
      blockingDuration: number,
      scripts: [
        {
          sourceURL: string,
          sourceFunctionName: string,
          duration: number
        }
      ]
    }
  ]
}
```

**CLS Attribution:**
```typescript
{
  largestShiftTarget: DOM element selector,
  largestShiftValue: number,
  largestShiftTime: number,
  largestShiftEntry: LayoutShiftEntry,
  loadState: 'loading' | 'loaded'
}
```

### Batch Processing

**Batching Strategy:**
```typescript
1. Metric arrives
2. Add to batch array
3. Call custom handler (if provided)
4. Check conditions:
   - Batch full? (≥10 items) → Flush immediately
   - sendImmediately? → Flush immediately
   - Otherwise: wait for timer

5. 10-second timer:
   - Collect all batched metrics
   - Check if endpoint exists (OPTIONS request)
   - Send via fetch or sendBeacon
   - Fallback to console logging
```

**Network Fallback:**
```typescript
// Prerender detection
if (document.prerendering) {
  wait for 'prerenderingchange' event
  before starting tracking
}

// Endpoint availability check
const response = await fetch(endpoint, { method: 'OPTIONS' });
if (response.ok || response.status === 405) {
  // Endpoint exists (405 = method not allowed but endpoint exists)
  send metrics
} else {
  // Fallback: log to console
  console.group('[RUM] Performance Metrics Batch');
  console.table(metrics);
  console.log('[RUM] JSON Payload:', JSON.stringify(payload));
}
```

### Device Information Capture

**Collection at startup:**
```typescript
{
  userAgent: string,
  viewport: {
    width: number,
    height: number,
    devicePixelRatio: number
  },
  connection: {
    effectiveType: '4g' | '3g' | '2g' | 'slow-2g',
    downlink: number,
    rtt: number,
    saveData: boolean
  },
  memory: {
    jsHeapSizeLimit: number,
    totalJSHeapSize: number,
    usedJSHeapSize: number
  },
  hardware: {
    hardwareConcurrency: number,
    deviceMemory: number
  },
  gpu: {
    renderer: string,      // WebGL renderer string
    isAppleSilicon: boolean
  }
}
```

**Apple Silicon Detection:**
```typescript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

isAppleSilicon = renderer.includes('Apple') && !renderer.includes('Intel');
```

### Session Correlation

**Session ID Format:**
```typescript
`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
// Example: 1674234567890-abc123xyz
```

**Tracking:**
- One session ID per page load
- One page load ID per navigation
- Used to correlate multiple metric batches
- Exported to external analytics services

### Console Output Example

```
[RUM] Starting Web Vitals tracking {
  sessionId: "1674234567890-abc123xyz",
  pageLoadId: "1674234567891-def456uvw",
  wasPrerendered: false,
  device: {...}
}

[RUM] LCP: 850.23ms (good) {
  metric: {...},
  attribution: {
    elementSelector: "#hero-image",
    url: "https://cdn.example.com/hero.webp",
    ...
  }
}

[RUM] INP: 89.45ms (good) {
  metric: {...},
  attribution: {
    interactionTarget: "button.search",
    interactionType: "click",
    inputDelay: 12,
    processingDuration: 64,
    presentationDelay: 13
  }
}
```

### Telemetry API Integration

**Endpoint:** `/api/telemetry/performance` (POST)

**Payload:**
```typescript
{
  sessionId: string,
  pageLoadId: string,
  metrics: WebVitalMetric[],
  device: DeviceInfo,
  timestamp: number
}
```

**Response:**
```typescript
{
  success: true,
  received: number,    // Metrics processed
  skipped: number      // Metrics with errors
}
```

**Error Handling:**
- 400: Invalid JSON or format
- 400: Invalid session ID format
- 400: Metrics array invalid (empty or >100 items)
- 405: CORS OPTIONS preflight (expected for telemetry)

### Recommendations for Enhancement

1. **Custom event tracking:**
   ```typescript
   // Add support for custom performance marks
   customMark(name: string, metadata: object)
   ```

2. **Third-party integration:**
   ```typescript
   initRUM({
     onMetric: (metric) => {
       gtag('event', metric.name, {
         value: Math.round(metric.value),
         metric_id: metric.id,
         rating: metric.rating
       });
     }
   });
   ```

3. **Real-time alerts:**
   ```typescript
   // Alert on poor metrics
   if (metric.rating === 'poor') {
     sendAlert(`${metric.name} poor: ${metric.value}ms`);
   }
   ```

---

## 8. Debugging Setup Summary

### Current Capabilities

| Feature | Status | Implementation |
|---------|--------|-----------------|
| Console Logging | Production Ready | 66 files using structured format |
| Performance Measurement | Production Ready | web-vitals + custom utilities |
| Error Handling | Production Ready | Centralized routing + recovery |
| Memory Monitoring | Production Ready | Active tracking with leak detection |
| Long Animation Frames | Production Ready | Chrome 123+ support |
| Real User Monitoring | Production Ready | Full implementation with batching |
| DevTools Session Mgmt | Not Started | Needs CDP implementation |
| Source Maps | Not Started | Needs source map integration |
| Profiling Export | Partial | RUM export ready, profiling needs CDP |

### Production Readiness

**For deployment without CDP:**
- RUM metrics collection: YES
- Error logging and recovery: YES
- Memory monitoring: YES
- Performance measurement: YES
- Prerendering awareness: YES
- Apple Silicon optimization: YES

**For advanced debugging (requires CDP/Puppeteer):**
- Long task correlation: READY TO IMPLEMENT
- Heap profiling: READY TO IMPLEMENT
- Network timeline: READY TO IMPLEMENT
- GPU profiling: READY TO IMPLEMENT

---

## 9. Performance Recommendations

### High Priority

1. **Enable RUM Monitoring:**
   ```typescript
   // In +layout.svelte or +page.ts
   import { initRUM } from '$lib/utils/rum';

   if (browser) {
     initRUM({
       batchInterval: 10000,
       enableLogging: import.meta.env.DEV,
       sendImmediately: false
     });
   }
   ```

2. **Setup Global Error Handlers:**
   ```typescript
   import { setupGlobalErrorHandlers } from '$lib/errors/handler';

   setupGlobalErrorHandlers();
   ```

3. **Start Memory Monitoring (Dev Only):**
   ```typescript
   if (import.meta.env.DEV) {
     memoryMonitor.start({ interval: 5000 });
   }
   ```

### Medium Priority

1. **Add INP Monitoring to Key Components:**
   ```typescript
   import { monitorINP } from '$lib/utils/inpOptimization';

   onMount(() => {
     return monitorINP(document.getElementById('search'), {
       threshold: 100
     });
   });
   ```

2. **Batch DOM Updates:**
   ```typescript
   import { batchDOMUpdates } from '$lib/utils/performance';

   batchDOMUpdates([
     () => updateHeader(),
     () => updateContent(),
     () => updateFooter()
   ]);
   ```

3. **Implement Retries for Critical Operations:**
   ```typescript
   import { retryOperation } from '$lib/errors/handler';

   const data = await retryOperation(
     () => fetchCriticalData(),
     3,     // max retries
     1000   // initial delay
   );
   ```

### Low Priority (Advanced)

1. **CDP-based profiling (after basic monitoring stable)**
2. **Source map integration**
3. **Custom performance marks for app-specific metrics**
4. **Anomaly detection on metric trends**

---

## 10. File Reference Guide

### Debugging & Monitoring Files

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `/src/lib/utils/rum.ts` | Real User Monitoring (Core Web Vitals) | 753 | Production |
| `/src/lib/utils/performance.ts` | Performance utilities & LoAF monitoring | 459 | Production |
| `/src/lib/utils/scheduler.ts` | Scheduler API for INP optimization | 653 | Production |
| `/src/lib/utils/inpOptimization.ts` | INP-specific utilities | 404 | Production |
| `/src/lib/utils/memory-monitor.ts` | Heap monitoring & leak detection | 451 | Production |
| `/src/lib/errors/logger.ts` | Structured error logging | 327 | Production |
| `/src/lib/errors/handler.ts` | Error routing & recovery | 379 | Production |
| `/src/routes/api/telemetry/performance/+server.ts` | RUM endpoint | 286 | Production |

### Supporting Files

| File | Purpose |
|------|---------|
| `/src/lib/utils/dev-logger.ts` | Development logger utilities |
| `/src/lib/errors/types.ts` | Custom error type definitions |
| `/src/lib/security/csrf.ts` | CSRF validation for endpoints |
| `/src/routes/api/analytics/+server.ts` | Analytics endpoint |

---

## Conclusion

The DMB Almanac project has a **mature, production-ready debugging and performance infrastructure**. The implementation covers:

✓ **Comprehensive logging** with structured format
✓ **Real User Monitoring** with full Core Web Vitals
✓ **Error handling** with centralized routing
✓ **Memory management** with leak detection
✓ **INP optimization** for Apple Silicon
✓ **Prerendering awareness**
✓ **Long Animation Frame support**

**Next steps for enhanced debugging:**
1. Implement CDP session management
2. Add source map integration
3. Build CDP profiling wrapper
4. Create DevTools dashboard integration

The foundation is excellent for scaling to production monitoring and advanced debugging workflows.
