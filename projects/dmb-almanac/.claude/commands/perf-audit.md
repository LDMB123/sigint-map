# Performance Audit

Comprehensive performance audit across the entire codebase or specific areas.

## Usage
```
/perf-audit [path or area]
```

## Instructions

You are a performance auditor. When invoked, conduct a thorough audit:

### Audit Scope

**If path provided**: Audit that specific file/directory
**If area provided** (e.g., "api", "components"): Focus on that area
**If no argument**: Audit the entire project

### Audit Checklist

#### 1. Core Web Vitals (Frontend)
- [ ] **LCP** (Largest Contentful Paint < 2.5s)
  - Check image optimization
  - Check font loading
  - Check render-blocking resources

- [ ] **INP** (Interaction to Next Paint < 200ms)
  - Check event handler complexity
  - Check long tasks
  - Check scheduler.yield() usage

- [ ] **CLS** (Cumulative Layout Shift < 0.1)
  - Check image dimensions
  - Check dynamic content
  - Check font swap

#### 2. Bundle Analysis
- [ ] Total bundle size
- [ ] Largest chunks
- [ ] Unused exports
- [ ] Duplicate dependencies
- [ ] Tree-shaking effectiveness

#### 3. Runtime Performance
- [ ] Algorithm complexity hotspots
- [ ] Memory usage patterns
- [ ] Memory leak potential
- [ ] GC pressure points

#### 4. Network Performance
- [ ] Request waterfall
- [ ] Sequential vs parallel requests
- [ ] Caching headers
- [ ] Compression

#### 5. Database/API Performance
- [ ] N+1 query patterns
- [ ] Missing indexes (if applicable)
- [ ] Over-fetching
- [ ] Under-fetching

### Scoring System

| Score | Rating | Description |
|-------|--------|-------------|
| 90-100 | Excellent | Production-ready, highly optimized |
| 70-89 | Good | Minor optimizations possible |
| 50-69 | Needs Work | Significant improvements needed |
| 0-49 | Critical | Major performance issues |

## Response Format

```
## Performance Audit Report

### Overall Score: [X]/100 - [Rating]

### Executive Summary
[2-3 sentence overview of findings]

### Scores by Category

| Category | Score | Issues | Priority Items |
|----------|-------|--------|----------------|
| Core Web Vitals | /100 | [count] | [top issue] |
| Bundle Size | /100 | [count] | [top issue] |
| Runtime | /100 | [count] | [top issue] |
| Network | /100 | [count] | [top issue] |
| Data Layer | /100 | [count] | [top issue] |

### Critical Issues (Fix Immediately)

#### Issue 1: [Title]
**Location**: [file:line]
**Impact**: [description]
**Fix**: [solution]

### High Priority Issues

[List with brief descriptions and fixes]

### Medium Priority Issues

[List with brief descriptions]

### Recommendations

1. **Quick Wins** (< 1 hour effort)
   - [item]
   - [item]

2. **Medium Effort** (1-4 hours)
   - [item]
   - [item]

3. **Major Refactors** (> 4 hours)
   - [item]
   - [item]

### Verification Commands
\`\`\`bash
# Run lighthouse
npx lighthouse [url] --view

# Bundle analysis
npm run build -- --analyze

# Profile runtime
[framework-specific command]
\`\`\`
```
