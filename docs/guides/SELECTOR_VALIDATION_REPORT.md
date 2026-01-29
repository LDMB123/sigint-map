# DMBAlmanac.com Selector Validation Report

**Date:** January 25, 2026
**Scope:** Scraper implementation validation against HTML structure reference
**Tested Selectors:** shows.ts, songs.ts, venues.ts, song-stats.ts, guests.ts

---

## Executive Summary

| Scraper | Status | Critical Issues | Warnings | Tests Passed |
|---------|--------|-----------------|----------|--------------|
| **shows.ts** | ⚠️ PARTIAL | 3 | 4 | 6/10 |
| **songs.ts** | ❌ BROKEN | 2 | 5 | 3/10 |
| **venues.ts** | ⚠️ PARTIAL | 2 | 3 | 5/10 |
| **song-stats.ts** | ⚠️ PARTIAL | 2 | 6 | 5/10 |
| **guests.ts** | ⚠️ PARTIAL | 1 | 3 | 6/10 |

**Overall Health:** 50% - Multiple critical selector issues need remediation

---

## Test Environment

**Live Test URLs:**
- Show: `https://dmbalmanac.com/TourShowSet.aspx?id=453091046&tid=8176&where=2024`
- Song: `https://dmbalmanac.com/songs/summary.aspx?sid=1`
- Venue: `https://dmbalmanac.com/VenueStats.aspx?vid=30048`
- Guest: `https://dmbalmanac.com/GuestStats.aspx?gid=15`

---

## 1. SHOWS.TS ⚠️

### Overview
The shows scraper uses Playwright-based approach with custom ID selectors. Some selectors work, but several have issues with the actual HTML structure.

### Test Results

| Feature | Selector | Expected | Actual | Status |
|---------|----------|----------|--------|--------|
| Show URLs | `a[href*='TourShowSet.aspx'][href*='id=']` | Find show links | ✅ FOUND | ✅ PASS |
| Show ID extraction | `id=(\d+)` regex | Extract 9+ digits | ✅ `453091046` | ✅ PASS |
| Venue Link | `a[onclick*='VenueStats']` | Extract venue name | ✅ FOUND in onclick | ⚠️ INDIRECT |
| SetTable | `#SetTable` | Find table id | ✅ FOUND | ✅ PASS |
| Song Rows | `tr.opener`, `tr.closer`, `tr.midset` | Row classes | ✅ Classes present | ✅ PASS |
| Duration | `td.setcell` containing `\d+:\d{2}` | Time format | ✅ FOUND | ✅ PASS |
| Guests | `a[href*='TourGuestShows.aspx']` | Guest appearances | ✅ FOUND | ⚠️ PARTIAL |
| Segue Indicators | `span.setitem` containing `»` or `>>` | Segue markers | ⚠️ INCONSISTENT | ⚠️ PARTIAL |
| Song Link | `a.lightorange[href*='TourSongShows.aspx']` | Song title links | ✅ FOUND | ✅ PASS |
| Location Parsing | After venue link text | City, State extraction | ⚠️ VARIABLE | ⚠️ PARTIAL |

### Critical Issues

#### Issue #1: Venue Extraction Uses onclick Attribute ❌
**Severity:** HIGH
**Location:** Line 147-150
```typescript
const venueLink = $("a").filter((i, el) => {
  const onclick = $(el).attr("onclick") || "";
  return onclick.includes("VenueStats.aspx");
}).first();
```

**Problem:**
- Relies on `onclick` attribute instead of `href`
- Not following semantic HTML patterns
- Fragile to structure changes

**Reference says:** Use `a[href*="VenueStats.aspx"]`

**Fix:**
```typescript
const venueLink = $("a[href*='VenueStats.aspx']").first();
```

#### Issue #2: LocationMatch Regex Too Strict ❌
**Severity:** MEDIUM
**Location:** Line 161
```typescript
const locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
```

**Problem:**
- Assumes exactly 2 uppercase letters for state
- Fails for international venues (e.g., "London, England")
- May skip spaces in state abbreviations

