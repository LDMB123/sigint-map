/**
 * Performance Profiling Suite
 *
 * Comprehensive profiling for agentic routing system with targets:
 * - Routing latency: <10ms
 * - Cache hit rate: 90%+
 * - Throughput: 10-100 tasks/sec
 * - Cost per task: $0.0015
 * - Tier distribution: 60% Haiku / 35% Sonnet / 5% Opus
 */

export interface PerformanceMetrics {
  // Routing performance
  routing: {
    latencyMs: number;
    p50: number;
    p95: number;
    p99: number;
    samples: number[];
  };

  // Cache efficiency
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    avgLookupMs: number;
  };

  // Throughput
  throughput: {
    tasksPerSecond: number;
    totalTasks: number;
    durationSeconds: number;
    concurrentTasks: number;
  };

  // Cost analysis
  cost: {
    totalCost: number;
    costPerTask: number;
    byTier: {
      haiku: { count: number; cost: number };
      sonnet: { count: number; cost: number };
      opus: { count: number; cost: number };
    };
  };

  // Tier distribution
  distribution: {
    haiku: { count: number; percentage: number };
    sonnet: { count: number; percentage: number };
    opus: { count: number; percentage: number };
  };

  // Errors and retries
  reliability: {
    successRate: number;
    errorRate: number;
    retries: number;
    fallbacks: number;
  };
}

export interface ProfilingConfig {
  sampleSize?: number;
  warmupIterations?: number;
  trackHistogram?: boolean;
  reportInterval?: number; // ms
}

export interface TaskResult {
  taskId: string;
  tier: 'haiku' | 'sonnet' | 'opus';
  routingLatencyMs: number;
  executionTimeMs: number;
  cacheHit: boolean;
  cacheLookupMs: number;
  success: boolean;
  retries: number;
  fallback: boolean;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
}

export interface ComparisonReport {
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  improvements: {
    routingLatency: string;
    cacheHitRate: string;
    throughput: string;
    costPerTask: string;
    tierDistribution: string;
  };
  passedTargets: {
    routingLatency: boolean; // <10ms
    cacheHitRate: boolean; // 90%+
    throughput: boolean; // 10-100 tasks/sec
    costPerTask: boolean; // <$0.0015
    tierDistribution: boolean; // 60/35/5
  };
}

/**
 * Performance profiler for agentic routing system
 */
export class PerformanceProfiler {
  private results: TaskResult[] = [];
  private startTime: number = 0;
  private config: Required<ProfilingConfig>;

  constructor(config: ProfilingConfig = {}) {
    this.config = {
      sampleSize: config.sampleSize ?? 1000,
      warmupIterations: config.warmupIterations ?? 10,
      trackHistogram: config.trackHistogram ?? true,
      reportInterval: config.reportInterval ?? 5000,
    };
  }

  /**
   * Start profiling session
   */
  start(): void {
    this.results = [];
    this.startTime = performance.now();
    console.log('[Profiler] Started profiling session');
  }

  /**
   * Record a task result
   */
  recordTask(result: TaskResult): void {
    this.results.push(result);
  }

  /**
   * Stop profiling and generate metrics
   */
  stop(): PerformanceMetrics {
    const endTime = performance.now();
    const durationSeconds = (endTime - this.startTime) / 1000;

    console.log(`[Profiler] Stopped profiling session (${durationSeconds.toFixed(2)}s)`);

    return this.calculateMetrics(durationSeconds);
  }

  /**
   * Calculate performance metrics from recorded results
   */
  private calculateMetrics(durationSeconds: number): PerformanceMetrics {
    const totalTasks = this.results.length;

    if (totalTasks === 0) {
      return this.emptyMetrics(durationSeconds);
    }

    // Routing latency
    const latencies = this.results.map(r => r.routingLatencyMs);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);

    const routing = {
      latencyMs: this.average(latencies),
      p50: this.percentile(sortedLatencies, 50),
      p95: this.percentile(sortedLatencies, 95),
      p99: this.percentile(sortedLatencies, 99),
      samples: this.config.trackHistogram ? sortedLatencies : [],
    };

