# Skill: Performance Trace Capture

**ID**: `performance-trace-capture`
**Category**: Performance
**Agent**: Performance Optimizer

---

## When to Use

- Investigating slow interactions
- Before/after performance comparisons
- Identifying long tasks and layout thrash
- Core Web Vitals optimization

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | URL to profile |
| interaction | string | No | Specific interaction to capture |

---

## Steps

### Step 1: Chrome DevTools Trace

```markdown
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Settings (gear icon) → Check "Web Vitals"
4. Click Record (circle icon)
5. Perform the interaction
6. Click Stop
7. Export trace: Right-click → Save Profile
```

### Step 2: Lighthouse Trace

```bash
# Capture Lighthouse trace
npx lighthouse http://localhost:3000 \
  --output=json \
  --output-path=lighthouse-trace.json \
  --chrome-flags="--headless" \
  --extra-headers='{"Cache-Control": "no-cache"}'

# View report
npx lighthouse-report-viewer lighthouse-trace.json
```

### Step 3: Programmatic Long Task Detection

```typescript
// lib/performance/long-tasks.ts
export function observeLongTasks(threshold = 50) {
  const tasks: PerformanceEntry[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > threshold) {
        tasks.push(entry);
        console.warn('Long task detected:', {
          duration: entry.duration.toFixed(2) + 'ms',
          startTime: entry.startTime.toFixed(2),
          // @ts-expect-error - LoAF specific
          scripts: entry.scripts?.map(s => s.invoker),
        });
      }
    }
  });

  // Long Animation Frames (Chromium 123+)
  try {
    observer.observe({ type: 'long-animation-frame', buffered: true });
  } catch {
    // Fallback to longtask
    observer.observe({ type: 'longtask', buffered: true });
  }

  return {
    getTasks: () => [...tasks],
    disconnect: () => observer.disconnect(),
  };
}
```

### Step 4: Core Web Vitals Capture

```typescript
// lib/performance/web-vitals.ts
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  entries: PerformanceEntry[];
}

export function captureWebVitals(): Promise<VitalMetric[]> {
  const metrics: VitalMetric[] = [];

  return new Promise((resolve) => {
    const handlers = [
      onLCP((metric) => metrics.push(formatMetric(metric))),
      onINP((metric) => metrics.push(formatMetric(metric))),
      onCLS((metric) => metrics.push(formatMetric(metric))),
      onFCP((metric) => metrics.push(formatMetric(metric))),
      onTTFB((metric) => metrics.push(formatMetric(metric))),
    ];

    // Wait for all metrics (or timeout)
    setTimeout(() => {
      handlers.forEach(h => h?.()); // Cleanup
      resolve(metrics);
    }, 10000);
  });
}

function formatMetric(metric: any): VitalMetric {
  return {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    entries: metric.entries || [],
  };
}
```

### Step 5: Layout Thrash Detection

```typescript
// lib/performance/layout-thrash.ts
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

  // Monkey-patch to detect forced layout
  window.getComputedStyle = function (...args) {
    if (lastOp === 'write') {
      thrashCount++;
      console.warn('Layout thrash: read after write');
    }
    readCount++;
    lastOp = 'read';
    return originalGetComputedStyle.apply(this, args);
  };

  return {
    getStats: () => ({ readCount, writeCount, thrashCount }),
    restore: () => {
      window.getComputedStyle = originalGetComputedStyle;
    },
  };
}
```

### Step 6: Generate Report

```typescript
// scripts/capture-performance.ts
import puppeteer from 'puppeteer';

async function capturePerformanceTrace(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Enable tracing
  await page.tracing.start({
    categories: [
      'devtools.timeline',
      'blink.user_timing',
      'v8',
    ],
  });

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Perform interaction
  await page.click('[data-testid="show-card"]');
  await page.waitForSelector('[data-testid="show-detail"]');

  const trace = await page.tracing.stop();

  // Get performance metrics
  const metrics = await page.metrics();

  await browser.close();

  return {
    trace: JSON.parse(trace.toString()),
    metrics,
  };
}
```

---

## Analysis Checklist

### Long Tasks (> 50ms)

- [ ] Identify script causing long task
- [ ] Can it be deferred?
- [ ] Can it use `scheduler.yield()`?
- [ ] Can it move to Web Worker?

### Layout Thrash

- [ ] Batch DOM reads before writes
- [ ] Use `requestAnimationFrame` for writes
- [ ] Cache computed styles
- [ ] Use CSS containment

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤ 2.5s | 2.5s - 4s | > 4s |
| INP | ≤ 200ms | 200ms - 500ms | > 500ms |
| CLS | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| trace.json | `.claude/artifacts/` | Chrome trace file |
| lighthouse.json | `.claude/artifacts/` | Lighthouse report |
| performance-report.md | `.claude/artifacts/` | Analysis summary |

---

## Output Template

```markdown
## Performance Trace Report

### Date: [YYYY-MM-DD]
### URL: [url]
### Interaction: [description]

### Core Web Vitals
| Metric | Value | Rating | Target |
|--------|-------|--------|--------|
| LCP | [X]ms | [rating] | < 1000ms |
| INP | [X]ms | [rating] | < 100ms |
| CLS | [X] | [rating] | < 0.05 |
| FCP | [X]ms | [rating] | < 1000ms |
| TTFB | [X]ms | [rating] | < 400ms |

### Long Tasks
| Duration | Script | Line |
|----------|--------|------|
| [X]ms | [file] | [line] |

### Layout Thrash
- Read operations: [N]
- Write operations: [N]
- Thrash events: [N]

### Recommendations
1. [High Impact] [Recommendation]
2. [Medium Impact] [Recommendation]
3. [Low Impact] [Recommendation]

### Before/After Comparison
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| LCP | [X]ms | [Y]ms | [Z]% |
| INP | [X]ms | [Y]ms | [Z]% |
```