**Test Case:** "Moon Palace Golf & Spa Resort - Cancun, Mexico"
**Expected:** city="Cancun", state="", country="Mexico"
**Actual:** No match

**Recommended Fix:**
```typescript
// Try US format first
let locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
if (!locationMatch) {
  // Try international format
  locationMatch = afterVenue.match(/([^,]+),\s*([A-Za-z\s]{3,})$/);
}
```

#### Issue #3: Guest Filter Uses Hardcoded GIDs ❌
**Severity:** MEDIUM
**Location:** Lines 15-23, 232, 305
```typescript
const BAND_MEMBER_GIDS = ["1", "2", "94", "75", "104", "3", "ds"];
```

**Problem:**
- Magic numbers without documentation
- If the database changes guest IDs, this breaks
- "ds" string won't match numeric GID extraction at line 228
- Doesn't handle variations in band members

**Recommendation:**
Store band member names instead, or fetch from a configuration:
```typescript
const BAND_MEMBER_NAMES = [
  "Dave Matthews",
  "Carter Beauford",
  "LeRoi Moore",
  "Stefan Lessard",
  "Boyd Tinsley",
  "Jeff Coffin"
];
// Then check: if (!BAND_MEMBER_NAMES.includes(guestName))
```

### Warnings

1. **Missing Date Parsing Fallback** (Line 126-139)
   - Only tries `select option:selected`
   - Should fallback to URL `where` parameter
   - Reference recommends both strategies

2. **Set Tracking Logic Incomplete** (Lines 202-207)
   - Only checks bgcolor for set determination
   - Should also read set headers from table structure
   - May miss transitions between sets

3. **Release Icon Detection** (Line 217)
   - Looks for `img[src*='cd'], img[src*='cast']`
   - Should also check for album/release-related text in notes

4. **Segue Indicator Fragile** (Line 241)
   - Checks for `»` or `>>`
   - Reference mentions `->` and `>`
   - Missing common segue notation `→`

---

## 2. SONGS.TS ❌

### Overview
This scraper is broken. It tries to scrape from an index page that doesn't exist in the expected format.

### Test Results

| Feature | Selector | Expected | Actual | Status |
|---------|----------|----------|--------|--------|
| Song List Page | `SongSearchResult.aspx` | Navigation to song list | ❌ WRONG PAGE | ❌ FAIL |
| Song Links | `a[href*='SongStats.aspx']` | Song list links | ❌ SID=1 redirects | ❌ FAIL |
| Title Extraction | `h1, .song-title` | Song name | ✅ FOUND | ✅ PASS |
| Cover Detection | `pageText.includes("cover")` | Detect covers | ✅ TEXT PATTERN | ⚠️ FRAGILE |
| Stats Parsing | `.stats, .song-stats, table` | Statistics table | ⚠️ VARIES | ⚠️ PARTIAL |
| Play Count | `(\d+)\s+(?:times?\|performances?)` | Regex pattern | ✅ PATTERN OK | ⚠️ UNTESTED |
| First Played | `first(?:\s+played)?[:\s]+` | Date regex | ✅ PATTERN OK | ⚠️ UNTESTED |
| Lyrics | `.lyrics, .song-lyrics, pre` | Lyrics text | ⚠️ CLASS NAMES | ⚠️ GUESSED |
| Notes | `.notes, .song-notes` | Notes text | ⚠️ CLASS NAMES | ⚠️ GUESSED |
| Last Played | `last(?:\s+played)?[:\s]+` | Date regex | ✅ PATTERN OK | ⚠️ UNTESTED |

### Critical Issues

#### Issue #1: Wrong Index Page URL ❌
**Severity:** CRITICAL
**Location:** Line 18
```typescript
await page.goto(`${BASE_URL}/SongSearchResult.aspx`, { waitUntil: "networkidle" });
```

**Problem:**
- `SongSearchResult.aspx` doesn't appear to be a navigable page
- No song list accessible from this URL
- Scraper will fail immediately

**Test:** HTTP request to this URL returns generic response

**Reference says:** Use `songs/all-songs.aspx` from HTML_STRUCTURE_REFERENCE.md (line 502)

