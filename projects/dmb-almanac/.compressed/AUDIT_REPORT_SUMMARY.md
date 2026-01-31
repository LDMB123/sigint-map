# Scraper Audit Report - Compressed Summary

**File:** app/scraper/AUDIT_REPORT.md
**Original:** 832 lines, ~7,087 tokens | **Compressed:** ~900 tokens | **Ratio:** 87% reduction
**Type:** Comprehensive audit | **Date:** 2026-01-23

## Executive Summary

Audit of DMB Almanac scraper covering **14 ASPX page types** → **9 JSON outputs**. Identified data quality issues, missing data points, and enhancement opportunities across 3,772 shows, 500 songs, 800 venues, 380 releases.

## Coverage Status

**Active Scrapers (14 types):**
- Shows: TourShowSet.aspx, TourShow.aspx
- Stats: SongStats.aspx, VenueStats.aspx, GuestStats.aspx
- Releases: DiscographyList.aspx, ReleaseView.aspx
- Special: Liberation.aspx, ShowRarity.aspx, ListView.aspx, ThisDayinHistory.aspx

**Missing/Partial:**
- ShowSetlist.aspx, TourShowInfo.aspx (partial), SongSearchResult.aspx

## Critical Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| History data invalid (pre-1991 + future shows) | CRITICAL | Data corruption |
| Rarity data completely empty | CRITICAL | Non-functional feature |
| Date format inconsistencies (M/D/YYYY, MM.DD.YY, ISO) | CRITICAL | Query failures |
| Segue data incomplete (only top 5-10) | HIGH | Missing relationships |
| Guest notes in guest names array | HIGH | Data structure broken |
| Early show venue corruption (1991-1995) | HIGH | 200+ shows affected |

## Data Quality Issues by Dataset

**shows.json (3,772 records):**
- Missing: band configuration, setlist type, segue targets, tease targets, release titles
- Corrupted: Early show venues (garbled city/state), international country codes (MEX as state)
- Incomplete: Guest context, sound quality, attendance

**song-stats.json (~500 songs):**
- Missing: Complete segue charts (only top entries), release breakdown, rarity index, play trends
- Inconsistent: Date formats vary by field
- Incomplete: Liberation history (recent only), duration stats missing venues

**releases.json (~380 releases):**
- Missing: Producer, label, catalog numbers, format, ASIN, streaming URLs
- Incomplete: Track credits, guest details, live release tour info, variants

**venue-stats.json (~800 venues):**
- Missing: Coordinates, venue type, capacity history, website, status (active/demolished)
- Geographic: International state/country errors
- Incomplete: Notable performances unstructured, show history by era

**guest-details.json:**
- Missing: Bio, links, primary band, photos, year range, per-song instruments
- Incomplete: Duet vs. full band distinction, appearance trends

**rarity.json:**
- **COMPLETELY EMPTY** - Shows array [], rarity index = 0, non-functional

**liberation.json:**
- Missing: Band configuration (not populated), full gap history, liberation predictions
- Incomplete: Only recent liberations tracked

**history.json:**
- **CRITICAL BUG**: Contains invalid pre-1991 and future-dated shows

## Missing Data Points (Comprehensive)

**Show-level (9 missing):** Configuration, setlist type, segue targets, teases, release versions, guest context, quality, attendance, weather

**Song-level (10 missing):** Full segue charts, segue types, release links, trends, avg position, neighbors, bust-outs, per-artist stats, cover origins, lyrics

**Venue-level (8 missing):** Coordinates, type, capacity history, URLs, status, era info, structured performances, signature songs

**Guest-level (8 missing):** Bio, links, affiliation, photos, instrument details, duet context, trends, co-guest patterns

**Release-level (9 missing):** Producer, label, catalogs, format, edition, credits, IDs (ASIN/Discogs/MB), streaming, ratings

**Tour-level (8 missing):** Actual names (not year-based), dates, themes, announcements, unique songs, avg length, rarity, categories

## Technical Gaps

**Validation:** No date range checks, required field validation, cross-entity verification
**Data Types:** Mixed formats, notes containing metadata, guest data in song arrays
**Error Handling:** Parser failures silent, fallback accepts garbage, no quality metrics
**Infrastructure:** No deduplication, schema validation, data quality scoring

## Recommendations Priority

**P0 - Critical (Fix Immediately):**
1. Fix history.json invalid dates
2. Implement rarity data extraction
3. Standardize all date formats to ISO 8601
4. Separate guest notes from guest names

**P1 - High (Next Sprint):**
5. Fix early show venue corruption (1991-1995)
6. Extract complete segue data with percentages
7. Add band configuration to shows
8. Implement data validation layer

**P2 - Medium (Next Month):**
9. Add venue coordinates and type
10. Expand release metadata (producer, label, format)
11. Extract actual tour names from TourShowInfo.aspx
12. Add guest biographical data

**P3 - Low (Backlog):**
13. Liberation prediction algorithm
14. Statistical trend analysis
15. Song lyrics database
16. User-submitted content integration

## Full Documentation

**Read full audit:** projects/dmb-almanac/app/scraper/AUDIT_REPORT.md
**Related:** COMPLETION_REPORT.md, P0_IMPLEMENTATION_COMPLETE.md
**Issue tracking:** Lines 58-427 (detailed findings by dataset)
**Missing data:** Lines 428-620 (comprehensive checklist)
