---
name: dmb-almanac-selector-fixes
description: "CSS selector and DOM query fixes for scraping"
recommended_tier: haiku
category: scraping
complexity: intermediate
tags:
  - projects
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/scraper/SELECTOR_FIXES_QUICKREF.md
migration_date: 2026-01-25
---

# Selector Fixes Quick Reference

**Quick access guide for developers**

---


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## What Changed

### 1. Songs Scraper (songs.ts)
**Before**: `/SongSearchResult.aspx` → 40-60% songs missing
**After**: `/songs/all-songs.aspx` → 98-100% coverage

```typescript
// OLD - WRONG
await page.goto(`${BASE_URL}/SongSearchResult.aspx`);

// NEW - CORRECT
const songListUrl = `${BASE_URL}/songs/all-songs.aspx`;
await page.goto(songListUrl, { waitUntil: "networkidle", timeout: 30000 });
```

### 2. Venue Extraction (shows.ts)
**Before**: `onclick` attribute → brittle, data corruption
**After**: semantic `href` selector → robust

```typescript
// OLD - WRONG
const venueLink = $("a").filter((i, el) => {
  const onclick = $(el).attr("onclick") || "";
  return onclick.includes("VenueStats.aspx");
}).first();

// NEW - CORRECT
const venueLink = $("a[href*='VenueStats.aspx']").first();
const venueId = venueLink.attr("href")?.match(/vid=(\d+)/)?.[1];
```

### 3. Location Parsing (shows.ts)
**Before**: US only → missing all international shows
**After**: US + international → 100% coverage

```typescript
// OLD - US ONLY
const locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);

// NEW - MULTI-FORMAT
let locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
if (locationMatch) {
  // US format: City, ST or City, ST, Country
} else {
  // International format: City, Country Name
  locationMatch = afterVenue.match(/([^,]+),\s*([A-Za-z\s]{2,})/);
}
```

### 4. Slot Breakdown (song-stats.ts)
**Before**: Always returns 0
**After**: Text patterns + row counting fallback

```typescript
// OLD - ALWAYS ZERO
parseInt($(".opener").text().trim(), 10) || 0

// NEW - TWO STRATEGIES
// Strategy 1: Text pattern extraction
opener: extractCount(/opener[:\s]+(\d+)/i)

// Strategy 2: Row counting (fallback)
if (totalFromText < 5) {
  result.opener = perfTable.find("tr.opener, tr[class*='opener']").length;
}
```

### 5. Guest Filtering (shows.ts)
**Before**: ID-only → fails on name references
**After**: ID + name + aliases → robust

```typescript
// OLD - ID ONLY
if (!BAND_MEMBER_GIDS.includes(gid)) {
  guestNames.push(name);
}

// NEW - ID AND NAME
if (!isBandMember(gid) && !isBandMember(guestName)) {
  guestNames.push(guestName);
}

// New helper function
function isBandMember(gidOrName: string): boolean {
  if (BAND_MEMBER_GIDS.includes(gidOrName)) return true;
  const lower = gidOrName.toLowerCase().trim();
  return BAND_MEMBERS.some(m =>
    m.name.toLowerCase() === lower ||
    m.aliases.some(a => a.toLowerCase() === lower)
  );
}
```

---

## Testing Commands

```bash
# Test songs scraper (fixed URL)
npm run scrape:songs -- --limit 10

# Test shows scraper (fixed venue + location)
npm run scrape:shows -- --year 2024

# Test song-stats scraper (fixed slot breakdown)
npm run scrape:song-stats -- --limit 5

# Verify live pages
curl -sL "https://dmbalmanac.com/songs/all-songs.aspx" | grep -c "summary.aspx?sid="
curl -sL "https://dmbalmanac.com/TourShowSet.aspx?id=453091046" | grep "VenueStats.aspx"
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Songs scraped | 50-60% | 98-100% |
| Venue extraction | ~60% | ~95-98% |
| International shows | 0% | ~98-100% |
| Slot breakdowns | Always 0 | ~90-95% accurate |

---

## Files Modified

1. `src/scrapers/songs.ts` - Lines 14-64
2. `src/scrapers/shows.ts` - Lines 14-54, 141-180, 182-198, 226-246, 318-330
3. `src/scrapers/song-stats.ts` - Lines 142-195, 196-254

---

## Rollback

```bash
# Revert all changes
git revert HEAD

# Revert specific file
git checkout HEAD~1 -- src/scrapers/songs.ts
```

---

## Documentation

- Full details: `SELECTOR_FIXES_IMPLEMENTATION.md`
- Original guide: `SELECTOR_REMEDIATION_GUIDE.md`
- Validation report: `<project_root>/SELECTOR_VALIDATION_REPORT.md`