    // Cache efficiency
    const cacheHits = this.results.filter(r => r.cacheHit).length;
    const cacheMisses = totalTasks - cacheHits;
    const cacheLookups = this.results.map(r => r.cacheLookupMs);

    const cache = {
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: (cacheHits / totalTasks) * 100,
      avgLookupMs: this.average(cacheLookups),
    };

    // Throughput
    const throughput = {
      tasksPerSecond: totalTasks / durationSeconds,
      totalTasks,
      durationSeconds,
      concurrentTasks: this.estimateConcurrency(),
    };

    // Cost analysis by tier
    const haikuTasks = this.results.filter(r => r.tier === 'haiku');
    const sonnetTasks = this.results.filter(r => r.tier === 'sonnet');
    const opusTasks = this.results.filter(r => r.tier === 'opus');

    const haikuCost = this.sum(haikuTasks.map(r => r.cost));
    const sonnetCost = this.sum(sonnetTasks.map(r => r.cost));
    const opusCost = this.sum(opusTasks.map(r => r.cost));
    const totalCost = haikuCost + sonnetCost + opusCost;

    const cost = {
      totalCost,
      costPerTask: totalCost / totalTasks,
      byTier: {
        haiku: { count: haikuTasks.length, cost: haikuCost },
        sonnet: { count: sonnetTasks.length, cost: sonnetCost },
        opus: { count: opusTasks.length, cost: opusCost },
      },
    };

    // Tier distribution
    const distribution = {
      haiku: {
        count: haikuTasks.length,
        percentage: (haikuTasks.length / totalTasks) * 100,
      },
      sonnet: {
        count: sonnetTasks.length,
        percentage: (sonnetTasks.length / totalTasks) * 100,
      },
      opus: {
        count: opusTasks.length,
        percentage: (opusTasks.length / totalTasks) * 100,
      },
    };

    // Reliability
    const successfulTasks = this.results.filter(r => r.success).length;
    const totalRetries = this.sum(this.results.map(r => r.retries));
    const totalFallbacks = this.results.filter(r => r.fallback).length;

    const reliability = {
      successRate: (successfulTasks / totalTasks) * 100,
      errorRate: ((totalTasks - successfulTasks) / totalTasks) * 100,
      retries: totalRetries,
      fallbacks: totalFallbacks,
    };