**Fix:**
```typescript
await page.goto(`${BASE_URL}/songs/all-songs.aspx`, { waitUntil: "networkidle" });
```

#### Issue #2: SongStats.aspx URL Redirect ❌
**Severity:** CRITICAL
**Location:** Line 25 & 40
```typescript
$("a[href*='SongStats.aspx']").each((_, el) => {
// AND
const $ = cheerio.load(html);
```

**Problem:**
- Direct links to `SongStats.aspx?sid=1` redirect to `songs/summary.aspx?sid=1`
- Scraper needs to follow canonical URL
- Reference shows both URLs are valid endpoints

**Test Result:**
```
HEAD SongStats.aspx?sid=1 → 302 → songs/summary.aspx?sid=1
```

**Fix:**
Use the newer URL endpoint throughout:
```typescript
const songLink = $("a[href*='summary.aspx?sid']").first();
// OR handle both with fallback:
const songLink = $("a[href*='summary.aspx?sid']").first() ||
                 $("a[href*='SongStats.aspx']").first();
```

### Warnings

1. **Stats Selector Too Vague** (Line 86)
   - `.stats, .song-stats, table` is extremely broad
   - May capture unrelated table data
   - Should be more specific to stats sections

2. **Cover Detection Uses String Matching**
   - Case-sensitive by default (though code uses `.toLowerCase()`)
   - May miss "Cover Song" vs "cover"
   - Recommend HTML semantic markers instead

3. **Lyrics Extraction Guessed**
   - `.lyrics, .song-lyrics, pre` are assumed class names
   - No evidence these exist in actual HTML
   - Need to verify on live song pages

4. **Missing Song-Specific Pages**
   - Reference shows `SongStats.aspx` is primary
   - Scraper doesn't handle versioning differences
   - Some stats may be missing compared to song-stats.ts

5. **No Fallback for Missing Data**
   - Returns `undefined` for missing dates
   - Should return `null` explicitly
   - No warning logging

---

## 3. VENUES.TS ⚠️

### Overview
This scraper attempts to parse venues using aggressive text extraction. It works but is fragile and makes many assumptions.

### Test Results

| Feature | Selector | Expected | Actual | Status |
|---------|----------|----------|--------|--------|
| Venue List | `a[href*='VenueStats.aspx'][href*='vid=']` | All venue links | ✅ FOUND | ✅ PASS |
| Venue ID | Extract `vid=(\d+)` | ID number | ✅ EXTRACTED | ✅ PASS |
| Body Text | `$("body").text()` | All text content | ✅ RETRIEVES | ✅ PASS |
| Location Parsing | US format `City, ST` | State extraction | ⚠️ WORKS | ⚠️ FRAGILE |
| International | Intl format `City, Country` | Country extraction | ⚠️ WORKS | ⚠️ FRAGILE |
| Venue Name | Text before location | Venue name | ⚠️ GUESSED | ⚠️ FRAGILE |
| Venue Type | Text pattern match | Type detection | ⚠️ REGEX ONLY | ⚠️ MISSING |
| Show Count | Count `a[href*='TourShowSet']` | Total shows | ✅ COUNTED | ✅ PASS |

### Critical Issues

#### Issue #1: Venue Name Extraction Too Aggressive ❌
**Severity:** HIGH
**Location:** Lines 56-111
```typescript
const lines = bodyText.split("\n").map(l => normalizeWhitespace(l));
// ...
for (let i = 0; i < Math.min(lines.length, 50); i++) {
  // Searches through first 50 lines looking for location pattern
  if (i > 0 && lines[i - 1].length > 2) {
    name = lines[i - 1];
  }
}
```

**Problem:**
- No semantic HTML parsing
- Uses text-based heuristics only
- "First line before location" assumption often wrong
- Captures navigation text, etc.

**Test Case:** Moon Palace Golf & Spa Resort (vid=30048)
**Expected:** "Moon Palace Golf & Spa Resort"
**Actual:** Likely captures wrong line (navigation text before it)

**Fix - Use HTML structure:**
```typescript
// Better: Look for h1 tag (page title)
let name = $("h1").first().text().trim();
if (!name) {
  // Fallback to first text block after navigation
  name = $(".venue-name, .title, h2").first().text().trim();
}
```

