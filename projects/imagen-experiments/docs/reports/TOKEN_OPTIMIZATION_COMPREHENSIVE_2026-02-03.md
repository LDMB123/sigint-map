# Token Optimization Analysis: imagen-experiments Project
**Generated:** 2026-02-03  
**Analyzer:** Token Optimizer Agent  
**Current Status:** HIGH - 70%+ reduction available

---

## Executive Summary

The imagen-experiments project contains **1.1+ MB of documentation** (330K+ tokens) with critical redundancy, obsolete content, and duplicate files that can be reduced to **~100K tokens** (70% savings).

### Key Metrics

| Metric | Value |
|--------|-------|
| **Total project size** | 72 MB (scripts + docs) |
| **Documentation size** | 1.1 MB (~330K tokens) |
| **Archived files** | 36 docs (~207K tokens) |
| **Active docs** | 11 main files (~45-55K tokens) |
| **Plans & reports** | 12 files (~27K tokens) |
| **Prompt files** | 6 files (~38.5K tokens) |
| **Scripts** | 65 vegas files + variants (~600-800K tokens, not counted in session) |
| **Session context files** | 7 overlapping (~29.8K tokens) |
| **Potential savings** | 220K+ tokens per session |

---

## Problem 1: Session Documentation Explosion (CRITICAL)

### Issue

Seven session context files serving identical purpose, all loaded on session start:

**Overlapping files:**
1. `docs/SESSION-MASTER-2026-02-02.md` (318 lines, 4.7K tokens)
2. `docs/_archived/SESSION-RECOVERY-2026-02-01.md` (301 lines, 4.5K tokens)
3. `docs/_archived/SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md` (147 lines, 4.2K tokens)
4. `docs/_archived/SESSION-2026-02-01-V10-V11-COMPRESSED.md` (154 lines, 3.9K tokens)
5. `docs/_archived/SESSION-STATE-COMPRESSED.md` (141 lines, 3.1K tokens)
6. `docs/_archived/SESSION-CONTEXT-COMPRESSED.md` (233 lines, 4.5K tokens)
7. `docs/_archived/SESSION-2026-02-01-IMAGEN-GENERATION.md` (253 lines, 5.1K tokens)

**Plus:** TOKEN-OPTIMIZATION-START-HERE.md, OPTIMIZATION-QUICK-REFERENCE.md, QUICK-REFERENCE-SESSION-START.md (3 more session refs)

### Impact

- **Cost per session:** 29.8K tokens wasted on duplicate session context
- **Annual impact:** 10.8M tokens (at 1 session/day)
- **Actual use:** Only SESSION-MASTER-2026-02-02.md needed (newest, most complete)

### Root Cause

Compression workflows created intermediate files that weren't deleted. Multiple session snapshots accumulated during development.

### Recommendation: Authority Pattern

**Action:** Keep ONLY `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/docs/SESSION-MASTER-2026-02-02.md`

**Delete:**
- All 7 _archived session files
- TOKEN-OPTIMIZATION-START-HERE.md (superseded by QUICK-REFERENCE)
- QUICK-REFERENCE-SESSION-START.md (outdated, points to archived files)

**Savings per session:** 25.1K tokens

---

## Problem 2: Compressed File Duplicates (35.6K+ tokens)

### Issue

32 files with "-COMPRESSED" suffix exist alongside originals in _archived directory. Pairs consume double token budget when both accessed:

**Major offenders:**

| Original | Compressed | Original Size | Compressed | Combined | Delete |
|----------|-----------|---------------|-----------|----------|--------|
| SULTRY-VEGAS-FINAL-181-210.md | -COMPRESSED.md | 43K tokens | 3.9K tokens | 46.9K | Compressed |
| NASHVILLE-GENERATION-TRACKER.md | -DOCS-COMPRESSED.md | 4.6K tokens | 2.5K tokens | 7.1K | Both archived |
| BOUNDARY-FINDINGS-REPORT.md | -COMPRESSED.md (2 versions) | 5K tokens | 2.8K + 2.5K | 10.3K | Archived variants |
| PHYSICS-DOCS-COMPRESSED.md | (no original) | - | 6.2K tokens | 6.2K | Keep if in use |
| INFERENCE-PHYSICS-THEORY.md | (no separate compressed) | 3.8K tokens | - | 3.8K | Archive |
| Metadata index files | DOCS-COMPRESSED-INDEX.md etc | 2.5K | 4.1K | 6.6K | Delete both |