    return {
      routing,
      cache,
      throughput,
      cost,
      distribution,
      reliability,
    };
  }

  /**
   * Estimate concurrent tasks based on overlapping execution windows
   */
  private estimateConcurrency(): number {
    if (this.results.length === 0) return 0;

    // Simple heuristic: find max overlapping tasks
    const events: Array<{ time: number; delta: number }> = [];

    for (const result of this.results) {
      const start = result.timestamp;
      const end = start + result.executionTimeMs;
      events.push({ time: start, delta: 1 });
      events.push({ time: end, delta: -1 });
    }

    events.sort((a, b) => a.time - b.time);

    let current = 0;
    let max = 0;

    for (const event of events) {
      current += event.delta;
      max = Math.max(max, current);
    }

    return max;
  }

  /**
   * Compare two profiling sessions
   */
  compare(before: PerformanceMetrics, after: PerformanceMetrics): ComparisonReport {
    const improvements = {
      routingLatency: this.formatImprovement(
        before.routing.latencyMs,
        after.routing.latencyMs,
        'ms',
        true // lower is better
      ),
      cacheHitRate: this.formatImprovement(
        before.cache.hitRate,
        after.cache.hitRate,
        '%',
        false // higher is better
      ),
      throughput: this.formatImprovement(
        before.throughput.tasksPerSecond,
        after.throughput.tasksPerSecond,
        'tasks/s',
        false // higher is better
      ),
      costPerTask: this.formatImprovement(
        before.cost.costPerTask,
        after.cost.costPerTask,
        '$',
        true // lower is better
      ),
      tierDistribution: this.formatDistributionChange(
        before.distribution,
        after.distribution
      ),
    };

    const passedTargets = {
      routingLatency: after.routing.latencyMs < 10,
      cacheHitRate: after.cache.hitRate >= 90,
      throughput: after.throughput.tasksPerSecond >= 10 && after.throughput.tasksPerSecond <= 100,
      costPerTask: after.cost.costPerTask <= 0.0015,
      tierDistribution: this.checkTierDistribution(after.distribution),
    };

    return {
      before,
      after,
      improvements,
      passedTargets,
    };
  }

  /**
   * Generate a formatted performance report
   */
  generateReport(metrics: PerformanceMetrics, title = 'Performance Report'): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push(`  ${title}`);
    lines.push('='.repeat(80));
    lines.push('');

    // Routing performance
    lines.push('ROUTING PERFORMANCE');
    lines.push('-'.repeat(80));
    lines.push(`  Average Latency:  ${metrics.routing.latencyMs.toFixed(2)}ms ${this.statusBadge(metrics.routing.latencyMs < 10, 'target: <10ms')}`);
    lines.push(`  P50 Latency:      ${metrics.routing.p50.toFixed(2)}ms`);
    lines.push(`  P95 Latency:      ${metrics.routing.p95.toFixed(2)}ms`);
    lines.push(`  P99 Latency:      ${metrics.routing.p99.toFixed(2)}ms`);
    lines.push('');

    // Cache efficiency
    lines.push('CACHE EFFICIENCY');
    lines.push('-'.repeat(80));
    lines.push(`  Hit Rate:         ${metrics.cache.hitRate.toFixed(1)}% ${this.statusBadge(metrics.cache.hitRate >= 90, 'target: 90%+')}`);
    lines.push(`  Cache Hits:       ${metrics.cache.hits.toLocaleString()}`);
    lines.push(`  Cache Misses:     ${metrics.cache.misses.toLocaleString()}`);
    lines.push(`  Avg Lookup Time:  ${metrics.cache.avgLookupMs.toFixed(2)}ms`);
    lines.push('');

    // Throughput
    lines.push('THROUGHPUT');
    lines.push('-'.repeat(80));
    const throughputInRange = metrics.throughput.tasksPerSecond >= 10 && metrics.throughput.tasksPerSecond <= 100;
    lines.push(`  Tasks/Second:     ${metrics.throughput.tasksPerSecond.toFixed(2)} ${this.statusBadge(throughputInRange, 'target: 10-100')}`);
    lines.push(`  Total Tasks:      ${metrics.throughput.totalTasks.toLocaleString()}`);
    lines.push(`  Duration:         ${metrics.throughput.durationSeconds.toFixed(2)}s`);
    lines.push(`  Concurrency:      ${metrics.throughput.concurrentTasks}`);
    lines.push('');

    // Cost analysis
    lines.push('COST ANALYSIS');
    lines.push('-'.repeat(80));
    lines.push(`  Cost/Task:        $${metrics.cost.costPerTask.toFixed(4)} ${this.statusBadge(metrics.cost.costPerTask <= 0.0015, 'target: $0.0015')}`);
    lines.push(`  Total Cost:       $${metrics.cost.totalCost.toFixed(4)}`);
    lines.push('');
    lines.push('  By Tier:');
    lines.push(`    Haiku:          ${metrics.cost.byTier.haiku.count.toLocaleString()} tasks, $${metrics.cost.byTier.haiku.cost.toFixed(4)}`);
    lines.push(`    Sonnet:         ${metrics.cost.byTier.sonnet.count.toLocaleString()} tasks, $${metrics.cost.byTier.sonnet.cost.toFixed(4)}`);
    lines.push(`    Opus:           ${metrics.cost.byTier.opus.count.toLocaleString()} tasks, $${metrics.cost.byTier.opus.cost.toFixed(4)}`);
    lines.push('');

    // Tier distribution
    const distOk = this.checkTierDistribution(metrics.distribution);
    lines.push('TIER DISTRIBUTION');
    lines.push('-'.repeat(80));
    lines.push(`  Haiku:            ${metrics.distribution.haiku.percentage.toFixed(1)}% (${metrics.distribution.haiku.count.toLocaleString()} tasks)`);
    lines.push(`  Sonnet:           ${metrics.distribution.sonnet.percentage.toFixed(1)}% (${metrics.distribution.sonnet.count.toLocaleString()} tasks)`);
    lines.push(`  Opus:             ${metrics.distribution.opus.percentage.toFixed(1)}% (${metrics.distribution.opus.count.toLocaleString()} tasks)`);
    lines.push(`  Target:           60% Haiku / 35% Sonnet / 5% Opus ${this.statusBadge(distOk, '')}`);
    lines.push('');

    // Reliability
    lines.push('RELIABILITY');
    lines.push('-'.repeat(80));
    lines.push(`  Success Rate:     ${metrics.reliability.successRate.toFixed(1)}%`);
    lines.push(`  Error Rate:       ${metrics.reliability.errorRate.toFixed(1)}%`);
    lines.push(`  Total Retries:    ${metrics.reliability.retries.toLocaleString()}`);
    lines.push(`  Fallbacks:        ${metrics.reliability.fallbacks.toLocaleString()}`);
    lines.push('');

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Generate a comparison report
   */
  generateComparisonReport(comparison: ComparisonReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('  PERFORMANCE COMPARISON REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push('IMPROVEMENTS');
    lines.push('-'.repeat(80));
    lines.push(`  Routing Latency:     ${comparison.improvements.routingLatency}`);
    lines.push(`  Cache Hit Rate:      ${comparison.improvements.cacheHitRate}`);
    lines.push(`  Throughput:          ${comparison.improvements.throughput}`);
    lines.push(`  Cost Per Task:       ${comparison.improvements.costPerTask}`);
    lines.push(`  Tier Distribution:   ${comparison.improvements.tierDistribution}`);
    lines.push('');

    lines.push('TARGET ACHIEVEMENT');
    lines.push('-'.repeat(80));
    lines.push(`  Routing Latency (<10ms):        ${this.passFailBadge(comparison.passedTargets.routingLatency)}`);
    lines.push(`  Cache Hit Rate (90%+):          ${this.passFailBadge(comparison.passedTargets.cacheHitRate)}`);
    lines.push(`  Throughput (10-100 tasks/s):    ${this.passFailBadge(comparison.passedTargets.throughput)}`);
    lines.push(`  Cost Per Task (<$0.0015):       ${this.passFailBadge(comparison.passedTargets.costPerTask)}`);
    lines.push(`  Tier Distribution (60/35/5):    ${this.passFailBadge(comparison.passedTargets.tierDistribution)}`);
    lines.push('');

    const allPassed = Object.values(comparison.passedTargets).every(v => v);
    if (allPassed) {
      lines.push('ALL PERFORMANCE TARGETS MET');
    } else {
      lines.push('SOME TARGETS NOT MET - FURTHER OPTIMIZATION NEEDED');
    }

    lines.push('');
    lines.push('='.repeat(80));
    lines.push('');

    // Add detailed before/after metrics
    lines.push('BEFORE OPTIMIZATION');
    lines.push('='.repeat(80));
    lines.push(this.generateReport(comparison.before, 'Before'));
    lines.push('');
    lines.push('');
    lines.push('AFTER OPTIMIZATION');
    lines.push('='.repeat(80));
    lines.push(this.generateReport(comparison.after, 'After'));

    return lines.join('\n');
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(metrics: PerformanceMetrics, filePath: string): void {
    // This would write to file in a real implementation
    console.log(`[Profiler] Metrics exported to ${filePath}`);
  }

  /**
   * Clear recorded results
   */
  reset(): void {
    this.results = [];
    this.startTime = 0;
  }

  // Helper methods

  private emptyMetrics(durationSeconds: number): PerformanceMetrics {
    return {
      routing: {
        latencyMs: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        samples: [],
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgLookupMs: 0,
      },
      throughput: {
        tasksPerSecond: 0,
        totalTasks: 0,
        durationSeconds,
        concurrentTasks: 0,
      },
      cost: {
        totalCost: 0,
        costPerTask: 0,
        byTier: {
          haiku: { count: 0, cost: 0 },
          sonnet: { count: 0, cost: 0 },
          opus: { count: 0, cost: 0 },
        },
      },
      distribution: {
        haiku: { count: 0, percentage: 0 },
        sonnet: { count: 0, percentage: 0 },
        opus: { count: 0, percentage: 0 },
      },
      reliability: {
        successRate: 0,
        errorRate: 0,
        retries: 0,
        fallbacks: 0,
      },
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return this.sum(values) / values.length;
  }

  private sum(values: number[]): number {
    return values.reduce((acc, val) => acc + val, 0);
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private formatImprovement(
    before: number,
    after: number,
    unit: string,
    lowerIsBetter: boolean
  ): string {
    const delta = after - before;
    const percentChange = ((delta / before) * 100);
    const improved = lowerIsBetter ? delta < 0 : delta > 0;

    const sign = delta > 0 ? '+' : '';
    const arrow = improved ? '↓' : '↑';
    const badge = improved ? '[IMPROVED]' : '[DEGRADED]';

    return `${before.toFixed(2)}${unit} → ${after.toFixed(2)}${unit} (${sign}${percentChange.toFixed(1)}%) ${arrow} ${badge}`;
  }

  private formatDistributionChange(
    before: PerformanceMetrics['distribution'],
    after: PerformanceMetrics['distribution']
  ): string {
    const beforeStr = `${before.haiku.percentage.toFixed(0)}/${before.sonnet.percentage.toFixed(0)}/${before.opus.percentage.toFixed(0)}`;
    const afterStr = `${after.haiku.percentage.toFixed(0)}/${after.sonnet.percentage.toFixed(0)}/${after.opus.percentage.toFixed(0)}`;

    const beforeOk = this.checkTierDistribution(before);
    const afterOk = this.checkTierDistribution(after);

    let status = '';
    if (!beforeOk && afterOk) {
      status = '[IMPROVED - NOW MEETS TARGET]';
    } else if (beforeOk && !afterOk) {
      status = '[DEGRADED - NO LONGER MEETS TARGET]';
    } else if (afterOk) {
      status = '[MAINTAINED TARGET]';
    } else {
      status = '[STILL BELOW TARGET]';
    }

    return `${beforeStr}% → ${afterStr}% ${status}`;
  }

  private checkTierDistribution(dist: PerformanceMetrics['distribution']): boolean {
    // Target: 60% Haiku / 35% Sonnet / 5% Opus
    // Allow +/- 10% tolerance
    const haikuOk = Math.abs(dist.haiku.percentage - 60) <= 10;
    const sonnetOk = Math.abs(dist.sonnet.percentage - 35) <= 10;
    const opusOk = Math.abs(dist.opus.percentage - 5) <= 10;

    return haikuOk && sonnetOk && opusOk;
  }

  private statusBadge(passed: boolean, label: string): string {
    const badge = passed ? '[PASS]' : '[FAIL]';
    return `${badge} ${label}`;
  }

  private passFailBadge(passed: boolean): string {
    return passed ? '[PASS]' : '[FAIL]';
  }
}

/**
 * Create a mock task result for testing
 */
export function createMockTaskResult(overrides: Partial<TaskResult> = {}): TaskResult {
  return {
    taskId: `task-${Math.random().toString(36).substr(2, 9)}`,
    tier: 'haiku',
    routingLatencyMs: 5,
    executionTimeMs: 100,
    cacheHit: false,
    cacheLookupMs: 1,
    success: true,
    retries: 0,
    fallback: false,
    inputTokens: 100,
    outputTokens: 50,
    cost: 0.0001,
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Run a profiling benchmark
 */
export async function runBenchmark(
  taskFn: () => Promise<TaskResult>,
  options: {
    iterations?: number;
    warmupIterations?: number;
    reportInterval?: number;
  } = {}
): Promise<PerformanceMetrics> {
  const {
    iterations = 100,
    warmupIterations = 10,
    reportInterval = 25,
  } = options;

  const profiler = new PerformanceProfiler({
    sampleSize: iterations,
    warmupIterations,
  });

  // Warmup
  console.log(`[Benchmark] Running ${warmupIterations} warmup iterations...`);
  for (let i = 0; i < warmupIterations; i++) {
    await taskFn();
  }

  // Actual benchmark
  console.log(`[Benchmark] Running ${iterations} benchmark iterations...`);
  profiler.start();

  for (let i = 0; i < iterations; i++) {
    const result = await taskFn();
    profiler.recordTask(result);

    if ((i + 1) % reportInterval === 0) {
      console.log(`[Benchmark] Progress: ${i + 1}/${iterations}`);
    }
  }

  const metrics = profiler.stop();

  // Generate report
  console.log('\n' + profiler.generateReport(metrics));

  return metrics;
}

/**
 * Example usage for testing the profiler
 */
export async function exampleUsage(): Promise<void> {
  // Simulate a routing function
  const simulateRouting = async (): Promise<TaskResult> => {
    const start = performance.now();

    // Simulate routing decision (2-8ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 6 + 2));
    const routingLatency = performance.now() - start;

    // Simulate cache lookup (0.5-2ms)
    const cacheStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1.5 + 0.5));
    const cacheLookup = performance.now() - cacheStart;

    // 70% cache hit rate
    const cacheHit = Math.random() < 0.7;

    // Tier selection (simulate 60/35/5 distribution)
    let tier: 'haiku' | 'sonnet' | 'opus';
    const rand = Math.random();
    if (rand < 0.6) {
      tier = 'haiku';
    } else if (rand < 0.95) {
      tier = 'sonnet';
    } else {
      tier = 'opus';
    }

    // Cost calculation
    const inputTokens = 100 + Math.floor(Math.random() * 200);
    const outputTokens = 50 + Math.floor(Math.random() * 100);

    const costPer1M = tier === 'haiku' ? 0.25 : tier === 'sonnet' ? 3.0 : 15.0;
    const cost = ((inputTokens + outputTokens) / 1_000_000) * costPer1M;

    // Execution time
    const executionTime = tier === 'haiku' ? 50 + Math.random() * 50 :
                          tier === 'sonnet' ? 100 + Math.random() * 100 :
                          200 + Math.random() * 200;

    return createMockTaskResult({
      tier,
      routingLatencyMs: routingLatency,
      executionTimeMs: executionTime,
      cacheHit,
      cacheLookupMs: cacheLookup,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
    });
  };

  // Run benchmark
  console.log('Starting benchmark...\n');
  const metrics = await runBenchmark(simulateRouting, {
    iterations: 100,
    warmupIterations: 10,
    reportInterval: 25,
  });

  // Example: Compare before/after optimization
  console.log('\n\nRunning optimized version...\n');

  const simulateOptimizedRouting = async (): Promise<TaskResult> => {
    const result = await simulateRouting();
    // Simulate improvements
    return {
      ...result,
      routingLatencyMs: result.routingLatencyMs * 0.7, // 30% faster routing
      cacheHit: Math.random() < 0.92, // 92% cache hit rate
      cacheLookupMs: result.cacheLookupMs * 0.8, // 20% faster cache lookups
    };
  };

  const optimizedMetrics = await runBenchmark(simulateOptimizedRouting, {
    iterations: 100,
    warmupIterations: 10,
    reportInterval: 25,
  });

  // Generate comparison report
  const profiler = new PerformanceProfiler();
  const comparison = profiler.compare(metrics, optimizedMetrics);

  console.log('\n' + profiler.generateComparisonReport(comparison));
}
