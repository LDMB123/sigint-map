# Web Scraping Skills Library

This directory contains reusable skills for building and maintaining resilient web scrapers with Playwright.

## Skills Included

### 1. Playwright Scraper Architecture
**File**: `playwright-scraper-architecture.md`
**Lines**: 544
**When to Use**: Building new web scrapers, designing rate limiting, implementing caching

**Key Topics**:
- Three-layer scraper architecture (Scraper → ETL → Output)
- Dynamic content handling with wait strategies
- Page object patterns for maintainability
- Concurrency and rate limiting strategies (p-queue)
- Exponential backoff and jitter
- File-based caching and checkpointing
- Error recovery patterns
- Data normalization (slugify, parseDate, parseDuration)
- Performance optimization (network blocking, parallel processing)
- Selector stability hierarchy (data-testid → roles → text → XPath)
- Production readiness checklist

**Code Examples**:
- Rate limiter with p-queue
- Page object pattern with Playwright locators
- Retry logic with exponential backoff
- Checkpoint system for resumable scraping
- Graceful degradation patterns
- Network blocking to reduce bandwidth

---

### 2. Scraper Debugging Guide
**File**: `scraper-debugging.md`
**Lines**: 649
**When to Use**: Fixing broken selectors, analyzing site HTML changes, diagnosing timeouts

**Key Topics**:
- Systematic debugging workflow (Reproduce → Inspect → Identify → Fix → Harden)
- Headed mode for visual debugging
- Debug logging and HTML snapshots
- Browser DevTools inspection workflow
- Common root causes and fixes:
  - Elements in iframes
  - Shadow DOM handling
  - Timing/race conditions
  - HTML structure changes
- Selector testing and fallback strategies
- Network request analysis
- Rate limiting detection and recovery
- HTML comparison for change detection
- Debugging checklist and resilience rating

**Code Examples**:
- Debug logging with timestamps
- Selector testing harness
- Iframe and shadow DOM piercing
- Network response interception
- HAR file recording and analysis
- Exponential backoff retry pattern
- HTML difference detector

---

## Quick Reference

### File Locations
```
/Users/louisherman/ClaudeCodeProjects/.claude/skills/scraping/
├── playwright-scraper-architecture.md    (Building scrapers)
├── scraper-debugging.md                  (Fixing scrapers)
└── README.md                             (This file)
```

### When to Use Which Skill

**Use Playwright Architecture when**:
- Starting a new scraper project
- Designing rate limiting strategy
- Implementing caching/checkpointing
- Setting up error recovery
- Planning for scale (thousands of pages)
- Need to choose wait strategies

**Use Scraper Debugging when**:
- Selectors stop working
- Getting empty data from parsing
- Timeouts or network errors
- HTML structure changed
- Site updated their layout
- Need to diagnose rate limiting
- Fixing existing broken scrapers

### Universal Selector Hierarchy
(Always prefer in this order)

1. `data-testid` attributes (most stable)
2. Semantic roles: `getByRole('button', ...)`
3. Text content: `getByText('...')`
4. Label associations: `getByLabel('...')`
5. Semantic CSS: `.submit-button`, `#login-form`
6. Structural CSS: `.form > button:first-child` (fragile)
7. XPath (last resort, extremely fragile)

### Rate Limiting Template
```typescript
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 2,        // Max 2 simultaneous
  intervalCap: 5,        // Max 5 requests
  interval: 10000        // Per 10 seconds
});

for (const url of urls) {
  await queue.add(() => scrapeUrl(url));
}
```

### Error Recovery Template
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
```

### Debugging Workflow
```
1. Launch in headed mode with DevTools
2. Take screenshot/save HTML when fails
3. Test selectors in browser console
4. Check Network tab for failures
5. Compare old HTML with new
6. Identify which selector broke
7. Find alternative selectors
8. Add fallback selectors
9. Test both headed and headless
10. Document changes and alternatives
```

## Generalized from Production Projects

These skills are generalized patterns from production web scrapers including:
- Multi-year data collection systems
- Dynamic content handling
- Rate-limited API scraping
- Database ETL pipelines
- Error recovery and resumption
- Performance optimization at scale

All project-specific references have been removed to make these universally applicable.

## Key Principles

1. **Resilience over Cleverness**: Simple selectors that work are better than sophisticated ones that break
2. **Graceful Degradation**: Partial data is better than complete failure
3. **Ethical Scraping**: Rate limiting and caching respect target site resources
4. **Maintainability**: Page objects and clear error messages help long-term
5. **Observability**: Logging, checkpoints, and monitoring enable debugging
6. **Testing**: Always test in both headed mode (visual) and headless mode

## Related Skills

See also:
- `.claude/skills/testing/` - Browser testing patterns
- `.claude/skills/performance/` - Optimization techniques
- `.claude/skills/automation/` - Playwright patterns

## File Statistics

| Skill | Lines | Topics | Code Examples |
|-------|-------|--------|----------------|
| Architecture | 544 | 12 major | 18 |
| Debugging | 649 | 14 major | 22 |
| **Total** | **1,193** | **26** | **40** |

---

Created: January 21, 2026
Last Updated: January 21, 2026
Status: Production Ready
