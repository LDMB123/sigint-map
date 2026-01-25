# DMB Almanac - Setlist Data Completeness Analysis
**Analysis Date**: January 23, 2026
**Analyst**: Data Analysis Agent

---

## Quick Summary

The DMB Almanac database has **good overall quality** but a **significant import gap**:

- **928 shows (26.9%)** are missing setlist data
- **599-show gap** between scraped data (3,126 shows with setlists) and database (2,527 shows with setlists)
- **Zero data quality issues** where data exists (all foreign keys valid, no broken references)
- **Recent import lag**: 2025-2026 shows not yet populated

**Action**: Re-run import process to capture available setlist data and investigate why 599 shows weren't imported.

---

## Report Files

### 1. SETLIST_COMPLETENESS_ANALYSIS.md (Primary Report)
**8.9 KB | Comprehensive Analysis**

Complete deep-dive analysis including:
- Executive summary with key metrics
- Year-by-year coverage breakdown (1991-2026)
- Problem areas and gaps identified
- Data quality assessment (what's working, what's broken)
- Sample shows missing setlist data
- Root cause analysis
- 10+ actionable recommendations
- SQL query reference guide

**Best for**: Understanding the full context and getting detailed recommendations

---

### 2. SETLIST_ANALYSIS_SUMMARY.txt (Quick Reference)
**6.5 KB | Executive Summary**

Quick-reference format with:
- Executive findings table
- Critical gaps by category
- Coverage trend analysis
- Top 10 prioritized action items
- Shows missing by year (breakdown)
- Next steps timeline (immediate/short-term/medium-term)

**Best for**: Quick understanding of issues and action items

---

### 3. missing_setlist_shows.csv (Data Export)
**68 KB | 928 rows | Actionable Data**

Complete list of all shows with 0 setlist entries:
- Show ID
- Date (sortable for targeting recent shows)
- Venue name
- City
- State/Country
- Tour name
- Setlist entries count (all 0)

**Best for**: Targeted investigation, data import fixing, or research

---

## Key Findings at a Glance

| Category | Finding | Status |
|----------|---------|--------|
| **Total Database Shows** | 3,455 | Current |
| **Shows with Setlists** | 2,527 (73.1%) | Good |
| **Shows Missing Setlists** | 928 (26.9%) | Issue |
| **Import Gap** | 599 shows | Critical |
| **Data Integrity** | 100% (no broken refs) | Excellent |
| **Recent Shows (2026)** | 0% populated | Urgent |
| **Recent Lag (2025)** | 39.6% populated | High Priority |
| **Historical (1998-2024)** | 95%+ coverage | Excellent |
| **Early Era (1991-1994)** | 0-79% in source | Limited by source |

---

## Critical Issues

### 1. Import Pipeline Broken (599 shows)
- Setlist data exists in scraped source for 3,126 shows
- Database only has 2,527 shows with setlists
- **Gap**: 599 shows (~9,700 songs) not imported

### 2. Recent Shows Not Updated (2025-2026)
- 2026: 5 shows, 0 with setlists (0%)
- 2025: 91 shows, 36 with setlists (39.6%)
- **Estimated missing**: 55+ shows worth of setlist data

### 3. Pandemic Era Incomplete (2020-2021)
- 2020: Only 11/46 shows have setlists (23.9%)
- 2021: Only 43/74 shows have setlists (58.1%)
- **Unclear**: Whether gaps are data source issues or import failures

### 4. Historical Data Limited (1991-1994)
- 1991: Zero setlist data available
- 1992: Only 22.8% of shows have setlists in source
- 1993: Only 64.1% of shows have setlists in source
- 1994: Only 79.0% of shows have setlists in source
- **Note**: Limited by historical source data, not database

---

## What's Working Well

1. **No Data Corruption**: Zero broken foreign key references
2. **No Missing References**: All 40,041 setlist entries have valid song_id
3. **Consistent Metrics**: Average 15.85 songs per show (matches source)
4. **Modern Era Complete**: 2014, 2022-2024 at 97-100% coverage
5. **Good Eras**: 1998-2019 period mostly 95%+ complete

---

## Immediate Action Items (This Week)

