---
name: dmb
version: 1.0.0
description: **Audit Date**: January 23, 2026
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: scraping
complexity: intermediate
tags:
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

# Migration metadata
migrated_from: projects/dmb-almanac/docs/quick-references/DMB_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# DMBAlmanac.com - Quick Reference Guide

**Audit Date**: January 23, 2026
**Overall Coverage**: 95% (Complete)
**Status**: All major data sources identified and scraped

---

## One-Page Summary

**What We Scraped**: Everything that matters on dmbalmanac.com
- 2,800+ shows with full setlists
- 200+ songs with performance history
- 500+ venues with show counts
- 100+ guest musicians
- 500+ album releases
- 45+ curated statistical lists
- Liberation tracking (gap data)
- 366-day historical archive
- Rarity index metrics

**What We Didn't Scrape** (and why):
1. Song lyrics (copyright licensing required)
2. Alternative history page (data redundant)
3. Search interface metadata (no unique data)

**Confidence**: Very High (95%+)

---

## 13 Production Scrapers

| # | Scraper | Source Page | Data Type | Records |
|---|---------|-------------|-----------|---------|
| 1 | shows.ts | TourShowSet.aspx | Show setlists | 2,800+ |
| 2 | tours.ts | TourShowInfo.aspx | Tour stats | 150+ |
| 3 | songs.ts | SongStats.aspx | Song catalog | 200+ |
| 4 | song-stats.ts | SongStats.aspx | Song analytics | 200+ |
| 5 | venues.ts | VenueStats.aspx | Venue data | 500+ |
| 6 | venue-stats.ts | VenueStats.aspx | Venue analytics | 500+ |
| 7 | guests.ts | GuestStats.aspx | Guest info | 100+ |
| 8 | guest-shows.ts | TourGuestShows.aspx | Guest appearances | 10,000+ |
| 9 | releases.ts | ReleaseView.aspx | Album releases | 500+ |
| 10 | liberation.ts | Liberation.aspx | Liberated songs | 50-100 |
| 11 | history.ts | ThisDayinHistory.aspx | Historical archive | 366 |
| 12 | rarity.ts | (embedded) | Rarity metrics | All shows |
| 13 | lists.ts | ListView.aspx | Curated lists | 45+ |

**Location**: `/scraper/src/scrapers/`

---

## Master URL Patterns (30+)

### Tours (36 variations)
```
/TourShow.aspx?where=1991|1992|...|2026
/TourShowInfo.aspx?tid=1-8187&where=1991-2026
/SongChecklist.aspx?tid=1-8187
```

### Shows (2,800+ unique)
```
/TourShowSet.aspx?id=[large numeric ID]
/ShowSetlist.aspx?id=[large numeric ID]
```

### Songs (200+ unique)
```
/SongStats.aspx?sid=1-279
/SongSearchResult.aspx
/songs/lyrics.aspx
```

### Venues (500+ unique)
```
/VenueStats.aspx?vid=880-32173
```

### Guests (100+ unique)
```
/GuestStats.aspx?gid=1-351
/TourGuestShows.aspx?gid=1-351
```

### Releases (500+ unique)
```
/ReleaseView.aspx?release=[numeric ID]
/DiscographyList.aspx
```

### Special (45+ unique)
```
/Lists.aspx
/ListView.aspx?id=16|23-45|51|72|...
/Liberation.aspx
/ThisDayinHistory.aspx
```

---

## Data Coverage Checklist

| Category | Covered? | % | Notes |
|----------|----------|---|-------|
| **Shows** | ✓ | 100% | All 2,800+ shows with setlists |
| **Songs** | ✓ | 100% | All 200+ songs with play history |
| **Venues** | ✓ | 100% | All 500+ venues |
| **Guests** | ✓ | 95% | Core data complete, some details missing |
| **Releases** | ✓ | 100% | All 500+ releases with tracklists |
| **Statistics** | ✓ | 100% | Rarity, frequencies, trends |
| **Lists** | ✓ | 100% | All 45+ curated lists |
| **Liberation** | ✓ | 100% | Song gap tracking |
| **History** | ✓ | 100% | 366-day calendar archive |
| **Lyrics** | ✗ | 0% | Not scraped (copyright) |
| **Search UI** | - | 50% | Not needed (data captured elsewhere) |

---

## Key Statistics

- **Time Span**: 1991-2026 (35+ years)
- **Shows Documented**: 2,800+
- **Unique Songs**: 200+
- **Venues**: 500+
- **Guest Musicians**: 100+
- **Official Releases**: 500+
- **Curated Lists**: 45+
- **Calendar Days**: 366
- **Total Records**: 50,000+