### Analysis

**Patterns detected:**

1. **Dual format strategy:** Some files kept in both verbose + compressed versions for comparison
2. **Incomplete compression:** Some compressed files exist without originals (orphaned)
3. **Metadata bloat:** Multiple INDEX files documenting compression (3.2K tokens of meta about compression)
4. **Generational accumulation:** Files from Jan 30 - Feb 1 all still present

### Root Cause

Token optimization project created compressed variants but didn't delete originals to preserve comparison data.

### Recommendation: Choose Format

**Strategy for different file types:**

| File Size | Recommendation | Logic |
|-----------|---|---------|
| < 3K tokens | Keep original only | Fast to read, compression not worth complexity |
| 3-10K tokens | Keep original (most useful) | Readable and useful, compression adds little value |
| 10-25K tokens | **Keep COMPRESSED + reference** | Significant savings, reference preserves links |
| > 25K tokens | **Archive original, keep COMPRESSED** | Huge savings, archive original for decompression if needed |

**Specific deletions:**

1. Delete `/docs/_archived/SULTRY-VEGAS-FINAL-181-210.md` (keep only compressed + reference)
   - **Saves:** 39.1K tokens
   
2. Delete `/docs/_archived/BOUNDARY-FINDINGS-REPORT-COMPRESSED.md` AND `/docs/_archived/BOUNDARY-FINDINGS-COMPRESSED.md`
   - Keep: Full `BOUNDARY-FINDINGS-REPORT.md` (5K tokens, frequently referenced)
   - **Saves:** 5.3K tokens
   
3. Delete all COMPRESSED metadata indices:
   - DOCS-COMPRESSED-INDEX.md (335 lines, 9.1K tokens)
   - OPTIMIZATION-SUMMARY-2026-02-01.md (311 lines, 8.8K tokens)
   - OPTIMIZATION_INDEX.md (284 lines, 8.3K tokens)
   - PLANS-COMPRESSED-INDEX.md (264 lines, 7.6K tokens)
   - **Saves:** 34.8K tokens (metadata about optimization, not needed)

4. Clean up orphaned compressed files:
   - PHYSICS-DOCS-COMPRESSED.md (no original, 6.2K tokens)
   - MISC-DOCS-COMPRESSED.md (188 lines, 5.4K tokens)
   - NASHVILLE-DOCS-COMPRESSED.md (378 lines, 9.2K tokens)
   - **Recommendation:** Delete (unused, orphaned)
   - **Saves:** 20.8K tokens

**Total savings from this section:** 100K+ tokens

---

## Problem 3: Redundant Session Snapshots (CRITICAL)

### Issue

Multiple snapshots of same session state accumulate over time:

**Session context files (not archives):**
- `CLAUDE.md` (87 lines, 900 tokens) - Outdated project guide
- `TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md` (603 lines, 20.3K tokens) - Latest, most complete
- `OPTIMIZATION-QUICK-REFERENCE.md` (139 lines, 3.8K tokens) - Quick version of above
- `DEEP_ANALYSIS_RESULTS.md` (5.7K) - Variant of above
- `TOKEN-OPTIMIZATION-START-HERE.md` (3.9K) - Entry point (no longer needed)
- `COMPRESSION_EXECUTIVE_SUMMARY.txt` (8.9K) - Summary (redundant)

**Plus archived variants (many)**

**Plus reports directory duplicates:**
- `docs/reports/TOKEN-OPTIMIZATION-2026-02-02.md` (11.3K tokens)
- `docs/reports/TOKEN-OPTIMIZATION-REPORT-2026-02-02.md` (1.1K tokens)
- Root: `TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md` (20.3K tokens)

