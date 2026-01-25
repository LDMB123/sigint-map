# Skill: Performance Trace Capture

**ID**: `performance-trace-capture`
**Category**: Performance
**Agent**: Performance Optimizer

---

## When to Use

- Investigating slow page loads or interactions
- Before/after performance comparisons
- Identifying long tasks and layout thrash
- Core Web Vitals optimization
- Profiling runtime performance bottlenecks
- Diagnosing frame drops or jank

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | URL to profile |
| interaction | string | No | Specific interaction to capture (e.g., "click show card") |
| duration | number | No | Recording duration in seconds (default: 10) |

---

## Steps

### Step 1: Chrome DevTools Performance Trace

```markdown
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Go to Performance tab
3. Click Settings (gear icon):
   - Check "Web Vitals"
   - Check "Screenshots"
   - Set CPU throttling if testing on fast machine (4x slowdown)
   - Set Network throttling if needed (Fast 3G)
4. Click Record (circle icon) or Cmd+E
5. Perform the interaction (or let it record page load)
6. Click Stop or Cmd+E
7. Analyze the timeline:
   - Look for Long Tasks (red triangles)
   - Check Main thread activity
   - Identify Layout Shifts (blue bars)
   - Review network waterfall
8. Export: Right-click timeline → Save Profile
   - Saves as .json file
   - Can be imported later for comparison
```

### Step 2: Lighthouse Performance Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run full audit
lighthouse http://localhost:5173 \
  --output=html \
  --output=json \
  --output-path=./lighthouse-report \
  --chrome-flags="--headless" \
  --preset=desktop

# View HTML report
open lighthouse-report.report.html

# For mobile testing
lighthouse http://localhost:5173 \
  --preset=mobile \
  --throttling-method=devtools
```

### Step 3: Programmatic Long Task Detection

```typescript
// src/lib/performance/long-tasks.ts
export interface LongTaskEntry extends PerformanceEntry {
  duration: number;
  startTime: number;
  attribution?: readonly TaskAttributionTiming[];
}

export function observeLongTasks(threshold = 50) {
  const tasks: LongTaskEntry[] = [];

  if (typeof PerformanceObserver === 'undefined') {
    console.warn('PerformanceObserver not supported');
    return {
      getTasks: () => tasks,
      disconnect: () => {},
    };
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > threshold) {
        tasks.push(entry as LongTaskEntry);
        console.warn('Long task detected:', {
          duration: entry.duration.toFixed(2) + 'ms',
          startTime: entry.startTime.toFixed(2) + 'ms',
          name: entry.name,
        });
      }
    }
  });

  // Use Long Animation Frames API if available (Chrome 116+)
  // Falls back to longtask API
  try {
    observer.observe({ type: 'long-animation-frame', buffered: true });
  } catch {
    try {
      observer.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      console.warn('Long task observation not supported', e);
    }
  }

  return {
    getTasks: () => [...tasks],
    disconnect: () => observer.disconnect(),
  };
}
```

### Step 4: Core Web Vitals Capture

```typescript
// src/lib/performance/web-vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

export interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export function captureWebVitals() {
  const metrics: VitalMetric[] = [];

  const formatMetric = (metric: Metric): VitalMetric => ({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  // Core Web Vitals
  onCLS((metric) => {
    metrics.push(formatMetric(metric));
    console.log('CLS:', metric.value);
  });

  onINP((metric) => {
    metrics.push(formatMetric(metric));
    console.log('INP:', metric.value);
  });

  onLCP((metric) => {
    metrics.push(formatMetric(metric));
    console.log('LCP:', metric.value);
  });

  // Other important metrics
  onFCP((metric) => {
    metrics.push(formatMetric(metric));
    console.log('FCP:', metric.value);
  });

  onTTFB((metric) => {
    metrics.push(formatMetric(metric));
    console.log('TTFB:', metric.value);
  });

  return {
    getMetrics: () => [...metrics],
  };
}
```

```svelte
<!-- src/routes/+layout.svelte - Add to root layout -->
<script>
  import { onMount } from 'svelte';
  import { captureWebVitals } from '$lib/performance/web-vitals';

  onMount(() => {
    if (import.meta.env.DEV) {
      const vitals = captureWebVitals();

      // Optional: Send to analytics
      window.addEventListener('beforeunload', () => {
        const metrics = vitals.getMetrics();
        console.table(metrics);
      });
    }
  });
</script>
```

### Step 5: Layout Thrash Detection

```typescript
// src/lib/performance/layout-thrash.ts
export function detectLayoutThrash() {
  const originalGetComputedStyle = window.getComputedStyle;
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  );

  let readCount = 0;
  let writeCount = 0;
  let thrashCount = 0;
  let lastOp: 'read' | 'write' | null = null;
  const thrashEvents: Array<{ type: string; stack: string }> = [];

  // Track layout reads (forced reflow)
  window.getComputedStyle = function (...args: any[]) {
    if (lastOp === 'write') {
      thrashCount++;
      thrashEvents.push({
        type: 'getComputedStyle after DOM write',
        stack: new Error().stack || '',
      });
      console.warn('Layout thrash: getComputedStyle after write');
    }
    readCount++;
    lastOp = 'read';
    return originalGetComputedStyle.apply(this, args as any);
  };

  // Track offsetHeight reads
  if (originalOffsetHeight) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get() {
        if (lastOp === 'write') {
          thrashCount++;
          thrashEvents.push({
            type: 'offsetHeight read after DOM write',
            stack: new Error().stack || '',
          });
          console.warn('Layout thrash: offsetHeight after write');
        }
        readCount++;
        lastOp = 'read';
        return originalOffsetHeight.get?.call(this);
      },
    });
  }

  return {
    getStats: () => ({ readCount, writeCount, thrashCount, thrashEvents }),
    restore: () => {
      window.getComputedStyle = originalGetComputedStyle;
      if (originalOffsetHeight) {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
      }
    },
  };
}
```

### Step 6: Automated Trace Capture with Playwright

```typescript
// scripts/capture-performance.ts
import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';

