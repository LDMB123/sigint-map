---
name: agent-performance-optimization
version: 1.0.0
description: **Date**: January 25, 2026
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: performance
complexity: advanced
tags:
  - performance
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
migrated_from: projects/dmb-almanac/.claude/AGENT_PERFORMANCE_OPTIMIZATION_GUIDE.md
migration_date: 2026-01-25
---

# Agent Performance Optimization Guide

**Date**: January 25, 2026
**Purpose**: Standard patterns for high-performance agent design
**Impact**: 10-15x throughput, 70-90% cost reduction

---

## Performance Principles

### 1. Parallelize Everything Possible
**Rule**: If tasks are independent, run them in parallel
**Pattern**: Haiku swarm for simple tasks, Sonnet for complex aggregation

### 2. Use Cheapest Capable Tier
**Rule**: Start with Haiku, escalate only when needed
**Pattern**: Cascading (Haiku → Sonnet → Opus)

### 3. Cache Aggressively
**Rule**: Never recompute what you've already computed
**Pattern**: Content-based cache keys with TTL

### 4. Fail Fast
**Rule**: Terminate early when outcome is determined
**Pattern**: Progressive deepening with early exit

### 5. Batch Intelligently
**Rule**: Group similar tasks to amortize overhead
**Pattern**: Optimal batch size (25-50 items)

---

## Standard Agent Interfaces

### ParallelCapable Interface

```typescript
interface ParallelCapable {
  /**
   * Does this agent support batch processing?
   */
  supportsBatching(): boolean;

  /**
   * Optimal batch size for this agent's task type
   * @returns Number of items to process in one batch
   */
  optimalBatchSize(): number;

  /**
   * Execute tasks in parallel batch
   * @param items Items to process
   * @returns Promise resolving to results array
   */
  executeBatch<T, R>(items: T[]): Promise<R[]>;

  /**
   * Maximum concurrent workers for this agent
   */
  maxConcurrency(): number;
}
```

**Usage Example:**
```typescript
class PerformanceAnalyzer implements ParallelCapable {
  supportsBatching() { return true; }
  optimalBatchSize() { return 50; }
  maxConcurrency() { return 200; }

  async executeBatch(files: string[]): Promise<Analysis[]> {
    // Haiku swarm for parallel analysis
    return await haikuSwarm.map(files, file => this.analyzeFile(file));
  }
}
```

---

### TierAware Interface

```typescript
interface TierAware {
  /**
   * Select appropriate model tier for task
   * @param task Task to evaluate
   * @returns Optimal tier (haiku/sonnet/opus)
   */
  selectTier(task: Task): 'haiku' | 'sonnet' | 'opus';

  /**
   * Estimate cost for task at given tier
   * @param task Task to estimate
   * @param tier Model tier to use
   * @returns Estimated cost in dollars
   */
  estimateCost(task: Task, tier: string): number;

  /**
   * Check if task can be cascaded (try cheap first)
   * @param task Task to check
   * @returns True if cascading is beneficial
   */
  supportsCascading(task: Task): boolean;
}
```

**Usage Example:**
```typescript
class TechnicalWriter implements TierAware {
  selectTier(task: DocTask): 'haiku' | 'sonnet' | 'opus' {
    if (task.type === 'changelog' || task.type === 'readme-quickstart') {
      return 'haiku'; // Simple docs
    }

    const complexity = this.estimateComplexity(task);
    return complexity > 0.7 ? 'sonnet' : 'haiku';
  }

  supportsCascading(task: DocTask): boolean {
    // Try Haiku first, escalate if quality insufficient
    return task.type !== 'api-reference';
  }
}
```

---

### Cacheable Interface

```typescript
interface Cacheable {
  /**
   * Generate cache key for input
   * @param input Input data
   * @returns Unique cache key
   */
  getCacheKey(input: any): string;

  /**
   * Cache time-to-live in milliseconds
   * @returns TTL in ms (0 = no expiration)
   */
  getCacheTTL(): number;

  /**
   * Should this result be cached?
   * @param input Input data
   * @param result Computed result
   * @returns True if cacheable
   */
  isCacheable(input: any, result: any): boolean;
}
```