### Analysis

These files are **analysis outputs**, not project files. They describe token optimization work but consuming tokens to describe token optimization is counterproductive.

### Recommendation: Single Source of Truth

**Keep:** `TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md` (latest, comprehensive)

**Delete:**
- TOKEN-OPTIMIZATION-START-HERE.md
- OPTIMIZATION-QUICK-REFERENCE.md
- COMPRESSION_EXECUTIVE_SUMMARY.txt
- DEEP_ANALYSIS_RESULTS.md
- TOKEN-OPTIMIZATION-2026-02-02.md (superseded)
- TOKEN-OPTIMIZATION-REPORT-2026-02-02.md (duplicate)
- OPTIMIZATION-QUICK-START.md in reports/

**Savings:** 61.3K tokens

---

## Problem 4: Prompt File Redundancy (MEDIUM)

### Issue

Six prompt concept files split into ranges (1-10, 11-20, 21-30, 31-40, 41-50, 51-60):

- Total size: 38.5K tokens
- Highly repetitive structure (same template repeated 60 times)
- Each concept: ~600-700 words of generation prompt

**Duplication detected:**
- Identical photo direction language across all 60 concepts
- Same photography specifications (Canon R5, ISO 4000, etc.)
- Same bar/venue descriptions (just venue name changes)
- Same attire descriptions (just color/style combinations)

### Current Usage

These files are **generation references**, not development docs. They should be:
- Read once during generation planning
- Referenced but not re-read per session

### Recommendation: Consolidation + Indexing

**Action:** Create metadata index only:

```markdown
# Prompt Concepts Index

**Total:** 60 concepts (dive bar + nashville + vegas variants)
**Location:** prompts/dive-bar-concepts-*.md (6 files)
**Format:** Markdown concept blocks (name, attire, hair, detailed generation prompt)

**Ranges:**
- 1-10: Foundational dive bar concepts
- 11-20: Variations and atmosphere
- 21-30: Extended variations
- 31-40: Austin-specific concepts
- 41-50: Regional variations
- 51-60: Reserved for future expansion

**Access pattern:** Read specific range needed (1-10 for planning, etc.)
```

**Replace prompts with index:** Move actual concept files to `/prompts/_archive/` (still accessible if needed)

**Keep lightweight reference:** ~500 tokens max

**Savings:** 38K tokens

---

## Problem 5: Verbose Documentation (MEDIUM)

### Issue

Large reference files with low compression opportunity but high verbosity:

| File | Size | Tokens | Type | Compression |
|------|------|--------|------|-------------|
| FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md | 23.5K | 5.8K | Technical reference | Can reduce to 2K (65%) |
| BOUNDARY-FINDINGS-REPORT.md | 20.4K | 5.0K | Research findings | Can reduce to 2K (60%) |
| INFERENCE-PHYSICS-THEORY.md | 15.3K | 3.8K | Theory documentation | Can reduce to 1.5K (60%) |
| KNOWLEDGE_BASE.md | - | 12K | Reference index | Already compressed |
| PHYSICS-CAPABILITY-MATRIX.md | 11.1K | 2.7K | Reference table | Already concise |

### Analysis

- **BOUNDARY-FINDINGS-REPORT.md:** 540 lines of detailed test results. First 100 lines provide all critical boundaries; remainder is repetitive validation. Can be summarized to key findings table.
- **FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md:** 23.5K but mostly explanatory. Core formula + component ratings table is 1/3 actual content.
- **INFERENCE-PHYSICS-THEORY.md:** 15.3K of physics explanation that isn't needed per session.

### Recommendation: Summary-Based Compression

**BOUNDARY-FINDINGS-REPORT.md compression strategy:**

Keep:
- Validated boundaries table (necklines, hosiery, hemlines)
- Timing windows
- Critical findings (fishnet = instant block)

Remove:
- Detailed methodology explanation (already in METHODOLOGY file)
- Repetitive success rate documentation
- Full validation traces

