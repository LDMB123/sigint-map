---
title: Long Animation Frames API (LoAF)
description: Modern performance monitoring for INP and interaction responsiveness
tags: [chromium-143, performance, api, metrics, inp, debugging]
min_chrome_version: 123
category: Performance APIs
complexity: advanced
last_updated: 2026-01
---

# Long Animation Frames API (LoAF) (Chrome 123+)

Detect and debug responsiveness issues beyond Long Tasks API. LoAF tracks the entire frame lifecycle including rendering, allowing precise INP (Interaction to Next Paint) attribution.

## When to Use

- **INP debugging** - Identify which JavaScript caused slow interactions
- **Main thread blocking** - See exact scripts slowing down frames
- **Render performance** - Track browser render work in frames
- **Interaction analysis** - Profile button clicks, form inputs, animations
- **Production monitoring** - Ship real-user interaction metrics
- **Replacing Long Tasks API** - More detailed and accurate

## Syntax

```typescript
// PerformanceLongAnimationFrameTiming
interface PerformanceLongAnimationFrameTiming extends PerformanceEntry {
  readonly duration: number;  // Total frame time (ms)
  readonly renderStart: number;  // When rendering began
  readonly styleAndLayoutStart: number;  // Style recalc/layout
  readonly blockingDuration: number;  // Time blocking rendering
  readonly firstUIEventTimestamp: number;  // First input in frame
  readonly scripts: PerformanceScriptTiming[];  // Scripts that ran
}

interface PerformanceScriptTiming {
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
  readonly sourceURL: string;  // File URL
  readonly sourceFunctionName: string;  // Function name
  readonly invokerType: string;  // 'user-interaction', 'script', 'event-listener'
}
```

## Examples

### Basic LoAF Monitoring

```typescript
// Observe all long animation frames (>50ms)
const loafObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const loaf = entry as PerformanceLongAnimationFrameTiming;

    console.log('Long Animation Frame Detected:', {
      duration: loaf.duration.toFixed(2) + 'ms',
      blockingDuration: loaf.blockingDuration.toFixed(2) + 'ms',
      renderStart: loaf.renderStart.toFixed(2) + 'ms',
      scripts: loaf.scripts.map(s => ({
        name: s.name,
        duration: s.duration.toFixed(2) + 'ms',
        invoker: s.invokerType,
        source: s.sourceURL
      }))
    });
  }
});

loafObserver.observe({ type: 'long-animation-frame', buffered: true });
```

### INP Attribution

```typescript
interface INPAttribution {
  interaction: string;
  duration: number;
  culpritScripts: Array<{
    source: string;
    function: string;
    duration: number;
  }>;
}

function analyzeINP(): INPAttribution[] {
  const attributions: INPAttribution[] = [];

  const loafObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const loaf = entry as PerformanceLongAnimationFrameTiming;

      // Only interest in interactions
      if (loaf.firstUIEventTimestamp > 0) {
        const culprits = loaf.scripts
          .filter(s => s.invokerType === 'user-interaction')
          .sort((a, b) => b.duration - a.duration);

        attributions.push({
          interaction: culprits[0]?.name || 'unknown',
          duration: loaf.duration,
          culpritScripts: culprits.slice(0, 3).map(s => ({
            source: new URL(s.sourceURL).pathname,
            function: s.sourceFunctionName || 'anonymous',
            duration: s.duration
          }))
        });
      }
    }
  });

  loafObserver.observe({ type: 'long-animation-frame', buffered: true });
  return attributions;
}
```

### Script-Level Performance Analysis

```typescript
interface ScriptBreakdown {
  bySource: Map<string, number>;
  byInvoker: Map<string, number>;
  slowestFunctions: Array<{
    source: string;
    function: string;
    duration: number;
  }>;
}

function getScriptBreakdown(): ScriptBreakdown {
  const bySource = new Map<string, number>();
  const byInvoker = new Map<string, number>();
  const allScripts: Array<{
    source: string;
    function: string;
    duration: number;
  }> = [];

  const loafObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const loaf = entry as PerformanceLongAnimationFrameTiming;

      for (const script of loaf.scripts) {
        // Aggregate by source
        bySource.set(
          script.sourceURL,
          (bySource.get(script.sourceURL) || 0) + script.duration
        );

        // Aggregate by invoker type
        byInvoker.set(
          script.invokerType,
          (byInvoker.get(script.invokerType) || 0) + script.duration
        );

        // Collect individual scripts
        allScripts.push({
          source: script.sourceURL,
          function: script.sourceFunctionName || 'anonymous',
          duration: script.duration
        });
      }
    }
  });

  loafObserver.observe({ type: 'long-animation-frame', buffered: true });

  return {
    bySource,
    byInvoker,
    slowestFunctions: allScripts.sort((a, b) => b.duration - a.duration).slice(0, 10)
  };
}
```

### Real User Monitoring (RUM)

