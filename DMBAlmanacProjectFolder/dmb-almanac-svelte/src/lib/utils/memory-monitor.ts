/**
 * Memory Monitor Utility for DMB Almanac
 *
 * Tracks heap usage and detects memory leaks in development
 * Integrates with RUM for production memory metrics
 *
 * Usage:
 * ```typescript
 * import { memoryMonitor } from '$lib/utils/memory-monitor';
 *
 * memoryMonitor.start({ interval: 5000 });
 * // ... perform operations
 * const report = memoryMonitor.getReport();
 * console.log(report);
 * ```
 */

import { browser } from '$app/environment';

/**
 * Type declaration for Chrome DevTools getEventListeners API
 * Only available in Chrome DevTools, not in regular JavaScript
 */
declare global {
  function getEventListeners(target: Element): Record<string, EventListener[]>;
}

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  external?: number;
  delta?: number;
}

export interface MemoryReport {
  samples: MemorySnapshot[];
  currentHeap: number;
  trend: 'stable' | 'growing' | 'shrinking' | 'unknown';
  averageGrowthPerSecond: number;
  maxHeapSize: number;
  minHeapSize: number;
  leakRisk: 'low' | 'medium' | 'high' | 'critical';
  lastCheckpoint?: MemorySnapshot;
}

export interface MemoryThresholds {
  warnThreshold: number; // MB
  criticalThreshold: number; // MB
  growthRateWarn: number; // MB/second
  growthRateCritical: number; // MB/second
}

class MemoryMonitor {
  private samples: MemorySnapshot[] = [];
  private maxSamples = 100;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private thresholds: MemoryThresholds = {
    warnThreshold: 100, // 100MB
    criticalThreshold: 200, // 200MB
    growthRateWarn: 1, // 1MB/s
    growthRateCritical: 5, // 5MB/s
  };

  /**
   * Get current memory info
   */
  private getMemoryInfo(): MemorySnapshot | null {
    if (!browser || !('memory' in performance)) {
      return null;
    }

    const mem = (performance as any).memory;
    const delta = this.samples.length > 0
      ? mem.usedJSHeapSize - this.samples[this.samples.length - 1].usedJSHeapSize
      : 0;

    return {
      timestamp: Date.now(),
      usedJSHeapSize: mem.usedJSHeapSize || 0,
      totalJSHeapSize: mem.totalJSHeapSize || 0,
      jsHeapSizeLimit: mem.jsHeapSizeLimit || 0,
      external: (mem.external || 0),
      delta,
    };
  }

