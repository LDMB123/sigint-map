# Analysis Agents

**Consolidated Category**: Analyzers + Efficiency + Amplification
**Total Agents**: 15
**Purpose**: Code analysis, performance optimization, and quality amplification

---

## Category Consolidation

This category merges three previously separate categories:
- **analyzers/** - Performance, complexity, architecture analysis
- **efficiency/** - Token optimization, batching, compression
- **amplification/** - Quality improvement, iterative refinement

**Why consolidated?** All agents analyze code/data and optimize outcomes.

---

## Agent Types

### Code Analysis
- `architecture-analyzer.md` - System architecture analysis
- `complexity-analyzer.md` - Cyclomatic/cognitive complexity
- `dependency-analyzer.md` - Dependency graph analysis
- `coverage-analyzer.md` - Test coverage analysis
- `performance-analyzer.md` - Performance profiling

### Efficiency Optimization
- `token-optimizer.md` - Minimize token usage
- `context-compressor.md` - Context window optimization
- `batch-aggregator.md` - Batch processing optimization
- `incremental-processor.md` - Incremental updates
- `session-optimizer.md` - Session state management
- `tier-router.md` - Model tier selection (Haiku/Sonnet/Opus)

### Quality Amplification
- `quality-amplifier.md` - Output quality improvement
- `iterative-refiner.md` - Multi-pass refinement
- `ensemble-synthesizer.md` - Multi-model synthesis
- `haiku-swarm-coordinator.md` - Parallel Haiku coordination

---

## Usage Patterns

**Analysis Pipeline:**
```
complexity-analyzer → architecture-analyzer → performance-analyzer
```

**Optimization Loop:**
```
token-optimizer + context-compressor → tier-router → execution
```

**Quality Amplification:**
```
initial-output → iterative-refiner → quality-amplifier → final-output
```

---

## Migration from Old Structure

| Old Path | New Path |
|----------|----------|
| `analyzers/performance-analyzer` | `analysis/performance-analyzer` |
| `efficiency/token-optimizer` | `analysis/token-optimizer` |
| `amplification/quality-amplifier` | `analysis/quality-amplifier` |