```typescript
interface RUMMetrics {
  interactionCount: number;
  slowInteractions: number;
  averageBlockingDuration: number;
  topCulprits: string[];
}

class LongAnimationFrameMonitor {
  private interactions: Map<string, PerformanceLongAnimationFrameTiming[]> = new Map();
  private culprits: Map<string, number> = new Map();

  constructor() {
    this.setupObserver();
  }

  private setupObserver(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loaf = entry as PerformanceLongAnimationFrameTiming;

        // Track interactions
        if (loaf.duration > 100) {
          const key = loaf.name || 'unknown-interaction';
          if (!this.interactions.has(key)) {
            this.interactions.set(key, []);
          }
          this.interactions.get(key)!.push(loaf);
        }

        // Track culprit scripts
        for (const script of loaf.scripts) {
          const culprit = new URL(script.sourceURL).pathname.split('/').pop() || 'unknown';
          this.culprits.set(culprit, (this.culprits.get(culprit) || 0) + script.duration);
        }
      }
    });

    observer.observe({ type: 'long-animation-frame', buffered: true });
  }

  getMetrics(): RUMMetrics {
    const allFrames = Array.from(this.interactions.values()).flat();
    const slowInteractions = allFrames.filter(f => f.duration > 100).length;
    const totalBlocking = allFrames.reduce((sum, f) => sum + f.blockingDuration, 0);

    return {
      interactionCount: allFrames.length,
      slowInteractions,
      averageBlockingDuration: totalBlocking / Math.max(allFrames.length, 1),
      topCulprits: Array.from(this.culprits.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name)
    };
  }

  reportToAnalytics(): void {
    const metrics = this.getMetrics();
    // Send to analytics service
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics)
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const monitor = new LongAnimationFrameMonitor();

  // Send metrics before unload
  window.addEventListener('beforeunload', () => {
    monitor.reportToAnalytics();
  });
});
```

### Click Responsiveness Test

```typescript
interface ClickMetrics {
  clickToRender: number;  // Time from click to first paint
  blockingDuration: number;  // Main thread blocked time
  culpritScripts: string[];
}

async function measureClickResponsiveness(
  element: HTMLElement
): Promise<ClickMetrics> {
  return new Promise((resolve) => {
    const clickStartTime = performance.now();
    let loafData: PerformanceLongAnimationFrameTiming | null = null;

    const loafObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loaf = entry as PerformanceLongAnimationFrameTiming;
        if (loaf.firstUIEventTimestamp >= clickStartTime) {
          loafData = loaf;
          break;
        }
      }
    });

    loafObserver.observe({ type: 'long-animation-frame' });

    element.addEventListener('click', () => {
      // Wait for next frame
      requestAnimationFrame(() => {
        if (loafData) {
          const metrics: ClickMetrics = {
            clickToRender: loafData.renderStart - clickStartTime,
            blockingDuration: loafData.blockingDuration,
            culpritScripts: loafData.scripts
              .filter(s => s.invokerType === 'user-interaction')
              .map(s => new URL(s.sourceURL).pathname.split('/').pop() || 'unknown')
          };
          resolve(metrics);
        }
      });
    }, { once: true });
  });
}

// Test button responsiveness
const button = document.querySelector('button[data-track]') as HTMLElement;
measureClickResponsiveness(button).then((metrics) => {
  console.log('Button Click Metrics:', metrics);
});
```

### Frame Composition Analysis

```typescript
interface FrameBreakdown {
  scriptTime: number;
  renderTime: number;
  idleTime: number;
  totalDuration: number;
}

function analyzeFrameComposition(loaf: PerformanceLongAnimationFrameTiming): FrameBreakdown {
  const scriptTime = loaf.scripts.reduce((sum, s) => sum + s.duration, 0);
  const renderTime = loaf.duration - loaf.renderStart;
  const idleTime = loaf.duration - loaf.blockingDuration;

  return {
    scriptTime,
    renderTime,
    idleTime,
    totalDuration: loaf.duration
  };
}

// Monitor frame composition
const frameCompositions: FrameBreakdown[] = [];

const loafObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const loaf = entry as PerformanceLongAnimationFrameTiming;
    if (loaf.duration > 50) {
      frameCompositions.push(analyzeFrameComposition(loaf));
    }
  }
});

loafObserver.observe({ type: 'long-animation-frame', buffered: true });
```

### Scroll Performance Monitoring

```typescript
class ScrollPerformanceMonitor {
  private scrollFrames: PerformanceLongAnimationFrameTiming[] = [];

  constructor() {
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    const loafObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loaf = entry as PerformanceLongAnimationFrameTiming;

        // Check if scroll-related
        if (loaf.scripts.some(s => s.invokerType === 'user-interaction' && s.name.includes('scroll'))) {
          this.scrollFrames.push(loaf);
        }
      }
    });

    loafObserver.observe({ type: 'long-animation-frame', buffered: true });
  }

  getScrollMetrics() {
    const slowFrames = this.scrollFrames.filter(f => f.duration > 50);
    const avgDuration = this.scrollFrames.reduce((sum, f) => sum + f.duration, 0) / Math.max(this.scrollFrames.length, 1);

    return {
      totalScrollFrames: this.scrollFrames.length,
      slowScrollFrames: slowFrames.length,
      averageDuration: avgDuration,
      jankPercentage: (slowFrames.length / this.scrollFrames.length) * 100
    };
  }
}
```

