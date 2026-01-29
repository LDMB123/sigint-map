---
skill: parallel-bundle-analysis
description: Parallel Bundle Analysis
---

# Parallel Bundle Analysis

## Usage

Run this command to perform comprehensive parallel analysis of your JavaScript/TypeScript bundle size, identifying optimization opportunities across multiple dimensions.

```
/parallel-bundle-analysis
```

## Instructions

Use a swarm pattern with 5 parallel Haiku workers to analyze bundle composition and identify optimization opportunities. Each worker specializes in a specific aspect of bundle optimization.

### Worker Assignments

**Worker 1: Dependency Weight Analyst**
- Identify heaviest npm dependencies
- Find lighter alternatives for bloated packages
- Detect duplicate dependencies in bundle
- Check for unused dependencies
- Calculate dependency tree depth impact

**Worker 2: Code Splitting Auditor**
- Identify dynamic import opportunities
- Review route-based splitting effectiveness
- Find components suitable for lazy loading
- Analyze shared chunk optimization
- Flag synchronous imports that should be async

**Worker 3: Tree Shaking Validator**
- Detect dead code not being eliminated
- Identify side-effect imports blocking tree shaking
- Review barrel file (index.ts) impact
- Check for CommonJS modules preventing optimization
- Flag named vs default export issues

**Worker 4: Asset Optimization Analyst**
- Review image formats and compression
- Identify inline asset opportunities
- Check font loading and subsetting
- Analyze CSS extraction and minification
- Flag unoptimized static assets

**Worker 5: Build Configuration Auditor**
- Review bundler configuration optimization
- Check minification and compression settings
- Identify source map configuration issues
- Review target browser configuration
- Flag development code in production builds

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Area | Potential Savings | Quick Wins | Effort Required | Impact |
|--------|------|-------------------|------------|-----------------|--------|
| 1 | Dependencies | X KB | X items | Low/Med/High | High/Med/Low |
| 2 | Code Splitting | X KB | X items | Low/Med/High | High/Med/Low |
| 3 | Tree Shaking | X KB | X items | Low/Med/High | High/Med/Low |
| 4 | Assets | X KB | X items | Low/Med/High | High/Med/Low |
| 5 | Build Config | X KB | X items | Low/Med/High | High/Med/Low |

**Total Potential Reduction: X KB (X%)**
**Current Bundle Size: X KB**
**Target Bundle Size: X KB**

Then provide:
1. Top 10 optimization actions ranked by impact/effort
2. Dependency replacement recommendations
3. Code splitting implementation plan
4. Build configuration changes
5. Performance budget recommendations
