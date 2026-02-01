# Phase 13: Git & VCS Optimization - Execution Plan

**Date:** 2026-01-31
**Target:** 8 optimizations (git cleanup and optimization)
**Estimated Recovery:** 10-20 MB + 100K tokens
**Status:** PLANNING - CRITICAL FINDINGS!

---

## Critical Discovery

**.git directory:** 128 MB (HUGE!)
**Pack size:** 72.12 MB
**Large objects found:** 600+ MB of files in git history that shouldn't be there!

---

## Largest Objects in Git History

| File | Size | Issue |
|------|------|-------|
| **guest-shows.json** | 300 MB | Generated scraper output |
| **checkpoint_guest-shows.json** | 300 MB | Scraper cache file |
| **setlist-entries.json** | 22 MB | Generated data |
| **checkpoint_shows_batch.json** | 20 MB | Scraper checkpoint |
| **shows.json** | 20 MB | Generated output |
| **libdmb_transform.rlib** | 10 MB | WASM build artifact |
| **libsyn.rlib** | 6 MB | Rust build artifact |
| **libjs_sys.rlib** | 6 MB | WASM dependency |
| **superseded-backups.tar.gz** | 6.9 MB | Old archive (replaced) |

**Total problematic files:** ~700 MB in git history!

---

## Root Cause Analysis

**Problem:** Large generated files were committed to git

**Files that should NEVER be in git:**
1. **Scraper outputs:** `*/output/*.json` (generated data)
2. **Scraper caches:** `*/cache/*.json` (temporary checkpoints)
3. **WASM build artifacts:** `*/target/` (Rust compilation outputs)
4. **Generated static data:** Should be built, not committed

**Why this happened:**
- .gitignore may have been incomplete
- Files committed before .gitignore rules added
- Build artifacts accidentally staged

---

## Phase 13 Strategy

### CONSERVATIVE Approach (Recommended)

**Do NOT rewrite git history** (preserves all commits, safe)

**Instead:**
1. ✅ Add comprehensive .gitignore rules
2. ✅ Remove large files from current working tree
3. ✅ Run `git gc --aggressive` (garbage collection)
4. ✅ Run `git prune` (remove unreachable objects)
5. ✅ Document large files for awareness

**Expected recovery:** 10-30 MB (through gc/prune only)
**Risk:** None (no history rewriting)

---

### AGGRESSIVE Approach (NOT Recommended)

**Rewrite git history** to remove large files

**Tools:** git filter-repo, BFG Repo-Cleaner

**Recovery potential:** 50-100 MB (removes files from history)

**Risks:**
- ⚠️ Rewrites all commits
- ⚠️ Changes commit SHAs
- ⚠️ Breaks existing clones
- ⚠️ Requires force push
- ⚠️ Destroys history

**Recommendation:** DO NOT DO THIS for active workspace

---

## Execution Plan - Conservative Approach

### Optimization 1-2: Improve .gitignore
**Action:** Add missing patterns
```gitignore
# Scraper outputs and caches
**/output/*.json
**/cache/*.json
**/checkpoint*.json

# WASM/Rust build artifacts
**/target/
**/*.rlib
**/*.rmeta

# Generated data (should be built)
**/static/data/*.json
```

### Optimization 3: Remove large files from working tree
**Action:** Remove if present, commit removal
```bash
git rm --cached projects/dmb-almanac/app/scraper/output/*.json
git rm --cached projects/dmb-almanac/app/scraper/cache/*.json
```

### Optimization 4-5: Git garbage collection
**Action:** Aggressive cleanup
```bash
git gc --aggressive --prune=now
```

**Expected:** Repack objects, remove unreachable

### Optimization 6: Git prune
**Action:** Remove unreachable objects
```bash
git prune --expire=now
```

### Optimization 7: Verify pack size
**Action:** Measure improvement
```bash
git count-objects -vH
```

### Optimization 8: Document large objects
**Action:** Create reference for future cleanup

---

## Expected Results (Conservative)

**Before:**
- .git size: 128 MB
- Pack size: 72.12 MB
- Loose objects: 55.32 MB

**After (estimated):**
- .git size: 100-110 MB (10-20 MB reduction)
- Pack size: 60-65 MB
- Loose objects: minimal

**Note:** Large files remain in history, but unreachable objects pruned

---

## Alternative: Git LFS Migration

**For future consideration:**

Large generated files could use Git LFS (Large File Storage):
- guest-shows.json → Git LFS
- checkpoint files → Git LFS
- Build artifacts → Excluded entirely

**Not doing now:** Would require rewriting history (risky)

---

## Success Criteria

- [ ] .gitignore improved with all necessary patterns
- [ ] Large files removed from working tree (if present)
- [ ] git gc --aggressive executed
- [ ] git prune executed
- [ ] Pack size reduced by 10+ MB
- [ ] .git directory size reduced
- [ ] All commits preserved (no history rewriting)
- [ ] Documentation created for large objects

---

## Risk Assessment

**CONSERVATIVE approach (what we're doing):**
- ✅ Zero risk to git history
- ✅ All commits preserved
- ✅ No force push needed
- ✅ Safe for collaborative work

**If we did AGGRESSIVE:**
- ⚠️ High risk - rewrites history
- ⚠️ Breaks existing clones
- ⚠️ Not reversible

---

## Next Steps

1. Check if large files exist in current working tree
2. Improve .gitignore
3. Remove large files from index (if present)
4. Run git gc --aggressive
5. Run git prune
6. Measure results
7. Document findings

---

**Created:** 2026-01-31
**Phase:** 13 of 15 (MEGA Optimization)
**Prerequisite:** Phases 1-12 complete (4.299M tokens + 471.94 MB)
**Approach:** Conservative (no history rewriting)
**Next:** Execute conservative git optimization
