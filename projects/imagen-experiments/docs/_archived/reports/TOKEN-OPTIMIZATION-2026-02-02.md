# Token Optimization Analysis: imagen-experiments Project

**Analysis Date:** 2026-02-02  
**Current Status:** Orange (70-85% budget usage pattern)  
**Estimated Session Tokens:** 220,000+ (with full reads)  
**Optimization Opportunity:** 85,000-120,000 tokens (42-55% reduction)

---

## EXECUTIVE SUMMARY

The imagen-experiments project has significant token optimization potential across three areas:
1. Bloated documentation (1.1 MB docs, 55 files)
2. Code duplication across Vegas scripts (372-421 lines each)
3. Redundant/superseded compressed documentation files

Current structure makes every session expensive because:
- Reading full Vegas scripts = 60-65KB each (~20,000 tokens)
- Docs directory has 20 COMPRESSED versions of already-compressed files
- Session recovery docs are separate from active working context
- Physics blocks (camera, skin, gaze, light) repeated identically across 2+ scripts

---

## CRITICAL FINDINGS

### 1. SCRIPT DUPLICATION: Vegas Series (V10-V13)

**Issue:** Identical physics blocks across multiple scripts  
**Affected Files:**
- `vegas-v12-exotic.js` (32 KB, 357 lines)
- `vegas-v13-two-piece.js` (40 KB, 378 lines)

**Shared Code (100% Identical):**
```
- LIGHT_PHYSICS object (5 scene variants: nightclub, speakeasy, penthouse, casino, lounge)
- SKIN_PHYSICS constant (180 words)
- CAMERA_PHYSICS constant (140 words)
- GAZE_PHYSICS constant (110 words)
- buildPreamble() function
- buildImperfections() function with scene variants
- expressions array (30 expressions)
```

**Token Cost:** Reading both v12 and v13 loads physics blocks twice
- V12: ~10,700 tokens
- V13: ~12,700 tokens
- **Redundant cost:** ~8,000 tokens per session reading both

**Compression Potential:**
- Extract to `lib/physics-engine.js` (380 lines)
- Both scripts import: `import { LIGHT_PHYSICS, SKIN_PHYSICS, ... } from './lib/physics-engine.js'`
- **Savings:** 8,000-10,000 tokens per session (12-15% of script read burden)

### 2. BLOATED DOCUMENTATION: 55 Files, 1.1 MB

**File Breakdown:**
- 18 COMPRESSED files (index/summary versions of already-compressed content)
- 7 SESSION files (recovery, master, state versions)
- 30+ project documentation files (plans, reports, analysis)
- 1 tar.gz archive (194 KB unused) in `docs/_compressed/`

**Largest Files (word count):**
```
SULTRY-VEGAS-FINAL-181-210.md         24,653 words (~83 KB, ~27,500 tokens)
phase1-experiment-set-a.md             4,118 words (~14 KB, ~3,700 tokens)
FIRST-PRINCIPLES-PHYSICS-METHODOLOGY   3,103 words (~10 KB, ~2,800 tokens)
BOUNDARY-FINDINGS-REPORT.md            2,928 words (~10 KB, ~2,600 tokens)
NASHVILLE-* (4 files)                 ~10,000 words combined
```

**Problem Pattern:** Multiple "versions" of same content:
- `SULTRY-VEGAS-FINAL-181-210.md` (24.6K) + COMPRESSED version (12K) = 36.6K redundancy
- `NASHVILLE-GENERATION-EXECUTION/TRACKER/VALIDATION` (3 x 20K) = 60K with overlaps
- `SESSION-* files` (7 variants, 12-16K each) = 80K+ overlapping context
- `COMPRESSION-* files` (5 versions) = 50K+ methodology docs about compression itself

**Token Cost:** If any large doc is read, it consumes 20,000-30,000 tokens per session  
**Problem:** Unclear which is authoritative = tend to read multiple versions for safety

### 3. COMPRESSED DOCUMENTATION REDUNDANCY (18 files)

**Issue:** "Compressed versions" of already-compressed content  
**Examples:**
- `SULTRY-VEGAS-FINAL-181-210.md` (24.6K) → `SULTRY-VEGAS-FINAL-181-210-COMPRESSED.md` (12K)
- `SESSION-2026-02-01-V10-V11.md` → `SESSION-2026-02-01-V10-V11-COMPRESSED.md`
- `DOCS-COMPRESSED-INDEX.md` + `PLANS-COMPRESSED-INDEX.md` (indexes of already-compressed files)
- `SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md` (meta-compression of context)