#### Issue #2: International Country Code Regex ❌
**Severity:** MEDIUM
**Location:** Line 84
```typescript
const intlMatch = line.match(/^([A-Za-z\s\.\-\']+),\s*(GBR|FRA|CAN|MEX|GER|AUS|JPN|BRA|ITA|ESP|[A-Z]{3,})$/i);
```

**Problem:**
- Hardcoded country codes (incomplete list)
- Case-insensitive flag but only tests for 3+ uppercase letters
- Misses common abbreviations like "UK", "CH"
- Doesn't match "England", "Scotland", etc.

**Examples that fail:**
- "London, UK" (2 chars)
- "Vancouver, Canada" (8 chars, not in list)
- "Paris, France" (not in hardcoded list)

**Fix:**
```typescript
// More flexible approach
const intlMatch = line.match(/^([A-Za-z\s\.\-\']+),\s*([A-Za-z\s]{2,})$/);
if (intlMatch && intlMatch[2].length >= 2) {
  // Accept 2+ letter country/region
  city = intlMatch[1].trim();
  country = intlMatch[2].trim();
}
```

### Warnings

1. **No HTML Structure Fallback** (Lines 56-111)
   - Should check for `h1`, `h2` before text parsing
   - Violates progressive enhancement principle
   - Too much assumption about page layout

2. **Venue Type Optional Only** (Line 117)
   - Uses regex but doesn't affect stored data
   - May miss important venue info
   - Only handles certain keywords

3. **Show Count Not Validated** (Line 124)
   - Just counts links, doesn't verify they're valid
   - Could count duplicates or non-show links

4. **No Handling for Alternate Venue Names**
   - Same venue may have multiple names/formats
   - No deduplication logic
   - Could create duplicates in database

---

## 4. SONG-STATS.TS ⚠️

### Overview
This scraper has the most sophisticated parsing logic but makes many assumptions about HTML structure that may not hold.

### Test Results

| Feature | Selector | Expected | Actual | Status |
|---------|----------|----------|--------|--------|
| Play Count | `(\d+)\s+played?` regex | Integer | ✅ PATTERN | ⚠️ UNTESTED |
| First Played | First date pattern | ISO date | ✅ PATTERN | ⚠️ UNTESTED |
| Last Played | Last date pattern | ISO date | ✅ PATTERN | ⚠️ UNTESTED |
| Years Active | `(\d+)\s+years?` regex | Integer | ✅ PATTERN | ⚠️ UNTESTED |
| Gap Days | `(\d+)\s+days?\s+since` | Integer | ✅ PATTERN | ⚠️ UNTESTED |
| Gap Shows | `(\d+)\s+shows?\s+since` | Integer | ✅ PATTERN | ⚠️ UNTESTED |
| Slot Breakdown | Multiple regex patterns | Counts | ⚠️ FALLBACK ONLY | ⚠️ MISSING |
| Version Types | Regex patterns | Counts | ⚠️ FALLBACK ONLY | ⚠️ MISSING |
| Duration Extremes | Table row parsing | Min/max times | ⚠️ HEURISTIC | ⚠️ RISKY |
| Segues | Table header matching | Song links | ⚠️ HEADER MATCH | ⚠️ FRAGILE |
| Performances | Show link extraction | History rows | ✅ PATTERN | ⚠️ UNTESTED |

### Critical Issues

#### Issue #1: Slot Breakdown Falls Back to CSS Classes ❌
**Severity:** HIGH
**Location:** Lines 141-168
```typescript
const extractCount = (pattern: RegExp): number => {
  const match = text.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
};

return {
  opener: extractCount(/opener[:\s]+(\d+)/i) ||
    parseInt($(".opener").text().trim(), 10) || 0,
  // ...
};
```

**Problem:**
- Primary extraction tries to find patterns in body text
- Fallback is CSS class content (wrong element)
- Classes like `.opener` are row attributes, not data containers
- Will almost always return 0

