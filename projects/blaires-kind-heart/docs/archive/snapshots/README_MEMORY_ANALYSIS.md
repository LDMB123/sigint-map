# Memory Leak Analysis - Blaire's Kind Heart

- Archive Path: `docs/archive/snapshots/README_MEMORY_ANALYSIS.md`
- Normalized On: `2026-03-04`
- Source Title: `Memory Leak Analysis - Blaire's Kind Heart`

## Summary
### The Problem
The iPad app has permanent event listeners on global objects (Navigation API, document, SpeechSynthesis) that use `Closure::forget()` and are never removed. On a 4GB iPad running continuously for 8 hours, this manifests as 30-50KB heap growth—negligible relative to total RAM but problematic as a pattern.

### The Impact
- Normal use: Unnoticeable
- Pathological use (rapid taps): 10-20KB growth in gesture detector
- Pattern risk: HIGH (prevents future optimizations)
- Maintenance: Difficult (listeners can't be stopped)

### The Fix
Migrate global event listeners from `dom::on(...) + forget()` to `dom::on_with_signal(..., &signal)` using AbortSignal. Estimated 2.5-3 hours total implementation time.

### Documents

### 1. MEMORY_LEAK_ANALYSIS.md (Full Technical Report)
**14 KB** - Comprehensive analysis of all issues

Contents:
- Executive summary with severity levels
- Detailed breakdown of each critical issue
- Heap growth calculations for iPad scenario
- Closure capture analysis
- Testing recommendations
- Code patterns for safe WASM memory management

**Read this if**: You want deep technical understanding, need to explain findings to team, or implementing fixes

## Context
Complete memory leak analysis of Blaire's Kind Heart WASM codebase. Identifies 9 memory issues across closure usage, event listener lifecycle, and RAF management.

**Analysis Date**: February 11, 2026
**Overall Risk**: MODERATE
**Critical Issues Found**: 5
**Growth Leak Risks**: 4
**Properly Handled Patterns**: 10+

## Actions
**12 KB** - Step-by-step fix instructions

Contents:
- 8 specific code fixes with before/after examples
- Quick wins (5-10 minute fixes)
- Medium complexity (30-45 minute fixes)
- Implementation instructions with patterns
- Verification checklist
- Cleanup timeline

**Read this if**: You're implementing the fixes or want to see exact code changes

### Sprint 1 (P0 - Critical, 40 min)
- [ ] Fix gesture TAP_TIMES retention (10 min)
- [ ] Add AbortSignal to navigation listeners (30 min)
- [ ] Test on iPad (30 min)

### Sprint 2 (P1 - High, 30 min)
- [ ] Speech voiceschanged guard (10 min)
- [ ] Verify PWA listeners (10 min)
- [ ] Test cycle (10 min)

### Sprint 3+ (P2 - Medium)
- [ ] Gardens listener removal (20 min)
- [ ] Worker listener storage (10 min)
- [ ] Automated memory regression tests (60 min)

### Long-Term Pattern Recommendations

### For Future Developers
1. Default to `dom::on_with_signal()` not `dom::on()`
2. Store listener references for explicit cleanup
3. Document why certain listeners are permanent
4. Use `Closure::once_into_js()` for ephemeral handlers
5. Track RAF loops, always cancel on cleanup

### For Code Reviews
- [ ] Check event listener cleanup
- [ ] Verify RAF loops call cancel_animation_frame
- [ ] Look for Closure::forget() usage
- [ ] Ensure no unbounded collections in closures

### Questions?

Refer to specific documents:
- **Why is this a leak?** → MEMORY_LEAK_ANALYSIS.md
- **How do I fix it?** → MEMORY_LEAK_FIXES.md
- **How do I test it?** → MEMORY_DIAGNOSTIC_CHECKLIST.md
- **Where exactly?** → MEMORY_FINDINGS_INDEX.md

1. Share these documents with the team
2. Review critical issues (15 min meeting)
3. Assign P0 fixes for next sprint
4. Run baseline memory tests (from checklist)
5. Implement fixes (2.5-3 hours)
6. Run before/after comparisons
7. Add automated regression tests
8. Document patterns in team wiki

---

**Analysis completed**: 2026-02-11
**Confidence level**: HIGH
**Files analyzed**: 50+ Rust source files
**Lines reviewed**: ~15,000
**Recommendation**: Implement P0 fixes within next sprint

## Validation
**16 KB** - Practical iPad testing procedures

Contents:
- 7 specific tests for different leak types
- DevTools procedures for macOS + iPad
- Pass/warn/leak criteria for each test
- Automated test template
- Troubleshooting guide
- Results reporting format

**Read this if**: You're testing on iPad or need to verify fixes

## References
**18 KB** - Complete findings catalog

Contents:
- All 9 issues with code locations
- Detailed evidence and examples
- Heap impact calculations
- Fix approaches and time estimates
- Summary table of all findings
- Status of each pattern

**Read this if**: You need a quick reference, searching for specific issue, or tracking fix status

### Critical Issues at a Glance

| Issue | File | Severity | Type | Est. Fix |
|-------|------|----------|------|----------|
| Navigation API listener | navigation.rs | HIGH | Permanent leak | 30 min |
| Click delegation listener | navigation.rs | HIGH | Permanent leak | 20 min |
| Gesture detector TAP_TIMES | gestures.rs | HIGH | Growth leak | 10 min |
| Gardens navigation listener | gardens.rs | MEDIUM | Conditional leak | 20 min |
| Speech voiceschanged | speech.rs | MEDIUM | Permanent leak | 10 min |
| Game Catcher RAF | game_catcher.rs | MEDIUM | Conditional leak | 5 min |
| Companion race condition | companion.rs | LOW-MEDIUM | Growth leak | 10 min |
| Worker message listener | db_client.rs | LOW | Conditional leak | 10 min |
| Onboarding handler | onboarding.rs | NONE | Safe | 0 min |

### Getting Started

### For Developers
1. Read: MEMORY_LEAK_ANALYSIS.md (15 min)
2. Review: MEMORY_FINDINGS_INDEX.md (10 min)
3. Implement: MEMORY_LEAK_FIXES.md (2.5-3 hours)
4. Test: MEMORY_DIAGNOSTIC_CHECKLIST.md (1 hour)

### For Reviewers
1. Read: MEMORY_LEAK_ANALYSIS.md (executive summary + critical issues)
2. Reference: MEMORY_FINDINGS_INDEX.md (to understand fixes)
3. Verify: MEMORY_DIAGNOSTIC_CHECKLIST.md (test results before/after)

### For Team Leads
1. Read: This document + issue summary above
2. Review: MEMORY_LEAK_ANALYSIS.md (impact section)
3. Plan: 2.5-3 hour sprint for P0 fixes
4. Add: Automated tests from MEMORY_DIAGNOSTIC_CHECKLIST.md

### Key Findings

### The Main Pattern Problem
```rust
// ❌ UNSAFE: Listener can never be removed
dom::on(&target, "click", handler);
// Closure is forgotten, persists forever

// ✅ SAFE: Listener can be stopped
let abort = browser_apis::new_abort_handle();
dom::on_with_signal(&target, "click", &abort.signal(), handler);
// Abort removes listener when needed
```

### Expected Impact After Fixes
- Growth reduction: 30-50KB/8hrs → <5KB/8hrs
- Pattern improvement: Enables cleanup for future features
- Maintenance: Establishes safe WASM patterns

### No Unsafe Code Issues
Analysis found:
- ✅ Proper use of web_sys FFI
- ✅ Sound unsafe block usage
- ✅ Correct WASM binding patterns
- ✅ No memory safety violations

The issues are memory management patterns, not Rust safety violations.

### Heap Math

### iPad 4GB RAM Scenario: 8-Hour Session
```
Baseline WASM: ~2.5MB
Initial state: ~500KB
Session growth (current): 30-50KB ← This is the leak
Relative to 4GB: 0.001% ← Negligible

But under pathological tapping: 10-20KB additional ← Concerning
And pattern prevents future optimization ← Why we fix
```

### What Gets Leaked
1. Navigation listener: +500B per navigation (permanent)
2. Click listener: +2KB (permanent, single instance)
3. TAP_TIMES: +500B-20KB (depends on tapping rate)
4. Speech listener: +800B (permanent)
5. Gardens listener: +1KB per module re-init

Total permanent overhead: ~4KB
Total growth potential: 30-50KB per 8 hours

### Code Quality Observations

### Strengths
- ✅ Proper RAF lifecycle management in most games
- ✅ Good use of thread_local for shared state
- ✅ Defensive guards prevent double-initialization
- ✅ Proper Closure::once_into_js() for one-time callbacks
- ✅ AbortSignal pattern already used in dom::on_with_signal()
- ✅ Web Locks for safe async DB access

### Areas for Improvement
- Permanent event listeners on global objects
- Some growth leaks in vector retention logic
- Could benefit from explicit cleanup patterns
- Missing automated memory regression tests

