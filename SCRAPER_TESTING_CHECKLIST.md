# Scraper Testing & Validation Checklist

**Purpose:** Verify selector fixes before production deployment
**Scope:** All five scraper modules and their selectors
**Estimated Duration:** 4-6 hours for complete validation

---

## Pre-Testing Setup

- [ ] Install test dependencies: `npm install jest cheerio playwright`
- [ ] Create `/tests/fixtures/` directory for sample HTML
- [ ] Create `/tests/selectors.test.ts` test file
- [ ] Set up headless Chrome/Chromium environment
- [ ] Configure timeout for network tests (30s)
- [ ] Create logging for selector validation

---

## PHASE 1: Manual Live Testing

### Test 1.1 - Shows Page Selectors ✅

**URL:** `https://dmbalmanac.com/TourShowSet.aspx?id=453091046&tid=8176&where=2024`

**Checklist:**

- [ ] Open in browser DevTools Console
- [ ] Run: `document.querySelectorAll('a[href*="VenueStats.aspx"]').length`
  - Expected: `>= 1`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Run: `document.querySelectorAll('#SetTable').length`
  - Expected: `1`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Run: `document.querySelectorAll('tr.opener, tr.closer, tr.midset').length`
  - Expected: `>= 10`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Run: `document.querySelectorAll('a.lightorange[href*="TourSongShows"]').length`
  - Expected: `>= 10`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Inspect first song row:
  ```javascript
  const row = document.querySelector('tr.opener');
  console.log('Cells:', row.querySelectorAll('td').length);
  console.log('Song link:', row.querySelector('a.lightorange').textContent);
  console.log('Duration:', row.textContent);
  ```
  - Song link text: _____
  - Duration found: ✅ YES / ❌ NO

- [ ] Check venue link onclick vs href:
  ```javascript
  const links = document.querySelectorAll('a');
  const venueViaHref = Array.from(links).find(a => a.href.includes('VenueStats'));
  const venueViaOnclick = Array.from(links).find(a => a.onclick && a.onclick.toString().includes('VenueStats'));
  console.log('Via href:', venueViaHref?.textContent);
  console.log('Via onclick:', venueViaOnclick?.textContent);
  ```
  - Href method works: ✅ YES / ❌ NO
  - Onclick method works: ✅ YES / ❌ NO

---

### Test 1.2 - Song Stats Page Selectors ✅

**URL:** `https://dmbalmanac.com/songs/summary.aspx?sid=1` (Ants Marching)

**Checklist:**

- [ ] Run: `document.querySelector('h1').textContent`
  - Expected: "Ants Marching" (or similar)
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Run: `document.querySelectorAll('.stat-col').length`
  - Expected: `>= 2`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Run: `document.querySelectorAll('table.stat-table').length`
  - Expected: `>= 1`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Check for performance table with row classes:
  ```javascript
  const perfTable = document.querySelectorAll('table.stat-table')[1]; // Usually 2nd table
  console.log('Opener rows:', perfTable.querySelectorAll('tr.opener').length);
  console.log('Closer rows:', perfTable.querySelectorAll('tr.closer').length);
  console.log('Midset rows:', perfTable.querySelectorAll('tr.midset').length);
  console.log('Total rows:', perfTable.querySelectorAll('tr').length);
  ```
  - Total rows > 0: ✅ YES / ❌ NO
  - Slot classes present: ✅ YES / ❌ NO

- [ ] Extract play count:
  ```javascript
  const text = document.body.textContent;
  const match = text.match(/(\d+)\s+times?|(\d+)\s+Known Plays/);
  console.log('Play count:', match);
  ```
  - Match found: ✅ YES / ❌ NO
  - Count value: _____

---

### Test 1.3 - Venue Page Selectors ✅

**URL:** `https://dmbalmanac.com/VenueStats.aspx?vid=30048` (Moon Palace Golf)

**Checklist:**

- [ ] Run: `document.querySelector('h1').textContent`
  - Expected: Venue name
  - Actual: _____
  - ✅ PASS / ❌ FAIL (if fails, is h2 present?)

- [ ] Run: `document.querySelectorAll('a[href*="TourShowSet"][href*="id="]').length`
  - Expected: `>= 1`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Extract location info:
  ```javascript
  const text = document.body.textContent;
  const locMatch = text.match(/Cancun|Mexico/);
  console.log('Location found:', locMatch);
  ```
  - Location found: ✅ YES / ❌ NO

