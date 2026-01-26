/**
 * Performance Benchmark: Tier Selection
 *
 * Measures the performance of the unified QualityAssessor and TierSelector
 * Target: <10ms per assessment as specified in implementation plan
 *
 * Run with: npx tsx .claude/benchmarks/tier-selection.benchmark.ts
 */

import { qualityAssessor, type Task } from "../lib/quality/quality-assessor";
import { selectTier, selectTierSimple } from "../lib/tiers/tier-selector";

// Test tasks of varying complexity
const tasks: Task[] = [
  // Simple tasks (10 examples)
  ...Array(10)
    .fill(null)
    .map((_, i) => ({
      description: `Simple task ${i + 1}: List files, read configuration, print output`,
      domain: "filesystem",
      requiredCapabilities: ["read"],
    })),

  // Medium tasks (10 examples)
  ...Array(10)
    .fill(null)
    .map((_, i) => ({
      description: `Medium task ${i + 1}: Refactor authentication to use JWT tokens with refresh rotation, update middleware, add tests`,
      domain: "backend",
      requiredCapabilities: ["code-generation", "security-analysis", "testing"],
      contextSize: 15000,
    })),

  // Complex tasks (10 examples)
  ...Array(10)
    .fill(null)
    .map((_, i) => ({
      description: `Complex task ${i + 1}: Design distributed tracing system. First, architect trace propagation. Second, implement instrumentation. Third, build sampling algorithm. Fourth, create correlation engine. Fifth, implement aggregation pipeline. Sixth, build visualization dashboard`,
      domain: "architecture",
      requiredCapabilities: [
        "system-design",
        "distributed-systems",
        "code-generation",
        "performance-optimization",
        "data-engineering",
        "frontend-development",
      ],
      contextSize: 50000,
      constraints: [
        "Sub-millisecond overhead",
        "100k+ spans/sec",
        "Multi-cloud support",
      ],
    })),
];

/**
 * Benchmark a function and return timing statistics
 */
function benchmark(
  name: string,
  fn: () => void,
  iterations: number
): {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
} {
  const timings: number[] = [];

  // Warmup (10% of iterations)
  for (let i = 0; i < Math.ceil(iterations * 0.1); i++) {
    fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    timings.push(end - start);
  }

  timings.sort((a, b) => a - b);

  const min = timings[0];
  const max = timings[timings.length - 1];
  const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length;
  const p50 = timings[Math.floor(timings.length * 0.5)];
  const p95 = timings[Math.floor(timings.length * 0.95)];
  const p99 = timings[Math.floor(timings.length * 0.99)];

  return { min, max, avg, p50, p95, p99 };
}

console.log("Tier Selection Performance Benchmark");
console.log("=====================================\n");

console.log("Configuration:");
console.log(`  Tasks: ${tasks.length} (10 simple, 10 medium, 10 complex)`);
console.log(`  Iterations: 1000 per task`);
console.log(`  Target: <10ms per assessment\n`);

// Benchmark 1: QualityAssessor.assessComplexity
console.log("Benchmark 1: QualityAssessor.assessComplexity()");
console.log("------------------------------------------------");

const complexityTimings = tasks.map((task, i) => {
  const name = `Task ${i + 1}`;
  const stats = benchmark(
    name,
    () => qualityAssessor.assessComplexity(task),
    1000
  );
  return { name, ...stats };
});

const complexityAvg =
  complexityTimings.reduce((sum, t) => sum + t.avg, 0) /
  complexityTimings.length;
const complexityP95 = Math.max(...complexityTimings.map((t) => t.p95));

console.log(`Average across all tasks: ${complexityAvg.toFixed(3)}ms`);
console.log(`P95 across all tasks: ${complexityP95.toFixed(3)}ms`);
console.log(
  `Target met: ${complexityP95 < 10 ? "✅ YES" : "❌ NO"} (${complexityP95.toFixed(1)}ms < 10ms)\n`
);

// Benchmark 2: TierSelector.selectTier (full)
console.log("Benchmark 2: TierSelector.selectTier() (full metadata)");
console.log("-------------------------------------------------------");

const tierSelectionTimings = tasks.map((task, i) => {
  const name = `Task ${i + 1}`;
  const stats = benchmark(name, () => selectTier(task), 1000);
  return { name, ...stats };
});

