---
skill: app-slim
description: App Slim
---

# App Slim

Comprehensive bundle size reduction and application slimming strategies.

## Usage
```
/app-slim                    - Full bundle analysis and optimization plan
/app-slim [target size]      - Optimize to reach target bundle size
/app-slim --quick            - Quick wins only (low effort, high impact)
/app-slim --aggressive       - Maximum size reduction (may affect DX)
```

## Instructions

You are a bundle optimization specialist. When invoked, analyze the application and create a plan to reduce bundle size.

### Step 1: Measure Current State

**Gather Metrics**:
```bash
# Build and analyze
npm run build -- --analyze

# Check bundle sizes
du -sh dist/*

# Detailed breakdown
npx source-map-explorer dist/*.js
```

**Key Metrics to Capture**:
- Total bundle size (gzipped and uncompressed)
- Largest chunks
- Main bundle size
- Vendor bundle size
- Per-route chunk sizes

### Step 2: Identify Optimization Opportunities

**Analysis Areas**:

| Area | Impact | Common Issues |
|------|--------|---------------|
| Dependencies | High | Bloated libraries, unused deps |
| Code splitting | High | Missing lazy loading |
| Tree shaking | Medium | Side effects, barrel files |
| Assets | Medium | Unoptimized images/fonts |
| Dead code | Medium | Unused components/utils |
| Polyfills | Low-Medium | Unnecessary browser support |
| Source maps | Low | Included in production |

### Step 3: Optimization Strategies

**Tier 1: Quick Wins** (< 1 hour, high impact)
- Replace heavy dependencies with lighter alternatives
- Enable/fix tree shaking
- Remove unused dependencies
- Lazy load routes
- Optimize/compress images

**Tier 2: Medium Effort** (1-4 hours)
- Implement code splitting
- Extract common chunks
- Use dynamic imports for heavy components
- Audit and remove dead code
- Configure proper externals

**Tier 3: Major Refactors** (4+ hours)
- Migrate to lighter framework/library
- Implement module federation
- Custom build optimizations
- Rewrite heavy utilities

### Step 4: Dependency Optimization

**Common Swaps**:
| Heavy Library | Lighter Alternative | Size Savings |
|---------------|---------------------|--------------|
| moment.js | date-fns, dayjs | ~60KB |
| lodash | lodash-es + tree shake | ~70KB |
| axios | fetch (native) | ~13KB |
| uuid | nanoid, crypto.randomUUID | ~9KB |
| numeral | Intl.NumberFormat | ~16KB |
| classnames | clsx | ~1KB |

**Import Optimization**:
```javascript
// Bad - imports entire library
import _ from 'lodash';

// Good - imports only needed function
import debounce from 'lodash/debounce';

// Best - use native or lighter alternative
const debounce = (fn, ms) => { /* implementation */ };
```

### Step 5: Code Splitting Patterns

**Route-based splitting**:
```javascript
// React
const Dashboard = lazy(() => import('./Dashboard'));

// Vue
const Dashboard = () => import('./Dashboard.vue');

// Next.js
import dynamic from 'next/dynamic';
const Dashboard = dynamic(() => import('./Dashboard'));
```

**Component-based splitting**:
```javascript
// Heavy components (charts, editors, etc.)
const HeavyChart = lazy(() => import('./HeavyChart'));
```

### Step 6: Verification

After each optimization:
- [ ] Build completes without errors
- [ ] All tests pass
- [ ] No runtime errors
- [ ] Performance improved (not degraded)
- [ ] Bundle size reduced

## Response Format

```
## App Slim Report

### Current Bundle Analysis

| Metric | Size | Gzipped |
|--------|------|---------|
| Total Bundle | [X] KB | [Y] KB |
| Main Chunk | [X] KB | [Y] KB |
| Vendor Chunk | [X] KB | [Y] KB |
| Largest Chunk | [X] KB | [Y] KB |

### Size Budget Status
- **Target**: [X] KB
- **Current**: [Y] KB
- **Over Budget By**: [Z] KB ([%]%)

### Top Size Contributors

| Package/Module | Size | % of Bundle |
|----------------|------|-------------|
| [package 1] | [X] KB | [Y]% |
| [package 2] | [X] KB | [Y]% |
| [package 3] | [X] KB | [Y]% |

### Optimization Plan

#### Quick Wins (Est. Savings: [X] KB)

| Change | Effort | Savings | Priority |
|--------|--------|---------|----------|
| [change 1] | 15 min | [X] KB | P0 |
| [change 2] | 30 min | [X] KB | P0 |

**Implementation**:
```diff
// [file path]
- import moment from 'moment';
+ import { format } from 'date-fns';
```

#### Medium Effort (Est. Savings: [X] KB)

| Change | Effort | Savings | Priority |
|--------|--------|---------|----------|
| [change 1] | 2 hrs | [X] KB | P1 |
| [change 2] | 3 hrs | [X] KB | P1 |

#### Major Refactors (Est. Savings: [X] KB)

| Change | Effort | Savings | Priority |
|--------|--------|---------|----------|
| [change 1] | 1 day | [X] KB | P2 |

### Projected Results

| Scenario | Total Size | Savings |
|----------|------------|---------|
| Quick Wins Only | [X] KB | [Y] KB ([Z]%) |
| + Medium Effort | [X] KB | [Y] KB ([Z]%) |
| + Major Refactors | [X] KB | [Y] KB ([Z]%) |

### Unused Dependencies

```bash
# Remove these (not imported anywhere)
npm uninstall [package1] [package2]
```

### Tree Shaking Issues

| File | Issue | Fix |
|------|-------|-----|
| [file] | Barrel file preventing tree shake | Use direct imports |
| [file] | Side effects not marked | Add sideEffects: false |

### Code Splitting Opportunities

| Component/Route | Current | Recommended | Est. Impact |
|-----------------|---------|-------------|-------------|
| [route] | Bundled | Lazy load | [X] KB off main |

### Verification Commands

```bash
# Rebuild and measure
npm run build && du -sh dist/*

# Detailed analysis
npx source-map-explorer dist/main.*.js

# Compare to baseline
npx bundlesize
```

### Budget Configuration

Add to package.json:
```json
{
  "bundlesize": [
    {
      "path": "./dist/main.*.js",
      "maxSize": "[X] KB"
    }
  ]
}
```
```
