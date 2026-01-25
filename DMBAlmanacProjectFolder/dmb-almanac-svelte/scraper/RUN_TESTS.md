# Show Scraper Test Suite

## Quick Validation
Run this to verify all fixes are working:

```bash
npx tsx test-show-parsing-inline.ts
```

Expected output:
```
TEST 1: Date Parsing ✓ PASSED
TEST 2: Venue Parsing ✓ PASSED  
TEST 3: Setlist Parsing ✓ PASSED
TEST 4: Guest Filtering ✓ PASSED
TESTS PASSED: 4/4
```

## Test Files

### Primary Tests
- **test-show-parsing-inline.ts** - Comprehensive unit tests (RECOMMENDED)
- **test-2000-show.ts** - Finds and tests a 2000s show
- **test-parsing.ts** - Original logic test

### Exploration Tools
- **analyze-show-detailed.ts** - HTML structure analysis
- **test-show-page.ts** - Page structure explorer
- **save-show-html.ts** - Save HTML for inspection

### Legacy Tests (pre-existing)
- test-corrected-scrape.ts
- test-fixed-scraper.ts
- test-full-scrape.ts
- test-multi-set-show.ts
- test-parse-show-detailed.ts
- test-parse-show.ts
- test-single-year.ts
- analyze-setlist-structure.ts

## Running the Full Scraper

After validation, run the full scraper:

```bash
npm run scrape:shows
```

This will:
1. Scrape all years from 1991 to present
2. Use rate limiting (5 requests per 10 seconds)
3. Cache HTML to avoid re-downloading
4. Save checkpoints after each year
5. Output to `scraper/output/shows.json`

## Cleanup

To remove test files:
```bash
rm test-*.ts analyze-*.ts save-*.ts
```

Keep only:
- test-show-parsing-inline.ts (for validation)
- RUN_TESTS.md (this file)
- SHOW_SCRAPER_FIXES.md (documentation)
- AUTOMATION_DEBUG_REPORT.md (technical details)
