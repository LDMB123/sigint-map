---
name: scraper-agent
version: 1.0.0
description: **Quick access guide for DMBAlmanac scraper agent knowledge**
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: agent-architecture
complexity: intermediate
tags:
  - agent-architecture
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

# Migration metadata
migrated_from: SCRAPER_AGENT_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# Scraper Agent Quick Reference

**Quick access guide for DMBAlmanac scraper agent knowledge**

---

## Critical URLs (CORRECTED JAN 2026)

```
Songs List:     /songs/all-songs.aspx          (NOT SongSearchResult.aspx)
Song Stats:     /songs/summary.aspx?sid=X      (NOT SongStats.aspx)
Show Setlist:   /TourShowSet.aspx?id=X&tid=Y&where=YYYY
Venue Stats:    /VenueStats.aspx?vid=X
Guest Stats:    /GuestStats.aspx?gid=X
```

---

## Critical Selectors (VALIDATED)

### Venue Extraction
```typescript
// CORRECT (semantic)
const venueLink = $("a[href*='VenueStats.aspx']").first();

// WRONG (don't use)
const venueLink = $("a").filter(onclick.includes("VenueStats"));
```

### Location Parsing
```typescript
// US Format
/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/
// Result: city="Richmond", state="VA", country="USA"

// International Format
/([^,]+),\s*([A-Za-z\s]{2,})/
// Result: city="London", state="", country="England"
```

### Segue Indicators
```typescript
const seguePatterns = [/→/, /->/, />>/, /»/, /segues?\s+into/i];
```

### Slot Breakdown
```typescript
// CORRECT (count rows)
const openers = $("tr.opener, tr[class*='opener']").length;

// WRONG (text matching)
const openers = parseInt($(".opener").text());  // Returns 0
```

---

## CSS Classes Reference

### Statistics
```css
.stat-col1      /* 50% width stats column */
.stat-col2      /* 25% width stats column */
.stat-table     /* Statistics table container */
.stat-heading   /* Orange heading text */
```

### Set Positions
```css
.opener         /* Teal background - set opener */
.closer         /* Dark blue - set closer */
.midset         /* Dark gray - mid-set song */
.encore         /* Dark red - encore */
.encore2        /* Bright red - second encore */
.set1closer     /* Medium blue - end of set 1 */
.set2opener     /* Dark teal - start of set 2 */
```

---

## ID Extraction Patterns

```typescript
const idPatterns = {
  show:  /[?&]id=(\d+)/,
  song:  /[?&]sid=(\d+)/,
  venue: /[?&]vid=(\d+)/,
  guest: /[?&]gid=(\d+)/,
  tour:  /[?&]tid=(\d+)/,
  year:  /[?&](?:where|year)=(\d{4})/
};
```

---

## Date Parsing

### Site Formats
- Display: `MM.DD.YY` (e.g., `01.17.26`)
- Legacy: `M/D/YYYY` (e.g., `1/17/2026`)
- URLs: `year=2024` (full year)

### Parser
```typescript
function parseSiteDate(dateStr: string): string | null {
  // Dot format: 01.17.26 -> 2026-01-17
  const dotMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  if (dotMatch) {
    const [, month, day, year] = dotMatch;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month}-${day}`;
  }

  // Slash format: 1/17/2026 -> 2026-01-17
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}
```

---

## Fallback Strategy Pattern

```typescript
function extract($: CheerioAPI): string {
  // Strategy 1: Semantic selector
  let value = $('.semantic-class').text().trim();

  // Strategy 2: HTML element
  if (!value) value = $('h1').first().text().trim();

  // Strategy 3: Title tag
  if (!value) value = $('title').text().split('|')[0].trim();

  // Strategy 4: Regex on body text
  if (!value) {
    const match = $('body').text().match(/pattern/);
    value = match?.[1] || 'Unknown';
  }

  return value;
}
```

---

## Quick Testing Commands

### Browser Console
```javascript
// Test selectors
document.querySelectorAll('a[href*="SongStats.aspx"]').length
document.querySelectorAll('.stat-table tr').length
document.querySelectorAll('[class*="opener"]').length

// Test extraction
document.querySelector('a[href*="VenueStats.aspx"]')?.textContent
```

### Command Line
```bash
# Verify song list page
curl -sL "https://dmbalmanac.com/songs/all-songs.aspx" | grep -c "summary.aspx?sid="

# Check stat-table usage
curl -sL "https://dmbalmanac.com/songs/summary.aspx?sid=1" | grep -c 'class="stat-table"'

# Verify venue link
curl -sL "https://dmbalmanac.com/TourShowSet.aspx?id=453091046" | \
  grep -o 'VenueStats.aspx[^"]*' | head -1
```

---

## Band Member Filter

```typescript
const BAND_MEMBER_GIDS = ["1", "2", "94", "75", "104", "3"];

// Filter guests
const guestLinks = $("a[href*='GuestStats.aspx']").filter((i, el) => {
  const gid = $(el).attr('href')?.match(/gid=([^&]+)/)?.[1];
  return gid && !BAND_MEMBER_GIDS.includes(gid);
});
```

---

## Reference Documents

1. **HTML Structure**: `/projects/dmb-almanac/docs/scraping/DMBALMANAC_HTML_STRUCTURE_REFERENCE.md`
2. **Selector Fixes**: `/SELECTOR_REMEDIATION_GUIDE.md`
3. **Validation Report**: `/SELECTOR_VALIDATION_REPORT.md`

---

## Common Pitfalls to Avoid

1. Using `SongSearchResult.aspx` for song list
2. Using `onclick` attributes instead of `href`
3. Only supporting US location format
4. Missing segue patterns (`->`, `→`)
5. Text matching for slot counts instead of row counting
6. Not handling date format variations
7. Assuming CSS classes exist without validation
8. Not implementing fallback strategies

---

**Last Updated**: January 25, 2026
**Validation Status**: All selectors validated against live site