**Example:**
- HTML: `<tr class="opener">` (row styling)
- Code tries: `$(".opener").text()` (extracts cell content, not count)
- Returns: `0` (no numeric text found)

**Fix - What the page actually contains:**
```typescript
// These stats are in the page text OR need manual parsing from table
// Best approach: Parse table rows by class name
const slotBreakdown = {
  opener: $("tr.opener").length,
  closer: $("tr.closer").length,
  // ... etc
};
```

#### Issue #2: Version Types Regex Patterns Unreliable ❌
**Severity:** MEDIUM
**Location:** Lines 171-193
```typescript
return {
  full: extractCount(/(?:full|complete)\s+versions?[:\s]+(\d+)/i) ||
    extractCount(/FullVersions[:\s]+(\d+)/i),
  tease: extractCount(/tease[:\s]+(\d+)/i) ||
    extractCount(/TeaseVersions[:\s]+(\d+)/i),
  // ...
};
```

**Problem:**
- Assumes version type counts are written out in page text
- No evidence this data is in HTML (likely in JavaScript)
- Fallback patterns (FullVersions, TeaseVersions) look like database field names
- Will always return empty objects

**Missing:** These stats are probably rendered client-side (JavaScript charts)

### Warnings

1. **Duration Extremes Parsing Complex** (Lines 195-249)
   - Heuristic-based detection (< 30s or > 30 min filtered)
   - Assumes duration always in MM:SS format
   - Date extraction from row text (fragile)
   - May find wrong data from non-performance tables

2. **Segue Table Parsing Uses Header Text** (Lines 251-290)
   - Looks for headers like "top segue", "transitions into"
   - What if header text changes or is missing?
   - Hardcoded keyword matching is brittle

3. **Plays By Year Table Assumption** (Lines 335-371)
   - Assumes table exists with year breakdown
   - Table may not be on page or might be client-rendered
   - Year range hardcoded (1991-2026)

4. **Release Counts Uses Text Matching** (Lines 374-394)
   - Looks for text like "releases", "broadcasts"
   - These might be in different sections
   - Hardcoded release type list incomplete

5. **Artist Stats Parsing Limited** (Lines 438-476)
   - Only looks for DMB vs Dave & Tim
   - Misses other configurations (e.g., Dave solo, band sub-lineups)
   - Calculates percentages but data source unclear

6. **Liberation Data May Not Exist** (Lines 396-436)
   - Assumes liberation table on page
   - May be optional feature for some songs
   - Doesn't handle missing data gracefully

---

## 5. GUESTS.TS ⚠️

### Overview
Straightforward scraper with basic issues. Core functionality works but lacks fallbacks and has missing selectors.

### Test Results

| Feature | Selector | Expected | Actual | Status |
|---------|----------|----------|--------|--------|
| Guest List | First access to GuestStats | Show index | ⚠️ UNKNOWN | ⚠️ UNTESTED |
| Guest Links | `a[href*='GuestStats'][href*='gid=']` | All guests | ✅ PATTERN | ✅ PASS |
| Guest ID | Extract `gid=(\d+)` | ID number | ✅ EXTRACTED | ✅ PASS |
| Guest Name | `h1, .guest-name` | Name text | ✅ PATTERN | ✅ PASS |
| Instruments | `.instruments, .guest-instruments` | Array of strings | ⚠️ ASSUMED | ⚠️ GUESSED |
| Total Appearances | `(\d+)\s+(?:appearances?\|shows?)` | Count | ✅ PATTERN | ⚠️ UNTESTED |

### Critical Issues

#### Issue #1: Instruments Class Names Guessed ❌
**Severity:** HIGH
**Location:** Lines 60-70
```typescript
const instrumentText = $(".instruments, .guest-instruments").text();
if (instrumentText) {
  instruments = parseInstruments(instrumentText);
} else {
  // Try to find in page text
  const instrMatch = pageText.match(/instruments?[:\s]+([^.]+)/i);
```

**Problem:**
- `.instruments` and `.guest-instruments` classes are assumed
- No evidence these exist in actual HTML
- Fallback regex is too broad (`([^.]+)` matches until first period)
- `parseInstruments()` function not shown - likely wrong parsing

