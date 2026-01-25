# Automation Debug Report - DMB Almanac Show Scraper

## Issue
Show scraper at `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/shows.ts` was failing to parse DMBAlmanac show pages correctly.

### Failing Behaviors
1. **Date parsing returned empty string** - Expected "1991-03-14", got ""
2. **Venue name not extracted** - Expected "Trax", got ""
3. **City/State not parsed** - Expected "Charlottesville, VA", got ""
4. **Setlist completely empty** - Expected 7 songs, got 0
5. **Band members listed as guests** - Expected 0 guests, got 5 (Dave, Carter, etc.)

## Root Cause Analysis

### What Changed
DMBAlmanac uses a JavaScript-heavy interface with:
- Dropdown navigation instead of static date headers
- JavaScript `onclick` handlers instead of direct href links
- Table-based layout with ID="SetTable"
- URL parameter-based guest identification (gid)

### Why Current Approach Broke

| Element | Wrong Selector | Why It Failed |
|---------|---------------|---------------|
| Date | `.show-date, h1, h2` | No such classes exist; date is in `<select>` dropdown |
| Date Format | Regex for "March 14, 1991" | Actual format is "03.14.1991" |
| Venue Link | `a[href*='VenueStats']` | Links use `javascript:void(0)` with onclick |
| Song Links | `a[href*='SongStats']` | Links use `javascript:void(0)` with class instead |
| Setlist Table | `tr, .setlist-row, .song-row` | Generic selector, misses actual `#SetTable` |
| Guest Filter | None | All GuestStats links treated as guests, no band member filter |

## Recommended Fix

### 1. Date Parsing
```typescript
// OLD - BROKEN
const dateEl = $(".show-date, .setlist-date, h1, h2").first();
const dateMatch = dateText.match(/(\w+\s+\d{1,2},?\s+\d{4})/);

// NEW - FIXED
const dateOption = $("select option:selected").filter((i, el) => {
  const text = $(el).text();
  return /\d{2}\.\d{2}\.\d{4}/.test(text);
}).first();

const rawDate = dateOption.text().trim(); // "03.14.1991"
const dateMatch = rawDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
const [, month, day, year] = dateMatch;
dateStr = `${year}-${month}-${day}`; // "1991-03-14"
```

### 2. Venue Extraction
```typescript
// OLD - BROKEN
const venueEl = $("a[href*='VenueStats']").first();

// NEW - FIXED
const venueLink = $("a").filter((i, el) => {
  const onclick = $(el).attr("onclick") || "";
  return onclick.includes("VenueStats.aspx");
}).first();

const venueName = normalizeWhitespace(venueLink.text());

// Extract location from parent text
const venueParent = venueLink.parent();
const locationText = venueParent.text();
const afterVenue = locationText.split(venueName)[1] || "";
const locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})/);
```

### 3. Setlist Extraction
```typescript
// OLD - BROKEN
$("tr, .setlist-row, .song-row").each((_, row) => {
  const songLink = $row.find("a[href*='SongStats']");

// NEW - FIXED
const setTable = $("#SetTable");
setTable.find("tr").each((_, row) => {
  const $row = $(row);

  // Skip header row
  if ($row.find(".setcolumn").length > 0) return;

  // Find song link in specific cell
  const songLink = $row.find("td.setheadercell a.lightorange").first();

  if (songLink.length > 0) {
    const songTitle = normalizeWhitespace(songLink.text());

    // Get position from first cell
    const positionCell = $row.find("td.setheadercell").first();
    const position = parseInt(positionCell.text().trim(), 10);

    // Detect slot by bgcolor
    const bgColor = positionCell.attr("bgcolor") || "";
    let slot: "opener" | "closer" | "standard" = "standard";
    if (bgColor === "#006666") slot = "opener";
    if (bgColor === "#214263" || bgColor === "#336699") slot = "closer";

    // ... rest of parsing
  }
});
```

### 4. Guest Filtering
```typescript
// Add constant at top of file
const BAND_MEMBER_GIDS = [
  "1",   // Dave Matthews
  "2",   // Carter Beauford
  "94",  // LeRoi Moore
  "75",  // Stefan Lessard
  "104", // Boyd Tinsley
  "3",   // Jeff Coffin
  "ds"   // Dave solo
];

// OLD - BROKEN
$("a[href*='GuestStats']").each((_, g) => {
  const name = normalizeWhitespace($(g).text());
  guests.push({ name, instruments: [], songs: [] });
});

// NEW - FIXED
$("a[href*='TourGuestShows.aspx']").each((_, guestLink) => {
  const href = $(guestLink).attr("href") || "";
  const gidMatch = href.match(/gid=([^&]+)/);

  if (gidMatch) {
    const gid = gidMatch[1];

    // Filter out band members
    if (!BAND_MEMBER_GIDS.includes(gid)) {
      const name = normalizeWhitespace($(guestLink).text());
      if (name && !guests.find((guest) => guest.name === name)) {
        guests.push({ name, instruments: [], songs: [] });
      }
    }
  }
});
```

## Additional Hardening

### Resilient Selector Hierarchy
1. **ID-based** (`#SetTable`) - Most stable, semantic
2. **Attribute filters** (`[onclick*="VenueStats"]`) - Functional selector
3. **Class combinations** (`td.setheadercell a.lightorange`) - Specific enough
4. **Background colors** (`[bgcolor="#006666"]`) - Visual indicator
5. **URL patterns** (`TourGuestShows.aspx?gid=`) - Backend parameter

