# Lighthouse Audit Report

- Archive Path: `docs/archive/snapshots/lighthouse-audit-report.md`
- Normalized On: `2026-03-04`
- Source Title: `Lighthouse Audit Report`

## Summary
**Date**: 2025-02-11

## Context
**Date**: 2025-02-11
**Build**: Phase 5 (Cache v5, Aggressive Prefetching)
**Target**: Desktop preset, Performance category
**URL**: http://localhost:8080

---

### Overall Score

**Performance: 79/100** ⚠️

---

### Core Web Vitals

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **LCP** (Largest Contentful Paint) | 3.9s | <2.5s | ❌ FAIL |
| **CLS** (Cumulative Layout Shift) | 0.000 | <0.1 | ✅ PASS |
| **FCP** (First Contentful Paint) | 0.4s | <1.8s | ✅ GOOD |
| **TTI** (Time to Interactive) | 4.2s | <3.8s | ⚠️ NEEDS IMPROVEMENT |
| **TBT** (Total Blocking Time) | 40ms | <200ms | ✅ GOOD |
| **Speed Index** | 1.2s | <3.4s | ✅ GOOD |

---

### Critical Finding: LCP Failure

**Issue**: LCP exceeds target by 1.4s (3.9s vs 2.5s)

**Root Cause**: Large WASM files in critical rendering path
- `blaires-kind-heart_bg.wasm`: 3.0MB (largest asset)
- `sqlite3.wasm`: 840KB
- Total WASM: 3.8MB blocking initial render

**Impact**: Delays first meaningful content paint, especially on slower connections

---

### Asset Analysis

### Largest Items (Top 3)

| Asset | Size | Impact |
|-------|------|--------|
| `blaires-kind-heart_bg.wasm` | 3.0 MB | Critical path blocker |
| `sparkle-splash.png` | 1.1 MB | Large hero image |
| `sqlite3.wasm` | 840 KB | Database module |

### Unused Resources

| Asset | Unused Size | % Unused |
|-------|-------------|----------|
| `animations.css` | 24.4 KB | Unknown |

---

### Recommendations

### High Priority (LCP Fix)

1. **WASM Lazy Loading**
   - Move `sqlite3.wasm` to deferred load (only needed for DB writes)
   - Consider code-splitting app WASM into critical + deferred chunks
   - Target: Reduce critical WASM from 3.8MB to ~2.0MB

2. **Image Optimization**
   - Compress `sparkle-splash.png` (1.1MB → target <400KB)
   - Use WebP format with aggressive compression
   - Consider CSS gradient fallback for splash

### Medium Priority

3. **Unused CSS Removal**
   - Audit `animations.css` for unused rules (24.4KB)
   - Tree-shake or inline critical animation CSS
   - Quick win: ~2-3% size reduction

4. **Service Worker Optimization**
   - Already using cache-first strategy ✅
   - Consider preloading WASM with lower priority
   - Implement resource hints (`<link rel="preload">`)

### Low Priority

5. **TTI Improvement** (currently 4.2s)
   - Profile main thread during init
   - Identify long tasks causing TTI delay
   - Consider `scheduler.yield()` batching refinement

---

### Wins from Phase 4-5

- **CLS**: Perfect 0.000 (no layout shifts) ✅
- **FCP**: Excellent 0.4s (fast initial paint) ✅
- **TBT**: Minimal 40ms (responsive main thread) ✅
- **Speed Index**: Good 1.2s (perceived speed) ✅

---

## Actions
**Option A: Address LCP (Recommended)**
- Phase 6a: WASM lazy loading + code splitting
- Phase 6b: Image optimization (sparkle-splash.png)
- Target: LCP <2.5s, Performance score 90+

**Option B: Continue Original Plan**
- Phase 6: Performance Monitoring (Web Vitals tracking)
- Phase 7: Safari API Hardening
- Phase 8: Accessibility
- Revisit LCP optimization later

**Option C: Quick Win**
- Remove unused CSS (24.4KB from animations.css)
- Then proceed with Option A or B

---

### Technical Notes

- No render-blocking resources detected ✅
- Cache strategy working correctly (cache-first)
- Phase 5 prefetching successful (17 assets moved to CRITICAL)
- Safari 26.2 target platform (desktop preset used for audit)
- iPad mini 6 (A15, 4GB RAM) will have different performance profile

---

### Conclusion

Phase 4-5 optimizations delivered significant wins in layout stability (CLS) and initial render (FCP), but exposed LCP bottleneck caused by large WASM files. Primary blocker is 3.8MB of WASM in critical path. Recommend addressing LCP issue before proceeding with remaining phases.

**Next Action**: Decide between Option A (LCP fix), B (continue plan), or C (quick CSS win)

## Validation
_Validation details not recorded._

## References
_No references recorded._

