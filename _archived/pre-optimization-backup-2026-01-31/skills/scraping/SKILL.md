---
name: scraping
description: >
  Web scraping with Playwright including architecture patterns,
  debugging workflows, selector resilience, and rate limiting
  for the DMB Almanac data extraction pipeline.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
---

# Web Scraping Skill

Playwright-based web scraping architecture, debugging, and resilience
patterns for extracting concert and setlist data.

## Capabilities

- **Scraper Architecture**: Page object pattern, data extraction pipeline, error recovery
- **Debugging Workflow**: Headed mode inspection, selector testing, HTML snapshot capture
- **Selector Resilience**: Fallback chains, iframe/shadow DOM handling, structure change detection
- **Network Analysis**: API response interception, HAR capture, request failure diagnosis
- **Rate Limiting**: Backoff strategies, delay management, status code detection

## When to Use

- Building or debugging Playwright web scrapers
- Diagnosing selector failures after site updates
- Handling rate limiting and network issues
- Extracting structured data from HTML pages
- Maintaining scraper resilience over time

## Debugging Workflow

1. **Reproduce locally** in headed mode with `slowMo: 500`
2. **Inspect with DevTools** - Elements tab, Console, Network tab
3. **Identify failing selector** - test each in browser console
4. **Determine root cause** - selector change, timing, network, iframe
5. **Apply minimal fix** with fallback selectors
6. **Test in headed + headless** modes
7. **Add resilience layer** (fallback chains, retries)
8. **Document** the fix and updated selectors

## Common Root Causes

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Selector not found | Element in iframe | Use `page.frameLocator()` |
| Empty data | Text in child element | Drill into child selectors |
| Timeout | JS-rendered content | Use `waitForFunction()` |
| 429 status | Rate limited | Add exponential backoff |
| Wrong page | Navigation issue | Verify `page.goto()` target |

## Resilience Rating Scale

- **10/10**: Uses data-testid, semantic roles, robust fallbacks
- **7/10**: Uses class names and IDs, some fallbacks
- **5/10**: Uses structural CSS, minimal error handling
- **2/10**: Uses XPath, fragile position-based selectors
- **0/10**: Hard-coded indexes, no error handling

Target: 8+/10 resilience.

## Supporting Reference Files

- `debugging-reference.md` - Detailed debugging procedures and code examples
- `architecture-reference.md` - Playwright scraper architecture patterns
