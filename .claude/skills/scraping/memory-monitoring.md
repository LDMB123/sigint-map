---
name: memory-monitoring
version: 1.0.0
description: ---
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: scraping
complexity: advanced
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

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/archive/misc/MEMORY_MONITORING_GUIDE.md
migration_date: 2026-01-25
---

# Memory Monitoring & Testing Guide
## DMB Almanac v2 - Implementation Reference

---

## Part 1: Manual Memory Profiling with Chrome DevTools

### Step-by-Step Guide for Each Leak

#### Test 1: NetworkStatus Leak
```
1. Open Chrome DevTools
2. Go to Memory tab
3. Click "Heap snapshot" button to take BASELINE snapshot
4. Note the heap size (e.g., 45.2 MB)

5. In console, simulate online events:
   window.dispatchEvent(new Event('online'));
   await new Promise(r => setTimeout(r, 3100));  // Wait for toast timeout
   window.dispatchEvent(new Event('offline'));

6. Repeat step 5 ten times (copy-paste the event dispatch 10x)
7. Force garbage collection: click the trash icon in Memory panel
8. Take second HEAP SNAPSHOT

9. Compare snapshots:
   - OLD: Should show ~245 EventListener objects
   - NEW (FIXED): Should show ~5 EventListener objects
```

#### Test 2: InstallPrompt Leak
```
1. Take baseline heap snapshot
2. Manually trigger beforeinstallprompt:
   // In console:
   const event = new Event('beforeinstallprompt');
   window.dispatchEvent(event);

3. Repeat 10 times
4. Force GC and take snapshot
5. Look for accumulating timeout objects in heap
```

#### Test 3: Confetti Leak
```
1. Take baseline heap snapshot
2. Rapidly toggle confetti (if available in UI):
   // Simulate with:
   for (let i = 0; i < 50; i++) {
     window.dispatchEvent(new CustomEvent('achievement-unlock'));
     await new Promise(r => setTimeout(r, 100));
   }

3. Wait for all animations to complete
4. Force GC and take snapshot
5. Look for Timeout objects - should be minimal
```

### Chrome DevTools Memory Panel Tips

**Finding Retained Objects:**
1. After taking second snapshot, select "Comparison" view
2. Filter by "Detached" in Objects allocated section
3. Look for:
   - "Timeout" objects (setInterval/setTimeout leaks)
   - "EventListener" objects (event listener leaks)
   - "HTMLElement (detached)" (DOM reference leaks)

**Size Analysis:**
- Shallow size = memory used by object itself
- Retained size = memory freed if object GC'd
- Look for objects with large retained size but small shallow size

---

## Part 2: Automated Memory Leak Testing

### Test File Template

Create `/apps/web/src/__tests__/memory-leaks.test.ts`:

```typescript
/**
 * Memory Leak Detection Tests
 *
 * Verifies that components don't leak memory on repeated mount/unmount cycles.
 * Uses performance.memory API which requires:
 * - Chrome/Chromium only
 * - Command line flag: --enable-precise-memory-info
 * - Run: npm run test -- --maxWorkers=1
 */

import { render, unmountComponentAtNode } from 'react-dom';
import React from 'react';

/**
 * Helper: Measure memory before and after operation
 */
function measureMemory() {
  if (!performance.memory) {
    console.warn('performance.memory not available - run with: ' +
      'node --expose-gc --inspect');
    return { used: 0, growth: 0 };
  }

  return {
    used: performance.memory.usedJSHeapSize,
    limit: performance.memory.jsHeapSizeLimit
  };
}

/**
 * Helper: Force garbage collection (requires --expose-gc flag)
 */
function forceGC() {
  if (typeof global.gc === 'function') {
    global.gc();
  } else {
    console.warn('GC not exposed - run tests with: node --expose-gc');
  }
}

describe('Memory Leaks - NetworkStatus', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    unmountComponentAtNode(container);
    document.body.removeChild(container);
    forceGC();
  });

  test('should not leak memory on repeated online/offline events', () => {
    const iterations = 20;  // Repeated mount/unmount cycles
    const memoryBefore = measureMemory();

    for (let i = 0; i < iterations; i++) {
      // Mount component
      render(React.createElement(() => {
        const [isOnline, setIsOnline] = React.useState(true);

        React.useEffect(() => {
          const handleOnline = () => setIsOnline(true);
          const handleOffline = () => setIsOnline(false);

          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);

          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);

        return React.createElement('div', null, isOnline ? 'Online' : 'Offline');
      }), container);

      // Simulate events
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));

      // Unmount
      unmountComponentAtNode(container);
    }

    forceGC();
    const memoryAfter = measureMemory();
    const growth = memoryAfter.used - memoryBefore.used;
    const growthMB = growth / 1_000_000;

    // Allow some growth but flag suspicious growth
    console.log(`Memory growth: ${growthMB.toFixed(2)}MB`);
    expect(growth).toBeLessThan(5_000_000);  // < 5MB growth
  });

  test('should clear timeouts on component unmount', async () => {
    const initialTimeout = setTimeout(() => {}, 10000);
    const initialId = (initialTimeout as any)._id;

    render(React.createElement(() => {
      React.useEffect(() => {
        const id = setTimeout(() => {}, 5000);
        return () => clearTimeout(id);
      }, []);

      return React.createElement('div');
    }), container);

    unmountComponentAtNode(container);

    // Verify no timeouts left dangling
    // Note: This is harder to test, would need Node.js internals
    expect(true).toBe(true);
  });
});

describe('Memory Leaks - Confetti', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    unmountComponentAtNode(container);
    document.body.removeChild(container);
    forceGC();
  });

  test('should not leak memory on rapid isActive toggles', async () => {
    const memoryBefore = measureMemory();
    const toggles = 50;

    for (let i = 0; i < toggles; i++) {
      render(React.createElement(() => {
        const [isActive, setIsActive] = React.useState(true);

        React.useEffect(() => {
          const id = setTimeout(() => {
            setIsActive(false);
          }, 100);
          return () => clearTimeout(id);
        }, []);

        return React.createElement('div', { 'data-active': isActive });
      }), container);

      await new Promise(r => setTimeout(r, 110));
      unmountComponentAtNode(container);
    }

    forceGC();
    const memoryAfter = measureMemory();
    const growth = memoryAfter.used - memoryBefore.used;

    console.log(`Confetti memory growth: ${(growth / 1_000_000).toFixed(2)}MB`);
    expect(growth).toBeLessThan(3_000_000);  // < 3MB
  });
});

describe('Memory Leaks - Event Listeners', () => {
  test('should properly cleanup event listeners', () => {
    const handler = jest.fn();

    // Simulate adding and removing listeners
    for (let i = 0; i < 100; i++) {
      window.addEventListener('online', handler);
      window.removeEventListener('online', handler);
    }

    // If implemented correctly, should only fire once
    window.dispatchEvent(new Event('online'));
    expect(handler).toHaveBeenCalledTimes(0);  // Should not be attached
  });
});
```

### Running Memory Tests

```bash
# Run with garbage collection exposed (required for memory tests)
node --expose-gc --max-old-space-size=2048 \
  ./node_modules/.bin/jest \
  --testPathPattern="memory-leaks" \
  --maxWorkers=1 \
  --forceExit

# Or add to package.json:
"test:memory": "node --expose-gc ./node_modules/.bin/jest --testPathPattern=memory-leaks --maxWorkers=1"
```

---

## Part 3: Runtime Memory Monitoring

### Client-Side Monitoring (Production)

Create `/src/lib/monitoring/memoryMonitor.ts`:

