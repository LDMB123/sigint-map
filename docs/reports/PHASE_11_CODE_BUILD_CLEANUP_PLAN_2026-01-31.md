# Phase 11: Code & Build Cleanup - Execution Plan

**Date:** 2026-01-31
**Target:** 20 optimizations (from MEGA plan)
**Estimated Recovery:** 50-100 MB disk + 200K tokens
**Status:** PLANNING

---

## Discovery Analysis

### Major Opportunities Found

#### 1. Emerson Violin PWA - MASSIVE Opportunity
**Size:** 572 MB total
- node_modules: 490 MB
- README files in node_modules: 217 files
- Estimated compression: 200-300 MB possible

**Note:** This is the 572 MB audit mentioned in Phase 14 plan - bringing it forward to Phase 11!

#### 2. Build Cache Directories
**Locations:** 8 .vite directories found
- projects/dmb-almanac/app/scraper/node_modules/.vite
- projects/dmb-almanac/app/node_modules/.vite
- projects/emerson-violin-pwa/node_modules/.vite
- And 5 more...

**Action:** Safe to delete (auto-regenerated on build)

#### 3. TypeScript Declaration Maps
**Pattern:** *.d.ts.map files throughout node_modules
**Purpose:** Source mapping for TypeScript declarations
**Action:** Not needed for production - can be removed

#### 4. node_modules README Compression
**Count:** 217+ README files across projects
**Estimated:** 2-5 MB of documentation
**Action:** Create compressed reference index

---

## Phase 11 Strategy

### HIGH PRIORITY: Emerson node_modules Cleanup

**This is Phase 14 work brought forward due to massive size!**

#### Option A: Full Cleanup (Recommended)
1. Audit unused dependencies
2. Remove unused packages
3. Run npm prune
4. Clear node_modules/.cache directories
5. Compress remaining README files

**Estimated Recovery:** 200-300 MB

#### Option B: Conservative (README compression only)
1. Compress 217 README files → index
2. Keep all packages intact

**Estimated Recovery:** 2-5 MB

**Recommendation:** Option A - Full cleanup (justifies bringing Phase 14 forward)

---

### MEDIUM PRIORITY: Build Cache Cleanup

**Target:** All .vite directories (8 locations)

**Actions:**
1. Measure total size of .vite directories
2. Delete all .vite caches (safe - auto-regenerated)
3. Document recovery

**Estimated Recovery:** 50-150 MB

---

### LOW PRIORITY: TypeScript Artifacts

**Target:** *.d.ts.map files in node_modules

**Actions:**
1. Count total .d.ts.map files
2. Measure total size
3. Remove (not needed for runtime)

**Estimated Recovery:** 5-20 MB

---

## Execution Plan - Phase 11

### Batch 1: Vite Cache Cleanup (5 optimizations)
**Target:** Delete all .vite directories
**Risk:** None (auto-regenerated)
**Recovery:** 50-150 MB

### Batch 2: Emerson README Compression (5 optimizations)
**Target:** Compress 217 README files → index
**Risk:** None (originals in npm registry)
**Recovery:** 2-5 MB + 100K tokens

### Batch 3: Emerson Dependency Audit (5 optimizations)
**Target:** Remove unused packages from Emerson
**Risk:** Low (with testing)
**Recovery:** 50-100 MB

### Batch 4: TypeScript Artifact Cleanup (3 optimizations)
**Target:** Remove .d.ts.map files
**Risk:** None (development-only files)
**Recovery:** 5-20 MB

### Batch 5: General Build Artifact Cleanup (2 optimizations)
**Target:** dist/ directories, .tsbuildinfo files
**Risk:** Low (auto-regenerated)
**Recovery:** Variable

---

## Success Criteria

- [ ] 20 optimization opportunities executed
- [ ] 50+ MB disk recovery (conservative)
- [ ] 100+ MB disk recovery (target)
- [ ] 200K+ token recovery
- [ ] Zero breaking changes
- [ ] All projects still build successfully

---

## Verification Requirements

**Before claiming completion:**
1. Run fresh disk measurement: `du -sh projects/*/` before & after
2. Test builds: `npm run build` in affected projects
3. Verify functionality: Quick smoke test
4. Count optimizations: 20 total across all batches
5. Document recovery with fresh measurements

---

## Risk Assessment

**LOW RISK:**
- .vite cache deletion (100% safe)
- .d.ts.map removal (dev-only)
- README compression (originals in registry)

**MEDIUM RISK:**
- Dependency removal (requires testing)
- dist/ cleanup (requires rebuild verification)

**MITIGATION:**
- Git commit before each batch
- Test builds after changes
- Keep package-lock.json for restoration

---

## Immediate Action

**Start with Batch 1 (lowest risk, high impact):**
1. Measure .vite directories
2. Delete all .vite caches
3. Verify builds still work
4. Document recovery

**Estimated time:** 15-20 minutes

---

**Created:** 2026-01-31
**Phase:** 11 of 15 (MEGA Optimization)
**Prerequisite:** Phases 1-10 complete (4.045M tokens + 85.74MB)
**Next:** Execute Batch 1 - Vite cache cleanup
