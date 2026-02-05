# Detailed File-by-File Token Analysis

## Script Files: 2.3 MB Total, ~760,000 tokens

### Vegas Series Duplication (V10-V13)

#### v10-transcendence.js (62 KB, 372 lines)
- **Status:** Unique, no redundancy
- **Physics:** Inline functions, not extracted
- **Token Cost:** ~20,700 tokens
- **Opportunity:** Extract physics for reuse

#### v11-gaze.js (64 KB, 416 lines)  
- **Status:** Unique physics variant
- **Physics:** Inline, similar to v10 but with gaze-specific extensions
- **Token Cost:** ~21,300 tokens
- **Opportunity:** Check if physics blocks identical to v12/v13

#### v12-exotic.js (32 KB, 357 lines)
- **Status:** CRITICAL DUPLICATION
- **Physics:** LIGHT_PHYSICS, SKIN_PHYSICS, CAMERA_PHYSICS, GAZE_PHYSICS all inline
- **Token Cost:** ~10,700 tokens
- **Redundancy:** 100% identical to v13-two-piece.js
- **Savings:** Extract physics module = -1,500 tokens per file
- **Priority:** HIGH

#### v12-apex.js (54 KB, 421 lines)
- **Status:** Different variant, likely unique physics
- **Token Cost:** ~18,000 tokens
- **Action:** Analyze against v12-exotic (check for same blocks)

#### v13-two-piece.js (40 KB, 378 lines)
- **Status:** CRITICAL DUPLICATION  
- **Physics:** LIGHT_PHYSICS, SKIN_PHYSICS, CAMERA_PHYSICS, GAZE_PHYSICS, buildPreamble, buildImperfections all identical to v12
- **Token Cost:** ~12,700 tokens
- **Redundancy:** Can eliminate ~1,500 tokens with physics module
- **Priority:** HIGH

#### Other Vegas Scripts (v4-v9, variants)
- **Total:** ~20 additional scripts, 40-50 KB each
- **Status:** Older versions, likely contain similar physics blocks
- **Opportunity:** Batch extraction if v10-v13 pattern identified
- **Risk:** High - need to verify compatibility

### Recommendation for Scripts

**Immediate:**
1. Extract v12 + v13 physics to shared module
2. Test both scripts import correctly
3. Verify no behavioral changes

**Phase 2:**
- Check v11 physics against v12 (likely 80% overlap)
- Analyze v10 physics (may differ significantly)
- Consider architectural refactoring if v4-v9 pattern confirmed

---

## Documentation Files: 1.1 MB Total, ~400,000 tokens

### Session Files (7 files, ~85,000 tokens) - DELETE ALL BUT ONE

#### SESSION-MASTER-2026-02-02.md (16 KB, 1,641 words)
- **Status:** KEEP - Latest and most comprehensive
- **Content:** Complete project state snapshot
- **Date:** 2026-02-02 (most recent)
- **Token Cost:** ~5,400 tokens
- **Action:** KEEP as authoritative

#### SESSION-RECOVERY-2026-02-01.md (12 KB, 1,268 words)
- **Status:** DELETE - Superseded by master
- **Content:** Recovery plan after context regression
- **Date:** 2026-02-01 (older)
- **Token Cost:** ~4,200 tokens
- **Reason:** Master is 1 day newer, should incorporate learnings
- **Action:** DELETE

#### SESSION-CONTEXT-MASTER-COMPRESSED-2026-02-01.md (12 KB, 1,200 words)
- **Status:** DELETE - Compressed version of other files
- **Content:** Compressed session context
- **Token Cost:** ~4,000 tokens
- **Reason:** Unnecessary compression layer
- **Action:** DELETE

#### SESSION-2026-02-01-V10-V11-COMPRESSED.md (12 KB, 1,160 words)
- **Status:** DELETE - Dated variant
- **Content:** Compressed v10-v11 session notes
- **Date:** 2026-02-01 (old)
- **Token Cost:** ~3,900 tokens
- **Action:** DELETE

#### SESSION-STATE-COMPRESSED.md (12 KB, 1,210 words)
- **Status:** DELETE - Metadata about compression
- **Content:** Session state in compressed form
- **Token Cost:** ~4,000 tokens
- **Action:** DELETE

#### SESSION-CONTEXT-COMPRESSED.md (12 KB, 1,245 words)
- **Status:** DELETE - Duplicate of master concept
- **Content:** Another compressed session context
- **Token Cost:** ~4,100 tokens
- **Action:** DELETE

#### SESSION-2026-02-01-IMAGEN-GENERATION.md (12 KB, 1,180 words)
- **Status:** DELETE - Specific phase documentation
- **Content:** Focused on generation phase only
- **Token Cost:** ~3,900 tokens
- **Action:** DELETE

