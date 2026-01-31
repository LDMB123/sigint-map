# Scraper Architecture - Compressed Summary

**File:** app/scraper/SCRAPER_ARCHITECTURE.md
**Original:** ~4,900 tokens | **Compressed:** ~700 tokens | **Ratio:** 86% reduction
**Type:** Technical documentation | **Last Modified:** 2026-01-30

## Architecture Overview

```
DMBAlmanac.com → Scraper (Playwright/Cheerio) → JSON → ETL (import-data.ts) → SQLite → Next.js
```

## Data Pipeline

**Phase 1 - Scraping:**
- Source: DMBAlmanac.com (DiscographyList.aspx, ReleaseView.aspx)
- Scrapers: releases.ts (45 releases)
- Output: output/releases.json
- Rate: ~5-6 releases/min, 8-10 min total

**Phase 2 - Import:**
- Input: releases.json
- Transform: Validate types, slugify, match songs, parse durations
- Load: INSERT releases + release_tracks
- Rate: ~1000 tracks/sec, <1 sec total

**Phase 3 - Query:**
- Web App: /releases/[slug]
- JOIN: releases → release_tracks → songs
- Display: Cover art, metadata, tracklist

## Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Scraper | scrapers/releases.ts | Extract release data from HTML |
| ETL | scripts/import-data.ts | Transform/load into SQLite |
| Cache | utils/cache.ts | HTML caching (5-10 MB) |
| Rate Limit | utils/rate-limit.ts | 2 concurrent, 5 req/10s |
| Helpers | utils/helpers.ts | parseDate, parseDuration, slugify |

## Database Schema

**releases table:**
- id, title, slug, release_type, release_date, cover_art_url, notes

**release_tracks table:**
- id, release_id, song_id, track_number, disc_number, duration_seconds, show_id, notes

## Utilities

**Rate Limiting:** concurrency=2, 5 req/10s, exponential backoff
**Caching:** HTML files in cache/, checkpoint_releases.json
**Checkpointing:** Resume from saveCheckpoint()
**Parsing:** parseDate, parseDuration (M:SS → seconds), slugify, normalizeWhitespace

## Error Handling

**Scraper:** Retry 3x with backoff, log, continue next
**Import:** Song not found → log warning, skip track
**Validation:** Invalid type → default "studio", log normalization

## Performance

**Scraping:** ~6 releases/min, ~3 MB network, 5-10 MB cache
**Import:** ~1000 tracks/sec, <50 MB memory, transactional
**Total:** ~10 min scrape + 1 sec import

## Best Practices

- Ethical: Rate limiting (30 req/min max), user agent, caching
- Resilient: Multiple HTML patterns, graceful degradation, null checks
- Integrity: Foreign keys, type validation, transactions
- DX: Progress logging, resumable ops, clear errors

## File Locations

**Scraper:** dmb-almanac/scraper/src/scrapers/releases.ts
**ETL:** dmb-almanac/scripts/import-data.ts
**Output:** dmb-almanac/scraper/output/releases.json
**Cache:** dmb-almanac/scraper/cache/*.html
**Schema:** dmb-almanac/lib/db/schema.sql
**DB:** dmb-almanac/data/dmb-almanac.db

## Full Documentation

**Read full file:** projects/dmb-almanac/app/scraper/SCRAPER_ARCHITECTURE.md
**Related:** RELEASES_SCRAPER.md, import-data.ts
**Diagrams:** Lines 20-194 (ASCII architecture + data flow)
