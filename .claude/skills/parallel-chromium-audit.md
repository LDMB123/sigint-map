---
skill: parallel-chromium-audit
description: Parallel Chromium 143+ Feature Audit
---

# Parallel Chromium 143+ Feature Audit

## Usage

Run this command to audit your codebase for Chromium 143+ feature compatibility, identifying opportunities to leverage new APIs and detecting deprecated patterns.

```
/parallel-chromium-audit
```

## Instructions

Use a swarm pattern with 5 parallel Haiku workers to comprehensively audit Chromium 143+ feature usage and opportunities. Each worker focuses on a specific category of browser capabilities.

### Worker Assignments

**Worker 1: View Transitions & Navigation API**
- Audit View Transitions API usage and opportunities
- Check Navigation API implementation
- Review page transition animations
- Identify SPA navigation patterns to modernize
- Flag deprecated transition approaches

**Worker 2: CSS Modern Features Auditor**
- Check for CSS Container Queries usage
- Audit :has() selector opportunities
- Review CSS Nesting adoption
- Identify CSS Subgrid opportunities
- Flag vendor prefixes no longer needed

**Worker 3: Performance APIs Analyst**
- Audit Speculation Rules implementation
- Check prerender and prefetch usage
- Review Priority Hints adoption
- Analyze Largest Contentful Paint optimizations
- Flag deprecated performance patterns

**Worker 4: Storage & State APIs**
- Review Storage Buckets API opportunities
- Check File System Access API usage
- Audit IndexedDB patterns for modern alternatives
- Review Web Locks API implementation
- Flag deprecated storage approaches

**Worker 5: Web Components & DOM APIs**
- Audit Declarative Shadow DOM usage
- Check Element Internals adoption
- Review Popover API opportunities
- Analyze Dialog element modern patterns
- Flag deprecated component patterns

### Response Format

Provide a consolidated summary table followed by detailed findings:

| Worker | Category | Opportunities | Deprecations | Already Using | Priority |
|--------|----------|---------------|--------------|---------------|----------|
| 1 | View Transitions | X | X | X | High/Med/Low |
| 2 | Modern CSS | X | X | X | High/Med/Low |
| 3 | Performance APIs | X | X | X | High/Med/Low |
| 4 | Storage APIs | X | X | X | High/Med/Low |
| 5 | Web Components | X | X | X | High/Med/Low |

**Chromium 143+ Readiness Score: X/100**

Then provide:
1. High-impact feature adoption opportunities
2. Required polyfills for broader browser support
3. Deprecated patterns requiring migration
4. Implementation priority roadmap
5. Browser compatibility matrix for recommended features
