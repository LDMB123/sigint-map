# SvelteKit Performance Trace Capture

Capture and analyze performance traces for SvelteKit applications using browser DevTools, Vite profiling, and server-side instrumentation.

## Usage

```bash
/performance-trace-capture [target] [options]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `target` | No | Route path, component, or `build` for build analysis |
| `options` | No | Flags: `--ssr`, `--hydration`, `--network`, `--memory`, `--runtime` |

## Instructions

You are a performance engineering expert specializing in SvelteKit/Vite performance profiling, Core Web Vitals optimization, and full-stack trace analysis.

Set up performance instrumentation, capture meaningful traces, and provide actionable optimization recommendations based on trace data.

### Performance Metrics Reference

| Metric | Target | Warning | Critical | Measurement |
|--------|--------|---------|----------|-------------|
| TTFB | < 200ms | 200-600ms | > 600ms | Server response time |
| FCP | < 1.0s | 1.0-2.5s | > 2.5s | First paint |
| LCP | < 2.5s | 2.5-4.0s | > 4.0s | Largest element render |
| INP | < 200ms | 200-500ms | > 500ms | Interaction delay |
| CLS | < 0.1 | 0.1-0.25 | > 0.25 | Layout shift score |
| TBT | < 200ms | 200-600ms | > 600ms | Blocking time |

### Browser Trace Capture Setup

```typescript
// src/lib/performance/trace.ts
interface TraceConfig {
  enableMarks: boolean;
  enableMeasures: boolean;
  sampleRate: number;
}

export function initTracing(config: TraceConfig = {
  enableMarks: true,
  enableMeasures: true,
  sampleRate: 1.0
}) {
  if (typeof window === 'undefined') return;
  if (Math.random() > config.sampleRate) return;

  // Mark navigation start
  performance.mark('app:init');

  // Observe LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime, lastEntry.element);
    performance.mark('lcp:complete');
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // Observe FID/INP
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('Interaction:', entry.name, entry.duration);
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });

  // Observe Layout Shifts
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        console.log('CLS:', entry.value, entry.sources);
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

// Component-level tracing
export function traceComponent(name: string) {
  const markName = `component:${name}`;
  performance.mark(`${markName}:start`);

  return {
    end() {
      performance.mark(`${markName}:end`);
      performance.measure(markName, `${markName}:start`, `${markName}:end`);
    }
  };
}
```

### SvelteKit SSR Tracing

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

const TRACE_HEADER = 'x-trace-id';

export const handle: Handle = async ({ event, resolve }) => {
  const traceId = crypto.randomUUID();
  const startTime = performance.now();

  // Add trace context
  event.locals.traceId = traceId;
  event.locals.traceStart = startTime;

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => {
      // Inject trace timing into HTML
      const duration = performance.now() - startTime;
      return html.replace(
        '</head>',
        `<script>window.__SSR_DURATION__=${duration}</script></head>`
      );
    },
  });

  // Add server timing header
  const duration = performance.now() - startTime;
  response.headers.set('Server-Timing', `ssr;dur=${duration.toFixed(2)}`);
  response.headers.set(TRACE_HEADER, traceId);

  // Log trace
  console.log(JSON.stringify({
    traceId,
    path: event.url.pathname,
    method: event.request.method,
    duration,
    timestamp: new Date().toISOString(),
  }));

  return response;
};

// src/routes/+layout.server.ts
export const load = async ({ locals }) => {
  const loadStart = performance.now();

  // ... load data

  console.log(`Layout load: ${performance.now() - loadStart}ms`);
  return { traceId: locals.traceId };
};
```

### Vite Build Profiling

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    // Enable detailed timing
    reportCompressedSize: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Log build warnings for analysis
        console.log('Build warning:', warning.code, warning.message);
        warn(warning);
      },
    },
  },
  // Profile transforms
  esbuild: {
    logLevel: 'info',
  },
});
```

```bash
# Capture build trace
DEBUG=vite:* npm run build 2>&1 | tee build-trace.log

# Vite profiling
npx vite build --profile
# Generates vite-profile-*.cpuprofile

# Analyze with Chrome DevTools
# 1. Open chrome://tracing
# 2. Load the .cpuprofile file
```

### Hydration Tracing

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount, afterUpdate } from 'svelte';
  import { browser } from '$app/environment';

  let hydrationComplete = false;

  onMount(() => {
    if (browser) {
      performance.mark('hydration:start');

      // Use requestIdleCallback for accurate end timing
      requestIdleCallback(() => {
        performance.mark('hydration:end');
        performance.measure('hydration', 'hydration:start', 'hydration:end');

        const measure = performance.getEntriesByName('hydration')[0];
        console.log('Hydration duration:', measure.duration);
        hydrationComplete = true;
      });
    }
  });

  afterUpdate(() => {
    if (hydrationComplete) {
      performance.mark('update:complete');
    }
  });
</script>

<slot />
```