### Animation Performance Tracking

```typescript
interface AnimationPerformance {
  name: string;
  frameCount: number;
  averageFrameTime: number;
  droppedFrames: number;
  jankRate: number;
}

function trackAnimationPerformance(animationName: string): AnimationPerformance {
  const frames: PerformanceLongAnimationFrameTiming[] = [];

  const loafObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const loaf = entry as PerformanceLongAnimationFrameTiming;
      // Simple heuristic: check if animation script is in execution
      if (loaf.scripts.some(s => s.name.includes(animationName))) {
        frames.push(loaf);
      }
    }
  });

  loafObserver.observe({ type: 'long-animation-frame', buffered: true });

  const droppedFrames = frames.filter(f => f.duration > 16.67).length;  // 60fps = 16.67ms
  const avgFrameTime = frames.reduce((sum, f) => sum + f.duration, 0) / Math.max(frames.length, 1);

  return {
    name: animationName,
    frameCount: frames.length,
    averageFrameTime: avgFrameTime,
    droppedFrames,
    jankRate: (droppedFrames / frames.length) * 100
  };
}
```

### VS Long Tasks API

```typescript
// LoAF is superior to Long Tasks for interaction analysis
// LoAF includes:
// - Rendering time (not in Long Tasks)
// - First UI event timestamp (for INP)
// - Script attribution (source, function name)
// - Blocking duration (exact main thread blocking)

// Example: Compare old vs new approach
function oldApproach() {
  // Long Tasks API - limited info
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('Long task:', entry.duration);
      // No info about which script, function, or rendering
    }
  });
  observer.observe({ entryTypes: ['longtask'] });
}

function newApproach() {
  // LoAF - detailed info
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const loaf = entry as PerformanceLongAnimationFrameTiming;
      console.log({
        duration: loaf.duration,
        blockingDuration: loaf.blockingDuration,
        renderStart: loaf.renderStart,
        scripts: loaf.scripts.map(s => ({
          source: s.sourceURL,
          function: s.sourceFunctionName,
          invoker: s.invokerType,
          duration: s.duration
        }))
      });
    }
  });
  observer.observe({ type: 'long-animation-frame', buffered: true });
}
```

### Production Monitoring Setup

```typescript
class ProductionLoAFMonitor {
  private sessionId = crypto.randomUUID();
  private slowInteractions: Array<{
    timestamp: number;
    duration: number;
    blockingDuration: number;
    culprit: string;
  }> = [];

  constructor(private endpoint: string) {
    this.startMonitoring();
    this.setupHeartbeat();
  }

  private startMonitoring(): void {
    const loafObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loaf = entry as PerformanceLongAnimationFrameTiming;

        // Only track "slow" frames (>100ms)
        if (loaf.duration > 100 && loaf.firstUIEventTimestamp > 0) {
          const culprit = loaf.scripts[0];
          this.slowInteractions.push({
            timestamp: Date.now(),
            duration: loaf.duration,
            blockingDuration: loaf.blockingDuration,
            culprit: culprit?.sourceFunctionName || 'unknown'
          });
        }
      }
    });

    loafObserver.observe({ type: 'long-animation-frame', buffered: true });
  }

  private setupHeartbeat(): void {
    // Send metrics periodically
    setInterval(() => {
      if (this.slowInteractions.length > 0) {
        this.report();
        this.slowInteractions = [];
      }
    }, 60000);  // Every minute
  }

  private report(): void {
    const payload = {
      sessionId: this.sessionId,
      url: window.location.href,
      interactions: this.slowInteractions
    };

    // Beacon API for reliability
    navigator.sendBeacon(
      this.endpoint,
      JSON.stringify(payload)
    );
  }
}

// Initialize on app start
if ('PerformanceObserver' in window) {
  new ProductionLoAFMonitor('/api/metrics/loaf');
}
```

## Key Metrics from LoAF

| Metric | Meaning | Target |
|--------|---------|--------|
| `duration` | Total frame time | < 50ms (60fps) |
| `blockingDuration` | Main thread blocked | < 30ms |
| `renderStart` | When rendering began | Early in frame |
| `firstUIEventTimestamp` | First input timestamp | For INP |

## Real-World Benefits

- **Pinpoint slow interactions** - See exact script causing delay
- **Better than Long Tasks** - Includes rendering and attribution
- **Production-safe** - Low overhead, safe to ship
- **INP insights** - Understand interaction responsiveness
- **Script profiling** - Know which files are slow

## Browser Support Detection

```typescript
function supportsLoAF(): boolean {
  return 'PerformanceObserver' in window && 'PerformanceLongAnimationFrameTiming' in window;
}

if (supportsLoAF()) {
  console.log('Using Long Animation Frames API');
  // Ship advanced monitoring
} else {
  console.log('Fallback to Long Tasks API');
}
```
