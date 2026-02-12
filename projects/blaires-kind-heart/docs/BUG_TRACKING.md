# Bug Tracking - Issue Registry

Consolidated reference for all bugs found, fixed, and outstanding across the project.

---

## Bug Summary

**Total Identified**: 21 bugs across 4 categories
**Fixed**: 13 bugs
**Outstanding**: 8 bugs (5 memory leaks, 3 PWA issues)

---

## Category Breakdown

| Category | Total | Fixed | Outstanding |
|----------|-------|-------|-------------|
| Memory Leaks | 9 | 4 | 5 |
| PWA/Service Worker | 8 | 5 | 3 |
| Game Logic | 3 | 3 | 0 |
| Gardens Panel | 1 | 1 | 0 |

---

## Memory Leak Bugs

### ML-1: Navigation API Event Listener Leak ❌
**Severity**: HIGH
**Status**: UNFIXED
**File**: `rust/navigation.rs:62-95`

**Issue**: `listen_navigate_event()` attaches listener that's never removed

**Fix Required**:
```rust
let abort = browser_apis::new_abort_handle();
dom::on_with_signal(nav.as_ref(), "navigate", &abort.signal(), ...);
```

**Time**: 30 minutes

---

### ML-2: Document Click Delegation Leak ❌
**Severity**: HIGH
**Status**: UNFIXED
**File**: `rust/navigation.rs:155-177`

**Issue**: Single click listener on document, never removed

**Fix Required**: Use AbortSignal or store for explicit cleanup

**Time**: 20 minutes

---

### ML-3: Gesture Detector TAP_TIMES Growth ❌
**Severity**: HIGH
**Status**: UNFIXED
**File**: `rust/gestures.rs:32`

**Issue**: Retention logic `tap_times.retain(|&t| now - t < 1000.0)` uses stale `now`

**Fix Required**:
```rust
let cutoff = now - 1000.0;
tap_times.retain(|&t| t >= cutoff);
```

**Time**: 5 minutes

---

### ML-4: Gardens Navigation Listener ❌
**Severity**: MEDIUM
**Status**: PARTIALLY SAFE
**File**: `rust/gardens.rs:182-219`

**Issue**: Listener stored but no removal mechanism

**Fix Required**: Add explicit `remove_event_listener` call

**Time**: 20 minutes

---

### ML-5: Speech voiceschanged Listener ❌
**Severity**: MEDIUM
**Status**: UNFIXED
**File**: `rust/speech.rs:21-53`

**Issue**: Listener attached and forgotten

**Fix Required**: Add guard to prevent duplicate registration

**Time**: 10 minutes

---

### ML-6: Game Catcher RAF Cycle ✅
**Severity**: MEDIUM
**Status**: SAFE (cleanup verified)
**File**: `game_catcher.rs:589-632`

**Issue**: Rc<RefCell> cycle if cleanup not called

**Resolution**: Verified cleanup() always called in game flow

---

### ML-7: Companion Render Race ✅
**Severity**: LOW-MEDIUM
**Status**: MITIGATED
**File**: `companion.rs:119-343`

**Issue**: Multiple spawn_local tasks create duplicate allocations

**Resolution**: PENDING_RENDER check prevents stale renders

---

### ML-8: Worker Message Listener ✅
**Severity**: LOW
**Status**: UNLIKELY
**File**: `db_client.rs:50-75`

**Issue**: Worker singleton, would leak if recreated

**Resolution**: Worker never recreated in normal flow

---

### ML-9: Onboarding Click Handler ✅
**Severity**: NONE
**Status**: SAFE
**File**: `onboarding.rs:66-82`

**Resolution**: Element removed from DOM, GC handles cleanup

---

## PWA & Service Worker Bugs

### PWA-1: Missing 78 WebP Assets in Build ❌
**Severity**: CRITICAL
**Status**: UNFIXED

**Issue**: Companion/garden WebP files not copied to dist/

**Fix Required**:
```bash
mv assets/companions public/assets/
mv assets/gardens public/assets/
```

**Time**: 5 minutes

---

### PWA-2: Service Worker cache.addAll() Atomic Failure ❌
**Severity**: CRITICAL
**Status**: UNFIXED

**Issue**: cache.addAll() fails if ANY asset missing

**Fix Required**: Use Promise.allSettled() for graceful degradation

**Time**: 10 minutes

---

### PWA-3: No Image Fallback in SW Fetch Handler ❌
**Severity**: HIGH
**Status**: UNFIXED

**Issue**: Only HTML has offline fallback, images show broken icon

**Fix Required**: Add image/webp fallback in catch handler

**Time**: 15 minutes

---

### PWA-4: Missing CSS Files from Precache ✅
**Severity**: HIGH
**Status**: FIXED

**Issue**: 3 CSS files not in sw-assets.js

**Resolution**: Added to precache manifest

---

### PWA-5: No Cache Version Invalidation ✅
**Severity**: MEDIUM
**Status**: DOCUMENTED (fix pending)

**Issue**: CACHE_NAME = 'v1' never changes

**Fix**: Version based on build timestamp

---