```typescript
/**
 * Runtime memory monitoring for production
 * Reports memory usage and detects leaks
 */

interface MemoryMetrics {
  timestamp: number;
  usedHeap: number;
  totalHeap: number;
  heapLimit: number;
  growthRate: number;  // bytes/minute
}

interface MemoryAlert {
  type: 'warning' | 'critical';
  message: string;
  metrics: MemoryMetrics;
}

class MemoryMonitor {
  private samples: MemoryMetrics[] = [];
  private maxSamples = 100;
  private checkInterval: NodeJS.Timeout | null = null;
  private alerts: MemoryAlert[] = [];
  private onAlert?: (alert: MemoryAlert) => void;

  constructor(intervalSeconds = 30) {
    if (!this.supportsMemoryAPI()) {
      console.warn('performance.memory API not available');
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkMemory();
    }, intervalSeconds * 1000);
  }

  private supportsMemoryAPI(): boolean {
    return 'memory' in performance && !!(performance as any).memory;
  }

  private checkMemory() {
    if (!this.supportsMemoryAPI()) return;

    const memory = (performance as any).memory;
    const metrics: MemoryMetrics = {
      timestamp: Date.now(),
      usedHeap: memory.usedJSHeapSize,
      totalHeap: memory.totalJSHeapSize,
      heapLimit: memory.jsHeapSizeLimit,
      growthRate: this.calculateGrowthRate()
    };

    this.samples.push(metrics);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.checkForLeaks(metrics);
  }

  private calculateGrowthRate(): number {
    if (this.samples.length < 2) return 0;

    const recent = this.samples.slice(-2);
    const timeDiff = (recent[1].timestamp - recent[0].timestamp) / 60000;  // minutes
    const heapDiff = recent[1].usedHeap - recent[0].usedHeap;

    return heapDiff / timeDiff;  // bytes/minute
  }

  private checkForLeaks(metrics: MemoryMetrics) {
    const usedMB = metrics.usedHeap / 1_000_000;
    const limitMB = metrics.heapLimit / 1_000_000;
    const usagePercent = (metrics.usedHeap / metrics.heapLimit) * 100;

    // Check 1: High absolute memory usage
    if (usagePercent > 80) {
      this.emit({
        type: 'critical',
        message: `Critical memory usage: ${usedMB.toFixed(0)}MB / ${limitMB.toFixed(0)}MB (${usagePercent.toFixed(0)}%)`,
        metrics
      });
      return;
    }

    if (usagePercent > 60) {
      this.emit({
        type: 'warning',
        message: `High memory usage: ${usedMB.toFixed(0)}MB (${usagePercent.toFixed(0)}%)`,
        metrics
      });
    }

    // Check 2: Sustained growth rate
    if (this.samples.length >= 10) {
      const recentGrowth = this.samples
        .slice(-10)
        .reduce((sum, s) => sum + s.growthRate, 0) / 10;

      if (recentGrowth > 1_000_000) {  // > 1MB/min average
        this.emit({
          type: 'warning',
          message: `Sustained memory growth: +${(recentGrowth / 1_000_000).toFixed(2)}MB/min`,
          metrics
        });
      }
    }

    // Check 3: Rapid spike
    if (this.samples.length >= 2) {
      const recent = this.samples[this.samples.length - 1];
      const previous = this.samples[this.samples.length - 2];
      const spike = recent.usedHeap - previous.usedHeap;

      if (spike > 5_000_000) {  // > 5MB spike in one check
        this.emit({
          type: 'warning',
          message: `Rapid memory spike: +${(spike / 1_000_000).toFixed(2)}MB`,
          metrics
        });
      }
    }
  }

  private emit(alert: MemoryAlert) {
    this.alerts.push(alert);
    this.onAlert?.(alert);

    // Optionally send to monitoring service
    if (alert.type === 'critical') {
      this.reportToService(alert);
    }
  }

  private reportToService(alert: MemoryAlert) {
    // Send to monitoring service (e.g., Sentry, DataDog)
    fetch('/api/monitoring/memory-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: alert.message,
        metrics: alert.metrics,
        userAgent: navigator.userAgent
      })
    }).catch(err => console.error('Failed to report memory alert:', err));
  }

  public getMetrics(): MemoryMetrics[] {
    return [...this.samples];
  }

  public getReport() {
    if (this.samples.length === 0) return null;

    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const totalGrowth = last.usedHeap - first.usedHeap;

    return {
      startTime: first.timestamp,
      endTime: last.timestamp,
      durationMinutes: (last.timestamp - first.timestamp) / 60000,
      initialHeap: first.usedHeap,
      currentHeap: last.usedHeap,
      totalGrowth,
      totalGrowthMB: totalGrowth / 1_000_000,
      averageGrowthRate: (totalGrowth / ((last.timestamp - first.timestamp) / 60000)) / 1_000_000,
      maxHeap: Math.max(...this.samples.map(s => s.usedHeap)),
      avgHeap: this.samples.reduce((sum, s) => sum + s.usedHeap, 0) / this.samples.length,
      alerts: this.alerts
    };
  }

  public stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public onAlertReceived(callback: (alert: MemoryAlert) => void) {
    this.onAlert = callback;
  }
}

export const memoryMonitor = new MemoryMonitor(30);  // Check every 30 seconds

// Auto-report on page unload for PWA scenarios
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const report = memoryMonitor.getReport();
    if (report && report.totalGrowthMB > 50) {
      console.log('Memory report:', report);
      // Could send to analytics
    }
  });
}
```