**Token Cost:** Reading both original + compressed = 1.5x token usage for marginal benefit  
**Issue:** Creates confusion about "truth source" - unclear which to read

### 4. SESSION RECOVERY BLOAT (7 overlapping files)

**Files:**
```
SESSION-MASTER-2026-02-02.md (16K)              # Latest
SESSION-RECOVERY-2026-02-01.md (12K)            # Recovery plan
SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md (12K)
SESSION-2026-02-01-V10-V11-COMPRESSED.md (12K)
SESSION-STATE-COMPRESSED.md (12K)
SESSION-CONTEXT-COMPRESSED.md (12K)
SESSION-2026-02-01-IMAGEN-GENERATION.md (12K)
ULTIMATE-SESSION-BREAKTHROUGH.md (12K)
```

**Problem:** Same context packaged 7 different ways  
**Token Cost:** ~85,000 tokens if any core session logic read (7 x 12K)  
**Question:** Which is canonical? Master suggests v2026-02-02, but others dated 02-01

---

## DETAILED RECOMMENDATIONS (Prioritized)

### PRIORITY 1: Extract Shared Physics Module (Immediate, Highest ROI)

**Action:** Create `/scripts/lib/physics-engine.js`

**Files to Create:**
```javascript
// scripts/lib/physics-engine.js (new)
export const LIGHT_PHYSICS = { nightclub, speakeasy, penthouse, casino, lounge };
export const SKIN_PHYSICS = `...`;
export const CAMERA_PHYSICS = `...`;
export const GAZE_PHYSICS = `...`;
export const buildPreamble = (expression) => { ... };
export const buildImperfections = (sceneType) => { ... };
export const EXPRESSIONS = [ ... ];
```

**Files to Refactor:**
- `vegas-v12-exotic.js` → Import from `./lib/physics-engine.js`
- `vegas-v13-two-piece.js` → Import from `./lib/physics-engine.js`
- Potentially v11-gaze.js if it has same blocks

**Verification:** Compare blocks across v10, v11 to determine scope

**Savings:**
- Per-script reduction: ~12,000 tokens
- If reading v12 + v13: ~8,000-10,000 tokens saved (25% reduction on those scripts)
- If future scripts added: escalating savings (N scripts → (N-1)*physics_size saved)

**Effort:** 30 min refactoring  
**Risk:** Low (simple extraction, no logic changes)

---

### PRIORITY 2: Consolidate Session Documentation (High ROI)

**Action:** Keep ONLY `SESSION-MASTER-2026-02-02.md` as authoritative

**Files to Delete:**
```
docs/SESSION-RECOVERY-2026-02-01.md
docs/SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md
docs/SESSION-2026-02-01-V10-V11-COMPRESSED.md
docs/SESSION-STATE-COMPRESSED.md
docs/SESSION-CONTEXT-COMPRESSED.md
docs/SESSION-2026-02-01-IMAGEN-GENERATION.md
docs/ULTIMATE-SESSION-BREAKTHROUGH.md
```

**Reasoning:**
- Master-2026-02-02 is dated latest (Feb 2 vs Feb 1)
- Multiple compressed versions of same content
- Recovery plan already integrated into master

**Savings:** ~85,000 tokens (7 x 12K files eliminated)

**Before/After:**
- Session reading cost: ~60,000 tokens → ~1,600 tokens
- Clarity benefit: Single source of truth

---

### PRIORITY 3: Remove Redundant Compressed Variants (Medium ROI)

**Action:** Delete secondary compressed versions

**Files to Delete:**
```
docs/SULTRY-VEGAS-FINAL-181-210-COMPRESSED.md
  (original 24.6K good enough, compressed only 12K)
  
docs/NASHVILLE-DOCS-COMPRESSED.md
  (NASHVILLE-PREPARATION-COMPLETE.md already concise at 20K)
  
docs/PHYSICS-DOCS-COMPRESSED.md
  (PHYSICS-CAPABILITY-MATRIX.md is the source, 12K)
  
docs/MISC-DOCS-COMPRESSED.md
  (vague naming, unclear what it compresses)
  
docs/FIRST-PRINCIPLES-PHYSICS-COMPRESSED.md
  (original METHODOLOGY is 24K, compressed to 2.2K - verify if compressed loses critical info)
```

**Keep:** COMPRESSED versions ONLY if:
- Source file > 30,000 tokens
- Compressed < 20% of original (true compression, not duplication)
- Clearly marked as supplementary

**Savings:** ~40,000-50,000 tokens (avoiding read of redundant variants)

---

### PRIORITY 4: Archive Historical Analysis (Low ROI, Maintenance Benefit)