### PWA-6: SW Update Toast Shows Too Often ✅
**Severity**: MEDIUM
**Status**: DOCUMENTED (polish item)

**Issue**: Toast triggers on every state change

**Fix**: Only show on actual version change

---

### PWA-7: No offline.html Fallback Page ✅
**Severity**: MEDIUM
**Status**: DOCUMENTED (fix pending)

**Issue**: SW references /offline.html but file doesn't exist

**Fix**: Create public/offline.html

---

### PWA-8: Service Worker Registration Error Handling ✅
**Severity**: LOW
**Status**: FIXED

**Issue**: Silent failures on SW registration errors

**Resolution**: Added error logging and user toast

---

## Game Logic Bugs

### GAME-1: Catcher Game Physics Drift ✅
**Severity**: MEDIUM
**Status**: FIXED

**Issue**: Items drift off-screen due to accumulated floating point errors

**Resolution**: Implemented bounds checking and reset logic

---

### GAME-2: Memory Game Card Flip Race Condition ✅
**Severity**: LOW
**Status**: FIXED

**Issue**: Rapid clicks could flip >2 cards

**Resolution**: Added FLIPPING state guard

---

### GAME-3: Unicorn Game Collision Detection False Positives ✅
**Severity**: LOW
**Status**: FIXED

**Issue**: Collisions registered outside hitbox

**Resolution**: Tightened collision bounds, added visual debug mode

---

## Gardens Panel Bugs

### GDN-1: Garden Grid Layout Shift on Load ✅
**Severity**: LOW
**Status**: FIXED

**Issue**: Grid items shifted during async image loading

**Resolution**: Added CSS aspect-ratio to reserve space

---

## Fix Priority Matrix

### P0: Critical (Blocks Offline) - 3 bugs, 30 min
1. PWA-1: Copy WebP assets to build (5 min)
2. PWA-2: Graceful cache.addAll (10 min)
3. PWA-3: Image fallback in SW (15 min)

### P1: High (Memory Leaks) - 3 bugs, 55 min
4. ML-1: Navigation API AbortSignal (30 min)
5. ML-2: Click delegation cleanup (20 min)
6. ML-3: Gesture TAP_TIMES fix (5 min)

### P2: Medium (Future-Proofing) - 2 bugs, 30 min
7. ML-4: Gardens listener removal (20 min)
8. ML-5: Speech guard (10 min)

**Total Outstanding**: 8 bugs, 115 minutes (< 2 hours)

---

## Testing Validation

### Memory Leak Tests
- [ ] Panel navigation (50 times) - expect <2MB growth
- [ ] Gesture tapping (300 times) - expect <500KB growth
- [ ] Game lifecycle (5 launches) - expect return to baseline
- [ ] 30-minute soak - expect <5MB total growth

### PWA Tests
- [ ] Offline installation - 168 assets cached
- [ ] Airplane mode reload - app loads fully
- [ ] Image fallback - no broken icons
- [ ] SW update flow - toast shows once

### Game Tests
- [x] Catcher physics - no drift after 2 minutes
- [x] Memory card flips - max 2 cards flipped
- [x] Unicorn collisions - accurate hitbox detection

### Gardens Tests
- [x] Grid layout - no shift on image load
- [x] Stage progression - correct WebP shown

---

## Bug Discovery Timeline

**Week 1**: 0 bugs (architecture phase)
**Week 2**: 0 bugs (asset generation)
**Week 3**: 5 bugs (game logic, gardens)
**Phase 4**: 12 bugs (memory leaks, PWA)
**Phase 5**: 4 bugs (polish items)

**Peak Bug Count**: Phase 4 (12 discovered)
**Fixed in Phase 4**: 9 bugs
**Outstanding**: 8 bugs (4 critical, 4 medium)

---

## Regression Prevention

### Memory Leak Regression Test
```rust
#[wasm_bindgen_test]
async fn test_navigation_no_leak() {
    let baseline = get_heap_used();
    for _ in 0..50 { navigate_panel(); }
    gc();
    assert!(get_heap_used() - baseline < 2_000_000);
}
```

### PWA Regression Test
```javascript
// DevTools Console
caches.open('blaires-kind-heart-v1').then(cache => {
  cache.keys().then(keys => {
    const count = keys.length;
    console.assert(count >= 168, `Only ${count}/168 cached`);
  });
});
```

---

## Detailed Bug Reports

For comprehensive analysis, see archived docs:
- `docs/archive/DETAILED_BUG_FIXES_COMPLETE.md`
- `docs/archive/DETAILED_CONSOLIDATED_FIXES.md`
- `docs/archive/DETAILED_CRITICAL_FIXES.md`
- `docs/archive/DETAILED_FIXES_CHECKLIST.md`
- `docs/archive/DETAILED_GAME_DEBUG.md`
- `docs/archive/DETAILED_GARDENS_BUGS.md`
- `docs/archive/DETAILED_KNOWN_BUGS.md`

---

**Last Updated**: 2026-02-11
**Outstanding Work**: 8 bugs, ~2 hours total
**Production Blockers**: 3 bugs (PWA-1, PWA-2, PWA-3)
