# Memory Leak Reference - Blaire's Kind Heart

- Archive Path: `docs/archive/phase-docs/MEMORY_REFERENCE.md`
- Normalized On: `2026-03-04`
- Source Title: `Memory Leak Reference - Blaire's Kind Heart`

## Summary
**Risk Level**: MODERATE (before fixes) → LOW (after fixes)
**Estimated Growth**: 30-50KB/8hrs → <5KB/8hrs

### Critical Issues (Fix First)

| Issue | File | Lines | Severity | Status | Fix Time |
|-------|------|-------|----------|--------|----------|
| Navigation API listeners | navigation.rs | 62-95 | HIGH | UNFIXED | 30 min |
| Click delegation listener | navigation.rs | 155-177 | HIGH | UNFIXED | 20 min |
| Gesture detector | gestures.rs | 14-48 | HIGH | UNFIXED | 10 min |

---

### Quick Fixes

### Fix 1: Gesture TAP_TIMES Retention (5 min)

**File**: `rust/gestures.rs`, line 32

```rust
// BEFORE (buggy):
tap_times.retain(|&t| now - t < 1000.0);

// AFTER (fixed):
let cutoff = now - 1000.0;
tap_times.retain(|&t| t >= cutoff);
```

**Prevents**: 5-10KB growth under rapid tapping

### Permanent Leaks
1. **Navigation API listener** - navigation.rs:62-95 (HIGH)
2. **Click delegation** - navigation.rs:155-177 (HIGH)
3. **Gesture pointerup** - gestures.rs:14-48 (HIGH)
4. **Gardens navigate** - gardens.rs:182-219 (MEDIUM)
5. **Speech voiceschanged** - speech.rs:21-53 (MEDIUM)

### Growth Leaks
6. **Gesture TAP_TIMES** - gestures.rs:32 (HIGH)
7. **Catcher RAF cycle** - game_catcher.rs:589-632 (MEDIUM, depends on cleanup)
8. **Companion race** - companion.rs:119-343 (LOW-MEDIUM, mitigated)

### Safe/Fixed
9. **Worker listener** - db_client.rs:50-75 (LOW, unlikely to manifest)
10. **Onboarding handler** - onboarding.rs:66-82 (SAFE, element removed)
11. **GPU particles** - gpu_particles.rs:334-382 (SAFE, cleanup proper)
12. **Game RAF loops** - game_unicorn.rs, game_memory.rs (SAFE)
13. **One-time closures** - lib.rs, companion.rs, gardens.rs (SAFE, `Closure::once`)

---

## Context
Quick reference for memory leak issues, fixes, and testing procedures.

---

## Actions
### Phase 1: Immediate (This Sprint)
1. Fix gestures TAP_TIMES retention - 10 min
2. Fix Navigation API listeners - 30 min
3. Fix click delegation - 20 min

**Total: 1 hour, prevents 17.5K+ token growth**

### Phase 2: Near-Term (Next Cycle)
4. Add speech voiceschanged guard - 10 min
5. Fix gardens listener removal - 20 min

**Total: 30 min, prevents 3K token growth**

---

### Safe Closure Patterns

### ✅ One-Time Closure
```rust
Closure::once_into_js(move |event| {
    // Handler logic
})
```

### ✅ Abortable Listener
```rust
let abort = browser_apis::new_abort_handle();
dom::on_with_signal(&target, "event", &abort.signal(), |e| {
    // Handler
});
// Store abort handle for cleanup
```

### ✅ RAF with Cleanup
```rust
let cb = Rc::new(RefCell::new(None));
let cb_clone = cb.clone();
*cb.borrow_mut() = Some(Closure::new(move |t| {
    // Loop logic
    if let Some(ref c) = *cb_clone.borrow() {
        request_animation_frame(c);
    }
}));
// MUST call cancel_animation_frame() in cleanup
```

