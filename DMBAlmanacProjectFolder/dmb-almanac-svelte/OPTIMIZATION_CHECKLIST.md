# Bundle Optimization Checklist

## Pre-Implementation

- [ ] Read `BUNDLE_ANALYSIS_SUMMARY.txt` (5 min)
- [ ] Review `BUNDLE_OPTIMIZATION_REPORT.md` sections 1-3 (15 min)
- [ ] Understand WASM investigation items (10 min)
- [ ] Backup current branch: `git checkout -b pre-optimization`
- [ ] Verify tests pass: `npm run test`
- [ ] Verify build works: `npm run build`
- [ ] Note current bundle size: `du -sh dist`

---

## Week 1: Quick Wins (18-25KB gzip savings)

### Priority 1: Replace Zod with Valibot (8-13KB savings)

**Setup (15 min)**
- [ ] Install valibot: `npm install valibot`
- [ ] Uninstall zod: `npm uninstall zod`
- [ ] Verify package.json updated
- [ ] Run: `npm run check` (should show error about zod import)

**Implementation (1-2 hours)**
- [ ] Open `/src/lib/db/dexie/sync.ts`
- [ ] Replace `import { z } from 'zod'` with valibot imports
- [ ] Update SyncMetaSchema definition
- [ ] Update type extraction (z.infer -> typeof)
- [ ] Update validation functions

**Verification (30 min)**
- [ ] Run: `npm run check` (no errors)
- [ ] Run: `npm run test` (all tests pass)
- [ ] Run: `npm run build`
- [ ] Verify build succeeds
- [ ] Check bundle size reduction: `du -sh dist`
- [ ] Expected: ~8-13KB reduction

**Commit**
- [ ] `git add src/lib/db/dexie/sync.ts package.json`
- [ ] `git commit -m "Replace Zod with Valibot for bundle reduction (-8-13KB gzip)"`

---

### Priority 2: Code-Split Dexie (10-12KB savings)

**Investigation (30 min)**
- [ ] Find all Dexie imports: `grep -r "from '\$lib/db/dexie" /src`
- [ ] Identify which routes/components import Dexie
- [ ] Check if Dexie needed on home page
- [ ] List pages that need Dexie:
  - [ ] /shows (yes/no)
  - [ ] /songs (yes/no)
  - [ ] /+layout.svelte (yes/no - for sync metadata?)

**Implementation (2-3 hours)**
- [ ] Update `/src/routes/+layout.svelte`:
  - [ ] Remove static Dexie import
  - [ ] Add dynamic import in onMount
  - [ ] Only initialize if needed

- [ ] Update data-heavy route layouts:
  - [ ] `/src/routes/shows/+layout.svelte` - add dynamic Dexie load
  - [ ] `/src/routes/songs/+layout.svelte` - add dynamic Dexie load
  - [ ] Update store exports to lazy-initialize

- [ ] Verify all imports work with dynamic loading

**Verification (30 min)**
- [ ] Run: `npm run dev`
- [ ] Test home page loads without Dexie
- [ ] Navigate to /shows - Dexie should load
- [ ] Navigate to /songs - Dexie should load
- [ ] Run: `npm run check` (no errors)
- [ ] Run: `npm run test` (all tests pass)
- [ ] Run: `npm run build`
- [ ] Expected: ~10-12KB from initial bundle (deferred)

**Commit**
- [ ] `git add src/routes/+layout.svelte src/routes/shows/+layout.svelte src/routes/songs/+layout.svelte`
- [ ] `git commit -m "Code-split Dexie to data routes (-10-12KB initial bundle)"`

---

## Week 2: Critical Investigation (60-130KB potential)

### Priority 3: WASM Lazy-Loading Audit (CRITICAL - 2-3 hours investigation)

**Investigation Phase 1: Check Current Loading (1 hour)**
- [ ] Open `/src/lib/wasm/bridge.ts` line 48
- [ ] Check: Is WASM imported statically or dynamically?
- [ ] Find all WASM imports: `grep -r "import.*wasm.*from" /src/lib/wasm`
- [ ] Document which modules are imported at compile-time

**Investigation Phase 2: Check Initialization (1 hour)**
- [ ] Find initializeWasm calls: `grep -r "initializeWasm" /src`
- [ ] Check where it's called: `/src/routes/+layout.svelte`?
- [ ] Is it called immediately or on-demand?
- [ ] Check worker initialization: `/src/lib/wasm/worker.ts`
- [ ] Does worker load all WASM or lazy-load?

**Investigation Phase 3: Trace Module Usage (1 hour)**
- [ ] For each WASM module, find usage:
  - [ ] dmb-transform: Used where?
  - [ ] dmb-segue-analysis: Used where?
  - [ ] dmb-date-utils: Used where?
  - [ ] dmb-string-utils: Used where?
  - [ ] dmb-force-simulation: Used for GuestNetwork? (lazy ✓)
  - [ ] dmb-visualize: Used where?
  - [ ] dmb-core: Used where?

**Documentation**
- [ ] Create `/src/lib/wasm/LOADING_STRATEGY.md` documenting findings
- [ ] Include findings in commit message

**Commit**
- [ ] `git add src/lib/wasm/LOADING_STRATEGY.md`
- [ ] `git commit -m "Investigation: WASM module loading strategy audit"`

---

### Priority 4: Tree-Shaking Audit (5-10KB potential)

**Setup (20 min)**
- [ ] Install visualizer: `npm install --save-dev rollup-plugin-visualizer`
- [ ] Update `/vite.config.ts` to include visualizer plugin
- [ ] Add build script: `"build:analyze": "vite build --mode analyze"`