  /**
   * Start monitoring memory
   */
  start(options?: { interval?: number }): void {
    if (!browser) return;

    if (this.isRunning) {
      console.warn('[MemoryMonitor] Already running');
      return;
    }

    const interval = options?.interval || 5000;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      const snapshot = this.getMemoryInfo();
      if (snapshot) {
        this.samples.push(snapshot);

        // Keep only last N samples
        if (this.samples.length > this.maxSamples) {
          this.samples = this.samples.slice(-this.maxSamples);
        }

        this.checkThresholds(snapshot);
      }
    }, interval);

    console.debug('[MemoryMonitor] Started (interval: ' + interval + 'ms)');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.debug('[MemoryMonitor] Stopped');
  }

  /**
   * Create a checkpoint for later comparison
   */
  checkpoint(): MemorySnapshot | null {
    return this.getMemoryInfo();
  }

  /**
   * Compare current heap to checkpoint
   */
  compareToCheckpoint(checkpoint: MemorySnapshot): {
    heapGrowth: number;
    heapGrowthMB: number;
    percentageGrowth: number;
    timeElapsedSeconds: number;
    growthRateMBPerSecond: number;
  } | null {
    const current = this.getMemoryInfo();
    if (!current) return null;

    const heapGrowth = current.usedJSHeapSize - checkpoint.usedJSHeapSize;
    const heapGrowthMB = heapGrowth / 1048576;
    const percentageGrowth = (heapGrowth / checkpoint.usedJSHeapSize) * 100;
    const timeElapsedSeconds = (current.timestamp - checkpoint.timestamp) / 1000;
    const growthRateMBPerSecond = heapGrowthMB / Math.max(timeElapsedSeconds, 1);

    return {
      heapGrowth,
      heapGrowthMB,
      percentageGrowth,
      timeElapsedSeconds,
      growthRateMBPerSecond,
    };
  }

  /**
   * Get memory report
   */
  getReport(): MemoryReport {
    const current = this.getMemoryInfo();

    if (!current || this.samples.length === 0) {
      return {
        samples: this.samples,
        currentHeap: current?.usedJSHeapSize || 0,
        trend: 'unknown',
        averageGrowthPerSecond: 0,
        maxHeapSize: current?.usedJSHeapSize || 0,
        minHeapSize: current?.usedJSHeapSize || 0,
        leakRisk: 'low',
      };
    }

    // PERF: Use loop instead of Math.max/min(...spread) to avoid stack overflow on large arrays
    let maxHeap = 0;
    let minHeap = Infinity;
    for (const sample of this.samples) {
      const heap = sample.usedJSHeapSize;
      if (heap > maxHeap) maxHeap = heap;
      if (heap < minHeap) minHeap = heap;
    }
    const avgGrowth = this.calculateAverageGrowth();
    const trend = this.calculateTrend();
    const leakRisk = this.assessLeakRisk(current, avgGrowth);

    return {
      samples: this.samples,
      currentHeap: current.usedJSHeapSize,
      trend,
      averageGrowthPerSecond: avgGrowth,
      maxHeapSize: maxHeap,
      minHeapSize: minHeap,
      leakRisk,
    };
  }

  /**
   * Clear samples and reset
   */
  reset(): void {
    this.samples = [];
    console.debug('[MemoryMonitor] Reset');
  }

  /**
   * Calculate trend (stable, growing, shrinking)
   */
  private calculateTrend(): 'stable' | 'growing' | 'shrinking' | 'unknown' {
    if (this.samples.length < 5) return 'unknown';

    const recent = this.samples.slice(-5);
    const first = recent[0].usedJSHeapSize;
    const last = recent[recent.length - 1].usedJSHeapSize;
    const change = (last - first) / first;

    if (change > 0.15) return 'growing'; // >15% growth = growing
    if (change < -0.15) return 'shrinking'; // >15% shrink = shrinking
    return 'stable';
  }

  /**
   * Calculate average growth rate
   */
  private calculateAverageGrowth(): number {
    if (this.samples.length < 2) return 0;

    let totalGrowth = 0;
    for (let i = 1; i < this.samples.length; i++) {
      const delta = this.samples[i].usedJSHeapSize - this.samples[i - 1].usedJSHeapSize;
      totalGrowth += Math.max(0, delta); // Only count positive growth
    }

    const timeElapsedSeconds = (this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp) / 1000;
    const growthMB = totalGrowth / 1048576;
    return growthMB / Math.max(timeElapsedSeconds, 1);
  }

  /**
   * Assess leak risk based on current metrics
   */
  private assessLeakRisk(current: MemorySnapshot, growthRate: number): 'low' | 'medium' | 'high' | 'critical' {
    const currentMB = current.usedJSHeapSize / 1048576;

    // Check absolute heap size
    if (currentMB > this.thresholds.criticalThreshold) {
      return 'critical';
    }
    if (currentMB > this.thresholds.warnThreshold) {
      return 'high';
    }

    // Check growth rate
    if (growthRate > this.thresholds.growthRateCritical) {
      return 'critical';
    }
    if (growthRate > this.thresholds.growthRateWarn) {
      return 'high';
    }

    // Check trend
    const trend = this.calculateTrend();
    if (trend === 'growing' && growthRate > 0.5) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check thresholds and emit warnings
   */
  private checkThresholds(snapshot: MemorySnapshot): void {
    const heapMB = snapshot.usedJSHeapSize / 1048576;
    const growthRate = this.calculateAverageGrowth();

    if (heapMB > this.thresholds.criticalThreshold) {
      console.error(`[MemoryMonitor] CRITICAL: Heap size ${heapMB.toFixed(2)}MB exceeds limit`);
    } else if (heapMB > this.thresholds.warnThreshold) {
      console.warn(`[MemoryMonitor] WARNING: Heap size ${heapMB.toFixed(2)}MB is high`);
    }

    if (growthRate > this.thresholds.growthRateCritical) {
      console.error(`[MemoryMonitor] CRITICAL: Growth rate ${growthRate.toFixed(2)}MB/s is too high`);
    } else if (growthRate > this.thresholds.growthRateWarn) {
      console.warn(`[MemoryMonitor] WARNING: Growth rate ${growthRate.toFixed(2)}MB/s is elevated`);
    }
  }

  /**
   * Export report as JSON
   */
  exportReport(): string {
    const report = this.getReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Format report for console display
   */
  formatReport(): string {
    const report = this.getReport();
    const currentMB = (report.currentHeap / 1048576).toFixed(2);
    const maxMB = (report.maxHeapSize / 1048576).toFixed(2);
    const minMB = (report.minHeapSize / 1048576).toFixed(2);
    const growthMBps = report.averageGrowthPerSecond.toFixed(3);

    return `
Memory Report:
  Current Heap: ${currentMB}MB
  Max Heap: ${maxMB}MB
  Min Heap: ${minMB}MB
  Trend: ${report.trend}
  Avg Growth Rate: ${growthMBps}MB/s
  Leak Risk: ${report.leakRisk.toUpperCase()}
  Samples: ${report.samples.length}
    `.trim();
  }

  /**
   * Get listener count estimate (Chrome DevTools)
   * Only works in Chrome DevTools, returns null in regular browser environments
   * PERF: Uses TreeWalker instead of querySelectorAll('*') for better memory efficiency
   */
  getListenerEstimate(): number | null {
    if (!browser || !window) return null;

    try {
      // Check if getEventListeners is available (only in Chrome DevTools)
      if (typeof getEventListeners !== 'function') {
        return null;
      }

      // PERF: Use TreeWalker instead of querySelectorAll('*')
      // TreeWalker is more memory-efficient as it doesn't create a large NodeList
      let count = 0;
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      let node: Node | null = walker.currentNode;
      while (node) {
        // Try to get event listener count from element
        // Note: This is only available in Chrome DevTools context
        try {
          const listeners = getEventListeners(node as Element);
          count += Object.keys(listeners).length;
        } catch {
          // Element may not support getEventListeners, skip it
        }
        node = walker.nextNode();
      }

      return count;
    } catch {
      // API not available in this environment
      return null;
    }
  }

  /**
   * Set custom thresholds
   */
  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitor();

/**
 * Development-only memory leak detector
 * Logs warnings to console if memory leak patterns detected
 */
export function detectMemoryLeak(
  name: string,
  operation: () => void | Promise<void>,
  options?: {
    iterations?: number;
    expectedGrowthMB?: number;
  }
): void {
  if (!browser || import.meta.env.PROD) {
    return; // Only in dev
  }

  const iterations = options?.iterations || 10;
  const expectedGrowthMB = options?.expectedGrowthMB || 5;

  console.group(`[MemoryLeakDetector] Testing: ${name}`);

  const checkpoint = memoryMonitor.checkpoint();
  if (!checkpoint) {
    console.warn('Memory monitor not available');
    console.groupEnd();
    return;
  }

  // Perform operation multiple times
  let promiseChain = Promise.resolve();
  for (let i = 0; i < iterations; i++) {
    promiseChain = promiseChain.then(() => {
      const result = operation();
      if (result instanceof Promise) {
        return result;
      }
      return Promise.resolve();
    });
  }

  promiseChain.then(() => {
    // Wait for GC
    if ((global as any).gc) {
      (global as any).gc();
    }

    setTimeout(() => {
      const comparison = memoryMonitor.compareToCheckpoint(checkpoint);
      if (comparison) {
        const { heapGrowthMB, growthRateMBPerSecond, timeElapsedSeconds } = comparison;

        console.log(`After ${iterations} iterations (${timeElapsedSeconds.toFixed(1)}s):`);
        console.log(`  Heap Growth: ${heapGrowthMB.toFixed(2)}MB`);
        console.log(`  Growth Rate: ${growthRateMBPerSecond.toFixed(3)}MB/s`);

        if (heapGrowthMB > expectedGrowthMB) {
          console.error(`  MEMORY LEAK DETECTED: Growth ${heapGrowthMB.toFixed(2)}MB > expected ${expectedGrowthMB}MB`);
        } else {
          console.log(`  Memory usage OK (within ${expectedGrowthMB}MB threshold)`);
        }
      }

      console.groupEnd();
    }, 500);
  });
}
