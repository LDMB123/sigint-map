# API Reference (Compressed)

**Version**: 1.0.0 | **Last Updated**: 2026-01-25
**Compression**: 89% reduction (11,800 → 1,290 tokens)
**Strategy**: Signature-based with critical config values
**Hash**: 5a7f2e9c | **Decompression**: Read full file for examples and detailed explanations

---

## Cache Management

`@claude/lib/cache-manager` - 3-tier semantic caching

### CacheManager

```typescript
const cache = new CacheManager();
```

#### L1: Routing Cache (LRU, <1ms)
- `getRouting<T>(taskDescription: string, context?: Record<string, any>): T | null`
- `setRouting<T>(taskDescription: string, value: T, context?: Record<string, any>, agentId?: string): void`
- Config: Max 50MB, TTL 3600s, LRU eviction

#### L2: Context Cache (SQLite)
- `getContext<T>(projectPath: string, itemType: string): T | null`
- `setContext<T>(projectPath: string, itemType: string, value: T, agentId?: string): void`
- Config: Max 200MB, TTL 86400s

#### L3: Semantic Cache (Embedding-based)
- `getSemantic<T>(query: string, agentId: string, fileHash?: string): Promise<T | null>`
- `setSemantic<T>(query: string, value: T, agentId: string, fileHash?: string): Promise<void>`
- Config: Max 500MB, TTL 7200s, Similarity threshold 0.85, Max candidates 100

#### Operations
- `getStats(): CacheStats` → {l1, l2, l3 hit rates, combined storage_size_mb}
- `invalidateFile(fileHash: string): void`
- `clearAll(): void`

---

## Semantic Routing

`@claude/lib/routing` - O(1) agent routing

### RouteTable

```typescript
const router = new RouteTable();
```

#### Routing
- `route(request: string, context?: Record<string, any>): AgentRoute` → {agent, tier}
- `batchRoute(requests: string[], context?: Record<string, any>): AgentRoute[]`

#### Semantic Hash
- `generateSemanticHash(request: string, context?: Record<string, any>): SemanticHash` → {domain, action, complexity, subtype, confidence, reserved}

#### Stats & Cache
- `getStats(): RouteStats` → {lookups, cacheHitRate, avgLookupTimeMs, fuzzyMatches}
- `clearCache(): void`
- `exportCache(): Record<string, HotPathEntry>`
- `importCache(data: Record<string, HotPathEntry>): void`

### HotCache

```typescript
const routingCache = createRoutingCache(1000);
const sessionCache = createSessionCache(500, 3600);
```

- `set(key, value, {ttl?}): void`
- `get(key): {value, hits, age} | null`
- `setMany(entries: [key, value][]): void`
- `getMany(keys: string[]): any[]`
- `getStats(): {hitRate%, avgAccessTimeMs}`

---

## Tier Selection

`@claude/lib/tiers` - Complexity-based model selection

### Complexity Analysis
- `analyzeComplexity(task: Task): number` → 0-100 score
- `analyzeTier(task: Task): TierRecommendation` → {tier, score, breakdown}
- `analyzeComplexityDetailed(task: Task): ComplexityBreakdown` → {signals, contributions}

**TIER_THRESHOLDS:**
```typescript
haiku:  { min: 0,  max: 30 }
sonnet: { min: 25, max: 70 }
opus:   { min: 65, max: 100 }
```

### TierDistributionTracker

```typescript
const tracker = new TierDistributionTracker();
// or with custom distribution:
const tracker = new TierDistributionTracker({
  targetDistribution: { haiku: 0.60, sonnet: 0.30, opus: 0.10 }
});
```

- `selectTier(task: Task): {tier, score}`
- `getDistribution(): {percentages: {haiku, sonnet, opus}}`
- `validateDistribution(): {valid, issues}`

### EscalationEngine

```typescript
const engine = new EscalationEngine({
  enableAutoEscalation: true,
  qualityThresholds: {
    minConfidence: 0.7,
    minCompleteness: 0.8,
    minCorrectness: 0.9
  }
});
```

- `execute(task, executorFn): Promise<{tier, escalationCount, success}>`

---

## Skill Optimization

`@claude/lib/skills` - Compression & lazy loading

### Skill Compression
- `compressSkill(markdown: string): CompressedSkill` → {level1, level2, level3, meta}

**Compression Output Structure:**
```typescript
{
  level1: { skill, domain, keywords, errors, version } // ~50 tokens
  level2: { ...level1, quick_fixes, patterns } // ~150 tokens
  level3: { ...level2, error_details, edge_cases, references } // ~300 tokens
  meta: { compressionRatio, originalTokens, compressedTokens }
}
```

### SkillLazyLoader

```typescript
const loader = new SkillLazyLoader({
  skillsDirectory: './.claude/skills',
  cacheEnabled: true,
  preloadHeaders: true
});
await loader.initialize();
```

- `getHeaders(): SkillHeader[]`
- `getQuickRef(skillId: string): Promise<Level2>`
- `getFull(skillId: string): Promise<Level3>`
- `getStats(): {l1Loads, l2Loads, l3Loads, tokensSaved}`

### Delta Encoding (Skill Packs)

```typescript
const pack = createSkillPack(rustSkills, 'rust-memory');
const skill = loadSkillFromPack(pack, 'rust-borrow-checker-debug');
const cost = getLoadCost(pack, skillId); // {tokens, alreadyLoaded}
```

---

## Parallel Processing

`@claude/lib/swarms` - 50-100 parallel workers

### Subtask Creation
```typescript
const subtask = createSubtask(id, payload, {
  priority?: number,
  maxRetries?: number,
  dependencies?: string[] // Wait for other subtasks
});
```