### Fallback Strategy
```typescript
// If SetTable not found, could fall back to:
const setTable = $("#SetTable") || $("table.threedeetable");

// If date dropdown empty, try alternate formats:
if (!dateStr) {
  // Try parsing from page title or other elements
}
```

### Error Recovery
Current implementation logs errors but returns null on failure:
```typescript
} catch (error) {
  console.error(`Error parsing show ${showUrl}:`, error);
  return null;
}
```

Consider adding:
- Retry logic for network failures
- Partial data recovery (save what was parsed successfully)
- Validation warnings (e.g., "Setlist has 0 songs - possible parsing failure")

## Testing Steps

### 1. Unit Test - Single Show
```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npx tsx test-show-parsing-inline.ts
```

**Expected Output:**
```
TEST 1: Date Parsing ✓ PASSED
TEST 2: Venue Parsing ✓ PASSED
TEST 3: Setlist Parsing ✓ PASSED
TEST 4: Guest Filtering ✓ PASSED
```

### 2. Integration Test - Full Scraper
```bash
npm run scrape:shows
```

Monitor for:
- Date field populated for all shows
- Venue names extracted
- Setlist counts > 0 for normal shows
- Guest counts reasonable (not equal to band size)

### 3. Edge Cases to Verify
- **Multi-set shows** (Set 1, Set 2, Encore)
- **Shows with actual guests** (non-band members)
- **Early shows** (1991-1993, smaller lineups)
- **Recent shows** (2020+, may have different format)
- **Special shows** (Central Park, acoustic sets)

## Selector Alternatives (If Current Breaks)

### Date
```typescript
// Primary (current)
$("select option:selected").filter(...);

// Fallback 1: Look in page header
$("h1, h2").text().match(/\d{2}\.\d{2}\.\d{4}/);

// Fallback 2: Parse from URL parameter
const whereMatch = showUrl.match(/where=(\d{4})/);
```

### Venue
```typescript
// Primary (current)
$("a").filter((i, el) => onclick.includes("VenueStats.aspx"));

// Fallback: Look for specific div structure
$(".newsitem").filter(...).find("a").first();
```

### Songs
```typescript
// Primary (current)
$("#SetTable tr td.setheadercell a.lightorange");

// Fallback 1: Any table with threedeetable class
$("table.threedeetable tr td a.lightorange");

// Fallback 2: Links with onclick containing TourSongShows
$("a").filter((i, el) => onclick.includes("TourSongShows.aspx"));
```

## Performance Considerations

### Rate Limiting
Current implementation uses p-queue with:
```typescript
concurrency: 2,
intervalCap: 5,
interval: 10000  // 5 requests per 10 seconds
```

After fixes, parsing is faster (no more failed selector searches), so rate limiting is more important.

### Caching
Uses HTML caching via `getCachedHtml()`:
```typescript
let html = getCachedHtml(showUrl);
if (!html) {
  await page.goto(showUrl, { waitUntil: "networkidle" });
  html = await page.content();
  cacheHtml(showUrl, html);
}
```

This prevents re-downloading on script restarts.

### Checkpointing
Saves progress after each year:
```typescript
completedYears.push(tour.year);
saveCheckpoint("shows", { completedYears, shows: allShows });
```

## Bot Detection Considerations

DMBAlmanac appears to be scraper-friendly:
- No CAPTCHA observed
- No aggressive rate limiting
- No IP blocking during testing
- Educational/archival use case

Current user agent is polite:
```typescript
"User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)"
```

If bot detection increases:
1. Add random delays between requests
2. Rotate user agents
3. Use headed mode occasionally
4. Add referrer headers
5. Respect robots.txt

## Documentation

Created comprehensive documentation:
- `SHOW_SCRAPER_FIXES.md` - Technical details of all changes
- `AUTOMATION_DEBUG_REPORT.md` - This file, debug workflow
- Test files with inline comments

## Summary

### Changes Made
- ✅ Fixed date parsing (dropdown with MM.DD.YYYY format)
- ✅ Fixed venue extraction (onclick attribute filter)
- ✅ Fixed setlist parsing (SetTable with specific selectors)
- ✅ Added band member filtering (BAND_MEMBER_GIDS array)
- ✅ Enhanced slot detection (bgcolor attribute mapping)
- ✅ Fixed duration parsing (handle &nbsp; properly)

### Test Results
- ✅ All 4 unit tests passing
- ✅ 1991 show parsed correctly (7 songs, 0 guests)
- ✅ 2000 show confirmed working (4 songs found)
- ✅ No TypeScript errors in modified code

### Files Modified
- `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/shows.ts`
  - Lines 19-29: Added BAND_MEMBER_GIDS
  - Lines 118-133: Fixed date parsing
  - Lines 135-161: Fixed venue parsing
  - Lines 166-255: Fixed setlist parsing
  - Lines 274-293: Fixed guest filtering

### Resilience Rating
**8/10** - Selectors are now based on:
- Semantic IDs (#SetTable)
- Functional attributes (onclick patterns)
- Structural classes (td.setheadercell)
- Backend parameters (gid=X)

These should survive minor redesigns. Major structural changes would require updates.
