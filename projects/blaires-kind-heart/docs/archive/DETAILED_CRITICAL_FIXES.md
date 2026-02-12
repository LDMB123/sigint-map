# Critical Bug Fixes - Session 2026-02-10

## Summary

Fixed 3 critical bugs identified by devils-advocate code review after completing Polish Pass phases.

---

## Fix 1: Speech Synthesis Voice Selection (CRITICAL)

**Bug**: Fiona voice (top-priority child-friendly voice) is Australian English (`en-AU`), not `en-US`. The filter at line 66 of `rust/speech.rs` checked `voice.lang() == "en-US"`, making Fiona selection dead code.

**Impact**: Voice selection would never select Fiona, falling back to system default instead of the warmest child-friendly voice.

**Fix**: Changed language filter for preferred voices from strict `"en-US"` to `starts_with("en")` to include `en-AU` (Fiona), `en-IE` (Moira), etc.

**File**: `rust/speech.rs`
```rust
// BEFORE (line 66):
if voice.name().contains(name) && voice.lang() == "en-US" {

// AFTER:
if voice.name().contains(name) && voice.lang().starts_with("en") {
```

**Additional Enhancement**: Added short-circuit in `voiceschanged` event handler to prevent redundant voice selection after initialization.

---

## Fix 2: Nice Words Mastery Badge Unreachable (CRITICAL)

**Bug**: `sticker_type_to_name()` at line 318 of `rust/rewards.rs` used `split('-')` on badge IDs. For "skill-bronze-nice-words", this creates 4 parts `["skill", "bronze", "nice", "words"]`, failing the `parts.len() != 3` check.

**Impact**: All 3 Nice Words mastery badges (bronze, silver, gold) permanently unreachable - 16.7% of mastery badges (3 of 18) can never be earned.

**Fix**: Changed from `split('-')` to `splitn(3, '-')` to limit split to 3 parts maximum, keeping "nice-words" as a single skill name.

**File**: `rust/rewards.rs`
```rust
// BEFORE (line 318):
let parts: Vec<&str> = sticker_type.split('-').collect();

// AFTER:
let parts: Vec<&str> = sticker_type.splitn(3, '-').collect();
```

---

## Fix 3: GPU Particle Rendering Freeze After View Transition (CRITICAL)

**Bug**: `resume_rendering()` at lines 488-490 of `rust/gpu_particles.rs` created a new closure with an empty body:
```rust
let closure = Closure::<dyn FnMut(f64)>::new(move |_timestamp: f64| {
    // Resume from current timestamp  ← EMPTY BODY
});
```

**Impact**: After any View Transition (panel navigation) during an active particle burst, GPU particles freeze permanently. The animation frame loop stops because the closure does nothing.

**Fix**: Instead of creating a new broken closure, reuse the existing closure stored in `ActiveBurst._closure` and request a new animation frame with it.

**File**: `rust/gpu_particles.rs`
```rust
// BEFORE (lines 483-494):
if cell.borrow().is_some() {
    let _start_time = crate::browser_apis::now_ms();
    let closure = Closure::<dyn FnMut(f64)>::new(move |_timestamp: f64| {
        // Resume from current timestamp
    });
    let frame_id = native_apis::request_animation_frame(&closure);
    if let Some(ref mut burst) = *cell.borrow_mut() {
        burst.frame_id = frame_id;
    }
}

// AFTER:
if let Some(ref burst) = *cell.borrow() {
    // Request next frame using the stored closure
    let new_frame_id = native_apis::request_animation_frame(&burst._closure);
    if let Some(ref mut burst_mut) = *cell.borrow_mut() {
        burst_mut.frame_id = new_frame_id;
    }
}
```

---

## Build Results

✅ All fixes compile successfully
✅ Only existing warnings (3 unused functions from Phase 2)
✅ No new errors introduced
✅ Server running at http://127.0.0.1:8080/ and http://192.168.7.120:8080/

---

## Testing Checklist

### Speech Synthesis
- [ ] Test on iPad mini 6 - verify Fiona voice is selected (check Safari console)
- [ ] Fallback test - speech works even if voices fail to load
- [ ] Test all 3 modes: `speak()`, `narrate()`, `celebrate()`

### Nice Words Badges
- [ ] Perform 5 "nice-words" kind acts
- [ ] Verify bronze Nice Words badge unlocks
- [ ] Perform 10 total - verify silver unlocks
- [ ] Perform 20 total - verify gold unlocks

### GPU Particles
- [ ] Start particle burst (log kind act or complete quest)
- [ ] During burst, navigate to different panel (triggers View Transition)
- [ ] Verify particles resume after transition
- [ ] Verify burst completes normally

---

## Additional Recommendations (Not Yet Implemented)

From devils-advocate review:

1. **Memory Leak** (line 48 of `speech.rs`): `cb.forget()` creates memory leak - consider removing event listener after first use
2. **Offline Queue** (`offline_queue.rs`): `clear_queue()` deletes ALL mutations including failed ones - should only delete successful
3. **First Speech Race** (`speech.rs`): Early speech uses system default, switches mid-session - consider init in boot batch 3
4. **Hardcoded Count** (`rewards.rs`): Use `STICKER_DESIGNS.len()` instead of hardcoded "51"

---

## Session Context

Part of comprehensive Polish Pass (Phases 1-6) for Blaire's Kind Heart PWA. Devils-advocate review performed after Phase 6 completion to catch overlooked issues before shipping.