async function capturePerformanceTrace(url: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Start tracing
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
  });

  // Navigate and wait for load
  await page.goto(url, { waitUntil: 'networkidle' });

  // Perform interaction (customize as needed)
  await page.click('[data-testid="show-card"]');
  await page.waitForSelector('[data-testid="show-detail"]');

  // Stop tracing
  await context.tracing.stop({ path: 'trace.zip' });

  // Get performance metrics
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstByte: navigation.responseStart - navigation.requestStart,
    };
  });

  await browser.close();

  console.log('Performance metrics:', metrics);
  writeFileSync('metrics.json', JSON.stringify(metrics, null, 2));

  return { metrics };
}

// Run it
capturePerformanceTrace('http://localhost:5173')
  .then(() => console.log('Trace captured'))
  .catch(console.error);
```

```bash
# Run the script
npx tsx scripts/capture-performance.ts

# View trace
npx playwright show-trace trace.zip
```

---

## Analysis Checklist

### Long Tasks (> 50ms)

- [ ] Identify script/function causing long task
- [ ] Can it be deferred or lazy-loaded?
- [ ] Can it use `requestIdleCallback` or `scheduler.postTask`?
- [ ] Can computation move to Web Worker?
- [ ] Can it be split into smaller chunks with yields?

### Layout Thrash

- [ ] Batch all DOM reads together
- [ ] Batch all DOM writes together
- [ ] Use `requestAnimationFrame` for visual updates
- [ ] Cache computed styles/dimensions
- [ ] Use CSS `contain` property for isolation

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | 2.5s - 4s | > 4s |
| INP (Interaction to Next Paint) | ≤ 200ms | 200ms - 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP (First Contentful Paint) | ≤ 1.8s | 1.8s - 3s | > 3s |
| TTFB (Time to First Byte) | ≤ 800ms | 800ms - 1800ms | > 1800ms |

---

## Common Issues and Fixes

### High LCP
- Preload critical images/fonts
- Optimize server response time
- Use CDN for static assets
- Implement server-side rendering

### High INP
- Break up long tasks with `scheduler.yield()`
- Debounce/throttle event handlers
- Use passive event listeners
- Minimize JavaScript execution

### High CLS
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use `aspect-ratio` for images/videos
- Avoid web fonts causing layout shift

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| trace.json | `.claude/artifacts/` | Chrome DevTools trace |
| trace.zip | `.claude/artifacts/` | Playwright trace |
| lighthouse.html | `.claude/artifacts/` | Lighthouse report |
| performance-report.md | `.claude/artifacts/` | Analysis summary |
| metrics.json | `.claude/artifacts/` | Captured metrics |

---

## Output Template

```markdown
## Performance Trace Report

### Date: [YYYY-MM-DD]
### URL: [url]
### Interaction: [description]
### Device: [Desktop/Mobile]
### Throttling: [None/4x CPU/Fast 3G]

### Core Web Vitals
| Metric | Value | Rating | Target | Status |
|--------|-------|--------|--------|--------|
| LCP | [X]ms | [good/needs-improvement/poor] | < 2500ms | [✓/✗] |
| INP | [X]ms | [good/needs-improvement/poor] | < 200ms | [✓/✗] |
| CLS | [X] | [good/needs-improvement/poor] | < 0.1 | [✓/✗] |
| FCP | [X]ms | [good/needs-improvement/poor] | < 1800ms | [✓/✗] |
| TTFB | [X]ms | [good/needs-improvement/poor] | < 800ms | [✓/✗] |

### Long Tasks
| Duration | Start Time | Attribution |
|----------|------------|-------------|
| [X]ms | [Y]ms | [script/function] |
| [X]ms | [Y]ms | [script/function] |

### Layout Thrash
- Read operations: [N]
- Write operations: [N]
- Thrash events: [N]
- Most common: [pattern]

### Main Thread Activity
- Total blocking time: [X]ms
- Script evaluation: [X]ms
- Rendering: [X]ms
- Painting: [X]ms
- Idle time: [X]ms

### Network
- Total requests: [N]
- Total transfer: [X]MB
- Resources > 100KB: [list]
- Blocking resources: [list]

### Recommendations

#### High Priority
1. [Recommendation] - Expected improvement: [X]ms LCP
2. [Recommendation] - Expected improvement: [X]ms INP

#### Medium Priority
1. [Recommendation] - Expected improvement: [description]
2. [Recommendation] - Expected improvement: [description]

#### Low Priority
1. [Recommendation]
2. [Recommendation]

### Comparison (if applicable)
| Metric | Before | After | Delta | % Change |
|--------|--------|-------|-------|----------|
| LCP | [X]ms | [Y]ms | [Z]ms | [P]% |
| INP | [X]ms | [Y]ms | [Z]ms | [P]% |
| CLS | [X] | [Y] | [Z] | [P]% |

### Files
- Trace: `.claude/artifacts/trace.json`
- Lighthouse: `.claude/artifacts/lighthouse.html`
- Metrics: `.claude/artifacts/metrics.json`
```

---

## Success Criteria

- Performance trace successfully captured
- Core Web Vitals measured and documented
- Long tasks identified and analyzed
- Layout thrash detected and quantified
- Actionable recommendations provided
- Baseline established for future comparison
- Artifacts saved for reference