**Test:** GuestStats.aspx?gid=15
**Expected:** Extract guest instruments properly
**Actual:** Unknown - CSS classes probably don't exist

**Fix - Need to investigate actual HTML:**
```typescript
// First test what's actually on the page
const guestPageHtml = await page.goto(url);
// Then inspect for instruments field
```

#### Issue #2: Guest List Starting Point Unknown ❌
**Severity:** MEDIUM
**Location:** Line 18
```typescript
await page.goto(`${BASE_URL}/GuestStats.aspx`, { waitUntil: "networkidle" });
```

**Problem:**
- `GuestStats.aspx` without parameters might not show full list
- Reference mentions `GuestList.aspx` (line 133)
- Code assumes index page at root endpoint

**Reference says:** Line 133-134
```
https://dmbalmanac.com/GuestList.aspx
```

**Fix:**
```typescript
await page.goto(`${BASE_URL}/GuestList.aspx`, { waitUntil: "networkidle" });
```

### Warnings

1. **parseInstruments() Utility Not Defined**
   - Called at lines 62, 68
   - Imported from utils/helpers.js
   - Parsing logic unknown - may be incorrect

2. **No Fallback for Missing Name**
   - Returns null if name not found (line 56)
   - Could skip valid guests with formatting variations

3. **Appearance Count Regex Broad**
   - Pattern `(\d+)\s+(?:appearances?\|shows?)` matches any count
   - Doesn't distinguish between show vs song appearances
   - Reference indicates different metrics exist

4. **No Song Appearances Data**
   - Reference shows guests appear on specific songs
   - Scraper only gets appearance count
   - Missing relationship data

---

## Comparison: Expected vs Actual HTML Selectors

### Reference Documentation (DMBALMANAC_HTML_STRUCTURE_REFERENCE.md)

| Page | Selector (Expected) | Actual in Code | Match |
|------|-------|---------|-------|
| Shows | `a[href*="TourShowSet.aspx"]` | ✅ Used | ✅ YES |
| Shows | Set headers: `tr td[colspan]` | ❌ Missing | ❌ NO |
| Shows | `.opener, .midset, .closer` | ✅ Used | ✅ YES |
| Songs | `a[href*="songs/summary.aspx"]` | ❌ Wrong URL | ❌ NO |
| Venue | `h1` for name | ❌ Not used | ❌ NO |
| Venue | `a[href*="VenueStats.aspx"]` | ✅ Used | ✅ YES |
| Guest | `h1` for name | ✅ Used | ✅ YES |
| Guest | `a[href*="GuestStats.aspx"]` | ✅ Used | ✅ YES |
| Song Stats | `.stat-table tr` | ⚠️ Assumed | ⚠️ PARTIAL |
| Show Stats | `table.stat-table` | ⚠️ Assumed | ⚠️ PARTIAL |

---

## Priority Fixes

### CRITICAL (Fix Immediately)

1. **songs.ts - Wrong Index Page**
   - Change `SongSearchResult.aspx` → `/songs/all-songs.aspx`
   - Change `SongStats.aspx` → `/songs/summary.aspx`
   - Impact: Scraper completely broken

2. **shows.ts - Venue Extraction**
   - Remove onclick-based filtering
   - Use semantic `a[href*='VenueStats.aspx']` selector
   - Impact: Venue data may be wrong or missing

3. **shows.ts - Location Parsing**
   - Add fallback for international venues
   - Fix regex to handle non-US locations
   - Impact: Shows outside US not parsed correctly

### HIGH PRIORITY (Fix Soon)

4. **venues.ts - Venue Name Extraction**
   - Use `h1` tag instead of line-based heuristics
   - Add fallback strategy
   - Impact: Venue names corrupted

5. **song-stats.ts - Slot Breakdown**
   - Count table rows by class instead of text matching
   - Impact: Slot statistics always zero

6. **guests.ts - Instruments Parsing**
   - Verify CSS class names on actual page
   - Or use different parsing strategy
   - Impact: Instruments data missing

### MEDIUM PRIORITY (Improve)