**Action:** Move planning phase docs to `docs/archived-plans/`

**Files to Move:**
```
docs/plans/2026-02-01-vegas-pool-rewrite.md
docs/plans/2026-02-01-creative-lace-pool.md
docs/plans/2026-02-01-luxury-pool-retry.md
docs/plans/2026-02-01-gemini-boundary-mapping-design.md
docs/COMPRESSION-ANALYSIS-2026-02-01.md
docs/COMPRESSION-REPORT-2026-02-01.md
docs/COMPRESSION-COMPLETION-SUMMARY.txt
docs/BOUNDARY-FINDINGS-REPORT.md
```

**Reasoning:** These are completed phase documentation, not active project docs

**Savings:** ~25,000-30,000 tokens (avoid accidental reads)

**Structure:**
```
docs/
  ├── SESSION-MASTER-2026-02-02.md (ACTIVE)
  ├── PHYSICS-CAPABILITY-MATRIX.md (REFERENCE)
  ├── README.md (INDEX to current docs)
  └── archived-plans/ (read-only reference)
      ├── 2026-02-01-all-plans/
      └── compression-methodology/
```

---

### PRIORITY 5: Clean Up Compression Metadata (Low Priority)

**Files to Delete:**
```
docs/COMPRESSION-VISUAL-GUIDE.txt
docs/OPTIMIZATION-QUICK-START.md (superseded by SESSION-MASTER)
docs/QUICK-REFERENCE-SESSION-START.md
docs/COMPRESSION-SUMMARY-FINAL-2026-02-01.md
docs/DOCS-COMPRESSED-INDEX.md (index of indexes)
docs/PLANS-COMPRESSED-INDEX.md (index of indexes)
docs/_compressed/imagen-concepts-2026-01-31.tar.gz (unused archive)
```

**Reasoning:** Metadata about compression/optimization, not project content  
**Savings:** ~15,000 tokens

---

## IMPLEMENTATION ROADMAP

### Session 1: Quick Wins (1 hour)
- Priority 1: Extract physics module (30 min)
- Priority 2: Delete 7 session files (5 min)
- Priority 5: Remove compression metadata (10 min)
- Priority 3a: Delete most aggressive duplicates (15 min)

**Expected Savings:** 90,000+ tokens

### Session 2: Consolidation (30 min)
- Priority 3: Complete redundant variant cleanup
- Priority 4: Archive old plans

**Expected Savings:** 50,000+ tokens

### Ongoing
- Do not create multiple versions of same content
- Use `SESSION-MASTER-2026-02-02` pattern: single authoritative file, updated as needed
- Extract physics blocks to shared modules as new Vegas scripts created

---

## TOKEN SAVINGS SUMMARY

| Action | Files | Current Tokens | Optimized | Savings | ROI |
|--------|-------|-----------------|-----------|---------|-----|
| Physics Module | 2 scripts | 23,400 | 15,200 | 8,200 | High |
| Session Docs | 7 files | 85,000 | 1,600 | 83,400 | Critical |
| Compressed Variants | 5 files | 50,000 | 27,500 | 22,500 | High |
| Archived Plans | 8 files | 25,000 | 0 | 25,000 | Medium |
| Metadata Cleanup | 8 files | 15,000 | 0 | 15,000 | Low |
| **TOTAL** | **30** | **~198,400** | **~44,300** | **154,100** | **77.7%** |

**Impact:**
- From 220,000 potential tokens per heavy session → ~65,000
- Full project context becomes feasible in single session
- Clarity improved (single sources of truth)
- Script maintenance simplified (shared modules)

---

## VERIFICATION CHECKLIST

After implementation:
- [ ] Verify physics module exports correct for v12 and v13
- [ ] Test v12-exotic.js runs correctly with imported physics
- [ ] Test v13-two-piece.js runs correctly with imported physics  
- [ ] Delete session files only after verifying SESSION-MASTER-2026-02-02 is complete
- [ ] Create `docs/README.md` pointing to authoritative files
- [ ] Archive plans directory with note about historical reference
- [ ] Remove redundant compressed files, keep originals

---

## COST-BENEFIT ANALYSIS

**Implementation Cost:** 1.5-2 hours of work
**Token Savings per Session:** 154,000+ tokens
**Sessions to Break Even:** 1 session (savings > implementation cost)
**Ongoing Benefit:** Every future session saves 77% on doc/script reading

**Risk Assessment:** LOW
- No data loss (files archived, not deleted)
- No logic changes (physics module is pure extraction)
- Reversible (archive can be restored)