### Use in Components

```typescript
import { memoryMonitor } from '@/lib/monitoring/memoryMonitor';

export function AppWithMemoryMonitoring() {
  useEffect(() => {
    // Set up alert handler
    memoryMonitor.onAlertReceived((alert) => {
      console.warn('Memory Alert:', alert.message);

      if (alert.type === 'critical') {
        // Could trigger garbage collection suggestions
        // or suggest clearing cache
      }
    });

    return () => {
      const report = memoryMonitor.getReport();
      console.log('Memory stats:', report);
    };
  }, []);

  return <App />;
}
```

---

## Part 4: Build-Time Validation

### Add to package.json scripts

```json
{
  "scripts": {
    "test:memory": "node --expose-gc --max-old-space-size=2048 jest --testPathPattern=memory-leaks --maxWorkers=1",
    "test:memory:watch": "npm run test:memory -- --watch",
    "lint:memory-patterns": "eslint --rule 'no-floating-promises: error' src/",
    "analyze:memory": "node scripts/analyze-memory-usage.js"
  }
}
```

### Create Memory Lint Rule

Create `/src/.eslintrc.memory.json`:

```json
{
  "rules": {
    "no-floating-promises": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "no-promise-executor-return": "error"
  },
  "overrides": [
    {
      "files": ["*.tsx", "*.ts"],
      "rules": {
        "react-hooks/rules-of-hooks": "error"
      }
    }
  ]
}
```

---

## Part 5: Memory Profiling in Production

### Monitoring Dashboard Metrics

Track these metrics in your monitoring system (Datadog, New Relic, CloudWatch):

```typescript
// Send to monitoring service
export function captureMemoryMetrics() {
  if (!('memory' in performance)) return;

  const memory = (performance as any).memory;
  const metrics = {
    timestamp: new Date().toISOString(),
    memory: {
      usedHeap: memory.usedJSHeapSize / 1_000_000,  // Convert to MB
      totalHeap: memory.totalJSHeapSize / 1_000_000,
      limit: memory.jsHeapSizeLimit / 1_000_000
    },
    navigation: {
      name: document.title,
      path: window.location.pathname
    },
    performance: {
      memory: memory.usedJSHeapSize
    }
  };

  // Send to your metrics endpoint
  navigator.sendBeacon('/api/metrics/memory', JSON.stringify(metrics));
}

// Call periodically
setInterval(captureMemoryMetrics, 60000);
```

---

## Part 6: Quick Reference Commands

### Memory Profiling Commands
```bash
# Run memory tests with GC exposed
node --expose-gc ./node_modules/.bin/jest --testPathPattern=memory

# Run with detailed heap snapshots
node --expose-gc --inspect node_modules/.bin/jest

# Check memory usage of process
ps aux | grep node  # Look at VSZ (virtual) and RSS (resident) columns

# Monitor with built-in tools
node --inspect app.js  # Then open chrome://inspect
```

### Heap Snapshot Analysis
```bash
# Using Chrome DevTools:
# 1. Elements > Console > Run this:
performance.memory  // See current usage

# 2. Take snapshots
// In DevTools Memory tab

# 3. Load massive data
// Perform operations

# 4. Take another snapshot

# 5. Detached DOM Finder extension
```

---

## Part 7: Troubleshooting

### "performance.memory shows high usage after fixes"
- Run garbage collection manually: `globalThis.gc?.()`
- Check browser cache settings
- Verify you're not holding references in console

### "Tests pass but app still leaks"
- Check background workers/service workers
- Verify third-party libraries not leaking
- Check browser extensions
- Monitor with long-running sessions (hours, not minutes)

### "Can't detect memory leaks in Jest"
- Add `--expose-gc` flag
- Increase `--max-old-space-size`
- Run with `--maxWorkers=1` (single worker)
- Check Node version supports performance.memory

---

