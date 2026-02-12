# Speculation Executor & Intent Predictor

**Original**: 1,067 lines, 26KB (~6.6K tokens)
**Compressed**: ~180 lines, 4.2KB (~1.1K tokens)
**Ratio**: 83% reduction
**Date**: 2026-02-02

---

## Speculation Executor

**Version**: 1.0.0 | **Status**: Production Ready

Speculative pre-execution achieving 8-10x apparent speedup via predictive task execution.

### Core Features
- Parallel speculation (3-5 tasks simultaneously)
- Budget: 5 tasks, 5s timeout, 2K tokens each
- Semantic LRU cache (10 min TTL)
- Background Haiku → Sonnet refinement
- Performance validation (8-10x speedup target)

### Architecture
```
Predictions → Filter (≥0.7) → Parallel Execute → Semantic Cache → Background Refine
```

### Quick Start
```typescript
const executor = new SpeculationExecutor({
  budget: { maxSpeculations: 5, timeoutMs: 5000, maxTokens: 2000 },
  cacheTtlSeconds: 600,
  minConfidence: 0.7,
  backgroundRefinement: true
});

const result = await executor.getCachedResult('run cargo check');
```

### API
- `executeSpeculations(predictions)` - Execute with budget limits
- `getCachedResult(action, context)` - Get cached result or null
- `getStats()` - Cache statistics
- `validatePerformanceTargets()` - Verify 8-10x speedup
- `exportStats()` - Monitoring data

### Config
```
maxSpeculations: 5 (prevent excessive parallelization)
timeoutMs: 5000 (fast-fail)
maxTokens: 2000 (cost control)
cacheTtlSeconds: 600 (freshness)
minConfidence: 0.7 (quality threshold)
```

### Performance
- Hit rate: 80%+ (target)
- Cache lookup: <0.01ms
- Speedup: 8-10x (target)
- Cost: ~$0.0005 per speculation

### Integration
- Route Table: Pre-load agent predictions
- Skill Packs: Warm skills for predicted actions
- Cascading Tiers: Haiku (speculation) → Sonnet (refinement) → Opus (escalation)

---

## Intent Predictor

**Version**: 1.0.0 | **Status**: Production Ready

Workflow prediction engine (70%+ accuracy) analyzing recent actions to predict next tasks.

### Core Features
- 8 default workflow patterns + custom JSON support
- 5 prediction strategies (workflow, sequential, context, user, learned)
- Multi-factor confidence calculation
- Pattern learning system
- Sub-5ms prediction time

### Workflow Patterns
1. **component-full-stack** (0.85): Create → Test → Features → Docs → Refactor
2. **debug-fix-test** (0.90): Fix → Test → Refactor → Test
3. **feature-development** (0.80): Function → Test → Integrate → Test → Docs
4. **refactor-optimize** (0.75): Refactor → Test → Optimize → Test
5. **api-full-stack** (0.82): Types → Function → Test → Docs → Integrate
6. **database-schema** (0.88): Types → Migrate → Test → Seed → Validate
7. **rust-module** (0.83): Types → Function → BorrowFix → Test → CompileFix
8. **security-audit** (0.87): Analyze → Scan → Fix → Test → Docs

### Quick Start
```typescript
const predictor = new IntentPredictor({
  minConfidence: 0.70,
  maxPredictions: 3,
  enableLearning: true
});

predictor.recordAction('component-create', 'create', {
  file: 'UserProfile.tsx',
  domain: 'react'
});

const predictions = await predictor.predictNext();
// → [{ task: 'test-create', confidence: 0.82, ... }, ...]
```

### API
- `recordAction(intent, actionType, metadata, success)` - Log action
- `predictNext()` - Get top 3 predictions
- `validatePrediction(actualIntent, predictions)` - Accuracy check
- `getAccuracy()` - Overall accuracy (0-1)
- `getStats()` - Detailed statistics
- `exportLearnedPatterns()` - Save patterns
- `importLearnedPatterns(patterns)` - Load patterns

### Config
```
minConfidence: 0.70 (filter threshold)
maxPredictions: 3 (top-K)
lookBackWindow: 10 (recent actions)
timeDecayFactor: 0.95 (weight old actions less)
enableLearning: true (learn custom patterns)
```

### Confidence Calculation
```
Final = BaseConfidence × PatternFrequency × TimeDecay × ContextMatch
```

### Performance
- Accuracy: 72-85% (target: 70%+)
- Prediction time: 1-3ms (target: <5ms)
- Memory: ~3MB (target: <10MB)
- Learning convergence: 3-4 repetitions

### Integration with Speculation Executor
```typescript
const predictions = predictor.predictNext();
const speculations = predictions.map(p => ({
  action: p.task,
  confidence: p.confidence,
  priority: p.matchedPatterns.length > 0 ? 3 : 1
}));
await executor.executeSpeculations(speculations);
```

---

## Testing

```bash
cd .claude/lib/speculation
npm test
```

**Coverage**: 50+ tests including:
- Parallel execution with budget limits
- Cache hit/miss scenarios
- Background refinement
- Performance validation
- Workflow pattern matching
- Pattern learning
- Accuracy validation

---

## See Also
- Speculative Execution: `../../../optimization/SPECULATIVE_EXECUTION.md`
- Semantic Caching: `../../../optimization/SEMANTIC_CACHING.md`
- Cascading Tiers: `../../../optimization/CASCADING_TIERS.md`
- Route Table: `../routing/route-table.md`