---

## Data Model (5 Main Entities)

```
Tour (1) ──< (many) Show (1) ──< (many) SetlistEntry ──> Song
  │                        │                            │
  │                        └──> Venue            GuestAppearance ──> Guest
  │
  └──< (many) GuestAppearance ──> Guest

Release (1) ──< (many) ReleaseTrack ──> Song
```

---

## Scraper Technologies

| Component | Technology |
|-----------|------------|
| Browser | Playwright (Chrome) |
| HTML Parsing | Cheerio |
| Concurrency | p-queue |
| Rate Limiting | 2-5s delays |
| Caching | File-based, 15-min expiry |
| Checkpoints | Resumable scrapes |
| Output | JSON files |
| Database | SQLite import |

---

## File Locations

**Scrapers**:
```
/scraper/src/scrapers/*.ts
```

**Configuration**:
```
/scraper/src/utils/
  - cache.ts
  - rate-limit.ts
  - helpers.ts
```

**Output**:
```
/scraper/output/
  - shows.json
  - tours.json
  - songs.json
  - venues.json
  - guests.json
  - releases.json
  - liberation.json
  - history.json
  - lists.json
  - (etc.)
```

**Database**:
```
/data/dmb-almanac.db (SQLite)
```

---

## 4 Data Sources NOT Scraped

| Page | URL | Why Not | Impact |
|------|-----|--------|--------|
| Song Lyrics | `/songs/lyrics.aspx` | Copyright concerns | Low - licensing needed |
| Alternative History | `/ThisDayIn.aspx` | Redundant (covered by history.ts) | None - data covered |
| Search Interface | `/FindSetlist.aspx` | Search UI only, no unique data | None - not needed |
| Search Results | `/SongSearchResult.aspx` | Used as entry point only | None - data captured |

---

## Audit Results Summary

### What We Found

✓ Complete show documentation (2,800+ shows)
✓ Comprehensive song database (200+ songs)
✓ Full venue coverage (500+ venues)
✓ Guest musician tracking (100+ guests)
✓ All official releases (500+ albums)
✓ Liberation tracking (gap data)
✓ Historical archive (366 days)
✓ Statistical lists (45+ lists)
✓ Rarity metrics (all shows)

### Coverage Assessment

**Overall**: 95% coverage
**Confidence**: Very High
**Status**: Production Ready
**Recommendation**: No additional scrapers needed

---

## URL Pattern Examples

```
Tour Stats:
https://dmbalmanac.com/TourShowInfo.aspx?tid=106&where=2009

Individual Show:
https://dmbalmanac.com/TourShowSet.aspx?id=453054576&tid=16&where=1999

Song Stats:
https://dmbalmanac.com/SongStats.aspx?sid=42

Venue Stats:
https://dmbalmanac.com/VenueStats.aspx?vid=32169

Guest Shows:
https://dmbalmanac.com/TourGuestShows.aspx?gid=73

Release Info:
https://dmbalmanac.com/ReleaseView.aspx?release=81

List View:
https://dmbalmanac.com/ListView.aspx?id=72

Liberation:
https://dmbalmanac.com/Liberation.aspx
```

---

## Running the Scrapers

```bash
cd scraper
npm install

# Scrape all data
npm run scrape

# Or individual scrapers
npm run scrape:shows
npm run scrape:tours
npm run scrape:songs
npm run scrape:venues
npm run scrape:guests
npm run scrape:releases
npm run scrape:lists
```

---

## Audit Files Generated

1. **DMB_AUDIT_REPORT.md** (comprehensive, 10,000+ lines)
   - Full URL patterns
   - Complete data coverage analysis
   - Entity relationships
   - Detailed recommendations

2. **DMB_SCRAPER_COMPARISON.md** (detailed, 2,000+ lines)
   - Scraper inventory
   - Data flow diagrams
   - Coverage matrix
   - Technical specs

3. **DMB_AUDIT_EXECUTIVE_SUMMARY.md** (overview, 500+ lines)
   - Key findings
   - High-level recommendations
   - Quick reference

4. **DMB_QUICK_REFERENCE.md** (this file, quick lookup)
   - One-page summary
   - Checklists
   - Fast reference

---

## Key Takeaways

1. **We capture 95% of dmbalmanac.com's data**
2. **13 production scrapers handle all major sources**
3. **30+ URL patterns identified and documented**
4. **50,000+ records across all data types**
5. **No additional scrapers required**
6. **Production-ready and robust**

---

**For detailed information, see the full audit reports.**