#### ULTIMATE-SESSION-BREAKTHROUGH.md (12 KB, 1,160 words)
- **Status:** DELETE - Celebratory documentation  
- **Content:** Discovery notes, not operational
- **Token Cost:** ~3,900 tokens
- **Action:** DELETE

**Subtotal Savings:** ~32,000 tokens (keep 5,400, delete 26,600)

---

### Large Original Documents (30 files, ~150,000 tokens)

#### SULTRY-VEGAS-FINAL-181-210.md (172 KB, 24,653 words) 
- **Status:** KEEP
- **Content:** Complete Vegas session execution log
- **Token Cost:** ~82,000 tokens
- **Alternative:** SULTRY-VEGAS-FINAL-181-210-COMPRESSED.md exists
- **Recommendation:** KEEP original, DELETE compressed
- **Reason:** Original already at 172 KB; compressed version only 12 KB (12K words) - too much information loss for marginal savings

#### phase1-experiment-set-a.md (32 KB, 4,118 words)
- **Status:** KEEP - Active reference
- **Content:** Phase 1 experimental design
- **Token Cost:** ~13,700 tokens
- **Action:** KEEP

#### FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md (24 KB, 3,103 words)
- **Status:** CONDITIONAL KEEP
- **Content:** Physics theory and methodology
- **Token Cost:** ~10,300 tokens
- **Alternative:** FIRST-PRINCIPLES-PHYSICS-COMPRESSED.md (2.2 KB, 300 words)
- **Risk:** Compressed version loses 90% of content - likely too aggressive
- **Recommendation:** KEEP original if methodology needed; DELETE compressed unless verified essential

#### NASHVILLE-GENERATION-TRACKER.md (20 KB, 2,831 words)
- **Status:** ARCHIVE
- **Content:** Generation tracking from completed phase
- **Token Cost:** ~9,400 tokens
- **Related Files:** NASHVILLE-GENERATION-EXECUTION.md, NASHVILLE-PREPARATION-COMPLETE.md
- **Recommendation:** Move to archived-plans/, consolidated summary in SESSION-MASTER

#### NASHVILLE-HONKY-TONK-VALIDATION.md (18 KB, 2,492 words)
- **Status:** ARCHIVE
- **Token Cost:** ~8,300 tokens
- **Action:** Move to archived-plans/

#### NASHVILLE-GENERATION-EXECUTION.md (18 KB, 2,559 words)
- **Status:** ARCHIVE
- **Token Cost:** ~8,500 tokens
- **Action:** Move to archived-plans/

#### NASHVILLE-PREPARATION-COMPLETE.md (20 KB, 2,417 words)
- **Status:** ARCHIVE
- **Token Cost:** ~8,000 tokens
- **Action:** Move to archived-plans/

#### BOUNDARY-FINDINGS-REPORT.md (20 KB, 2,928 words)
- **Status:** ARCHIVE
- **Content:** Phase-specific findings
- **Token Cost:** ~9,700 tokens
- **Action:** Move to archived-plans/

#### INFERENCE-PHYSICS-THEORY.md (16 KB, 2,244 words)
- **Status:** CONDITIONAL KEEP
- **Content:** Physics theory for model inference
- **Token Cost:** ~7,500 tokens
- **Question:** Still relevant? Move to archived-plans/ if phase complete

### Redundant Compressed Variants (to delete)

1. **SULTRY-VEGAS-FINAL-181-210-COMPRESSED.md** (12 KB)
   - Original: 172 KB, 24,653 words
   - Compressed: 12 KB, 2,251 words
   - Ratio: 9% of original
   - Status: DELETE (too much compression, original large enough)
   - Savings: ~4,000 tokens

2. **NASHVILLE-DOCS-COMPRESSED.md** (16 KB)
   - References: NASHVILLE-PREPARATION-COMPLETE.md (20 KB)
   - Status: DELETE (both will be archived)
   - Savings: ~5,300 tokens

3. **PHYSICS-DOCS-COMPRESSED.md** (12 KB)
   - Source: PHYSICS-CAPABILITY-MATRIX.md (12 KB)
   - Status: DELETE (no size advantage, delete both or keep original)
   - Savings: ~4,000 tokens

4. **MISC-DOCS-COMPRESSED.md** (7 KB)
   - Status: DELETE (unclear scope, probably historical)
   - Savings: ~2,300 tokens

5. **FIRST-PRINCIPLES-PHYSICS-COMPRESSED.md** (2.2 KB)
   - Source: FIRST-PRINCIPLES-PHYSICS-METHODOLOGY.md (24 KB)
   - Compression: 9% of original
   - Status: DELETE (verify methodology not needed; if needed, keep full version)
   - Savings: ~730 tokens

**Subtotal Savings:** ~16,300 tokens

---

### Metadata and Process Docs (10 files, ~40,000 tokens) - DELETE

