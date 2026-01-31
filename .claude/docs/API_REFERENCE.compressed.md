# API Reference (Compressed)

**Original:** 44,541 bytes (~14,000 tokens)
**Compressed:** Below (~800 tokens)
**Ratio:** 94% reduction
**Strategy:** Reference-based
**Full content:** `.claude/docs/API_REFERENCE.md`

---

## Overview

Universal Agent Framework optimization library - complete API documentation for performance optimization tools.

**Version:** 1.0.0
**Updated:** 2026-01-25

### Performance Achievements
- 90%+ cache hit rates (semantic caching)
- 60-70% token reduction (skill compression)
- 8-10x apparent speedup (speculative execution)
- 50-90% cost savings (tier selection)
- O(1) routing (<0.1ms lookup)

## Core Modules Summary

### Cache Management
**Module:** `@claude/lib/cache-manager`
**Class:** `CacheManager`
- L1: Routing cache (in-memory LRU, <1ms)
- L2: Semantic cache (similarity-based)
- L3: Long-term cache (persistent)

### Semantic Routing
**Module:** `@claude/lib/routing/route-table`
**Class:** `RouteTable`
- O(1) hash-based routing
- Semantic hash generation
- Fallback category routing

### Tier Selection
**Module:** `@claude/lib/routing/tier-selector`
**Function:** `selectTier(complexity: number)`
- Haiku: 0-40 complexity
- Sonnet: 41-80 complexity
- Opus: 81-100 complexity

### Skill Optimization
**Module:** `@claude/lib/skills/compressor`
**Class:** `SkillCompressor`
- Summary-based compression (60-70% reduction)
- Reference extraction
- YAML/JSON encoding

### Parallel Processing
**Module:** `@claude/lib/parallel/coordinator`
**Class:** `ParallelCoordinator`
- Swarm coordination
- Work partitioning
- Result aggregation

### Speculative Execution
**Module:** `@claude/lib/speculative/executor`
**Class:** `SpeculativeExecutor`
- Intent prediction
- Parallel path execution
- Result selection

## Key APIs

**Routing:**
```typescript
routeTable.lookup(query: string): AgentRoute
semanticHash.generate(domain, action, subtype): string
```

**Caching:**
```typescript
cache.get(key: string): T | null
cache.set(key: string, value: T, ttl?: number): void
cache.similarity(query: string, threshold: number): T[]
```

**Compression:**
```typescript
compressor.compress(skill: string): CompressedSkill
compressor.decompress(compressed: CompressedSkill): string
```

**Parallel Execution:**
```typescript
coordinator.dispatch(tasks: Task[]): Promise<Result[]>
coordinator.partition(workload: W): Task[]
```

## Integration Patterns

- **Hot path optimization** - Cache + Route Table
- **Cold start mitigation** - Prewarming + Lazy loading
- **Cost optimization** - Tier cascading + Compression
- **Latency reduction** - Speculation + Parallelization

## Performance Tuning

**Cache Configuration:**
- L1 size: 100 entries (routing)
- L2 size: 1000 entries (semantic)
- L3: Unlimited (persistent)
- TTL: 6 hours (L1/L2), 7 days (L3)

**Tier Thresholds:**
- Haiku: Simple queries, code generation
- Sonnet: Analysis, review, optimization
- Opus: Complex reasoning, architectural decisions

**Compression Ratios:**
- Documentation: 85-95%
- Code references: 90-95%
- Configs: 80-90%

## Troubleshooting

**Low cache hit rate:** Increase similarity threshold
**Slow routing:** Check route table size
**High costs:** Review tier selection thresholds
**Memory issues:** Reduce L2 cache size

## Migration Guide

From legacy routing to route table:
1. Generate semantic hashes for all routes
2. Build route table JSON
3. Update routing logic to use RouteTable class
4. Validate with existing test cases

---

**Full API documentation:** `.claude/docs/API_REFERENCE.md`
**Code location:** `.claude/lib/`
**Examples:** See integration patterns in full docs