### Priority 1: Re-run Import for Recent Shows
- Verify shows.json was scraped recently
- Import missing 2025-2026 shows
- Expected result: +55-600 new setlist entries
- Effort: 1-2 hours

### Priority 2: Investigate the 599-Show Gap
- Check import logs for errors or early termination
- Verify process is importing all 3,772 shows from source
- Determine why only 2,527 setlists made it to database
- Effort: 2-4 hours

### Priority 3: Analyze 2020-2021 Gaps
- Compare source data for completeness
- Determine if gaps are legitimate (source) or process failures
- Expected result: Clarification of ~66 shows
- Effort: 1-2 hours

---

## SQL Queries for Verification

### Quick Overview
```sql
-- Database coverage summary
SELECT
    COUNT(*) as total_shows,
    SUM(CASE WHEN song_count > 0 THEN 1 ELSE 0 END) as shows_with_setlist,
    SUM(CASE WHEN song_count = 0 THEN 1 ELSE 0 END) as shows_without_setlist
FROM shows;
```

### Year-by-Year Coverage
```sql
SELECT
    SUBSTR(date, 1, 4) as year,
    COUNT(*) as total_shows,
    SUM(CASE WHEN song_count > 0 THEN 1 ELSE 0 END) as with_setlist,
    ROUND(100.0 * SUM(CASE WHEN song_count > 0 THEN 1 ELSE 0 END) /
        COUNT(*), 1) as coverage_pct
FROM shows
GROUP BY year
ORDER BY year DESC;
```

### Shows Missing Setlist Data
```sql
SELECT s.id, s.date, v.name, v.city, COUNT(se.id) as entries
FROM shows s
LEFT JOIN venues v ON s.venue_id = v.id
LEFT JOIN setlist_entries se ON s.id = se.show_id
GROUP BY s.id
HAVING COUNT(se.id) = 0
ORDER BY s.date DESC;
```

---

## Timeline & Context

- **Data Source**: dmbalmanac.com (scraped 2026-01-15)
- **Database**: SQLite at `data/dmb-almanac.db`
- **Scraped JSON**: `scraper/output/shows.json` (3,772 shows)
- **Analysis Date**: 2026-01-23
- **Database Shows**: 3,455 total

---

## Recommendations Summary

### Short Term (1-2 weeks)
1. Re-run import process with debugging enabled
2. Capture missing 2025-2026 setlist data
3. Investigate 2020-2021 pandemic era gaps
4. Verify data quality after import

### Medium Term (1-3 months)
1. Implement automated import monitoring
2. Set up alerts for coverage drops
3. Document source limitations (1991-1994)
4. Schedule weekly import updates

### Long Term (ongoing)
1. Build dashboard tracking setlist coverage
2. Investigate alternative sources for 1991-1994
3. Create data quality reporting
4. Archive this analysis as baseline

---

## Files Location

All analysis files are in the project root:

```
/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/

├── ANALYSIS_INDEX.md (this file)
├── SETLIST_COMPLETENESS_ANALYSIS.md (full report)
├── SETLIST_ANALYSIS_SUMMARY.txt (quick reference)
└── missing_setlist_shows.csv (928 shows with 0 setlist entries)
```

---

## Next Steps

1. **Read**: Start with SETLIST_ANALYSIS_SUMMARY.txt for quick overview
2. **Understand**: Read SETLIST_COMPLETENESS_ANALYSIS.md for full context
3. **Research**: Use missing_setlist_shows.csv to investigate specific shows
4. **Act**: Follow the Top 10 action items in the main report
5. **Verify**: Re-run analysis after fixes to measure improvement

---

## Questions This Analysis Answers

- Where are the setlist data gaps? **928 shows total, concentrated in 1991-1994, 2020-2021, 2025-2026**
- Is the imported data clean? **Yes, 100% data integrity where data exists**
- What shows are missing setlist data? **See missing_setlist_shows.csv (all 928 listed)**
- Why is coverage 73% not 83%? **599-show import gap between source and database**
- Which years need attention? **2026 (urgent), 2025 (high), 2020-2021 (investigate), 1991-1994 (historical)**
- How long to fix? **1-2 hours to re-import, 2-4 hours to investigate root cause**
- Is there data corruption? **No - zero broken references, all song IDs valid**

---

**End of Analysis Index**
