---
name: sveltekit-bundle-analyzer
description: "sveltekit uundle analyzer for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Skill: Bundle Analyzer

**ID**: `bundle-analyzer`
**Category**: Performance
**Agent**: Performance Optimizer / Build Systems Engineer

---

## When to Use

- Before production release
- After adding new dependencies
- When bundle size increases unexpectedly
- Identifying optimization opportunities
- Establishing performance budgets

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| baseline_size | number | No | Previous bundle size for comparison (KB) |

---

## Steps

### Step 1: Setup Bundle Analyzer

For Vite/SvelteKit projects:

```bash
# Install rollup-plugin-visualizer
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    visualizer({
      filename: './stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### Step 2: Generate Bundle Report

```bash
# Build with visualization
npm run build

# This generates stats.html with treemap visualization
# Also check .svelte-kit/output for bundle files
```

### Step 3: Extract Key Metrics

```bash
# Get chunk sizes (gzipped)
find .svelte-kit/output/client/_app/immutable/chunks -name "*.js" -exec gzip -c {} \; -exec echo {} \; | \
  awk 'NR%2==1{size=$0} NR%2==0{print size, $0}' | sort -rn | head -20

# Get total JS size
find .svelte-kit/output/client/_app -name "*.js" -exec du -ch {} + | grep total

# Get largest individual chunks
ls -lhS .svelte-kit/output/client/_app/immutable/chunks/*.js | head -10
```

### Step 4: Analyze Bundle Contents

```bash
# Install source-map-explorer for detailed analysis
npm install -g source-map-explorer

# Analyze specific chunk
source-map-explorer .svelte-kit/output/client/_app/immutable/chunks/[chunk-id].js

# Analyze all chunks
source-map-explorer '.svelte-kit/output/client/_app/immutable/chunks/*.js'
```

### Step 5: Create Optimization Plan

Review the bundle analysis and identify:
- Large dependencies that could be lazy-loaded
- Duplicate code across chunks
- Unused exports that could be tree-shaken
- Opportunities for code splitting

---

## Analysis Checklist

For each large chunk (>100KB):

- [ ] Is it used on first page load?
- [ ] Can it be lazy-loaded or code-split?
- [ ] Are there duplicate dependencies across chunks?
- [ ] Can tree-shaking reduce size?
- [ ] Is there a smaller alternative library?
- [ ] Are source maps included in production? (should be excluded)

---

## Common Optimizations

### 1. Dynamic Import Heavy Components

```typescript
// Before
import HeavyChart from './HeavyChart.svelte';
```

```typescript
// After - Lazy load
<script>
  import { onMount } from 'svelte';

  let HeavyChart;

  onMount(async () => {
    const module = await import('./HeavyChart.svelte');
    HeavyChart = module.default;
  });
</script>

{#if HeavyChart}
  <svelte:component this={HeavyChart} />
{:else}
  <ChartSkeleton />
{/if}
```

### 2. Tree-Shake Large Libraries

```typescript
// Before - imports entire library
import * as d3 from 'd3';
```

```typescript
// After - named imports only
import { select } from 'd3-selection';
import { scaleLinear, scaleTime } from 'd3-scale';
import { line } from 'd3-shape';
```

### 3. Replace Large Libraries

| Library | Size | Alternative | Savings |
|---------|------|-------------|---------|
| moment.js | 67KB | date-fns or native Temporal API | ~50KB |
| lodash | 72KB | lodash-es + tree-shake or native methods | ~60KB |
| d3 (full) | 170KB | d3 submodules only | ~80KB+ |
| axios | 13KB | native fetch API | ~13KB |

### 4. Code Split by Route

SvelteKit automatically code-splits by route. Verify with build output:

```bash
# Check that each route has its own chunk
ls -lh .svelte-kit/output/client/_app/immutable/nodes/
```

### 5. Optimize Vite Build

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext', // Modern browsers only
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk strategy
          if (id.includes('node_modules')) {
            if (id.includes('d3')) return 'vendor-d3';
            if (id.includes('svelte')) return 'vendor-svelte';
            return 'vendor';
          }
        },
      },
    },
  },
});
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| bundle-visualization | `stats.html` | Interactive treemap |
| bundle-sizes.json | `.claude/artifacts/` | Size data for tracking |
| optimization-plan.md | `.claude/artifacts/` | Action items and priorities |

---

## Output Template

```markdown
## Bundle Analysis Report

### Date: [YYYY-MM-DD]
### Project: [project-name]

### Summary
| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Total JS (gzip) | [X]KB | 500KB | [OK/OVER] |
| Largest Chunk | [X]KB | 150KB | [OK/OVER] |
| Initial Load JS | [X]KB | 300KB | [OK/OVER] |
| Number of Chunks | [N] | - | - |

### Chunk Breakdown

| Chunk | Size (raw) | Size (gzip) | Type | Optimization |
|-------|------------|-------------|------|--------------|
| vendor-*.js | [X]KB | [Y]KB | Dependencies | See below |
| [route]-*.js | [X]KB | [Y]KB | Route | [Action] |
| [component]-*.js | [X]KB | [Y]KB | Component | [Action] |

### Large Dependencies

| Package | Size (gzip) | Used By | Action |
|---------|-------------|---------|--------|
| d3 | 170KB | /visualizations | Lazy load + tree-shake |
| dexie | 60KB | All routes | Keep (core functionality) |
| [library] | [X]KB | [routes] | [Action] |

### Optimization Plan

#### Priority 1 (High Impact)
1. Lazy load D3 visualizations - Expected savings: 120KB
2. Tree-shake unused D3 modules - Expected savings: 50KB

#### Priority 2 (Medium Impact)
1. Replace library X with native API - Expected savings: 30KB
2. Optimize vendor chunking strategy - Expected savings: 20KB

#### Priority 3 (Low Impact / Future)
1. Investigate further tree-shaking opportunities
2. Consider CDN for common dependencies

### Commands

```bash
# Run analysis
npm run build

# View visualization
open stats.html

# Analyze specific chunk
source-map-explorer .svelte-kit/output/client/_app/immutable/chunks/[chunk-id].js
```

### Projected Savings
- Current total: [X]KB (gzip)
- After P1 optimizations: [Y]KB (gzip)
- Savings: [Z]KB ([P]%)
- Timeline: [estimate]
```

---

## Performance Budget Recommendations

| Page Type | Max JS (gzip) | Max CSS (gzip) |
|-----------|---------------|----------------|
| Landing | 150KB | 20KB |
| Dashboard | 300KB | 30KB |
| Detail | 200KB | 25KB |

---

## Success Criteria

- Bundle analysis report generated
- All chunks > 100KB identified and assessed
- Optimization plan with expected savings documented
- Performance budgets established or validated
- Baseline captured for future comparison
