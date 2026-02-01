# Phase 12: Advanced Compression - Execution Plan

**Date:** 2026-01-31
**Target:** 10 optimizations (re-compress tar.gz archives with zstd)
**Estimated Recovery:** 2-5 MB disk + 50K tokens
**Status:** PLANNING

---

## Current Archive Analysis

### Existing Archives
**Total:** 10 tar.gz files in `_archived/`
**Total Size:** 50 MB (gzip compressed)
**Algorithm:** tar + gzip (default compression)

**Archives by size:**
1. superseded-backups-2026-01-31.tar.gz: 6.6 MB (largest - best candidate)
2. dmb-almanac-analysis-2026-01-25.tar.gz: 2.1 MB
3. workspace-audits-2026-01-25.tar.gz: 209 KB
4. dmb-cleanup-docs-2026-01-31.tar.gz: 176 KB
5. dmb-migration-docs-2026-01-31.tar.gz: 106 KB
6. workspace-guides-2026-01-31.tar.gz: 95 KB
7. optimization-reports-jan30.tar.gz: 80 KB
8. superseded-reports-jan25-30.tar.gz: 57 KB
9. dmb-phases-docs-2026-01-31.tar.gz: 43 KB
10. consolidated-indices-2026-01-31.tar.gz: 21 KB

---

## Compression Strategy

### zstd vs gzip Comparison

**gzip (current):**
- Compression ratio: ~60-70% typical
- Speed: Medium
- Compatibility: Universal

**zstd (target):**
- Compression ratio: ~65-75% typical (5-10% better)
- Speed: Much faster than gzip
- Compatibility: Modern (macOS, Linux, Windows 10+)
- Levels: 1-22 (default: 3, we'll use 19 for max compression)

**Expected improvement:** 5-15% additional compression

---

## Execution Plan

### Priority: Top 5 Archives (Best ROI)

**High Priority (5 optimizations):**
1. superseded-backups-2026-01-31.tar.gz (6.6 MB) → Expected: 6.0-6.3 MB
2. dmb-almanac-analysis-2026-01-25.tar.gz (2.1 MB) → Expected: 1.9-2.0 MB
3. workspace-audits-2026-01-25.tar.gz (209 KB) → Expected: 190-200 KB
4. dmb-cleanup-docs-2026-01-31.tar.gz (176 KB) → Expected: 160-170 KB
5. dmb-migration-docs-2026-01-31.tar.gz (106 KB) → Expected: 95-100 KB

**Medium Priority (5 optimizations):**
6-10. Remaining 5 smaller archives

---

## Re-compression Method

**Process:**
1. Decompress: `tar -xzf archive.tar.gz`
2. Re-compress with zstd level 19: `tar -cf - files/ | zstd -19 -o archive.tar.zst`
3. Verify integrity: `tar -tzf archive.tar.zst`
4. Compare sizes
5. Replace if smaller
6. Delete temporary files

**Safety:**
- Keep original .tar.gz until .tar.zst verified
- Test extraction before deleting original
- Document all conversions

---

## Expected Results

### Conservative Estimate (5-10% improvement)
- Current: 50 MB
- After: 45-47.5 MB
- Recovery: 2.5-5 MB

### Optimistic Estimate (10-15% improvement)
- Current: 50 MB
- After: 42.5-45 MB
- Recovery: 5-7.5 MB

**Token recovery:** Minimal (archives already compressed for token purposes)
**Primary benefit:** Disk space savings

---

## Risk Assessment

**LOW RISK:**
- Original archives preserved until verification
- Can revert if issues found
- zstd is stable and well-tested

**COMPATIBILITY:**
- zstd available on all modern systems
- May need zstd for extraction (documented)

---

## Alternative: Skip Re-compression

**Consideration:** Current 50 MB archives already well-compressed

**Arguments against re-compression:**
- Effort: ~30-45 minutes for marginal gain
- Complexity: Introduces zstd dependency
- Gain: Only 2.5-7.5 MB (5-15% improvement)

**Arguments for re-compression:**
- Completes Phase 12 as planned
- Demonstrates best-practice compression
- Every MB counts toward MEGA goal
- zstd is superior algorithm

**Recommendation:** Proceed with top 5 archives only (best ROI)

---

## Success Criteria

- [ ] Top 5 archives re-compressed with zstd
- [ ] All archives verified (extraction test)
- [ ] Size comparison documented
- [ ] 2+ MB disk recovery achieved
- [ ] Original .tar.gz files replaced with .tar.zst
- [ ] Documentation updated with extraction commands

---

## Next Steps

1. Test zstd compression on largest archive
2. Measure compression improvement
3. Decide: proceed with all 10 or top 5 only
4. Execute re-compression
5. Verify and document results

---

**Created:** 2026-01-31
**Phase:** 12 of 15 (MEGA Optimization)
**Prerequisite:** Phases 1-11 complete (4.299M tokens + 467 MB)
**Next:** Execute compression test on largest archive