const tierSelectionAvg =
  tierSelectionTimings.reduce((sum, t) => sum + t.avg, 0) /
  tierSelectionTimings.length;
const tierSelectionP95 = Math.max(...tierSelectionTimings.map((t) => t.p95));

console.log(`Average across all tasks: ${tierSelectionAvg.toFixed(3)}ms`);
console.log(`P95 across all tasks: ${tierSelectionP95.toFixed(3)}ms`);
console.log(
  `Target met: ${tierSelectionP95 < 10 ? "✅ YES" : "❌ NO"} (${tierSelectionP95.toFixed(1)}ms < 10ms)\n`
);

// Benchmark 3: TierSelector.selectTierSimple
console.log("Benchmark 3: TierSelector.selectTierSimple() (tier only)");
console.log("---------------------------------------------------------");

const tierSimpleTimings = tasks.map((task, i) => {
  const name = `Task ${i + 1}`;
  const stats = benchmark(name, () => selectTierSimple(task), 1000);
  return { name, ...stats };
});

const tierSimpleAvg =
  tierSimpleTimings.reduce((sum, t) => sum + t.avg, 0) /
  tierSimpleTimings.length;
const tierSimpleP95 = Math.max(...tierSimpleTimings.map((t) => t.p95));

console.log(`Average across all tasks: ${tierSimpleAvg.toFixed(3)}ms`);
console.log(`P95 across all tasks: ${tierSimpleP95.toFixed(3)}ms`);
console.log(
  `Target met: ${tierSimpleP95 < 10 ? "✅ YES" : "❌ NO"} (${tierSimpleP95.toFixed(1)}ms < 10ms)\n`
);

// Summary
console.log("\n" + "=".repeat(60));
console.log("Summary");
console.log("=".repeat(60));

const allTargetsMet =
  complexityP95 < 10 && tierSelectionP95 < 10 && tierSimpleP95 < 10;

console.log(`\nPerformance Targets (all < 10ms):`);
console.log(`  QualityAssessor:       ${complexityP95.toFixed(3)}ms ${complexityP95 < 10 ? "✅" : "❌"}`);
console.log(`  TierSelector (full):   ${tierSelectionP95.toFixed(3)}ms ${tierSelectionP95 < 10 ? "✅" : "❌"}`);
console.log(`  TierSelector (simple): ${tierSimpleP95.toFixed(3)}ms ${tierSimpleP95 < 10 ? "✅" : "❌"}`);

console.log(`\n${allTargetsMet ? "🎉 All performance targets met!" : "⚠️  Some targets not met"}`);

// Detailed breakdown by complexity
console.log(`\n${"=".repeat(60)}`);
console.log("Breakdown by Task Complexity");
console.log("=".repeat(60));

const simpleTasksTimings = tierSelectionTimings.slice(0, 10);
const mediumTasksTimings = tierSelectionTimings.slice(10, 20);
const complexTasksTimings = tierSelectionTimings.slice(20, 30);

const simpleAvg =
  simpleTasksTimings.reduce((sum, t) => sum + t.avg, 0) /
  simpleTasksTimings.length;
const mediumAvg =
  mediumTasksTimings.reduce((sum, t) => sum + t.avg, 0) /
  mediumTasksTimings.length;
const complexAvg =
  complexTasksTimings.reduce((sum, t) => sum + t.avg, 0) /
  complexTasksTimings.length;

console.log(`\nSimple tasks (Haiku tier):`);
console.log(`  Average: ${simpleAvg.toFixed(3)}ms`);
console.log(
  `  P95: ${Math.max(...simpleTasksTimings.map((t) => t.p95)).toFixed(3)}ms`
);

console.log(`\nMedium tasks (Sonnet tier):`);
console.log(`  Average: ${mediumAvg.toFixed(3)}ms`);
console.log(
  `  P95: ${Math.max(...mediumTasksTimings.map((t) => t.p95)).toFixed(3)}ms`
);

console.log(`\nComplex tasks (Opus tier):`);
console.log(`  Average: ${complexAvg.toFixed(3)}ms`);
console.log(
  `  P95: ${Math.max(...complexTasksTimings.map((t) => t.p95)).toFixed(3)}ms`
);

console.log(`\n${"=".repeat(60)}`);
console.log("Benchmark Complete");
console.log("=".repeat(60));
