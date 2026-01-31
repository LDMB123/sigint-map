---
name: dmb-almanac-dmbalmanac-html-structure
description: "HTML structure analysis of dmbalmanac.com for scraping"
recommended_tier: sonnet
category: scraping
complexity: advanced
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
migrated_from: projects/dmb-almanac/docs/projects/dmb-almanac/DMBALMANAC_HTML_STRUCTURE_REFERENCE.md
migration_date: 2026-01-25
---

# DMBAlmanac.com HTML Structure Reference

**Version:** 2.0
**Last Updated:** January 25, 2026
**Purpose:** Comprehensive selector guide for scraper agents

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

## Table of Contents

1. [Site Overview](#site-overview)
2. [Global CSS Classes](#global-css-classes)
3. [URL Patterns](#url-patterns)
4. [Page Structures](#page-structures)
   - [Show Setlist Page](#show-setlist-page)
   - [Song Stats Page](#song-stats-page)
   - [Venue Stats Page](#venue-stats-page)
   - [Guest Stats Page](#guest-stats-page)
   - [Tour Listing Page](#tour-listing-page)
   - [Song List Page](#song-list-page)
5. [Common Selectors](#common-selectors)
6. [Data Extraction Patterns](#data-extraction-patterns)
7. [JavaScript Rendered Content](#javascript-rendered-content)
8. [Fallback Strategies](#fallback-strategies)
9. [Known Quirks](#known-quirks)

---

## Site Overview

DMBAlmanac.com is an ASP.NET WebForms application using:
- **Server-side rendering**: Most content is pre-rendered HTML
- **Table-based layouts**: Many pages use `<table>` for structure
- **Minimal CSS classes**: Limited semantic class naming
- **Query string navigation**: URLs use parameters like `id`, `sid`, `vid`, `gid`, `tid`
- ... (see documentation for complete list)

### Key Characteristics
- **Date format on site**: `MM.DD.YY` (e.g., `01.17.26`)
- **Date format for parsing**: Convert to ISO `YYYY-MM-DD`
- **No pagination**: Most lists load completely
- **Static content**: JavaScript primarily for modals/charts, not data loading
- ... (see documentation for complete list)

---

## Global CSS Classes

These classes appear across multiple page types:

### Layout Classes
```css
.findmenucell {
  padding: 4px 20px 2px 20px;
}
```

### Statistics Display Classes
```css
.stat-col1 { width: 50%; margin: 5px 5px 5px 0; float: left; }
.stat-col2 { width: 25%; margin: 5px; float: left; }
.stat-heading { margin: 0 0 6px 0; color: #FFC449; font-size: 18px; font-weight: bold; }
.stat-table { width: 100%; margin-bottom: 10px; }
```

### Set Position Color Classes
```css
.opener { background-color: #006666; }      /* Teal - Set opener */
.closer { background-color: #214263; }      /* Dark blue - Set closer */
.set1closer { background-color: #336699; }  /* Medium blue */
.set2opener { background-color: #004040; }  /* Dark teal */
.midset { background-color: #2E2E2E; }      /* Dark gray - Mid-set song */
.encore { background-color: #660000; }      /* Dark red - Encore */
.encore2 { background-color: #CC0000; }     /* Bright red - Encore 2 */
```

### Highlight Classes
```css
.mycell {
  font-weight: bold;
  color: #102142;
  background-color: #FFD34B;
  text-align: center;
}

.span-left { border-right: none; }
.bold { font-weight: bold; }
.guestrow { /* padding and font sizing for guest entries */ }
.ic, .sc { /* cell styling for date/slot columns */ }
```

---

## URL Patterns

### Parameter Reference

| Entity | Parameter | Example URL |
|--------|-----------|-------------|
| Show | `id` | `TourShowSet.aspx?id=453532912` |
| Song | `sid` | `SongStats.aspx?sid=1` |
| Venue | `vid` | `VenueStats.aspx?vid=100` |
| Guest | `gid` | `GuestStats.aspx?gid=15` |
| ... | ... | ... |

### Full URL Templates

```
# Show pages
https://dmbalmanac.com/TourShowSet.aspx?id={showId}&tid={tourId}&where={year}
https://dmbalmanac.com/ShowSetlist.aspx?id={showId}

# Song pages
https://dmbalmanac.com/SongStats.aspx?sid={songId}
https://dmbalmanac.com/songs/summary.aspx?sid={songId}
https://dmbalmanac.com/TourSongShows.aspx?sid={songId}&tid={tourId}&where={year}

# Venue pages
https://dmbalmanac.com/VenueStats.aspx?vid={venueId}

# Guest pages
https://dmbalmanac.com/GuestStats.aspx?gid={guestId}
https://dmbalmanac.com/GuestStats.aspx?gid={guestId}&sid={songId}

# Tour pages
https://dmbalmanac.com/TourShowsByYear.aspx?year={year}
https://dmbalmanac.com/TourShow.aspx?where={year}
https://dmbalmanac.com/TourShowInfo.aspx?tid={tourId}&where={year}

# List pages
https://dmbalmanac.com/songs/all-songs.aspx
https://dmbalmanac.com/VenueList.aspx
https://dmbalmanac.com/GuestList.aspx
```

---

## Page Structures

### Show Setlist Page

**URLs:**
- `TourShowSet.aspx?id={id}&tid={tid}&where={year}`
- `ShowSetlist.aspx?id={id}`

#### Header Section

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Venue Link | `a[href*="VenueStats.aspx"]` | Text containing venue pattern |
| Venue ID | Extract from href: `/vid=(\d+)/` | - |
| Location | Text after venue link | Adjacent `<td>` content |
| Date | Header text or URL parameter | `where` param parsing |
| ... | ... | ... |

#### Setlist Table

The setlist uses a table-based structure:

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Set Headers | `tr td[colspan]` containing "Set" | Text matching `/Set \d|Encore/` |
| Song Rows | `tr.opener, tr.midset, tr.closer, tr.encore, tr.encore2` | `tr` with song links |
| Song Link | `a[href*="TourSongShows.aspx"]` | `a[href*="sid="]` |
| Song Title | Song link `.text()` | - |
| ... | ... | ... |

#### Set Position Classes
Use the row class to determine song position in set:
- `.opener` - First song in set
- `.midset` - Middle of set
- `.closer`, `.set1closer` - Last song in set
- `.set2opener` - First song in Set 2
- ... (see documentation for complete list)

---

### Song Stats Page

**URLs:**
- `SongStats.aspx?sid={songId}`
- `songs/summary.aspx?sid={songId}`

#### Statistics Panel

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector | Pattern |
|------|-----------------|---------|
| Play Count | `.stat-col1` text | `/(\d+)\s*Known Plays/` |
| Gap Days | `.stat-col2` text | `/(\d+)\s*Days Since/` |
| Last Played | `.stat-col2` text | `/\((\d{2}\.\d{2}\.\d{2})\)/` |
| Total Time | Text matching | `/(\d+:\d{2}:\d{2})\s*total/` |
| ... | ... | ... |

#### Performance History Table

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| History Rows | `.stat-table tr` (skip header) | `table tr` with show links |
| Duration | First `td` text | `/\d+:\d{2}/` pattern |
| Show Link | `a[href*="TourShowSet.aspx"]` | `a[href*="id="]` |
| Show ID | Extract from href: `/id=(\d+)/` | - |
| ... | ... | ... |

#### Chart Containers

```
// See full implementation in related skills
```

JavaScript initialization:
```
// See full implementation in related skills
```

---

### Venue Stats Page

**URL:** `VenueStats.aspx?vid={venueId}`

#### Venue Header

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Venue Name | `h1` | First heading element |
| Location | `p` after `h1` | Text below venue name |

#### Venue Statistics

```
// See full implementation in related skills
```

**Selectors:**
| Data | Pattern |
|------|---------|
| Total Shows | `/Total Shows?:\s*(\d+)/i` |
| First Show | `/First Show?:\s*(\d{2}\/\d{2}\/\d{4})/i` |
| Last Show | `/Last Show?:\s*(\d{2}\/\d{2}\/\d{4})/i` |

#### Show History Table

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Show Links | `a[href*="TourShowSet.aspx"]` | `a[href*="id="]` |
| Show ID | Extract from href: `/id=(\d+)/` | - |
| Date | Link text | `/\d{2}\.\d{2}\.\d{2}/` pattern |

---

### Guest Stats Page

**URL:** `GuestStats.aspx?gid={guestId}`

#### Guest Header

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Guest Name | `h1` |
| Instruments | `p` text, often in quotes |

#### Statistics Summary

```
// See full implementation in related skills
```

**Selectors:**
| Data | Pattern |
|------|---------|
| Show Count | `/Show Appearances?:\s*(\d+)/i` |
| Distinct Songs | `/Distinct Song.*?:\s*(\d+)/i` |
| Total Songs | `/Total Song.*?:\s*(\d+)/i` |

#### Song Appearances Table

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Song Links | `a[href*="GuestStats.aspx"][href*="sid="]` |
| Song ID | Extract from href: `/sid=(\d+)/` |
| Play Count | Text in parentheses: `/\((\d+)\)/` |

#### Appearance History by Year

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Year Headers | `h3` containing year |
| Show Links | `a[href*="TourShowSet.aspx"]` within year section |
| Date | Link text in `M.DD` format |

---

### Tour Listing Page

**URL:** `TourShowsByYear.aspx?year={year}`

#### Show List Structure

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector | Notes |
|------|-----------------|-------|
| Show Links | `a[href*="TourShowSet.aspx"]` | Contains date |
| Show ID | Extract: `/id=(\d+)/` | From href |
| Tour ID | Extract: `/tid=(\d+)/` | From href |
| Date | Show link text | Format: `MM.DD.YY` |
| ... | ... | ... |

#### Tour Navigation

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Year Links | `a[href*="TourShow.aspx?where="]` |
| Year Value | Extract: `/where=(\d{4})/` |

#### Tour Statistics Summary

```
// See full implementation in related skills
```

**Patterns:**
| Data | Regex Pattern |
|------|---------------|
| Show Count | `/# Shows\s*=\s*(\d+)/` |
| Performances | `/# Song Performances\s*=\s*([\d,]+)/` |
| Average Songs | `/Average.*?=\s*([\d.]+)/` |
| Different Songs | `/Different Songs.*?=\s*(\d+)/` |
| ... | ... | ... |

---

### Song List Page

**URL:** `songs/all-songs.aspx`

#### Song Entries

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Song Links | `a[href*="songs/summary.aspx"]` |
| Song ID | Extract: `/sid=(\d+)/` |
| Song Title | Link text |

#### Category Sections

```
// See full implementation in related skills
```

#### Song Dropdown Filter

```
// See full implementation in related skills
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Dropdown | `select[name*="SongNav"]` |
| Options | `select option[value]` |
| Song ID | Option `value` attribute |

---

## Common Selectors

### Universal Link Extractors

```
// See full implementation in related skills
```

### ID Extraction Regex

```
// See full implementation in related skills
```

### Date Parsing

```
// See full implementation in related skills
```

### Duration Parsing

```
// See full implementation in related skills
```

---

## Data Extraction Patterns

### Show Setlist Extraction

```
// See full implementation in related skills
```

### Song Statistics Extraction

```
// See full implementation in related skills
```

---

## JavaScript Rendered Content

### Chart Containers (Handled by JS)

The following elements are populated via JavaScript and contain chart data:

```
// See full implementation in related skills
```

**Note:** These charts are rendered client-side. Data is passed via JavaScript:

```
// See full implementation in related skills
```

**Scraping Strategy:**
1. Wait for `networkidle` to ensure charts load
2. Or extract data from embedded JSON in page scripts
3. Charts are supplementary; core data is in HTML tables

### Info Button Popups

```
// See full implementation in related skills
```

**Note:** These trigger modal popups. Data may be fetched via AJAX or already in page.

---

## Fallback Strategies

### Strategy 1: Multi-Selector Cascade

```
// See full implementation in related skills
```

### Strategy 2: Context-Aware Extraction

```
// See full implementation in related skills
```

### Strategy 3: Robust Row Parsing

```
// See full implementation in related skills
```

---

## Known Quirks

### 1. Date Format Variations
- Standard: `MM.DD.YY` (01.17.26)
- Alternative: `M/D/YYYY` (1/17/2026)
- In URLs: `year=2024` (full year)

### 2. Missing Data Patterns
- Early shows (pre-1992) may lack duration data
- Some venues have unknown IDs
- Guest information may be incomplete for older shows

### 3. URL Encoding Issues
- Some venue names with special characters may have encoded URLs
- Apostrophes in song titles may appear as `&#39;` or `'`

### 4. Table Structure Variations
- Some pages use `<table class="stat-table">`, others use plain `<table>`
- Row classes (`.opener`, `.midset`) not always present
- Some setlists lack set break indicators

### 5. Pagination Absence
- Most lists load completely (no pagination)
- Very long lists may have performance issues
- Liberation list, rarity index are single-page

### 6. Image-Based Info
- Some icons (like `/images/showinfo.gif`) trigger JavaScript
- Info popups may contain additional data not in main HTML

### 7. Session-Dependent Content
- Some statistics may vary based on current tour
- "X days since" calculations are relative to today

---

## Testing Selectors

### Verification Checklist

Before using selectors in production, verify:

```
// See full implementation in related skills
```

### Browser Console Testing

```
// See full implementation in related skills
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-25 | 2.0 | Complete rewrite with detailed selectors |
| 2026-01-23 | 1.0 | Initial structure documentation |

---

## Related Documents

- `/docs/projects/dmb-almanac/missing-scrapers-specification.md` - Gap analysis
- `/docs/quick-references/scraper-quick-reference.md` - Quick reference
- `/.claude/skills/projects/dmb-almanac/playwright-scraper-architecture.md` - Architecture