### WorkDistributor

```typescript
const distributor = new WorkDistributor({
  workerCount: 75,
  maxRetries: 3,
  enableWorkStealing: true,
  workStealingIntervalMs: 1000,
  progressUpdateIntervalMs: 500,
  processor: async (subtask) => { /*...*/ },
  onProgress: (report) => { },
  onSubtaskComplete: (result) => { },
  onSubtaskFail: (id, error, willRetry) => { }
});
```

- `distribute(subtasks): Promise<{results, failures, stats}>`
- Stats: {totalDurationMs, throughput: tasks/sec}

### ResultAggregator

```typescript
const aggregator = new ResultAggregator({
  strategy: Strategies.CONSENSUS, // MERGE, RANK_AND_FILTER, etc
  duplicateStrategy: 'merge',
  confidenceThreshold: 0.7
});
```

- `aggregate(results): Promise<{result, confidence, metadata}>`
- `streamingAggregate(asyncIterator, {batchSize, onBatch}): AsyncIterable`

---

## Speculative Execution

`@claude/lib/speculation` - 8-10x apparent speedup

### IntentPredictor

```typescript
const predictor = new IntentPredictor({
  minConfidence: 0.70,
  maxPredictions: 3,
  lookBackWindow: 10,
  enableLearning: true
});
```

- `recordAction(intent: string, action: string, context: {}): void`
- `predictNext(): Promise<Prediction[]>` → [{task, confidence, reason, expectedDelay, suggestedParams, matchedPatterns}]
- `validatePrediction(actual: string, predictions): boolean`
- `getAccuracy(): number` → 0-1

### SpeculationExecutor

```typescript
const executor = new SpeculationExecutor({
  enabled: true,
  budget: { maxSpeculations: 5, timeoutMs: 5000, maxTokens: 2000 },
  cacheTtlSeconds: 600,
  minConfidence: 0.7,
  backgroundRefinement: true
});
```

- `executeSpeculations(predictions): Promise<void>`
- `getCachedResult(task: string, params?: {}): Promise<{data, executionTimeMs} | null>`
- `validatePerformanceTargets(): {valid, speedup, hitRate, issues[]}`
- `getStats(): {totalSpeculations, cacheHits, hitRate%, avgSpeculationTimeMs, tokensSaved, costSavedUsd}`

---

## Configuration

### Cache Tuning (caching.yaml)

**High-Volume Systems:**
```yaml
l1_routing_cache: { max_size_mb: 100, ttl_seconds: 7200 }
l2_context_cache: { max_size_mb: 500, ttl_seconds: 172800 }
l3_semantic_cache: { max_size_mb: 1000, ttl_seconds: 14400 }
```

**Memory-Constrained:**
```yaml
l1_routing_cache: { max_size_mb: 25, ttl_seconds: 1800 }
l2_context_cache: { max_size_mb: 100, ttl_seconds: 43200 }
l3_semantic_cache: { max_size_mb: 200, ttl_seconds: 3600 }
```

### Tier Distribution Presets

**Default:** 60% Haiku, 30% Sonnet, 10% Opus
**Quality:** 40% Haiku, 40% Sonnet, 20% Opus
**Cost:** 80% Haiku, 18% Sonnet, 2% Opus

### Worker Count Recommendations

**I/O-Bound:** 100 workers, 500ms work-stealing interval
**CPU-Bound:** min(20, cpus × 2) workers
**Mixed:** 50 workers, 1000ms interval

### Speculation Budget Tuning

**Aggressive:** maxSpeculations=10, timeoutMs=10000, maxTokens=5000, minConfidence=0.60
**Conservative:** maxSpeculations=3, timeoutMs=3000, maxTokens=1000, minConfidence=0.80

---

## Performance Targets

| Component | Metric | Target | Notes |
|-----------|--------|--------|-------|
| Routing | Lookup time | <0.1ms | O(1) with cache |
| L1 Cache | Hit rate | >70% | LRU eviction |
| L2 Cache | Hit rate | >60% | Project context |
| L3 Cache | Hit rate | 85%+ | Semantic matching |
| Speculation | Speedup | 8-10x | For predicted tasks |
| Speculation | Hit rate | >70% | Depends on patterns |
| Skill Compression | Ratio | 60-70% | Token reduction |
| Parallel | Throughput | 50-75x | vs sequential |

---

## Error Codes & Solutions

**Low Cache Hit Rate (<60%)**
- Increase TTL in config
- Lower similarity threshold (0.85 → 0.75)
- Pre-warm cache with common tasks

**High Speculation Miss Rate (<70%)**
- Increase lookBackWindow (10 → 15)
- Add more context to recordAction()
- Lower minConfidence (0.70 → 0.65)

**Slow Routing (>1ms)**
- Ensure hot cache enabled
- Export/import cache for persistence
- Pre-warm common patterns

**Worker Pool Inefficiency**
- Enable workStealing with 500ms interval
- Adjust worker count for workload type
- Monitor for stalled workers

**Memory Issues (OOM)**
- Process in batches (max 1000 items)
- Reduce cache max_size_mb in config
- Clear caches every hour

---

## Version & Support

**Version**: 1.0.0 (2026-01-25)

**Features:**
- 3-tier cache (L1/L2/L3)
- Semantic routing (O(1))
- Tier selection + distribution
- Skill compression (60-70%)
- Parallel processing (50-100 workers)
- Speculative execution (8-10x)

**Full Reference**: `.claude/docs/API_REFERENCE.md`

---

*Compressed: 2026-02-02 | Original: 11,800 tokens | Compressed: 1,290 tokens | 89% reduction*
