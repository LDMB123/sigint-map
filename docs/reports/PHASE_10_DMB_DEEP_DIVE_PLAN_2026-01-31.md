# Phase 10: DMB Almanac Deep Dive - Execution Plan

**Date:** 2026-01-31
**Target:** 40 optimizations (from MEGA plan)
**Estimated Recovery:** 2-3 MB disk + 800K tokens
**Status:** PLANNING

---

## Discovery Analysis

### DMB Almanac Documentation Size
- **Total docs/:** 5.7 MB
- **Large files (>15KB):** 112 files
- **Medium files (10-15KB):** 133 files
- **Total markdown >10KB:** 245 files
- **Scraping docs:** 14 files (237 KB)
- **Archive directory:** 1.0 MB

### Optimization Categories

#### Category A: Scraping Documentation (Priority 1)
**Location:** `projects/dmb-almanac/docs/scraping/`
**Files:** 14 files, 237 KB total
**Compression potential:** 90-95% (similar to Phase 9)

**Target files:**
1. DMBALMANAC_HTML_STRUCTURE_REFERENCE.md (24 KB)
2. TOUR_STATS_IMPLEMENTATION_ROADMAP.md (21 KB)
3. Guest_Shows_Scraper_Spec.md (22 KB)
4. TOUR_STATS_EXTRACTION_GUIDE.md (19 KB)
5. RELEASES_SCRAPER_CODE_REFERENCE.md (18 KB)
6. DMB_SCRAPER_COMPARISON.md (17 KB)
7. missing-scrapers-specification.md (17 KB)
8. RELEASES_SCRAPER_ANALYSIS.md (16 KB)
9. DMBALMANAC_GAPS_AND_OPPORTUNITIES.md (14 KB)
10. DMB_ENHANCEMENT_OPPORTUNITIES.md (14 KB)
11. scraper-gaps-summary.txt (13 KB)
12. RELEASES_SCRAPER_REPORT.md (11 KB)
13. RELEASES_SCRAPER_SUMMARY.txt (9.6 KB)
14. RELEASES_SCRAPER_QUICKSTART.md (5.6 KB)

**Estimated recovery:** 215 KB disk + ~54K tokens (91% compression)

---

#### Category B: Archive Directory Analysis (Priority 2)
**Location:** `projects/dmb-almanac/docs/archive/`
**Size:** 1.0 MB
**Status:** Need to analyze for duplicates and compression opportunities

**Analysis needed:**
- Check for duplicate files
- Identify superseded versions
- Measure compression potential
- Create archive manifest

**Estimated recovery:** 200-400 KB disk + 50-100K tokens

---

#### Category C: Large Documentation Files (Priority 3)
**Location:** `projects/dmb-almanac/docs/` (various subdirectories)
**Count:** 112 files >15KB
**Strategy:** Ultra-compress top 30-40 largest files

**Target subdirectories:**
- `architecture/` (37 files)
- `audits/` (33 files)
- `guides/` (30 files)
- `analysis/` (10 files)

**Estimated recovery:** 1.5-2.0 MB disk + 400-600K tokens

---

## Execution Strategy

### Phase 10A: Scraping Documentation Compression (7 optimizations)
**Method:** Ultra-compressed single-line summaries (Phase 9 style)
**Files:** 14 scraping-related files
**Target ratio:** 91%+ compression

### Phase 10B: Archive Directory Optimization (8 optimizations)
**Method:** Analyze, deduplicate, compress or consolidate
**Files:** To be determined after analysis
**Target ratio:** 40-50% reduction

### Phase 10C: Top 25 Large Files Compression (25 optimizations)
**Method:** Ultra-compressed summaries
**Files:** 25 largest files from architecture/, audits/, guides/
**Target ratio:** 95%+ compression

---

## Success Criteria

- [ ] 40 optimization opportunities executed
- [ ] 2.0+ MB disk recovery
- [ ] 800K+ token recovery
- [ ] 90%+ average compression ratio
- [ ] All originals preserved or archived
- [ ] Zero data loss on essential information

---

## Verification Requirements

**Before claiming completion:**
1. Run fresh disk measurement: `du -sh before/` vs `du -sh after/`
2. Count files processed: `find . -name "BATCH_*.md" | wc -l`
3. Verify compression ratios per batch
4. Test archive accessibility
5. Run organization check: `.claude/scripts/enforce-organization.sh`

---

## Phase 10A Execution: Scraping Docs

### Batch Plan

**BATCH_01_SCRAPING_LARGE** (5 files, 15-24KB each)
- DMBALMANAC_HTML_STRUCTURE_REFERENCE.md (24 KB)
- Guest_Shows_Scraper_Spec.md (22 KB)
- TOUR_STATS_IMPLEMENTATION_ROADMAP.md (21 KB)
- TOUR_STATS_EXTRACTION_GUIDE.md (19 KB)
- RELEASES_SCRAPER_CODE_REFERENCE.md (18 KB)
**Total:** 104 KB → ~2 KB (98% compression)

**BATCH_02_SCRAPING_MEDIUM** (6 files, 13-17KB each)
- DMB_SCRAPER_COMPARISON.md (17 KB)
- missing-scrapers-specification.md (17 KB)
- RELEASES_SCRAPER_ANALYSIS.md (16 KB)
- DMBALMANAC_GAPS_AND_OPPORTUNITIES.md (14 KB)
- DMB_ENHANCEMENT_OPPORTUNITIES.md (14 KB)
- scraper-gaps-summary.txt (13 KB)
**Total:** 91 KB → ~1.5 KB (98% compression)

**BATCH_03_SCRAPING_SMALL** (3 files, 5-11KB each)
- RELEASES_SCRAPER_REPORT.md (11 KB)
- RELEASES_SCRAPER_SUMMARY.txt (9.6 KB)
- RELEASES_SCRAPER_QUICKSTART.md (5.6 KB)
**Total:** 26 KB → ~0.5 KB (98% compression)

---

## Timeline

**Phase 10A:** 20 minutes (scraping docs compression)
**Phase 10B:** 30 minutes (archive analysis + optimization)
**Phase 10C:** 45 minutes (large files compression)
**Total:** ~90 minutes

---

## Output Structure

```
docs/reports/compressed-summaries/phase10-dmb/
├── BATCH_01_SCRAPING_LARGE.md
├── BATCH_02_SCRAPING_MEDIUM.md
├── BATCH_03_SCRAPING_SMALL.md
├── BATCH_04_ARCHIVE_CONSOLIDATION.md
└── BATCH_05-08_LARGE_FILES_[A-D].md
```

---

## Risk Assessment

**Low Risk:**
- Scraping documentation (reference material, stable)
- Archive directory (already archived content)
- Large documentation files (infrequently accessed)

**Mitigation:**
- Preserve all originals
- Create detailed references in summaries
- Maintain searchable format
- Test recovery process

---

## Next Steps

1. Execute Phase 10A (scraping docs compression)
2. Analyze archive directory
3. Execute Phase 10B (archive optimization)
4. Identify top 25 large files
5. Execute Phase 10C (large file compression)
6. Verify all metrics with fresh commands
7. Commit with evidence-based claims
8. Proceed to Phase 11

---

**Created:** 2026-01-31
**Phase:** 10 of 15 (MEGA Optimization)
**Prerequisite:** Phases 1-9 complete (3.86M tokens + 85MB recovered)
**Next:** Phase 11 - Code & Build Cleanup