### Network Trace Capture

```typescript
// src/lib/performance/network-trace.ts
export function captureNetworkTrace() {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming;
        console.log({
          name: resource.name,
          type: resource.initiatorType,
          duration: resource.duration,
          transferSize: resource.transferSize,
          timing: {
            dns: resource.domainLookupEnd - resource.domainLookupStart,
            tcp: resource.connectEnd - resource.connectStart,
            ttfb: resource.responseStart - resource.requestStart,
            download: resource.responseEnd - resource.responseStart,
          },
        });
      }
    }
  });

  observer.observe({ entryTypes: ['resource', 'navigation'] });
  return observer;
}
```

### Trace Analysis Tools

| Tool | Purpose | Command/URL |
|------|---------|-------------|
| Chrome DevTools | Full browser trace | F12 > Performance |
| Lighthouse | CWV audit | DevTools > Lighthouse |
| WebPageTest | Network waterfall | webpagetest.org |
| Vite Profile | Build performance | `vite build --profile` |
| 0x | Node.js flame graphs | `0x -- node build` |
| Clinic.js | Server profiling | `clinic doctor -- node build` |

### Response Format

```markdown
## Performance Trace Report

### Capture Configuration
- **Target**: [route or component]
- **Environment**: [dev/production]
- **Capture Type**: [browser/ssr/build/network]
- **Sample Duration**: [X]ms

### Core Web Vitals Summary

| Metric | Value | Target | Status | Notes |
|--------|-------|--------|--------|-------|
| TTFB | [X]ms | < 200ms | OK/WARN/CRIT | [notes] |
| FCP | [X]ms | < 1.0s | OK/WARN/CRIT | [notes] |
| LCP | [X]s | < 2.5s | OK/WARN/CRIT | [element] |
| INP | [X]ms | < 200ms | OK/WARN/CRIT | [notes] |
| CLS | [X] | < 0.1 | OK/WARN/CRIT | [shifts] |
| TBT | [X]ms | < 200ms | OK/WARN/CRIT | [notes] |

### Timeline Analysis

\`\`\`
0ms      100ms    200ms    500ms    1000ms   2000ms
|--------|--------|--------|--------|--------|
[=====] TTFB (150ms)
       [==] FCP (80ms after TTFB)
              [========] LCP (350ms after FCP)
                    [=] Hydration (120ms)
                       [===] TTI (200ms)
\`\`\`

### SSR Trace Breakdown

| Phase | Duration | % of Total | Bottleneck |
|-------|----------|------------|------------|
| Route matching | [X]ms | [X]% | No |
| Load functions | [X]ms | [X]% | Possible |
| Rendering | [X]ms | [X]% | No |
| Serialization | [X]ms | [X]% | No |

### Hot Spots Identified

#### 1. [Location/Component]
- **Duration**: [X]ms
- **Type**: [CPU/Network/Render]
- **Call stack**:
  \`\`\`
  [stack trace or flame graph summary]
  \`\`\`
- **Recommendation**: [fix]

### Network Waterfall

| Resource | Type | Size | Duration | Blocking |
|----------|------|------|----------|----------|
| /api/data | fetch | [X]KB | [X]ms | Yes/No |
| chunk.js | script | [X]KB | [X]ms | Yes/No |

### Instrumentation Code

\`\`\`typescript
// Add to src/hooks.server.ts
[tracing code]
\`\`\`

\`\`\`typescript
// Add to src/routes/+layout.svelte
[client tracing code]
\`\`\`

### Capture Commands

\`\`\`bash
# Browser trace (run in DevTools console)
await performance.profile.start();
// ... interact with page
const trace = await performance.profile.stop();

# SSR profiling
NODE_OPTIONS="--cpu-prof" npm run preview

# Lighthouse CLI
npx lighthouse http://localhost:5173 --output=json --output-path=./trace.json
\`\`\`

### Recommendations Priority

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| [issue] | High/Med/Low | Low/Med/High | P1/P2/P3 |

### Before/After Projections

| Metric | Current | Target | Expected After Fix |
|--------|---------|--------|-------------------|
| LCP | [X]s | 2.5s | [Y]s |
| TTFB | [X]ms | 200ms | [Y]ms |
```