**Usage Example:**
```typescript
class ArchitectureAnalyzer implements Cacheable {
  getCacheKey(files: string[]): string {
    // Content-based key
    const fileHashes = files.map(f => hashFile(f));
    return `arch-analysis:${hashCombine(fileHashes)}`;
  }

  getCacheTTL(): number {
    return 15 * 60 * 1000; // 15 minutes
  }

  isCacheable(files: string[], result: Analysis): boolean {
    // Cache successful analyses, not errors
    return result.success && files.length > 5;
  }
}
```

---

### EarlyTermination Interface

```typescript
interface EarlyTermination {
  /**
   * Should processing terminate early?
   * @param intermediateResults Results so far
   * @returns True if should stop
   */
  shouldTerminate(intermediateResults: any[]): boolean;

  /**
   * Reason for termination
   * @returns Human-readable reason
   */
  getTerminationReason(): string;

  /**
   * Minimum results before allowing early termination
   */
  getMinResultsBeforeTermination(): number;
}
```

**Usage Example:**
```typescript
class ReviewOrchestrator implements EarlyTermination {
  shouldTerminate(reviews: Review[]): boolean {
    // Stop if critical security issue found
    const hasCritical = reviews.some(r =>
      r.severity === 'critical' && r.category === 'security'
    );
    return hasCritical && reviews.length >= 3;
  }

  getTerminationReason(): string {
    return 'Critical security vulnerability detected';
  }

  getMinResultsBeforeTermination(): number {
    return 3; // Need at least 3 reviews
  }
}
```

---

## Performance Patterns

### Pattern 1: Haiku Swarm (Fan-Out)

**When to use**: Many independent simple tasks
**Cost**: 92% cheaper than Sonnet
**Speedup**: 50-200x with 200 workers

```typescript
async function validateFiles(files: string[]): Promise<ValidationResult[]> {
  const coordinator = new HaikuSwarmCoordinator({
    maxWorkers: 200,
    batchSize: 50,
  });

  // Each Haiku validates one file
  const validations = await coordinator.fanOut(files, async (file) => {
    return await haikuAgent.validate(file);
  });

  return validations;
}
```

**Performance**:
- 100 files: 4 seconds, $0.125 (vs 250 seconds, $1.50 sequential Sonnet)
- 1000 files: 15 seconds, $1.25 (vs 2500 seconds, $15.00)

---

### Pattern 2: Map-Reduce

**When to use**: Parallel processing + aggregation
**Cost**: 70% cheaper than all-Sonnet
**Speedup**: 10-30x

```typescript
async function analyzeCodebase(files: string[]): Promise<Analysis> {
  // MAP: Haiku workers analyze each file (parallel)
  const fileAnalyses = await haikuSwarm.map(files, async (file) => {
    return {
      complexity: analyzeComplexity(file),
      dependencies: extractDependencies(file),
      issues: findIssues(file),
    };
  });

  // REDUCE: Sonnet aggregates and synthesizes (single)
  const summary = await sonnetAgent.reduce(fileAnalyses, async (analyses) => {
    return {
      totalComplexity: sum(analyses.map(a => a.complexity)),
      dependencyGraph: buildGraph(analyses.map(a => a.dependencies)),
      criticalIssues: prioritize(analyses.flatMap(a => a.issues)),
    };
  });

  return summary;
}
```

---

### Pattern 3: Cascading Tiers

**When to use**: Try cheap first, escalate if needed
**Cost**: 60-80% savings
**Speedup**: Variable

```typescript
async function generateDocumentation(spec: APISpec): Promise<string> {
  // Level 1: Try Haiku (cheap)
  const haikuDocs = await haikuAgent.generate(spec);

  // Check quality
  const quality = await evaluateQuality(haikuDocs);

  if (quality.score > 0.8) {
    return haikuDocs; // Good enough!
  }

  // Level 2: Escalate to Sonnet (complex)
  const sonnetDocs = await sonnetAgent.generate(spec, {
    context: haikuDocs, // Use Haiku attempt as context
    focusAreas: quality.weaknesses,
  });

  return sonnetDocs;
}
```

---

### Pattern 4: Progressive Deepening

**When to use**: Quick scan → deep analysis
**Cost**: 60% savings on clean code
**Speedup**: 3-5x average