**Analysis (1-2 hours)**
- [ ] Run: `npm run build:analyze`
- [ ] Opens `dist/stats.html` in browser
- [ ] Identify large modules:
  - [ ] d3-utils.ts
  - [ ] wasm/index.ts
  - [ ] wasm/serialization.ts

**Audit d3-utils.ts** (30 min)
- [ ] Check all exports: `grep -n "^export" /src/lib/utils/d3-utils.ts`
- [ ] For each export, verify it's used: `grep -r "arrayMax\|arrayMin\|colorSchemes\|..." /src`
- [ ] Document unused exports (if any)

**Audit wasm/index.ts** (30 min)
- [ ] Check re-exports: `grep -n "^export" /src/lib/wasm/index.ts`
- [ ] Sample 10 exports and verify usage
- [ ] Document patterns of unused exports

**Documentation**
- [ ] Create findings: Which exports are unused?
- [ ] Create PR comment explaining tree-shaking effectiveness

**Verification**
- [ ] Run: `npm run build` (should show no changes in bundle if all exports used)

**Commit**
- [ ] `git add package.json vite.config.ts`
- [ ] `git commit -m "Setup bundle analyzer for tree-shaking verification"`

---

### Priority 5: Bundle Analyzer Setup (2 hours)

**Configuration (1 hour)**
- [ ] Already done in Priority 4 setup ✓

**Add CI/CD Monitoring (1 hour)**
- [ ] Create `.github/workflows/bundle-size.yml`
- [ ] Add bundle size check on PR
- [ ] Configure size thresholds
- [ ] Test workflow by pushing branch

**Verify**
- [ ] Create test PR and verify workflow runs
- [ ] Check bundle size comment appears on PR

**Commit**
- [ ] `git add .github/workflows/bundle-size.yml`
- [ ] `git commit -m "Add automated bundle size monitoring to CI/CD"`

---

## Week 3: Optimization Implementation (Optional - based on investigation)

### Priority 6: WASM Module Lazy-Loading (if needed - 50-100KB potential)

**Only if investigation reveals issues.**

**Implementation**
- [ ] Refactor WASM imports to dynamic
- [ ] Route-based WASM loading
- [ ] Lazy-load non-critical modules
- [ ] Test all functionality still works

**Commit**
- [ ] `git add src/lib/wasm/bridge.ts ...`
- [ ] `git commit -m "Refactor WASM loading to lazy-loading strategy (-100KB gzip)"`

---

### Priority 7: Component Code-Splitting (if needed - 5-10KB potential)

**Only if analysis shows benefits.**

**Implementation**
- [ ] Convert visualization components to dynamic imports
- [ ] Ensure D3 modules load only when needed
- [ ] Test component loading

**Commit**
- [ ] `git add src/routes/visualizations/...`
- [ ] `git commit -m "Implement component code-splitting for visualizations (-5-10KB)"`

---

### Priority 8: Advanced Optimizations (optional - 3-5KB)

**CSS Optimization**
- [ ] Audit `/src/app.css` for unused styles
- [ ] Remove dead CSS
- [ ] Verify color schemes are used

**Vendor Chunk Optimization**
- [ ] Review vite.config.ts manual chunks
- [ ] Check for opportunities to further split vendors

---

## Testing & Validation

### After Each Priority

- [ ] `npm run dev` works without errors
- [ ] `npm run check` passes (no type errors)
- [ ] `npm run test` passes (all tests green)
- [ ] `npm run build` succeeds
- [ ] `npm run preview` loads without errors

### After Each Week

**Performance Metrics**
- [ ] Bundle size documented: `du -sh dist`
- [ ] Gzip size checked: `gzip -c dist/index.js | wc -c`
- [ ] Compare to baseline

**Lighthouse Audit**
- [ ] Run Lighthouse on preview
- [ ] Check LCP, FCP, INP, CLS
- [ ] Document changes

**Network Waterfall**
- [ ] Chrome DevTools > Network
- [ ] Check main JS size
- [ ] Verify WASM loads appropriately
- [ ] Verify Dexie deferred loading

---

## Documentation

### Update Project Docs

- [ ] Update `CLAUDE.md` with bundle optimization notes
- [ ] Add comments to optimized files
- [ ] Document any architectural changes

### Create Reports

- [ ] Before/after bundle breakdown
- [ ] Performance improvement summary
- [ ] Lessons learned for future optimizations

---

## Final Verification

- [ ] [ ] All tests pass
- [ ] [ ] No type errors
- [ ] [ ] Build succeeds with no warnings
- [ ] [ ] Preview runs without issues
- [ ] [ ] Bundle size reduced by target amount
- [ ] [ ] No regressions in functionality
- [ ] [ ] All new features work correctly
- [ ] [ ] Documentation updated

---

## Rollback Plan

If anything breaks:

```bash
# Reset to pre-optimization state
git checkout pre-optimization

# Or revert specific commit
git revert <commit-hash>

# Or reset hard if needed
git reset --hard pre-optimization
```

---

## Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Bundle reduction | 18-25KB Week 1 | - |
| Tree-shaking audit | 5-10KB potential | - |
| WASM investigation | Insights | - |
| CI/CD setup | Automated | - |
| Tests passing | 100% | - |
| Zero regressions | Yes | - |

---

## Notes

- Keep commits small and focused
- Test frequently during implementation
- Document findings as you go
- Update this checklist as you progress
- Create draft PR after Week 1 for review
- Merge after full Week 2 verification

---

**Starting Date:** _______________
**Completion Target:** 3 weeks
**Status:** Not started