- [ ] Run: `document.querySelectorAll('table').length`
  - Expected: `>= 1`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

---

### Test 1.4 - Guest Page Selectors ✅

**URL:** `https://dmbalmanac.com/GuestStats.aspx?gid=15` (Tim Reynolds)

**Checklist:**

- [ ] Run: `document.querySelector('h1').textContent`
  - Expected: Guest name
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Extract instruments:
  ```javascript
  const text = document.body.textContent;
  const instrMatch = text.match(/guitar|vocals|violin/i);
  console.log('Instruments found:', instrMatch);
  ```
  - Instrument info found: ✅ YES / ❌ NO

- [ ] Run: `document.querySelectorAll('a[href*="GuestStats"][href*="gid="]').length`
  - Expected: `>= 1`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

---

### Test 1.5 - Song List Page Selectors ✅

**URL:** `https://dmbalmanac.com/songs/all-songs.aspx`

**Checklist:**

- [ ] Run: `document.querySelectorAll('a[href*="summary.aspx?sid="]').length`
  - Expected: `> 100`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Run: `document.querySelectorAll('a[href*="SongStats.aspx"]').length`
  - Expected: `>= 0`
  - Actual: _____
  - ✅ PASS / ❌ FAIL

- [ ] Check first song link:
  ```javascript
  const firstLink = document.querySelector('a[href*="summary.aspx?sid="]');
  console.log('Link:', firstLink.href);
  console.log('Contains sid=:', firstLink.href.includes('sid='));
  ```
  - Link format correct: ✅ YES / ❌ NO

---

## PHASE 2: Automated Selector Testing

### Test 2.1 - Create Test Fixtures

Save HTML snapshots from live pages:

```bash
# Create fixture directory
mkdir -p tests/fixtures

# Download real pages
curl -sL "https://dmbalmanac.com/TourShowSet.aspx?id=453091046" > tests/fixtures/show.html
curl -sL "https://dmbalmanac.com/songs/summary.aspx?sid=1" > tests/fixtures/song.html
curl -sL "https://dmbalmanac.com/VenueStats.aspx?vid=30048" > tests/fixtures/venue.html
curl -sL "https://dmbalmanac.com/GuestStats.aspx?gid=15" > tests/fixtures/guest.html
curl -sL "https://dmbalmanac.com/songs/all-songs.aspx" > tests/fixtures/songs-list.html
```

---

### Test 2.2 - Shows Selectors Unit Test

**File:** `/tests/selectors.test.ts`

```typescript
import * as cheerio from 'cheerio';
import * as fs from 'fs';

describe('Shows Page Selectors', () => {
  let html: string;
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    html = fs.readFileSync('tests/fixtures/show.html', 'utf-8');
    $ = cheerio.load(html);
  });

  test('should find SetTable by ID', () => {
    const table = $('#SetTable');
    expect(table.length).toBeGreaterThan(0);
  });

  test('should find song rows with position classes', () => {
    const rows = $('tr.opener, tr.closer, tr.midset, tr.encore');
    expect(rows.length).toBeGreaterThan(5);
  });

  test('should find venue link via href', () => {
    const venueLink = $("a[href*='VenueStats.aspx']").first();
    expect(venueLink.length).toBe(1);
    expect(venueLink.attr('href')).toMatch(/vid=\d+/);
  });

  test('should find song links with lightorange class', () => {
    const songLinks = $("a.lightorange[href*='TourSongShows']");
    expect(songLinks.length).toBeGreaterThan(5);
  });

  test('should find duration in song rows', () => {
    const rows = $('tr.opener, tr.midset, tr.closer');
    let foundDuration = false;
    rows.each((_, row) => {
      const text = $(row).text();
      if (/\d+:\d{2}/.test(text)) {
        foundDuration = true;
      }
    });
    expect(foundDuration).toBe(true);
  });

  test('should not use onclick for venue extraction', () => {
    // Venue should be extractable via href, not onclick
    const venueViaHref = $("a[href*='VenueStats.aspx']").first();
    const venueText = venueViaHref.text().trim();
    expect(venueText.length).toBeGreaterThan(0);
    expect(venueText).toMatch(/[A-Za-z]/); // Should be text, not code
  });

  test('should extract venue ID from href', () => {
    const venueLink = $("a[href*='VenueStats.aspx']").first();
    const href = venueLink.attr('href') || '';
    const match = href.match(/vid=(\d+)/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toMatch(/\d+/);
  });
});
```