**Estimated compression:** 5.0K → 1.8K tokens (64% savings)

**FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md compression:**

Keep:
- Safety bypass formula
- Component effectiveness table
- Word allocation breakdown
- Key principles (5 bullet points)

Remove:
- Verbose component explanations
- Extended discussion of semantic orthogonality
- Training data overlap discussion

**Estimated compression:** 5.8K → 1.9K tokens (67% savings)

**Total potential savings from documentation compression:** 12K tokens

---

## Problem 6: Plans Directory (MEDIUM)

### Issue

Planning documents from 2026-02-01 experimentation phase:

- 5 detailed plan files (14K-17K bytes each)
- 2 compressed/index variants
- All marked "2026-02-01" (older, may be obsolete)

**Files:**
1. `2026-02-01-vegas-pool-rewrite.md` (16.2K)
2. `2026-02-01-creative-lace-pool.md` (17.3K)
3. `2026-02-01-luxury-pool-retry.md` (14.5K)
4. `2026-02-01-gemini-boundary-mapping-design.md` (15.9K)
5. Plus PLANS-COMPRESSED-INDEX.md, PLANS-COMPRESSED variants

### Analysis

Plans from Feb 1 may be obsolete given current date is Feb 3. Check if any are actively in use.

**Question for review:**
- Are these plans current or historical?
- If historical: Archive to `_archived/plans-2026-02-01/`
- If current: Keep only active plan, archive others

### Recommendation: Archive Decision

If all completed/obsolete: Archive entire `/plans/` directory to `/docs/_archived/plans-2026-02-01-snapshot/`

**Savings if archived:** 20.5K tokens

If some are active: Keep only active plan in `/plans/`, archive others.

---

## Comprehensive Savings Summary

### Quick Wins (Low Risk, 30 Minutes)

| Item | Action | Savings | Priority |
|------|--------|---------|----------|
| Session files | Delete 6 archived session files | 25.1K tokens | CRITICAL |
| Metadata indices | Delete DOCS/OPTIMIZATION/PLANS indices | 34.8K tokens | CRITICAL |
| Start guides | Delete redundant START-HERE files | 8.8K tokens | HIGH |
| Reports duplication | Keep only latest TOKEN-OPTIMIZATION-AGENT | 15.2K tokens | HIGH |
| **Subtotal** | | **83.9K tokens** | |

### Medium Effort (1-2 Hours)

| Item | Action | Savings | Priority |
|------|--------|---------|----------|
| Compressed duplicates | Delete superseded compressed variants | 64.2K tokens | HIGH |
| Prompt concepts | Create index, archive concepts | 38K tokens | MEDIUM |
| Plans archive | Archive if obsolete | 20.5K tokens | MEDIUM |
| **Subtotal** | | **122.7K tokens** | |

### Advanced (2-3 Hours)

| Item | Action | Savings | Priority |
|------|--------|---------|----------|
| Documentation compression | Compress BOUNDARY/PHYSICS/INFERENCE | 12K tokens | MEDIUM |
| Script deduplication | Extract shared physics blocks | 3.1K tokens | LOW |
| **Subtotal** | | **15.1K tokens** | |

### **TOTAL POTENTIAL SAVINGS: 221.7K tokens (70%)**

---

## Implementation Roadmap

### Phase 1: Delete Obvious Redundancy (30 min)

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments

# Delete archived session files
rm -f docs/_archived/SESSION-RECOVERY-2026-02-01.md
rm -f docs/_archived/SESSION-2026-02-01-V10-V11-COMPRESSED.md
rm -f docs/_archived/SESSION-STATE-COMPRESSED.md
rm -f docs/_archived/SESSION-CONTEXT-COMPRESSED.md
rm -f docs/_archived/SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md
rm -f docs/_archived/SESSION-2026-02-01-IMAGEN-GENERATION.md

# Delete metadata indices
rm -f docs/_archived/DOCS-COMPRESSED-INDEX.md
rm -f docs/_archived/OPTIMIZATION-SUMMARY-2026-02-01.md
rm -f docs/_archived/OPTIMIZATION_INDEX.md
rm -f docs/_archived/OPTIMIZATION-QUICK-START.md
rm -f docs/plans/PLANS-COMPRESSED-INDEX.md