```typescript
async function reviewCode(files: string[]): Promise<Review> {
  // Level 1: Quick Haiku scan (all files)
  const quickScan = await haikuSwarm.scan(files, {
    checks: ['syntax', 'style', 'obvious-bugs'],
  });

  // Identify files needing deep review
  const problematicFiles = quickScan
    .filter(result => result.issues.length > 0)
    .map(result => result.file);

  if (problematicFiles.length === 0) {
    return { status: 'clean', summary: quickScan };
  }

  // Level 2: Deep Sonnet analysis (only problem files)
  const deepReview = await sonnetReviewers.analyze(problematicFiles, {
    checks: ['security', 'performance', 'architecture'],
  });

  return merge(quickScan, deepReview);
}
```

---

### Pattern 5: Parallel Ensemble

**When to use**: Try multiple approaches, pick best
**Cost**: Moderate (but faster convergence)
**Speedup**: 40% fewer iterations

```typescript
async function refineOutput(input: string): Promise<string> {
  // Try 5 parallel refinement strategies with Haiku
  const refinements = await Promise.all([
    haiku('Refine for clarity: ' + input),
    haiku('Refine for correctness: ' + input),
    haiku('Refine for completeness: ' + input),
    haiku('Refine for conciseness: ' + input),
    haiku('Refine for examples: ' + input),
  ]);

  // Sonnet selects best refinement
  const best = await sonnet(`
    Select the best refinement from these options:
    ${refinements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

    Return only the number (1-5) of the best option.
  `);

  return refinements[parseInt(best) - 1];
}
```

---

### Pattern 6: Result Caching

**When to use**: Always (for idempotent operations)
**Cost**: 100x faster on cache hits
**Speedup**: Eliminates redundant work

```typescript
class CachedAgent {
  private cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 15 * 60 * 1000, // 15 minutes
  });

  async execute<T>(input: any): Promise<T> {
    // Generate cache key
    const cacheKey = this.getCacheKey(input);

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Compute result
    const result = await this.performWork(input);

    // Cache result
    if (this.isCacheable(input, result)) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  private getCacheKey(input: any): string {
    return `${this.agentName}:${hashObject(input)}`;
  }
}
```

---

## Agent Communication Protocol

### AgentBus

**Purpose**: Enable inter-agent communication and coordination

```typescript
interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'cancel';
  payload: any;
  priority: number; // 0-9, higher = more urgent
  timestamp: number;
  correlationId?: string; // For request/response pairing
}

class AgentBus {
  private subscribers = new Map<string, Agent[]>();
  private messageQueue = new PriorityQueue<AgentMessage>();

  /**
   * Publish message to agent(s)
   */
  publish(msg: AgentMessage): void {
    if (msg.type === 'broadcast') {
      this.broadcastToAll(msg);
    } else {
      const recipients = this.subscribers.get(msg.to) || [];
      recipients.forEach(agent => agent.receive(msg));
    }
  }

  /**
   * Subscribe to messages for agent
   */
  subscribe(agentId: string, agent: Agent): void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, []);
    }
    this.subscribers.get(agentId)!.push(agent);
  }

  /**
   * Request-response pattern
   */
  async request<T>(from: string, to: string, payload: any): Promise<T> {
    const correlationId = generateId();

    this.publish({
      from,
      to,
      type: 'request',
      payload,
      priority: 5,
      timestamp: Date.now(),
      correlationId,
    });

    // Wait for response
    return new Promise((resolve) => {
      this.waitForResponse(correlationId, resolve);
    });
  }
}
```

**Usage Example:**
```typescript
// Agent 1: Request dependency graph
const graph = await agentBus.request(
  'architecture-analyzer',
  'dependency-analyzer',
  { files: ['src/**/*.ts'] }
);

// Agent 2: Receives request, sends response
class DependencyAnalyzer {
  async receive(msg: AgentMessage) {
    if (msg.type === 'request') {
      const result = await this.analyzeDependencies(msg.payload.files);

      agentBus.publish({
        from: 'dependency-analyzer',
        to: msg.from,
        type: 'response',
        payload: result,
        priority: msg.priority,
        timestamp: Date.now(),
        correlationId: msg.correlationId,
      });
    }
  }
}
```

---

## Performance Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Sequential When Parallel Possible

**Bad:**
```typescript
const results = [];
for (const file of files) {
  results.push(await analyzeFile(file)); // Sequential!
}
```

**Good:**
```typescript
const results = await Promise.all(
  files.map(file => analyzeFile(file)) // Parallel!
);
```

---

### ❌ Anti-Pattern 2: Using Expensive Tier for Simple Tasks

**Bad:**
```typescript
// Using Sonnet for simple validation
const isValid = await sonnetAgent.validate(input);
```

**Good:**
```typescript
// Use Haiku for simple validation
const isValid = await haikuAgent.validate(input);
```

---

### ❌ Anti-Pattern 3: No Caching

**Bad:**
```typescript
async function analyze(files: string[]) {
  return await performExpensiveAnalysis(files); // Always recomputes
}
```

**Good:**
```typescript
async function analyze(files: string[]) {
  const cacheKey = hashFiles(files);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const result = await performExpensiveAnalysis(files);
  cache.set(cacheKey, result);
  return result;
}
```

---

### ❌ Anti-Pattern 4: No Early Termination

**Bad:**
```typescript
async function review(files: string[]) {
  const reviews = [];
  for (const file of files) {
    reviews.push(await reviewFile(file));
  }
  return reviews; // Reviews everything even after finding critical issue
}
```

**Good:**
```typescript
async function review(files: string[]) {
  const reviews = [];
  for (const file of files) {
    const review = await reviewFile(file);
    reviews.push(review);

    if (review.severity === 'critical') {
      return { status: 'failed-fast', reviews }; // Stop early
    }
  }
  return { status: 'complete', reviews };
}
```

---

### ❌ Anti-Pattern 5: Large Batch Sizes

**Bad:**
```typescript
// Process all 10,000 files in one batch
const results = await processFiles(allFiles);
```

**Good:**
```typescript
// Process in optimal batches of 50
const batches = chunk(allFiles, 50);
const results = [];

for (const batch of batches) {
  const batchResults = await processFiles(batch);
  results.push(...batchResults);
}
```

---

## Implementation Checklist

When creating or optimizing an agent, ensure:

### Performance
- [ ] Supports parallel execution for independent tasks
- [ ] Uses cheapest capable tier (Haiku when possible)
- [ ] Implements caching for idempotent operations
- [ ] Has early termination logic for critical findings
- [ ] Uses optimal batch sizes (25-50 items)

### Coordination
- [ ] Declares integration points with other agents
- [ ] Implements AgentBus communication protocol
- [ ] Shares intermediate results when beneficial
- [ ] Handles backpressure from downstream agents

### Quality
- [ ] Has tier-aware delegation strategy
- [ ] Implements progressive deepening when appropriate
- [ ] Uses ensemble methods for better convergence
- [ ] Validates output quality before returning

### Monitoring
- [ ] Tracks execution time per operation
- [ ] Logs tier usage and costs
- [ ] Monitors cache hit rates
- [ ] Reports early termination frequency

---

## Performance Metrics to Track

```typescript
interface AgentMetrics {
  // Execution
  executionTime: number;
  taskCount: number;
  throughput: number; // tasks/second

  // Cost
  tierUsage: { haiku: number; sonnet: number; opus: number };
  totalCost: number;
  costPerTask: number;

  // Efficiency
  cacheHitRate: number;
  parallelizationFactor: number;
  earlyTerminationRate: number;

  // Quality
  errorRate: number;
  retryRate: number;
  outputQuality: number;
}
```

---

## Estimated Performance Gains

| Pattern | Speedup | Cost Savings | When to Use |
|---------|---------|--------------|-------------|
| Haiku Swarm | 50-200x | 92% | Many simple tasks |
| Map-Reduce | 10-30x | 70% | Parallel + aggregation |
| Cascading | 2-5x | 60-80% | Try cheap first |
| Progressive Deepening | 3-5x | 60% | Quick scan → deep |
| Ensemble | 1.5-2x | -20% | Better quality |
| Caching | 100x | 99% | Repeated operations |

**Combined Impact**: 10-15x throughput, 70-90% cost reduction

---

## Next Steps

1. **Audit existing agents** against this guide
2. **Implement interfaces** (ParallelCapable, TierAware, Cacheable, EarlyTermination)
3. **Add AgentBus** communication protocol
4. **Update high-impact agents** first (analyzers, generators, reviewers)
5. **Monitor metrics** to validate improvements
6. **Iterate** based on real-world performance data

---

**Version**: 1.0
**Last Updated**: January 25, 2026
**Maintained By**: DMB Almanac Performance Team