**Run Test:**
```bash
npm test -- selectors.test.ts --testNamePattern="Shows Page"
```

**Expected Result:** ✅ 7/7 passing

---

### Test 2.3 - Song Selectors Unit Test

```typescript
describe('Song Stats Page Selectors', () => {
  let html: string;
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    html = fs.readFileSync('tests/fixtures/song.html', 'utf-8');
    $ = cheerio.load(html);
  });

  test('should find h1 heading', () => {
    const heading = $('h1').first();
    expect(heading.length).toBe(1);
    expect(heading.text().length).toBeGreaterThan(0);
  });

  test('should find stat columns', () => {
    const cols = $('.stat-col');
    expect(cols.length).toBeGreaterThan(1);
  });

  test('should find stat table', () => {
    const table = $('table.stat-table');
    expect(table.length).toBeGreaterThan(0);
  });

  test('should find performance data with row classes', () => {
    const perfTable = $('table.stat-table').last();
    const rows = perfTable.find('tr.opener, tr.closer, tr.midset, tr.encore');
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should extract play count from body text', () => {
    const bodyText = $('body').text();
    const match = bodyText.match(/(\d+)\s+times?|(\d+)\s+Known Plays/i);
    expect(match).not.toBeNull();
  });

  test('should find show links in performance table', () => {
    const perfTable = $('table.stat-table').last();
    const showLinks = perfTable.find("a[href*='ShowSetlist'], a[href*='TourShowSet']");
    expect(showLinks.length).toBeGreaterThan(0);
  });
});
```

---

### Test 2.4 - Venue Selectors Unit Test

```typescript
describe('Venue Page Selectors', () => {
  let html: string;
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    html = fs.readFileSync('tests/fixtures/venue.html', 'utf-8');
    $ = cheerio.load(html);
  });

  test('should find heading (h1 or h2)', () => {
    const heading = $('h1').first().text() ||
                    $('h2').first().text();
    expect(heading.length).toBeGreaterThan(0);
  });

  test('should find venue show links', () => {
    const links = $("a[href*='TourShowSet'][href*='id=']");
    expect(links.length).toBeGreaterThan(0);
  });

  test('should extract venue ID from link', () => {
    const link = $("a[href*='TourShowSet']").first();
    const href = link.attr('href') || '';
    const match = href.match(/vid=(\d+)/);
    // Note: Some show links may have vid parameter
    expect(href.length).toBeGreaterThan(0);
  });

  test('should find location in page text', () => {
    const bodyText = $('body').text();
    // Look for US format (City, ST) or Intl (City, Country)
    const usMatch = bodyText.match(/([A-Za-z\s]+),\s*([A-Z]{2})(?:,\s*[A-Za-z\s]+)?/);
    const intlMatch = bodyText.match(/([A-Za-z\s]+),\s*([A-Za-z\s]{3,})/);
    expect(usMatch || intlMatch).not.toBeNull();
  });
});
```

---

### Test 2.5 - Guest Selectors Unit Test

```typescript
describe('Guest Page Selectors', () => {
  let html: string;
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    html = fs.readFileSync('tests/fixtures/guest.html', 'utf-8');
    $ = cheerio.load(html);
  });

  test('should find h1 heading', () => {
    const heading = $('h1').first();
    expect(heading.length).toBe(1);
    expect(heading.text().length).toBeGreaterThan(0);
  });

  test('should find appearance count', () => {
    const bodyText = $('body').text();
    const match = bodyText.match(/(\d+)\s+appearances?/i);
    expect(match).not.toBeNull();
  });

  test('should have methods to extract instruments', () => {
    const bodyText = $('body').text();
    // Look for various instrument keywords
    const hasInstruments = /guitar|vocals|violin|piano|drums|bass/i.test(bodyText);
    expect(hasInstruments).toBe(true);
  });
});
```

---

### Test 2.6 - Songs List Selectors Unit Test

```typescript
describe('Songs List Page Selectors', () => {
  let html: string;
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    html = fs.readFileSync('tests/fixtures/songs-list.html', 'utf-8');
    $ = cheerio.load(html);
  });

  test('should find song links with summary.aspx format', () => {
    const links = $("a[href*='songs/summary.aspx?sid=']");
    expect(links.length).toBeGreaterThan(100);
  });

  test('each song link should have valid sid parameter', () => {
    const links = $("a[href*='songs/summary.aspx?sid=']");
    let validLinks = 0;
    links.each((_, el) => {
      const href = $(el).attr('href') || '';
      if (/sid=\d+/.test(href)) {
        validLinks++;
      }
    });
    expect(validLinks).toBeGreaterThan(100);
  });

  test('song links should have readable text', () => {
    const firstLink = $("a[href*='songs/summary.aspx?sid=']").first();
    const text = firstLink.text().trim();
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/^http/); // Not a URL
  });
});
```