# Delete redundant session guides
rm -f TOKEN-OPTIMIZATION-START-HERE.md
rm -f OPTIMIZATION-QUICK-REFERENCE.md
rm -f docs/QUICK-REFERENCE-SESSION-START.md

# Keep reports clean (only keep latest)
rm -f docs/reports/TOKEN-OPTIMIZATION-2026-02-02.md
rm -f docs/reports/TOKEN-OPTIMIZATION-REPORT-2026-02-02.md
rm -f docs/reports/OPTIMIZATION-QUICK-START.md

git add -A && git commit -m "chore: Remove 22 redundant documentation files, reduce session cost by 83.9K tokens"
```

**Result:** 83.9K tokens saved

### Phase 2: Consolidate Compressed Files (30 min)

Move large originals to archive, keep compressed:
- Archive SULTRY-VEGAS-FINAL-181-210.md (keep only compressed)
- Archive NASHVILLE-* variants (keep only essentials)
- Archive BOUNDARY-FINDINGS-REPORT-COMPRESSED variants

**Result:** 64.2K tokens saved

### Phase 3: Documentation Compression (1 hour)

Compress key reference files:
1. BOUNDARY-FINDINGS-REPORT.md: 5.0K → 1.8K tokens
2. FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md: 5.8K → 1.9K tokens
3. INFERENCE-PHYSICS-THEORY.md: 3.8K → 1.5K tokens

Create new compressed versions, update references.

**Result:** 12K tokens saved

### Phase 4: Prompt Consolidation (Optional, 30 min)

Create prompt index, archive concept files:

**Result:** 38K tokens saved

---

## File Organization After Optimization

```
imagen-experiments/
├── CLAUDE.md (project overview)
├── README.md (minimal)
├── TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md (single source of truth)
├── docs/
│   ├── SESSION-MASTER-2026-02-02.md (current session context)
│   ├── KNOWLEDGE_BASE.md (compressed reference index)
│   ├── BOUNDARY-FINDINGS-REPORT.md (compressed to 1.8K)
│   ├── FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md (compressed to 1.9K)
│   ├── PHYSICS-CAPABILITY-MATRIX.md (concise reference)
│   ├── NASHVILLE-FINAL-30-CONCEPTS.md (generation reference)
│   ├── EXPERIMENTS_INDEX.md (active experiments)
│   ├── reports/
│   │   └── TOKEN-OPTIMIZATION-COMPREHENSIVE-2026-02-03.md (this file)
│   └── _archived/
│       ├── 2026-02-01-snapshot/ (plans from Feb 1, if obsolete)
│       ├── SULTRY-VEGAS-FINAL-181-210-COMPRESSED.md
│       └── [other historical docs]
├── prompts/
│   ├── INDEX.md (metadata only)
│   └── _archive/
│       └── dive-bar-concepts-*.md (if truly archived)
└── scripts/
    └── [vegas variants, physics engine]