### ❌ Permanent Leak (Avoid)
```rust
let cb = Closure::new(|e| { /* handler */ });
target.add_event_listener_with_callback("event", cb.as_ref().unchecked_ref());
cb.forget();  // LEAK: Can never be removed
```

---

### Detailed Documentation

For in-depth analysis, see archived docs:
- `../DETAILED_MEMORY_ANALYSIS.md` - Full technical analysis
- `../DETAILED_MEMORY_FIXES.md` - Complete fix implementations
- `../DETAILED_MEMORY_INDEX.md` - All issues catalogued
- `../DETAILED_MEMORY_CHECKLIST.md` - iPad testing procedures

---

### Expected Outcomes

**Before Fixes**:
- Heap growth: 30-50KB per 8 hours
- Pattern risk: HIGH (permanent listeners)
- Maintenance: HIGH (no cleanup mechanisms)

**After Fixes**:
- Heap growth: <5KB per 8 hours
- Pattern risk: LOW (AbortSignal standard)
- Maintenance: LOW (cleanup documented)

---

### Regression Prevention

Add to CI pipeline:
```rust
#[wasm_bindgen_test]
async fn test_navigation_no_leak() {
    let baseline = get_heap_used();
    for _ in 0..50 { navigate_panel(); }
    gc();
    let growth = get_heap_used() - baseline;
    assert!(growth < 2_000_000, "Leak detected: {}MB", growth/1_000_000);
}
```

---

**Last Updated**: 2026-02-11
**Status**: Active reference document

## Validation
1. **Panel Navigation** (30 sec)
   - Navigate 50 times between panels
   - Expected: <2MB heap growth
   - LEAK indicator: >5MB growth

2. **Gesture TAP_TIMES** (10 sec)
   - Rapidly tap 200-300 times
   - Expected: <500KB growth
   - LEAK indicator: >5MB growth

3. **Game Lifecycle** (2 min)
   - Launch/exit game 5 times
   - Expected: Heap returns to baseline
   - LEAK indicator: >30MB growth

4. **30-Minute Soak** (30 min)
   - Normal play for 30 minutes
   - Expected: <5MB total growth
   - LEAK indicator: >20MB growth

### DevTools Commands

```javascript
// Baseline measurement
const baseline = performance.memory?.usedJSHeapSize || 0;
console.log(`Baseline: ${(baseline / 1024 / 1024).toFixed(2)}MB`);

// After test
const after = performance.memory?.usedJSHeapSize || 0;
const growth = (after - baseline) / 1024 / 1024;
console.log(`Growth: ${growth.toFixed(2)}MB`);
console.log(`Status: ${growth < 2 ? 'PASS' : 'LEAK'}`);
```

---

## References
**File**: `rust/navigation.rs`, lines 62-95

```rust
// Add thread_local for cleanup
thread_local! {
    static NAV_ABORT: RefCell<Option<browser_apis::AbortHandle>> =
        const { RefCell::new(None) };
}

fn listen_navigate_event() {
    let Some(nav) = get_navigation_object() else { return };

    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    dom::on_with_signal(nav.as_ref(), "navigate", &signal, move |event: Event| {
        // ... handler logic ...
    });

    NAV_ABORT.with(|cell| {
        if let Some(old) = cell.borrow_mut().take() {
            old.abort();
        }
        *cell.borrow_mut() = Some(abort);
    });
}
```

**Prevents**: Unbounded closure accumulation

### Fix 3: Speech voiceschanged Guard (10 min)

**File**: `rust/speech.rs`, lines 19-53

```rust
thread_local! {
    static VOICES_LISTENER_ATTACHED: Cell<bool> = const { Cell::new(false) };
}

pub fn init_voices() {
    if VOICES_READY.with(|ready| *ready.borrow())
        || VOICES_LISTENER_ATTACHED.with(|set| set.get()) {
        return;
    }

    // ... attach listener ...

    VOICES_LISTENER_ATTACHED.with(|set| set.set(true));
}
```

**Prevents**: Duplicate listener registration

---

