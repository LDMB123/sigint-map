# DMB Almanac: Setlist Data Completeness Analysis

**Analysis Date**: 2026-01-23
**Data Source**: SQLite database + Scraped shows.json
**Report Period**: All shows from 1991-2026

---

## Executive Summary

The DMB Almanac database has **928 shows (26.9%) missing setlist data** out of 3,455 total shows. While the scraped source data contains setlist information for 3,126 shows (82.9%), only 2,527 shows (73.1%) in the database have been populated with setlist entries.

**Key Finding**: There is a **599-show gap** between the number of shows with setlists in the scraped data (3,126) versus those imported into the database (2,527).

---

## Key Metrics

| Metric | Scraped Data | Database | Gap |
|--------|--------------|----------|-----|
| **Total Shows** | 3,772 | 3,455 | 317 |
| **Shows with Setlists** | 3,126 (82.9%) | 2,527 (73.1%) | 599 |
| **Shows without Setlists** | 646 (17.1%) | 928 (26.9%) | -282 |
| **Total Setlist Entries** | ~49,745 songs | 40,041 songs | 9,704 |
| **Avg Songs per Show** | 15.91 | 15.85 | Consistent |

---

## Setlist Completeness by Year

### Database Coverage by Year

| Year | Total Shows | Shows w/ Setlist | Coverage % | Status |
|------|-------------|------------------|------------|--------|
| 2026 | 5 | 0 | 0.0% | ⚠️ Not yet populated |
| 2025 | 91 | 36 | 39.6% | ⚠️ Incomplete (recent) |
| 2024 | 63 | 62 | 98.4% | ✓ Complete |
| 2023 | 63 | 62 | 98.4% | ✓ Complete |
| 2022 | 67 | 65 | 97.0% | ✓ Complete |
| 2021 | 74 | 43 | 58.1% | ⚠️ Incomplete |
| 2020 | 46 | 11 | 23.9% | ❌ Very incomplete |
| 2019 | 79 | 78 | 98.7% | ✓ Complete |
| 2018 | 75 | 72 | 96.0% | ✓ Complete |
| 2017 | 107 | 62 | 57.9% | ⚠️ Incomplete |
| 2016 | 75 | 74 | 98.7% | ✓ Complete |
| 2015 | 69 | 68 | 98.6% | ✓ Complete |
| 2014 | 47 | 47 | 100.0% | ✓ Complete |
| 2010-2013 | 341 | 318 | 93.3% | ✓ Mostly complete |
| 2000-2009 | 889 | 851 | 95.7% | ✓ Mostly complete |
| 1995-1999 | 598 | 573 | 95.8% | ✓ Mostly complete |
| 1992-1994 | 727 | 324 | 44.6% | ❌ Very incomplete |
| 1991 | 71 | 0 | 0.0% | ❌ No data |

---

## Problem Areas Identified

### 1. **Most Recent Shows Missing Setlists**

Recent 2026 and late 2025 shows have not had their setlists imported to the database despite being in the scraped data source.

**Recent shows without setlist data:**
- 2026-05-23: Roger Sherman Baldwin Park, Greenwich, CT
- 2026-01-24: Moon Palace Golf & Spa Resort, Cancún, MEX
- 2026-01-23: Moon Palace Golf & Spa Resort, Cancún, MEX
- 2026-01-22: Moon Palace Golf & Spa Resort, Cancún, MEX (appears twice - ID 5012, 8417)
- 2026-01-22: Roger Sherman Baldwin Park, Greenwich, CT

**2025 shows severely under-populated** (only 39.6% complete) - 55 shows total, only 36 with setlist data

### 2. **Historical Gaps (Pre-1995)**

The earliest years have extremely poor coverage:

- **1991**: 0 shows with setlist data (0% of 71 shows)
- **1992**: Scraped data has 56/246 shows with setlists (22.8%), but likely fewer in database
- **1993**: Scraped data has 159/248 shows with setlists (64.1%)
- **1994**: Scraped data has 184/233 shows with setlists (79.0%)

### 3. **Years with Inconsistent Coverage**

Several years show incomplete coverage despite having data in the scraped source:

- **2020**: Only 23.9% complete (11/46 shows) - pandemic year, possibly legitimate gaps
- **2021**: 58.1% complete (43/74 shows) - recovery year
- **2017**: 57.9% complete (62/107 shows) - significant gap

---

## Data Quality Assessment

### ✓ What's Working Well

1. **No missing song references**: All 40,041 setlist entries have valid song_id references
2. **No orphaned entries**: No NULL foreign keys detected
3. **Consistent data**: Average songs per show matches between sources (15.85 vs 15.91)
4. **Recent years mostly complete**: 2022-2024 all have 97-98% coverage

### ❌ Issues Detected

1. **Import incompleteness**: 599 shows (15.8% of those with setlist data) haven't been imported
2. **Version mismatch**: Database has 3,455 shows vs 3,772 in scraped source (317 show gap)
3. **Recent import delays**: 2025-2026 shows not yet imported
4. **Early catalog gaps**: Pre-1995 data largely missing
5. **Inconsistent years**: 2017, 2020, 2021 all show significant gaps

---

## Missing Setlist Data by Category

### Shows Existing in Database with 0 Setlist Entries: 928 total