```

---

## Session Token Usage Projections

### Before Optimization
- Session load: 220K tokens
- Status: ORANGE (70-85% of budget)

### After Phase 1 (Delete Redundancy)
- Session load: 136K tokens
- Status: GREEN (68% reduction)

### After Phase 2 (Consolidate Compressed)
- Session load: 72K tokens
- Status: GREEN (33% of budget)

### After Phase 3 (Compress Docs)
- Session load: 60K tokens
- Status: GREEN (30% of budget)

### After Phase 4 (Prompt Index)
- Session load: 22K tokens
- Status: GREEN (11% of budget)

---

## Recommendations by Urgency

### CRITICAL (Do Today)
- [ ] Delete 6 archived session files
- [ ] Delete metadata indices (DOCS/OPTIMIZATION/PLANS)
- [ ] Delete redundant START-HERE files
- [ ] Consolidate reports to single TOKEN-OPTIMIZATION-AGENT file

**Time:** 20 minutes  
**Savings:** 83.9K tokens

### HIGH (This Week)
- [ ] Archive or consolidate compressed file variants
- [ ] Update SESSION-MASTER to point to archived docs
- [ ] Test session load after changes

**Time:** 30 minutes  
**Savings:** 64.2K tokens

### MEDIUM (Next Week)
- [ ] Compress BOUNDARY/PHYSICS/INFERENCE documentation
- [ ] Decide on prompt file archival strategy
- [ ] Update all references in active files

**Time:** 2 hours  
**Savings:** 50K tokens

### LOW (Nice to Have)
- [ ] Extract shared physics blocks from Vegas scripts
- [ ] Create unified concept generation framework
- [ ] Document final optimization decisions

**Time:** 2-3 hours  
**Savings:** 3K+ tokens

---

## Verification Checklist

After implementing changes:
- [ ] Run `git status` to verify all deletes
- [ ] Search for broken references in remaining files
- [ ] Test SESSION-MASTER loads completely
- [ ] Verify no files reference deleted archives
- [ ] Check prompt access still works (if archived)
- [ ] Measure new session token count
- [ ] Create commit with clear message

---

## Appendix: File Inventory

### Root Level Files (Consolidate to 2-3)
- CLAUDE.md (87 lines) - Keep
- README.md (913 bytes) - Keep (minimal)
- TOKEN-OPTIMIZATION-AGENT-REPORT-2026-02-03.md (20.3K) - Keep (comprehensive)
- TOKEN-OPTIMIZATION-START-HERE.md (3.9K) - DELETE
- OPTIMIZATION-QUICK-REFERENCE.md (3.8K) - DELETE
- COMPRESSION_EXECUTIVE_SUMMARY.txt (8.9K) - DELETE
- DEEP_ANALYSIS_RESULTS.md (5.7K) - DELETE

### Active Docs (Keep as-is, but compress verbosity)
- SESSION-MASTER-2026-02-02.md (4.7K) - KEEP
- KNOWLEDGE_BASE.md (12K) - KEEP (already compressed)
- BOUNDARY-FINDINGS-REPORT.md (5K) - COMPRESS to 1.8K
- FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md (5.8K) - COMPRESS to 1.9K
- PHYSICS-CAPABILITY-MATRIX.md (2.7K) - KEEP (concise)
- NASHVILLE-FINAL-30-CONCEPTS.md (size unknown) - KEEP
- EXPERIMENTS_INDEX.md - KEEP
- REFERENCE-IMAGE-VALIDATION.md - KEEP
- TOKEN_OPTIMIZATION_RESULTS.md - KEEP
- QUICK-REFERENCE-SESSION-START.md (1.1K) - DELETE (references archived files)

### Reports Directory
- TOKEN-OPTIMIZATION-2026-02-02.md (11.3K) - DELETE
- TOKEN-OPTIMIZATION-REPORT-2026-02-02.md (1.1K) - DELETE
- OPTIMIZATION-QUICK-START.md (300 bytes) - DELETE
- README.md (700 bytes) - DELETE
- DETAILED-FILE-ANALYSIS.md (2.7K) - REVIEW (keep if unique content)

### Archived Docs (36 files, ~207K tokens)
- Session files (6) - DELETE
- Compressed duplicates (15) - CONSOLIDATE/DELETE
- Metadata files (8) - DELETE
- Historical reports (7) - ARCHIVE

### Plans Directory (7 files, 20.5K tokens)
- If obsolete: Archive all to `_archived/plans-snapshot-2026-02-01/`
- If active: Keep only current plan, archive others

### Prompts Directory (6 files, 38.5K tokens)
- If rarely accessed: Create INDEX.md, move concepts to `_archive/`
- If actively generated from: KEEP as-is (generation workflow dependency)

---

**Report completed:** 2026-02-03  
**Estimated implementation time:** 3-4 hours total  
**Estimated token savings:** 221.7K tokens (70% reduction)  
**Next review date:** 2026-02-10