#### COMPRESSION-* Files (5 files)
- COMPRESSION-ANALYSIS-2026-02-01.md (12 KB)
- COMPRESSION-REPORT-2026-02-01.md (6 KB)
- COMPRESSION-COMPLETION-SUMMARY.txt (7.5 KB)
- COMPRESSION-VISUAL-GUIDE.txt (7.6 KB)
- COMPRESSION-SUMMARY-FINAL-2026-02-01.md (7.4 KB)
- **Total:** ~40 KB
- **Token Cost:** ~13,300 tokens
- **Status:** DELETE - Metadata about compression process, not project content
- **Reason:** Next optimization session doesn't need history of previous optimizations
- **Savings:** ~13,300 tokens

#### INDEX/Quick-Start Files (5 files)
- DOCS-COMPRESSED-INDEX.md (11 KB, 1,401 words)
- PLANS-COMPRESSED-INDEX.md (8.6 KB, 1,362 words)
- OPTIMIZATION-QUICK-START.md (6.2 KB, 850 words)
- QUICK-REFERENCE-SESSION-START.md (3.5 KB, 500 words)
- OPTIMIZATION-SUMMARY-2026-02-01.md (8.6 KB, 1,200 words)
- **Total:** ~38 KB
- **Token Cost:** ~12,600 tokens
- **Status:** DELETE or REPLACE with single SESSION-MASTER-2026-02-02.md reference
- **Reason:** Session Master should be authoritative; no need for multiple indexes
- **Savings:** ~12,600 tokens

#### Archive
- docs/_compressed/imagen-concepts-2026-01-31.tar.gz (194 KB)
- **Token Cost:** 0 (binary, not read)
- **Status:** DELETE
- **Reason:** Unknown contents, likely from old phase

**Subtotal Savings:** ~25,900 tokens

---

## Implementation Priority Matrix

| File | Size | Tokens | Action | Priority | Savings |
|------|------|--------|--------|----------|---------|
| SESSION-RECOVERY-2026-02-01.md | 12K | 4,200 | DELETE | 1 | 4,200 |
| SESSION-CONTEXT-MASTER-COMPRESSED | 12K | 4,000 | DELETE | 1 | 4,000 |
| SESSION-2026-02-01-V10-V11-COMPRESSED | 12K | 3,900 | DELETE | 1 | 3,900 |
| SESSION-STATE-COMPRESSED.md | 12K | 4,000 | DELETE | 1 | 4,000 |
| SESSION-CONTEXT-COMPRESSED.md | 12K | 4,100 | DELETE | 1 | 4,100 |
| SESSION-2026-02-01-IMAGEN-GENERATION | 12K | 3,900 | DELETE | 1 | 3,900 |
| ULTIMATE-SESSION-BREAKTHROUGH.md | 12K | 3,900 | DELETE | 1 | 3,900 |
| Physics extraction (v12+v13) | - | - | REFACTOR | 1 | 8,200 |
| SULTRY-VEGAS-COMPRESSED.md | 12K | 4,000 | DELETE | 2 | 4,000 |
| NASHVILLE-DOCS-COMPRESSED.md | 16K | 5,300 | DELETE | 2 | 5,300 |
| PHYSICS-DOCS-COMPRESSED.md | 12K | 4,000 | DELETE | 2 | 4,000 |
| MISC-DOCS-COMPRESSED.md | 7K | 2,300 | DELETE | 2 | 2,300 |
| FIRST-PRINCIPLES-COMPRESSED.md | 2.2K | 730 | DELETE | 2 | 730 |
| COMPRESSION-*.md (5 files) | 40K | 13,300 | DELETE | 3 | 13,300 |
| DOCS/PLANS INDEX (5 files) | 38K | 12,600 | DELETE | 3 | 12,600 |
| NASHVILLE-* (4 files) | 76K | 25,300 | ARCHIVE | 4 | 0 |
| plans/ directory | 96K | 32,000 | ARCHIVE | 4 | 0 |

---

## Verification Checklist

Before deleting:
- [ ] Confirm SESSION-MASTER-2026-02-02.md has all essential context
- [ ] Verify no critical recovery info exists only in SESSION-RECOVERY-2026-02-01.md
- [ ] Confirm physics extraction doesn't break v12 or v13 functionality
- [ ] Check if FIRST-PRINCIPLES-PHYSICS-METHODOLOGY still needed (methodology vs results)
- [ ] Test that archived plans are accessible if needed

---

## Deleted File Recovery Instructions

If needed, deleted files can be recovered from git:
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments
git log --name-status -- docs/SESSION-RECOVERY-2026-02-01.md
git show <commit>:docs/SESSION-RECOVERY-2026-02-01.md > docs/SESSION-RECOVERY-2026-02-01.md.recovered
```

