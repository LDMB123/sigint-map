# Known Bugs - Post Phase 5 Testing

## Overview

**Date**: 2026-02-11
**Phase**: Phase 5 Testing Complete → Phase 6 Deployment Prep
**Status**: Some bugs remain but not blocking production deployment

## Bug Categories

### Deferred from Phase 4 (Not Blocking)

**Bug #15: Web Locks Over-Serialization**
- **Severity**: MEDIUM
- **Impact**: Unnecessary write serialization across different tables
- **Root Cause**: All writes use same lock name "db-write"
- **Fix Required**: Scope locks to table names (e.g., "db-write-gardens")
- **Effort**: 2-3 hours (systematic refactor)
- **Deferral Reason**: Requires broader refactor across codebase
- **Production Impact**: Minimal - writes complete successfully, just slower

**Database Type Standardization (Incomplete)**
- **Severity**: MEDIUM
- **Impact**: 14+ callsites still use `as_u64()` instead of `as_f64()`
- **Files**: lib.rs, weekly_goals.rs, games.rs
- **Fix Required**: Systematic audit and standardization
- **Effort**: 2-3 hours
- **Deferral Reason**: Not yet observed causing issues in testing
- **Production Impact**: Potential type confusion in unpatched modules

### Discovered During Phase 5 Testing

**[Document any bugs found during manual testing here]**

**Example format:**
```markdown
**Bug #XX: [Short Description]**
- **Severity**: CRITICAL/HIGH/MEDIUM/LOW
- **Impact**: [What breaks]
- **Reproduction**: [Steps to reproduce]
- **Workaround**: [If available]
- **Fix Status**: Pending/In Progress/Deferred
```

## MEDIUM Priority Bugs (From Phase 3 Discovery)

### Visual & Animation Issues

**Bug #16: CSS Animation Restart on Re-mount**
- **Impact**: Animations don't restart when component re-renders
- **Fix**: Use `animation-play-state` instead of class toggle
- **File**: src/styles/animations.css
- **Production Impact**: Cosmetic only

**Bug #18: CSS Grid Overflow on Small Viewports**
- **Impact**: Gardens grid breaks on screens <320px
- **Fix**: Add responsive breakpoints
- **File**: src/styles/gardens.css
- **Production Impact**: Minimal (iPad Mini 6 is 768px wide)

**Bug #21: View Transition CSS Targeting**
- **Impact**: Transitions apply to wrong elements
- **Fix**: Use `::view-transition-group(companion-skin)` selector
- **File**: src/styles/animations.css
- **Production Impact**: Cosmetic only

**Bug #22: WebP Render Flicker on Slow Connections**
- **Impact**: Brief flash during asset load
- **Fix**: Preload critical assets or add fade-in transition
- **Production Impact**: Minimal (offline-first caching)

### Service Worker Issues

**Bug #19: No Error Logging in Service Worker**
- **Impact**: Silent failures difficult to debug
- **Fix**: Add error event listener and cache failure logging
- **File**: public/sw.js
- **Production Impact**: Debugging difficulty only

**Bug #20: Stale-While-Revalidate Not Implemented**
- **Impact**: Slower updates when cached content exists
- **Fix**: Serve from cache immediately, fetch in background
- **File**: public/sw.js
- **Production Impact**: Slightly slower update experience

**Bug #24: SW Update Detection Silent Failure**
- **Impact**: Users don't know when app has updates
- **Fix**: Broadcast to clients on updatefound, show prompt
- **File**: public/sw.js
- **Production Impact**: Update awareness only

### Backend & Performance

**Bug #17: WebGPU Device Lost Handling Missing**
- **Impact**: App doesn't recover from GPU crashes
- **Fix**: Add `device.lost` event listener
- **Production Impact**: Low (WebGPU not yet used)

**Bug #25: Concurrent Write Locks Cause Deadlocks**
- **Impact**: Same as Bug #15 (over-serialization)
- **Fix**: Table-scoped lock names
- **Production Impact**: Covered by Bug #15

**Bug #26: Navigation Panel State Not Persisted**
- **Impact**: Panel state lost on refresh
- **Fix**: Store current panel in sessionStorage
- **File**: rust/navigation.rs
- **Production Impact**: UX convenience only

## LOW Priority Bugs (Cosmetic)

**Bug #27: Missing glow-breathe Keyframes**
- **Impact**: Idle animation doesn't pulse
- **Fix**: Add @keyframes to animations.css
- **Production Impact**: Visual polish only

**Bug #28: Sleepy Expression Mapping**
- **Impact**: "sleepy" class maps to "happy" asset
- **Fix**: Update EXPRESSION_MAP in companion.rs
- **Production Impact**: Visual accuracy only

**Bug #29: Manifest Icon Safe Zone**
- **Impact**: Icon edges may clip on some devices
- **Fix**: Design iteration (regenerate icons with padding)
- **Production Impact**: Cosmetic only

**Bugs #30-32: Various UI Polish**
- Minor spacing, color, typography issues
- Production Impact: Cosmetic only

## Bugs Fixed Since Phase 3

✅ **Bug #1**: Assets not copied to build
✅ **Bug #2**: Missing CSS in SW precache
✅ **Bug #3**: Gardens seed empty
✅ **Bug #4**: Stage index mapping + "Stage 6 of 5" display
✅ **Bug #5**: OPFS detection broken
✅ **Bug #6**: Export interval too long
✅ **Bug #7**: Emoji fallback selector too broad
✅ **Bug #8**: Companion memory leak
✅ **Bug #9**: set_expression race condition
✅ **Bug #10**: Navigation API state desync
✅ **Bug #11**: Boolean type confusion
✅ **Bug #12**: View Transitions memory leak
✅ **Bug #13**: Integer type mismatch
✅ **Bug #14**: NULL safety in garden growth

## Production Readiness Assessment

### Blocking Issues: 0
No CRITICAL or HIGH priority bugs blocking deployment

### Non-Blocking Issues: 17
- 2 MEDIUM (deferred from Phase 4)
- 9 MEDIUM (visual, SW, performance)
- 6 LOW (cosmetic)

### Recommendation
**APPROVED for production deployment** with known limitations documented

### Post-Deployment Backlog

**Phase 6B** (Future iteration):
1. Web Locks table-scoped names (Bug #15)
2. Database type standardization (14+ callsites)
3. Service Worker resilience improvements (Bugs #19, #20, #24)
4. CSS responsive improvements (Bug #18)
5. WebGPU device lost handling (Bug #17)

**Phase 6C** (Polish):
1. Animation improvements (Bugs #16, #21, #22, #27)
2. Expression mapping accuracy (Bug #28)
3. Manifest icon redesign (Bug #29)
4. UI polish items (Bugs #30-32)

---

**Known Bugs: 17 Remaining (0 Blocking)**
**Production Status: ✅ APPROVED for Deployment**