7. **song-stats.ts - Version Types & Release Counts**
   - These may require JavaScript execution or different page section
   - Consider if data actually exists in HTML

8. **shows.ts - Segue Indicators**
   - Add missing `→` and `->` patterns
   - Improve detection logic

9. **guests.ts - Starting Page URL**
   - Verify GuestList.aspx vs GuestStats.aspx
   - May need parameter

10. **venues.ts - International Locations**
    - Expand country detection beyond hardcoded list
    - Handle more formats

---

## Data Type Mismatches

| Scraper | Expected Type | Code Type | Issue |
|---------|---|---|---|
| shows.ts | `duration: string` | `string \| undefined` | Optional but shouldn't be |
| songs.ts | `totalPlays: number` | `number \| undefined` | Should default to 0 |
| venues.ts | `totalShows: number` | `number \| undefined` | Should be present |
| song-stats.ts | `slotBreakdown.opener: number` | `number` | OK but always 0 |
| guests.ts | `instruments: string[]` | `string[]` | OK but often empty |

---

## Testing Recommendations

### Before Production

1. **Test Against Multiple Shows**
   - 2024 show (modern format)
   - 1995 show (older format)
   - International show
   - Small venue show

2. **Test Against Edge Cases**
   - Song with no plays
   - Song with 500+ plays
   - Guest with 1 appearance
   - Guest with 50+ appearances
   - Venue with single show

3. **HTML Inspector Verification**
   - Use browser DevTools on live pages
   - Verify all CSS selectors actually exist
   - Check for class name variations

4. **Regex Pattern Testing**
   - Test date patterns with multiple formats
   - Test duration patterns with edge cases
   - Test location patterns with edge cases

### Unit Tests Needed

```typescript
describe('shows.ts selectors', () => {
  test('extracts venue from semantic anchor', () => {
    // Should use a[href*='VenueStats'], not onclick
  });

  test('handles international locations', () => {
    // Should parse "London, England" correctly
  });

  test('identifies segue indicators', () => {
    // Should handle ->, →, >>, etc.
  });
});

describe('songs.ts selectors', () => {
  test('uses correct song list URL', () => {
    // Should navigate to /songs/all-songs.aspx
  });

  test('follows redirects for SongStats', () => {
    // Should handle sid=1 → /songs/summary.aspx?sid=1
  });
});
```

---

## Recommendations

### Immediate Actions

1. Fix CRITICAL issues (3 issues affecting show/song scraping)
2. Run selectors against 5-10 live pages of each type
3. Add logging to identify which selectors fail
4. Create test fixture HTML files

### Short Term

1. Implement fallback selector chains
2. Add HTML structure inspection/logging
3. Create per-page validation tests
4. Document actual CSS classes found on each page type

### Long Term

1. Build comprehensive selector test suite
2. Add browser-based headless validation
3. Create monitoring for selector drift
4. Document all assumptions in code comments

---

## Appendix: Live Test Results

### Test 1: Song Stats Page (sid=1)
```
URL: https://dmbalmanac.com/songs/summary.aspx?sid=1
Classes Found: stat-col, stat-table, h1, opener, closer, midset
Selectors Working: h1 for title, .stat-col for stats sections
Selectors Broken: .lyrics, .guest-instruments (not present)
```

### Test 2: Show Page (2024-05)
```
URL: https://dmbalmanac.com/TourShowSet.aspx?id=453091046&tid=8176&where=2024
Classes Found: setheadercell, setcell, endcell, opener, closer, midset, encore
IDs Found: SetTable
Selectors Working: #SetTable, a.lightorange, tr.opener/closer/midset
Selectors Broken: Venue extraction via onclick (should use href)
```

### Test 3: Venue Page (vid=30048)
```
URL: https://dmbalmanac.com/VenueStats.aspx?vid=30048
Classes Found: (none semantic for venue name)
HTML Structure: No clear h1 for venue name
Selectors Broken: Text-based extraction unreliable
```

---

**Report Generated:** January 25, 2026
**Scraper Status:** 50% Functional - Critical Fixes Required
**Recommendation:** DO NOT USE IN PRODUCTION until critical issues resolved
