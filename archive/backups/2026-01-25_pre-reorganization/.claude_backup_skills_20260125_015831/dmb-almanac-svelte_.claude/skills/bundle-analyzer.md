# Skill: Bundle Analyzer Skill

**ID**: `bundle-analyzer`
**Category**: Performance
**Agent**: Performance Optimizer / Build Systems Engineer

---

## When to Use

- Before production release
- After adding new dependencies
- When bundle size increases
- Identifying optimization opportunities

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| baseline_size | number | No | Previous bundle size for comparison |

---

## Steps

### Step 1: Setup Bundle Analyzer

```bash
# Install if not present
npm install @next/bundle-analyzer --save-dev
```

```typescript
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

### Step 2: Generate Bundle Report

```bash
# Build with analysis
ANALYZE=true npm run build

# This opens browser with treemap visualization
# Also generates:
# - .next/analyze/client.html
# - .next/analyze/nodejs.html
```

### Step 3: Extract Key Metrics

```bash
# Get chunk sizes
ls -la .next/static/chunks/*.js | awk '{print $5, $9}' | sort -rn

# Get total JS size
find .next/static -name "*.js" -exec du -ch {} + | grep total

# Get largest chunks
ls -laS .next/static/chunks/*.js | head -10
```

### Step 4: Identify Large Dependencies

```bash
# Parse build manifest
cat .next/build-manifest.json | jq '.pages | to_entries | .[] | {page: .key, chunks: .value | length}'

# Check specific chunk contents (requires source-map-explorer)
npx source-map-explorer .next/static/chunks/main-*.js
```

### Step 5: Create Optimization Plan

---

## Analysis Checklist

For each large chunk (>100KB):

- [ ] Is it used on first page load?
- [ ] Can it be lazy-loaded?
- [ ] Are there duplicate dependencies?
- [ ] Can tree-shaking reduce size?
- [ ] Is there a smaller alternative library?

---

## Common Optimizations

### 1. Dynamic Import Heavy Components

```typescript
// Before
import { HeavyChart } from './HeavyChart';

// After
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### 2. Tree-Shake Large Libraries

```typescript
// Before - imports entire library
import * as d3 from 'd3';

// After - named imports
import { select, scaleLinear } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
```

### 3. Replace Large Libraries

| Library | Size | Alternative | Savings |
|---------|------|-------------|---------|
| moment.js | 67KB | date-fns | 50KB |
| lodash | 72KB | lodash-es + tree-shake | 60KB |
| d3 (full) | 170KB | d3 submodules | 80KB |

### 4. Code Split by Route

```typescript
// Ensure page-specific code doesn't leak to other pages
// Check build output for shared chunks
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| bundle-report.html | `.next/analyze/` | Visual treemap |
| bundle-sizes.json | `.claude/artifacts/` | Size data |
| optimization-plan.md | `.claude/artifacts/` | Action items |

---

## Output Template

```markdown
## Bundle Analysis Report

### Date: [YYYY-MM-DD]

### Summary
| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| First Load JS | [X]KB | 400KB | [OK/OVER] |
| Largest Chunk | [X]KB | 100KB | [OK/OVER] |
| Total JS | [X]MB | 1.2MB | [OK/OVER] |

### Chunk Breakdown

| Chunk | Size | Type | Optimization |
|-------|------|------|--------------|
| main-*.js | [X]KB | Entry | N/A |
| framework-*.js | [X]KB | React/Next | N/A |
| [chunk]-*.js | [X]KB | Page | [Action] |

### Large Dependencies

| Package | Size | Used By | Action |
|---------|------|---------|--------|
| d3 | 170KB | /visualizations | Lazy load |
| dexie | 60KB | All pages | Conditional |

### Optimization Plan

#### Priority 1 (High Impact)
1. [Action] - Expected savings: [X]KB
2. [Action] - Expected savings: [X]KB

#### Priority 2 (Medium Impact)
1. [Action] - Expected savings: [X]KB

### Commands

```bash
# Run analysis
ANALYZE=true npm run build

# Check specific chunk
npx source-map-explorer .next/static/chunks/[chunk].js
```

### Projected Savings
- Current: [X]KB
- After optimizations: [Y]KB
- Savings: [Z]KB ([P]%)
```
