# DMB Almanac Missing Shows Analysis Report

Generated: 2026-01-19

## Executive Summary

| Metric | Count |
|--------|-------|
| Shows on dmbalmanac.com | 3,773 |
| Shows with valid scraped data | 566 |
| Shows needing re-scrape | 3,207 |
| Current database shows | 3,361 |
| Database shows with setlists | 2,079 |

## Problem Identified

The primary `shows.json` file (20MB) contains **corrupted data** from a failed scrape run:
- Dates are incorrect (many shows have "1991-01-01" as the date)
- Venue/city fields contain garbage text from parsing errors
- Setlists are mostly empty

Only `cache/checkpoint_shows.json` contains valid data, but it only includes years 1991-1993 (566 shows).

## Shows Comparison by Year

| Year | Website | Valid Scraped | DB Shows | DB w/Setlists | Gap (Need Scrape) |
|------|---------|---------------|----------|---------------|-------------------|
| 1991 | 71 | 71 | 65 | 11 | 0 |
| 1992 | 247 | 247 | 285 | 20 | 0 |
| 1993 | 248 | 248 | 322 | 78 | 0 |
| 1994 | 233 | 0 | 208 | 166 | **233** |
| 1995 | 165 | 0 | 154 | 141 | **165** |
| 1996 | 168 | 0 | 162 | 146 | **168** |
| 1997 | 73 | 0 | 67 | 65 | **73** |
| 1998 | 140 | 0 | 121 | 119 | **140** |
| 1999 | 123 | 0 | 108 | 107 | **123** |
| 2000 | 71 | 0 | 50 | 49 | **71** |
| 2001 | 115 | 0 | 99 | 88 | **115** |
| 2002 | 126 | 0 | 102 | 99 | **126** |
| 2003 | 94 | 0 | 80 | 76 | **94** |
| 2004 | 84 | 0 | 69 | 67 | **84** |
| 2005 | 97 | 0 | 73 | 73 | **97** |
| 2006 | 82 | 0 | 65 | 65 | **82** |
| 2007 | 92 | 0 | 80 | 74 | **92** |
| 2008 | 72 | 0 | 57 | 55 | **72** |
| 2009 | 108 | 0 | 86 | 83 | **108** |
| 2010 | 118 | 0 | 101 | 99 | **118** |
| 2011 | 45 | 0 | 32 | 30 | **45** |
| 2012 | 92 | 0 | 79 | 74 | **92** |
| 2013 | 87 | 0 | 75 | 62 | **87** |
| 2014 | 63 | 0 | 47 | 47 | **63** |
| 2015 | 80 | 0 | 69 | 68 | **80** |
| 2016 | 88 | 0 | 75 | 74 | **88** |
| 2017 | 114 | 0 | 107 | 62 | **114** |
| 2018 | 88 | 0 | 75 | 72 | **88** |
| 2019 | 93 | 0 | 79 | 78 | **93** |
| 2020 | 95 | 0 | 46 | 11 | **95** |
| 2021 | 99 | 0 | 74 | 43 | **99** |
| 2022 | 84 | 0 | 66 | 65 | **84** |
| 2023 | 80 | 0 | 63 | 62 | **80** |
| 2024 | 79 | 0 | 63 | 62 | **79** |
| 2025 | 55 | 0 | 53 | 36 | **55** |
| 2026 | 4 | 0 | 4 | 0 | **4** |

## Priority Analysis

### Highest Priority (Biggest Gaps)
1. **1994** - 233 shows missing (all data for this year)
2. **1996** - 168 shows missing
3. **1995** - 165 shows missing
4. **1998** - 140 shows missing
5. **2002** - 126 shows missing

### Years with Partial Data
The database contains shows for all years, but the source of this data is unclear since the scraped JSON files are corrupted. The data may have come from:
- A previous successful scrape run
- Manual data entry
- A different data source

### Critical Issue: Website Count vs URLs
- dmbalmanac.com reports **3,578 shows**
- show-urls.json contains **3,773 URLs**
- This discrepancy (195 URLs) suggests some URLs may be duplicates or non-show pages

## Recommended Approach

### Phase 1: Re-scrape All Missing Shows (3,207 shows)

```bash
# Use the prepared missing shows list
# File: /Users/louisherman/Documents/dmb-almanac/scraper/output/missing-shows-to-scrape.json

# Estimated time at 2 requests/second with 1.5s delay:
# 3,207 shows * 2 seconds = ~107 minutes (~1.8 hours)
```

### Phase 2: Validate Existing Database Data
1. Cross-reference database shows against newly scraped data
2. Identify shows in DB without valid setlists
3. Update/replace corrupted records

### Phase 3: Incremental Updates
After full rescrape:
- Set up checkpointing every 50 shows
- Implement resume from checkpoint on failure
- Add validation before database import

## Files Reference

| File | Path | Status |
|------|------|--------|
| URL Manifest | `scraper/output/show-urls.json` | Valid (3,773 URLs) |
| Missing Shows List | `scraper/output/missing-shows-to-scrape.json` | Created (3,207 URLs) |
| Valid Scraped Shows | `scraper/cache/checkpoint_shows.json` | Valid (566 shows, 1991-1993) |
| Corrupted Scrape | `scraper/output/shows.json` | CORRUPTED - Do not use |
| Corrupted Checkpoint | `scraper/output/checkpoint_shows_batch.json` | CORRUPTED - Do not use |

## Next Steps

1. **Fix scraper date/venue parsing** before re-running
2. **Run rescrape** using the `missing-shows-to-scrape.json` URL list
3. **Validate output** before importing to database
4. **Clean database** - remove duplicate date entries
5. **Re-import** with corrected data

## Scraper Command

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper

# Re-scrape missing shows using the prepared list
npm run scrape:shows -- --input=output/missing-shows-to-scrape.json --validate
```
