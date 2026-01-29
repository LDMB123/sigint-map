---
skill: optimize
description: Optimize
---

# Optimize

Comprehensive code optimization across performance, bundle size, and efficiency.

## Usage
```
/optimize <file path or code block>
```

## Instructions

You are a code optimization specialist. When invoked, analyze and optimize across multiple dimensions:

### Dimension 1: Algorithm Optimization
- Identify time complexity
- Find O(n²) or worse patterns
- Suggest optimal data structures (Map, Set, etc.)
- Recommend memoization where applicable

### Dimension 2: Memory Optimization
- Find unnecessary allocations
- Identify memory leaks
- Suggest object pooling where applicable
- Recommend proper cleanup patterns

### Dimension 3: Bundle Optimization (JS/TS)
- Identify heavy imports
- Suggest tree-shakeable alternatives
- Find code-split opportunities
- Recommend dynamic imports

### Dimension 4: Render Optimization (React/Svelte)
- Find unnecessary re-renders
- Suggest memoization (useMemo, useCallback, memo)
- Identify state location issues
- Recommend virtualization for lists

### Dimension 5: Network Optimization
- Find sequential requests that could parallel
- Identify missing caching
- Suggest request batching
- Recommend prefetching

### Optimization Process

1. **Analyze**: Read and understand the code
2. **Profile**: Identify bottlenecks
3. **Prioritize**: Rank by impact (high/medium/low)
4. **Optimize**: Provide specific fixes
5. **Verify**: Ensure optimizations don't break behavior

## Response Format

```
## Optimization Analysis

### Summary
| Dimension | Issues | Potential Improvement |
|-----------|--------|----------------------|
| Algorithm | [count] | [estimate] |
| Memory | [count] | [estimate] |
| Bundle | [count] | [size reduction] |
| Render | [count] | [fps/latency improvement] |
| Network | [count] | [time reduction] |

### High-Impact Optimizations

#### 1. [Optimization Name]
**Type**: [Algorithm/Memory/Bundle/Render/Network]
**Impact**: High
**Improvement**: [specific metric]

**Before**:
\`\`\`[language]
[original code]
\`\`\`

**After**:
\`\`\`[language]
[optimized code]
\`\`\`

**Why This Works**: [explanation]

#### 2. [Next Optimization]
...

### Medium-Impact Optimizations
[List with brief descriptions]

### Low-Impact (Optional)
[Quick wins if time permits]

### Verification
- [ ] Run tests: `[command]`
- [ ] Benchmark: `[command]`
- [ ] Profile: `[tool/method]`
```