**Run All Selector Tests:**
```bash
npm test -- selectors.test.ts
```

**Expected Result:** ✅ All tests passing

---

## PHASE 3: Integration Testing

### Test 3.1 - Shows Scraper Integration

```bash
# Test scraper with single show
npm run scrape:shows -- --test-mode --limit=1

# Expected output:
# ✓ Parsed show date
# ✓ Extracted venue name
# ✓ Found setlist entries (>= 10)
# ✓ Parsed song titles
# ✓ Extracted durations
```

**Validation Checklist:**
- [ ] Show date in ISO format (YYYY-MM-DD)
- [ ] Venue name is text (not code)
- [ ] Setlist has 10+ entries
- [ ] Songs are recognized (not "undefined")
- [ ] Duration format is "M:SS"
- [ ] Location has city and state/country
- [ ] No JavaScript errors in console
- [ ] Script completes in < 30 seconds

---

### Test 3.2 - Songs Scraper Integration

```bash
# Test with first 10 songs
npm run scrape:songs -- --test-mode --limit=10

# Expected output:
# ✓ Found songs index page
# ✓ Fetched first 10 songs
# ✓ Parsed titles
# ✓ Extracted statistics
```

**Validation Checklist:**
- [ ] Navigated to /songs/all-songs.aspx (or correct URL)
- [ ] Found songs (not error)
- [ ] Titles are extracted
- [ ] No "undefined" titles
- [ ] Script completes in < 60 seconds

---

### Test 3.3 - Venues Scraper Integration

```bash
# Test with first 10 venues
npm run scrape:venues -- --test-mode --limit=10

# Expected output:
# ✓ Found venues list
# ✓ Parsed venue names
# ✓ Extracted locations
```

**Validation Checklist:**
- [ ] Venue names are recognized
- [ ] Locations have city/state or city/country
- [ ] No corrupted names (no navigation text)
- [ ] Show count >= 1
- [ ] Script completes in < 60 seconds

---

### Test 3.4 - Song Stats Scraper Integration

```bash
# Test with first 5 songs
npm run scrape:song-stats -- --test-mode --limit=5

# Expected output:
# ✓ Found song stats pages
# ✓ Parsed play counts (not 0)
# ✓ Extracted slot breakdown
```

**Validation Checklist:**
- [ ] Play count > 0
- [ ] Slot breakdown has non-zero values
- [ ] Performances table parsed
- [ ] Duration statistics extracted
- [ ] Script completes in < 60 seconds per song

---

### Test 3.5 - Guests Scraper Integration

```bash
# Test with first 10 guests
npm run scrape:guests -- --test-mode --limit=10

# Expected output:
# ✓ Found guests list
# ✓ Parsed guest names
# ✓ Extracted instruments
```

**Validation Checklist:**
- [ ] Guest names extracted
- [ ] Instruments array populated (or empty with reason)
- [ ] Appearance counts > 0
- [ ] No errors for missing CSS classes
- [ ] Script completes in < 60 seconds

---

## PHASE 4: Data Quality Validation

### Test 4.1 - Shows Data

Run on 10 recent shows and 10 old shows:

- [ ] All shows have dates
- [ ] All dates are valid ISO format
- [ ] All shows have venue names
- [ ] All venues have locations
- [ ] All setlists have > 0 songs
- [ ] Song count <= 30 (typical show size)
- [ ] No duplicate shows in list
- [ ] Location parsing is correct (spot check 5)

**Command:**
```bash
npm run scrape:shows -- --year=2024 --limit=10
npm run scrape:shows -- --year=1995 --limit=10
```

---

### Test 4.2 - Songs Data

Run on all available songs:

- [ ] All songs have titles
- [ ] No "undefined" titles
- [ ] Cover songs marked correctly
- [ ] Play counts are numbers
- [ ] No negative values
- [ ] First/last played dates are valid (if present)