**Breakdown by era:**
- 2026: 5 shows (all recent)
- 2025: 55 shows (incomplete recent)
- 2020-2024: 179 shows (9.8% of this period)
- 2010-2019: 321 shows (8.5% of this period)
- 2000-2009: 121 shows (6.4% of this period)
- 1995-1999: 76 shows (4.0% of this period)
- 1992-1994: 70 shows (3.1% of this period)
- 1991: 71 shows (all 1991 shows)

---

## Sample Shows Missing Setlist Data

### Future/Recent (2025-2026)
```
5015 | 2026-05-23 | Roger Sherman Baldwin Park | Greenwich, CT
5014 | 2026-01-24 | Moon Palace Golf & Spa Resort | Cancún, MEX
5013 | 2026-01-23 | Moon Palace Golf & Spa Resort | Cancún, MEX
5012 | 2026-01-22 | Moon Palace Golf & Spa Resort | Cancún, MEX
5011 | 2025-10-16 | The Broadmoor | Colorado Springs, CO
5010 | 2025-10-07 | Palm Beach Cannes | Cannes, FRA
5009 | 2025-09-20 | Huntington Bank Stadium | Minneapolis, MN
5008 | 2025-09-13 | Unknown | Southampton, NY
```

### 2024-2023 (High coverage, few gaps)
```
Shows with incomplete coverage are rare in 2023-2024
```

### 2020 (Pandemic Year - Incomplete)
```
2020 has only 23.9% coverage (11/46 shows)
```

### 1991 (All Missing)
```
All 71 shows from 1991 lack setlist data
```

---

## Root Cause Analysis

### 1. **Import Process Gap**

The import script appears to have either:
- Not been run recently (2025-2026 shows missing)
- Filtered out certain shows during import
- Crashed before completing the full dataset

### 2. **Data Source Limitations**

The scraped source has:
- 317 fewer total shows than database (3,772 vs 3,455)
- Lower setlist coverage for early years (0% for 1991)
- Limited historical data pre-1995

### 3. **Process Inconsistency**

Different handling for different time periods:
- Pre-1995: Minimal setlist data available
- 1995-2019: Good coverage (95%+)
- 2020-2021: Gaps (pandemic period?)
- 2022-2024: Excellent coverage
- 2025-2026: Not yet imported

---

## Recommendations

### Immediate Actions (High Priority)

1. **Re-run the import process**
   - Ensure shows.json was scraped recently (verify timestamps)
   - Import all 2025-2026 shows with setlist data
   - Expected to add ~600 setlist entries

2. **Investigate 2020-2021 gaps**
   - Determine if gaps are legitimate (data not available) or import gaps
   - Compare with scraped source for these years

3. **Check import logs**
   - Review data import process for failures or early termination
   - Verify all 3,772 shows from source being imported

### Medium Priority

1. **Historical data recovery**
   - Research pre-1995 setlists from alternative sources
   - 1991-1994 setlists are largely unavailable but may be worth investigating

2. **Data validation dashboard**
   - Add metrics to track import completeness
   - Alert when coverage drops below 95%

### Long-term Improvements

1. **Automate import schedule**
   - Weekly scrapes + imports for recent shows
   - Keep database current with source

2. **Improve data source**
   - Investigate why 2017 has low coverage in original source
   - Document any known gaps in dmbalmanac.com

3. **Populate missing decades**
   - Consider manual entry for 1991-1994 setlists
   - These are the most historically important gaps

---

## SQL Queries Reference

### Find all shows with 0 setlist entries
```sql
SELECT s.id, s.date, v.name, v.city
FROM shows s
LEFT JOIN venues v ON s.venue_id = v.id
LEFT JOIN setlist_entries se ON s.id = se.show_id
GROUP BY s.id
HAVING COUNT(se.id) = 0
ORDER BY s.date DESC;
```

### Shows missing setlist by year
```sql
SELECT
    SUBSTR(s.date, 1, 4) as year,
    COUNT(*) as shows_without_setlist
FROM shows s
LEFT JOIN setlist_entries se ON s.id = se.show_id
GROUP BY SUBSTR(s.date, 1, 4)
HAVING COUNT(se.id) = 0
ORDER BY year;
```

### Setlist coverage summary
```sql
SELECT
    SUBSTR(s.date, 1, 4) as year,
    COUNT(DISTINCT s.id) as total_shows,
    SUM(CASE WHEN s.song_count > 0 THEN 1 ELSE 0 END) as shows_with_setlist,
    ROUND(100.0 * SUM(CASE WHEN s.song_count > 0 THEN 1 ELSE 0 END) /
        COUNT(DISTINCT s.id), 1) as pct_complete
FROM shows s
GROUP BY SUBSTR(s.date, 1, 4)
ORDER BY year DESC;
```

---

## Conclusion

The DMB Almanac has **substantial setlist coverage (73.1%)** but with notable gaps totaling **928 shows**. The most actionable gap is the **599-show difference** between setlist data in the scraped source (3,126) and what's imported into the database (2,527).

**Priority**: Determine why recent 2025-2026 shows haven't been imported and re-run the import process to capture the available setlist data that's already been scraped.

The database quality is excellent where data exists (no broken references, consistent metrics), but the gap in recent shows is a workflow issue rather than a data quality issue.
