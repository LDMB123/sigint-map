# LCP Optimization Report

- Archive Path: `docs/archive/snapshots/lcp-optimization-report.md`
- Normalized On: `2026-03-04`
- Source Title: `LCP Optimization Report`

## Summary
**Date**: 2025-02-11

## Context
**Date**: 2025-02-11
**Phase**: Post-Phase 5 LCP fixes
**Build**: Cache v6

---

## Actions
### 1. Image Optimization
**File**: `sparkle-splash.png` → `sparkle-splash-optimized.png`
- **Before**: 1.1MB PNG
- **After**: 63KB PNG (optimized with sips)
- **Reduction**: 94% (1,037KB saved)
- **Method**: macOS `sips` tool with resample and compression

### 2. CSS Cleanup
**File**: `animations.css` optimization
- **Before**: 25KB, 876 lines
- **After**: 13KB, 493 lines
- **Reduction**: 48% (12KB saved)
- **Removed**:
  - Unused celebration overlay system (300+ lines)
  - Redundant keyframes
  - Unused color-cycle animations
  - Idle/ambient animations that weren't implemented

### 3. Service Worker Update
**Cache version**: v5 → v6
- Updated sparkle-splash reference to optimized version
- Cache name reflects LCP optimization phase

---

### Option A: WASM Lazy Loading (Recommended)
1. Defer SQLite WASM load until first DB write
   - Move from CRITICAL_ASSETS to deferred load
   - Saves 840KB + 365KB = 1.2MB from critical path
   - Estimated LCP impact: -0.3s to -0.5s

2. Code-split app WASM
   - Separate critical UI code from deferred features
   - Target: Reduce 3MB → 1.5MB critical + 1.5MB deferred
   - More complex, requires Rust refactoring

### Option B: Continue to Phase 6
Proceed with original plan:
- Phase 6: Performance Monitoring (Web Vitals tracking)
- Phase 7: Safari API Hardening
- Phase 8: Accessibility
- Revisit WASM optimization later

### Option C: Quick Wins First
1. ✅ DONE: Remove unused CSS (12KB saved)
2. ✅ DONE: Optimize splash image (1MB saved)
3. NEXT: Defer SQLite WASM (1.2MB critical path reduction)
4. THEN: Proceed with Phase 6-8

---

### Recommendation

**Continue with Option A** (WASM lazy loading):
- SQLite WASM deferral is low-hanging fruit
- Minimal risk (DB writes only happen after user interaction)
- Expected to push LCP under 2.5s target
- Can achieve Performance 90+ score before Phase 6

After SQLite optimization, proceed with Phases 6-8 as planned.

---

### Files Modified

```
assets/illustrations/blaire/sparkle-splash-optimized.png  (NEW, 63KB)
index.html                                                 (sparkle-splash reference updated)
src/styles/animations.css                                 (optimized from 25KB to 13KB)
src/styles/animations-backup.css                          (backup of original)
public/sw-assets.js                                       (sparkle-splash reference updated)
public/sw.js                                              (cache version v5 → v6)
```

---

### Conclusion

Phase LCP optimizations delivered measurable improvements (+4 performance points, -0.9s LCP, -0.7s TTI). Asset compression (image + CSS) was successful, but WASM bundle size remains the primary blocker. SQLite lazy loading is next logical step to reach Performance 90+ target.

## Validation
| Metric | Before (v5) | After (v6) | Change | Status |
|--------|-------------|------------|--------|--------|
| **Performance Score** | 79/100 | 83/100 | +4 | ⚠️ IMPROVED |
| **LCP** | 3.9s | 3.0s | -0.9s | ⚠️ IMPROVED (still >2.5s) |
| **CLS** | 0.000 | 0.000 | - | ✅ PERFECT |
| **FCP** | 0.4s | 0.4s | - | ✅ EXCELLENT |
| **TTI** | 4.2s | 3.5s | -0.7s | ✅ IMPROVED |
| **TBT** | 40ms | 44ms | +4ms | ✅ GOOD |
| **Speed Index** | 1.2s | 1.2s | - | ✅ GOOD |

---

### Analysis

### Wins
1. **LCP improvement**: 0.9s reduction (3.9s → 3.0s)
   - Primarily from sparkle-splash.png compression (1.1MB → 63KB)
   - Faster critical asset loading

2. **TTI improvement**: 0.7s reduction (4.2s → 3.5s)
   - CSS cleanup reduced parse time
   - Faster stylesheet processing

3. **Overall score**: +4 points (79 → 83)
   - Moving in right direction
   - Approaching target of 90+

### Remaining Bottleneck
**WASM files still dominate critical path**:
- `blaires-kind-heart_bg.wasm`: 3.0MB
- `sqlite3.wasm`: 840KB
- `sqlite3.js`: 365KB
- **Total WASM**: 4.2MB blocking initial render

**LCP target**: 2.5s (currently 3.0s, need 0.5s improvement)

---

## References
_No references recorded._

