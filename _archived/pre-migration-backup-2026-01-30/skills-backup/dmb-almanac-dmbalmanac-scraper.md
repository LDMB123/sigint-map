---
name: dmb-almanac-dmbalmanac-scraper
description: "Web scraper for dmbalmanac.com concert and setlist data"
recommended_tier: sonnet
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
migrated_from: projects/dmb-almanac/app/docs/archive/misc/DMBALMANAC_SCRAPER_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# DMBAlmanac Data Scraping - Quick Reference Guide

**Quick Links**: [Main Research](#dmbalmanac-data-sources-research-report) | [Technical Specs](#missing-scrapers-technical-specification) | [This Guide](#quick-reference)

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

## Data Coverage Summary

### Current Scrapers (5)
| Scraper | Data | Tables | Status | Lines |
|---------|------|--------|--------|-------|
| Shows | Tour listings, dates, venues | shows, venues, tours | ✅ Active | ~450 |
| Setlists | Song sequences, slots, segues | setlist_entries, songs | ✅ Active | ~600 |
| Guests | Guest musicians, instruments | guests, guest_appearances | ✅ Active | ~700 |
| Releases | Albums, tracks, dates | releases, release_tracks | ✅ Active | ~500 |
| Almanac IDs | ID mapping | shows.almanac_id | ✅ Active | ~200 |

### Missing High-Priority Scrapers (5)
| Scraper | Data | Tables | Priority | Est. Time |
|---------|------|--------|----------|-----------|
| Song Stats | Play counts, dates, gaps | songs (enhance), liberation_list | 🔴 P1 | 4-6h |
| Liberation | Song gaps since played | liberation_list | 🔴 P1 | 2-3h |
| Venue Stats | Venue history, plays | venues (enhance) | 🔴 P1 | 3-4h |
| Curated Lists | Themed song/venue lists | curated_lists, curated_list_items | 🟡 P2 | 4-5h |
| Tour Stats | Tour-level aggregates | tours (enhance) | 🟡 P2 | 2-3h |

---

## By Data Category

### Songs
**Current Coverage**:
- ✅ Title, slug, basic attributes (from setlists/releases)
- ✅ Relationships to releases and setlist entries

**Missing Coverage**:
- ❌ Play count (`times_played`)
- ❌ First/last play dates (`first_played`, `last_played`)
- ❌ Slot statistics (opener/closer counts)
- ❌ Lyrics
- ❌ Gap tracking (from liberation list)
- ❌ Song composition details (composer, year)

**Scrapers Needed**: Song Statistics, Lyrics (optional)

---

### Venues
**Current Coverage**:
- ✅ Name, city, state, country (from shows)
- ✅ Relationships to shows

**Missing Coverage**:
- ❌ Total shows (`total_shows`)
- ❌ First/last show dates
- ❌ Venue type
- ❌ Capacity
- ❌ Most played songs at venue
- ❌ Official live releases

**Scrapers Needed**: Venue Statistics

---

### Guests
**Current Coverage**:
- ✅ Name, instruments (from setlist pages)
- ✅ Appearances and show relationships
- ✅ Total appearance count

**Missing Coverage**:
- Mostly complete via current scraper
- Minor: Could add guest statistics pages for biography

**Scrapers Needed**: None (complete)

---

### Releases
**Current Coverage**:
- ✅ Title, type, date, catalog number
- ✅ Track listings with durations
- ✅ Cover art
- ✅ Complete categorization

**Missing Coverage**:
- None - releases are fully scraped

**Scrapers Needed**: None (complete)

---

### Shows & Setlists
**Current Coverage**:
- ✅ Show dates, venues, tours
- ✅ Complete setlist entries
- ✅ Segues and teases
- ✅ Guest appearances per song

**Missing Coverage**:
- Minor enhancements from tour stats (tour-level aggregate)

**Scrapers Needed**: Tour Statistics (enhancement only)

---

### Curated Content
**Current Coverage**:
- ❌ No curated lists

**Missing Coverage**:
- ❌ All curated lists

**Scrapers Needed**: Curated Lists

---

## URL Cheat Sheet

### Individual Records
```
Song Stats:      https://dmbalmanac.com/SongStats.aspx?sid=42
Venue Stats:     https://dmbalmanac.com/VenueStats.aspx?vid=100
Guest Stats:     https://dmbalmanac.com/GuestStats.aspx?gid=15
Tour Stats:      https://dmbalmanac.com/TourStats.aspx?tid=5
Show Setlist:    https://dmbalmanac.com/TourShowSet.aspx?id=ALMANAC_ID
Release View:    https://dmbalmanac.com/ReleaseView.aspx?release=2
```

### List Pages
```
Song List:       https://dmbalmanac.com/SongList.aspx
Venue List:      https://dmbalmanac.com/VenueList.aspx
Guest List:      https://dmbalmanac.com/GuestList.aspx
Releases:        https://dmbalmanac.com/Releases.aspx
Curated Lists:   https://dmbalmanac.com/Lists.aspx
Tours by Year:   https://dmbalmanac.com/TourShowsByYear.aspx?year=2024
```

### Tour/Show Pages
```
Tour Show:       https://dmbalmanac.com/TourShow.aspx?where=2024
```

---

## Database Schema (Relevant Fields)

### Songs Table
```sql
-- Current fields
id, title, slug, original_artist, is_cover, is_original, lyrics,
created_at, updated_at

-- Missing fields (from Song Stats scraper)
first_played, last_played, times_played,
opener_count, closer_count, encore_count, avg_gap_days
```

### Venues Table
```sql
-- Current fields
id, name, slug, city, state, country, country_code,
venue_type, capacity, latitude, longitude, created_at, updated_at

-- Already has
total_shows, first_show_date, last_show_date

-- Could enhance
venueType, capacity (may be incomplete)
```

### Tours Table
```sql
-- Current fields
id, name, slug, year, start_date, end_date, total_shows,
unique_songs, created_at, updated_at

-- Already mostly complete - could add details
```

### New Table: liberation_list
```sql
-- Already in schema, needs data
id, song_id, last_played, last_show_id, days_since, shows_since,
configuration, is_liberated, liberated_date, updated_at
```

### New Tables: curated_lists & curated_list_items
```sql
-- Already in schema, needs data
curated_lists:
  id, title, slug, category, description, item_count,
  created_at, updated_at

curated_list_items:
  id, list_id, position, item_type, item_id, item_title,
  notes, metadata, created_at
```

---

## Implementation Priority Matrix

```
┌─────────────────────────────────────────────────┐
│           High Impact / Low Effort              │
│  ✅ Song Statistics (P1)                        │
│  ✅ Liberation List (P1)                        │
│  ✅ Venue Statistics (P1)                       │
├─────────────────────────────────────────────────┤
│          Medium Impact / Medium Effort          │
│  🟡 Curated Lists (P2)                          │
│  🟡 Tour Statistics (P2)                        │
├─────────────────────────────────────────────────┤
│            Low Impact / Low Effort              │
│  🟢 List Summary Pages (P3)                     │
│  🟢 Song Lyrics (P3)                            │
├─────────────────────────────────────────────────┤
│         Medium Impact / High Effort             │
│                    (none)                       │
└─────────────────────────────────────────────────┘
```

---

## Data Scraping Workflow

### Phase 1: Essential Data (Do First)
```
1. Song Statistics Scraper
   ├─ Query all songs from database
   ├─ For each song: fetch SongStats.aspx?sid=X
   ├─ Parse: play counts, dates, gaps
   ├─ Update: songs table with stats
   └─ Duration: ~45 minutes

2. Liberation List Scraper
   ├─ Fetch Liberation list page
   ├─ Parse: songs with gap data
   ├─ Upsert: liberation_list table
   └─ Duration: < 10 minutes

3. Venue Statistics Scraper
   ├─ Query all venues from database
   ├─ For each venue: fetch VenueStats.aspx?vid=X
   ├─ Parse: first/last shows, song counts
   ├─ Update: venues table with stats
   └─ Duration: ~10 minutes
```

### Phase 2: Enrichment Data (Do Second)
```
4. Curated Lists Scraper
   ├─ Fetch Lists.aspx
   ├─ For each list: parse items
   ├─ Upsert: curated_lists and items
   └─ Duration: ~15 minutes

5. Tour Statistics Scraper
   ├─ Query all tours from database
   ├─ For each tour: fetch TourStats.aspx?tid=X
   ├─ Parse: tour-level stats
   ├─ Update: tours table
   └─ Duration: < 5 minutes
```

### Phase 3: Optional Enhancements (Do If Needed)
```
6. Song Lyrics Scraper
   ├─ Query songs without lyrics
   ├─ For each song: extract lyrics from SongStats
   ├─ Update: songs.lyrics field
   └─ Duration: 30-60 minutes

7. List Summary Scrapers
   ├─ Validate/enhance existing data
   └─ Duration: < 10 minutes combined
```

---

## Testing Checklist

Before running any scraper in production:

- [ ] Test with --limit 5 first
- [ ] Verify data types match schema
- [ ] Check for SQL injection vulnerabilities
- [ ] Test error handling (network timeouts)
- [ ] Validate rate limiting works
- [ ] Verify no duplicate inserts
- [ ] Check foreign key constraints
- [ ] Test rollback procedure
- [ ] Verify output logs are clear
- [ ] Run with --dry-run flag first

---

## Estimated Project Timeline

| Phase | Scrapers | Dev Time | Run Time | Total |
|-------|----------|----------|----------|-------|
| 1 | Song Stats, Liberation, Venue Stats | 10h | 65min | 2.5h |
| 2 | Curated Lists, Tour Stats | 6h | 20min | 1h |
| 3 | Lyrics, Summaries | 3h | 90min | 2.5h |
| **Total** | **5 scrapers** | **19h** | **175min** | **6h** |

**Development work**: 19 hours (spread over 2-3 weeks)
**First full run**: ~3 hours
**Recurring runs**: ~30-45 minutes (monthly)

---

## Common Issues & Solutions

### Issue: "Song/Venue/Guest ID not found"
**Cause**: Missing ID extraction
**Solution**:
- Verify ID is being extracted from URL or list page
- Check if ID format has changed on site
- Add debug logging to show extracted IDs

### Issue: "HTML parsing failed"
**Cause**: Site HTML structure changed
**Solution**:
- Manually visit page in browser
- Inspect HTML with DevTools
- Update CSS selectors in scraper
- Add fallback parsing methods

### Issue: "Rate limiter causing timeouts"
**Cause**: Network is slower than expected
**Solution**:
- Increase rate limit from 1s to 2s
- Add timeout handling with retries
- Check internet connection
- Monitor site performance

### Issue: "Duplicate key errors"
**Cause**: Running scraper twice without cleanup
**Solution**:
- Use UPSERT instead of INSERT
- Check for existing records before insert
- Implement idempotent operations

---

## Monitoring & Success Metrics

### Health Checks
- [ ] All URLs return HTTP 200
- [ ] No parsing errors > 5%
- [ ] Database inserts match parsed count
- [ ] Foreign key constraints pass
- [ ] No duplicate slug violations

### Data Quality Checks
```sql
-- Songs should have stats
SELECT COUNT(*) FROM songs WHERE times_played IS NULL;

-- Liberation list should be populated
SELECT COUNT(*) FROM liberation_list;

-- Venues should have show counts
SELECT COUNT(*) FROM venues WHERE total_shows = 0;

-- Curated lists should exist
SELECT COUNT(*) FROM curated_lists;
```

---

## Commands to Run Scrapers

```bash
# Individual scrapers
pnpm --filter scraper tsx src/scrapers/songs-stats.ts
pnpm --filter scraper tsx src/scrapers/liberation-list.ts
pnpm --filter scraper tsx src/scrapers/venue-stats.ts
pnpm --filter scraper tsx src/scrapers/curated-lists.ts
pnpm --filter scraper tsx src/scrapers/tour-stats.ts

# With options
pnpm --filter scraper tsx src/scrapers/songs-stats.ts --limit 10
pnpm --filter scraper tsx src/scrapers/venue-stats.ts --dry-run
pnpm --filter scraper tsx src/scrapers/curated-lists.ts --verbose

# All at once
pnpm --filter scraper scrape:all
```

---

## File Locations

**Research Documents**:
- `~/Documents/DMBALMANAC_DATA_SOURCES_RESEARCH.md` - Full research report
- `~/Documents/MISSING_SCRAPERS_TECHNICAL_SPEC.md` - Technical specs
- `~/Documents/DMBALMANAC_SCRAPER_QUICK_REFERENCE.md` - This file

**Existing Scrapers**:
- `~/Documents/dmbalmanac-v2/services/scraper/src/scrapers/shows-all-years.ts`
- `~/Documents/dmbalmanac-v2/services/scraper/src/scrapers/setlists.ts`
- `~/Documents/dmbalmanac-v2/services/scraper/src/scrapers/guests.ts`
- `~/Documents/dmbalmanac-v2/services/scraper/src/scrapers/releases.ts`
- `~/Documents/dmbalmanac-v2/services/scraper/src/scrapers/update-almanac-ids.ts`

**Database Schema**:
- `~/Documents/dmbalmanac-v2/packages/database/prisma/schema.prisma`

---

## Next Steps

1. **Review this guide** with the development team
2. **Read the full research report** (DMBALMANAC_DATA_SOURCES_RESEARCH.md)
3. **Review technical specs** for each scraper (MISSING_SCRAPERS_TECHNICAL_SPEC.md)
4. **Create implementation tasks** for Phase 1 scrapers
5. **Assign developers** and set timeline
6. **Start with Song Statistics Scraper** (highest priority)

---

## Support Resources

- **Site**: https://dmbalmanac.com
- **Database Schema**: See Prisma file
- **Existing Scrapers**: Reference implementation examples
- **Rate Limiting**: Keep 1+ second between requests
- **Testing**: Use --limit and --dry-run flags

---

## Key Takeaway

**We're currently scraping ~65% of available data on dmbalmanac.com.**
Implementing the 5 missing Priority 1 & 2 scrapers will bring us to **95% coverage** in just 19 hours of development work and 3 hours of runtime.

The investment is well worth it for the completeness and feature richness it provides.