**Validation SQL (after DB import):**
```sql
-- Check for missing titles
SELECT COUNT(*) FROM songs WHERE title IS NULL OR title = '';
-- Expected: 0

-- Check play counts
SELECT COUNT(*) FROM songs WHERE totalPlays < 0;
-- Expected: 0

-- Check dates
SELECT COUNT(*) FROM songs
  WHERE firstPlayedDate IS NOT NULL
  AND firstPlayedDate > NOW();
-- Expected: 0
```

---

### Test 4.3 - Venues Data

Run on all venues:

- [ ] All venues have names
- [ ] All venues have cities
- [ ] 95%+ have state (for US) or country
- [ ] Show counts > 0
- [ ] No duplicate venues

**Validation SQL:**
```sql
SELECT COUNT(*) FROM venues WHERE name IS NULL;
-- Expected: 0

SELECT COUNT(*) FROM venues WHERE city IS NULL;
-- Expected: 0

SELECT AVG(showCount) FROM venues;
-- Expected: > 5 (typical venue has multiple shows)
```

---

### Test 4.4 - Song Stats Data

Run on 50 random songs:

- [ ] Play counts match referenced data (spot check 5)
- [ ] Slot breakdown totals make sense
- [ ] No negative values
- [ ] Performances table populated

---

## PHASE 5: Error Handling Validation

### Test 5.1 - Network Error Handling

```bash
# Test with invalid show ID
npm run scrape:shows -- --test-mode --show-id=999999999
# Should: Log error, skip show, continue

# Test with offline mode (disconnect internet)
npm run scrape:shows -- --test-mode --limit=1
# Should: Use cache if available, or fail gracefully
```

**Expected Behavior:**
- [ ] Errors logged clearly
- [ ] Script doesn't crash
- [ ] Checkpoint saved
- [ ] Can resume from checkpoint

---

### Test 5.2 - Selector Failure Handling

```bash
# Mock broken selector by modifying HTML fixture
# Test scraper with modified fixture
npm run test:selectors -- --use-broken-fixture
# Should: Fall back to alternative selectors
```

---

## Final Sign-Off Checklist

### Before Going to Production

- [ ] All Phase 1 manual tests passed (✅)
- [ ] All Phase 2 unit tests passing (✅)
- [ ] All Phase 3 integration tests successful (✅)
- [ ] All Phase 4 data quality checks passed (✅)
- [ ] Error handling validated (Phase 5)
- [ ] No console errors or warnings
- [ ] Rate limiting working correctly
- [ ] Cache functioning properly
- [ ] Checkpoints save/restore correctly
- [ ] All selectors documented in code comments
- [ ] Assumptions documented in README
- [ ] Test coverage > 80%
- [ ] Performance acceptable (< 5 minutes for 100 items)

### Post-Deployment Monitoring

- [ ] Set up error logging/alerts
- [ ] Monitor selector failures daily
- [ ] Track data quality metrics
- [ ] Weekly validation of sample data
- [ ] Version control for all scraper changes

---

## Test Result Summary Template

```
SCRAPER VALIDATION REPORT
Date: [DATE]
Tester: [NAME]

PHASE 1 - MANUAL TESTING
✅ Shows selectors: [PASS/FAIL]
✅ Songs selectors: [PASS/FAIL]
✅ Venues selectors: [PASS/FAIL]
✅ Guests selectors: [PASS/FAIL]
✅ Song list selectors: [PASS/FAIL]

PHASE 2 - UNIT TESTING
✅ Shows tests: [X/X passing]
✅ Songs tests: [X/X passing]
✅ Venues tests: [X/X passing]
✅ Guests tests: [X/X passing]
✅ Song list tests: [X/X passing]

PHASE 3 - INTEGRATION TESTING
✅ Shows scraper: [PASS/FAIL]
✅ Songs scraper: [PASS/FAIL]
✅ Venues scraper: [PASS/FAIL]
✅ Song stats scraper: [PASS/FAIL]
✅ Guests scraper: [PASS/FAIL]

PHASE 4 - DATA QUALITY
✅ Shows data: [PASS/FAIL]
✅ Songs data: [PASS/FAIL]
✅ Venues data: [PASS/FAIL]
✅ Guest data: [PASS/FAIL]

PHASE 5 - ERROR HANDLING
✅ Network errors: [PASS/FAIL]
✅ Selector fallbacks: [PASS/FAIL]

NOTES:
[Any issues found or special observations]

RECOMMENDATION:
[APPROVED FOR PRODUCTION / NEEDS MORE WORK]
```

---

**Document Created:** January 25, 2026
**Version:** 1.0
**Estimated Test Duration:** 4-6 hours
