# Critical Panic Risk Fixes - Implementation Guide

## Overview

This guide provides specific code patches for the 3 critical panic risks identified in the Rust WASM modules. Each fix can be applied independently and tested in isolation.

---

## Fix #1: Division by Zero in dmb-segue-analysis/src/predictor.rs

### Problem
```rust
// Line ~450 (approximate)
let total: u32 = transitions.values().sum();
for (&next, &count) in transitions {
    let prob = count as f64 / total as f64;  // PANICS if total == 0
    candidates.entry(next).or_insert_with(PredictionSignals::default).markov_1 = prob;
}
```

**Risk**: If a song has no outgoing transitions (rare but possible edge case), `total` = 0, causing `NaN`.

### Solution

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/predictor.rs`

**Search for**:
```rust
if let Some(transitions) = self.first_order.get(&current) {
    let total: u32 = transitions.values().sum();
    for (&next, &count) in transitions {
        let prob = count as f64 / total as f64;
```

**Replace with**:
```rust
if let Some(transitions) = self.first_order.get(&current) {
    let total: u32 = transitions.values().sum();
    if total == 0 {
        // No transitions recorded - skip this signal
        #[cfg(feature = "console_logs")]
        gloo_console::warn!("No transitions found for song {}", current);
    } else {
        for (&next, &count) in transitions {
            let prob = count as f64 / total as f64;
            candidates.entry(next).or_insert_with(PredictionSignals::default).markov_1 = prob;
        }
    }
}
```

### Locations to Fix (Same Module)

Search for this pattern and apply fix to ALL instances:
- `self.second_order` access (~line 480-490)
- `self.third_order` access (~line 495-505)
- `self.monthly_plays` access (~line 515-525)
- `self.venue_plays` access (~line 510-520)

### Test Case

```rust
#[test]
fn test_predictor_empty_transitions() {
    let predictor = SetlistPredictor::new();
    let context = r#"{
        "currentSongIds": [999],
        "setPosition": "opener"
    }"#;
    
    let result = predictor.predict_ensemble(context, Some(10));
    assert!(result.is_ok(), "Should handle songs with no transitions");
}
```

---

## Fix #2: Underflow in dmb-segue-analysis/src/similarity.rs

### Problem
```rust
// Line ~380 (approximate)
for &song_id in setlist {
    let idx = (song_id as usize - 1).min(self.total_songs - 1);  // PANICS
    vector[idx] = 1.0;
}
```

**Risk Scenarios**:
1. If `song_id == 0`: `0 as usize - 1` underflows → panic in debug mode
2. If `self.total_songs == 0`: Vector has size 0 but indexing happens anyway

### Solution

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/similarity.rs`

**Search for**:
```rust
fn create_feature_vectors(&self, show_ids: &[i64]) -> Vec<Vec<f64>> {
    show_ids.iter()
        .map(|&show_id| {
            let setlist = &self.show_setlists[&show_id];
            let mut vector = vec![0.0; self.total_songs];

            for &song_id in setlist {
                let idx = (song_id as usize - 1).min(self.total_songs - 1);
                vector[idx] = 1.0;
            }
            vector
        })
        .collect()
}
```

**Replace with**:
```rust
fn create_feature_vectors(&self, show_ids: &[i64]) -> Vec<Vec<f64>> {
    show_ids.iter()
        .map(|&show_id| {
            let setlist = &self.show_setlists[&show_id];
            let mut vector = vec![0.0; self.total_songs];

            for &song_id in setlist {
                // Validate song_id is positive
                if song_id <= 0 {
                    #[cfg(feature = "console_logs")]
                    gloo_console::warn!("Invalid song_id {} in show {}", song_id, show_id);
                    continue;
                }

                // Compute safe index with underflow protection
                let idx = if self.total_songs > 0 {
                    ((song_id as usize).saturating_sub(1)).min(self.total_songs - 1)
                } else {
                    continue;  // Skip if vector is empty
                };

                if idx < vector.len() {
                    vector[idx] = 1.0;
                }
            }
            vector
        })
        .collect()
}
```

### Test Cases

```rust
#[test]
fn test_feature_vectors_zero_song_id() {
    let mut engine = SetlistSimilarityEngine::new();
    let result = engine.initialize(r#"[{"songId": 0, "showId": 1}]"#, 100);
    assert!(result.is_ok(), "Should handle song_id of 0");
}

#[test]
fn test_feature_vectors_empty_total_songs() {
    let mut engine = SetlistSimilarityEngine::new();
    let result = engine.initialize(r#"[{"songId": 1, "showId": 1}]"#, 0);
    assert!(result.is_ok(), "Should handle zero total_songs");
}

#[test]
fn test_feature_vectors_negative_song_id() {
    let mut engine = SetlistSimilarityEngine::new();
    let result = engine.initialize(r#"[{"songId": -5, "showId": 1}]"#, 100);
    assert!(result.is_ok(), "Should handle negative song_id");
}
```

---

## Fix #3: Index Out of Bounds in Matrix Operations

### Problem
```rust
// In build_transition_matrix() and similar functions
let n = song_ids.len();
let mut matrix = vec![vec![0.0; n]; n];

for ((from, to), &count) in &transition_data.counts {
    if let (Some(&from_idx), Some(&to_idx)) = (id_to_idx.get(from), id_to_idx.get(to)) {
        counts[from_idx][to_idx] = count;  // Could panic if indices don't match dimensions
        matrix[from_idx][to_idx] = transition_data.get_probability(*from, *to);
    }
}
```

**Risk**: If `id_to_idx` map is corrupted or becomes out of sync with actual matrix dimensions.

### Solution

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/lib.rs`

**Search for**:
```rust
for ((from, to), &count) in &transition_data.counts {
    if let (Some(&from_idx), Some(&to_idx)) = (id_to_idx.get(from), id_to_idx.get(to)) {
        counts[from_idx][to_idx] = count;
        matrix[from_idx][to_idx] = transition_data.get_probability(*from, *to);
    }
}
```

**Replace with**:
```rust
for ((from, to), &count) in &transition_data.counts {
    if let (Some(&from_idx), Some(&to_idx)) = (id_to_idx.get(from), id_to_idx.get(to)) {
        // Bounds check before indexing
        if from_idx < n && to_idx < n {
            counts[from_idx][to_idx] = count;
            matrix[from_idx][to_idx] = transition_data.get_probability(*from, *to);
        } else {
            #[cfg(feature = "console_logs")]
            gloo_console::error!(
                "Index out of bounds: [{},{}] not in range [0,{})",
                from_idx, to_idx, n
            );
        }
    }
}
```

### Test Case

```rust
#[test]
fn test_transition_matrix_bounds() {
    let entries_json = r#"[
        {"songId": 1, "showId": 1, "position": 1},
        {"songId": 2000000, "showId": 1, "position": 2}
    ]"#;
    
    let result = build_transition_matrix(entries_json, Some(1));
    assert!(result.is_ok(), "Should handle large song IDs without panicking");
}
```

---

## Fix #4: Division by Zero in Similarity Engine

### Problem
```rust
// Multiple locations in SetlistSimilarityEngine
let similarity = intersection as f64 / union as f64;  // If union == 0
let cosine = intersection / (magnitude_a * magnitude_b);  // If magnitudes == 0
```

### Solution

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/similarity.rs`

**Search for**:
```rust
fn jaccard_similarity(&self, set_a: &HashSet<i64>, set_b: &HashSet<i64>) -> f64 {
    let intersection = set_a.intersection(set_b).count();
    let union = set_a.union(set_b).count();

    if union == 0 {
        0.0
    } else {
        intersection as f64 / union as f64
    }
}

fn cosine_similarity(&self, set_a: &HashSet<i64>, set_b: &HashSet<i64>) -> f64 {
    let intersection = set_a.intersection(set_b).count() as f64;
    let magnitude_a = (set_a.len() as f64).sqrt();
    let magnitude_b = (set_b.len() as f64).sqrt();

    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        0.0
    } else {
        intersection / (magnitude_a * magnitude_b)
    }
}
```

**Current Status**: These are ALREADY protected! The code already has guards.

**Verify** with:
```bash
grep -n "if union == 0" /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/similarity.rs
```

---

## Implementation Checklist

### Phase 1: Apply Fixes (Day 1)

- [ ] Apply Fix #1: Division by zero in predictor.rs
- [ ] Apply Fix #2: Underflow in similarity.rs
- [ ] Apply Fix #3: Index bounds in matrix operations
- [ ] Verify Fix #4: Confirm division guards exist
- [ ] Run `cargo build --target wasm32-unknown-unknown` without errors
- [ ] Run `cargo test` to verify test suite passes

### Phase 2: Testing (Day 2)

- [ ] Add edge case tests from above to test suite
- [ ] Test with empty input arrays
- [ ] Test with single-element inputs
- [ ] Test with large IDs (> 2^31)
- [ ] Test with negative IDs
- [ ] Run full integration test suite

### Phase 3: Deployment (Day 3)

- [ ] Review diffs with team
- [ ] Get code review approval
- [ ] Merge to main branch
- [ ] Build and deploy to staging
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Monitor error logs for first 24 hours

### Phase 4: Verification (Day 4)

- [ ] Confirm no new errors in production error logs
- [ ] Run performance benchmarks (should see no regression)
- [ ] Document what was fixed in release notes
- [ ] Close associated bug tickets

---

## Verification Commands

### Build and Test
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm

# Build the WASM modules
cargo build --target wasm32-unknown-unknown

# Run Rust unit tests
cargo test --lib

# Build in release mode (optimized)
cargo build --target wasm32-unknown-unknown --release
```

### Check for Panics
```bash
# Search for remaining panic risks
grep -r "\.unwrap()" dmb-segue-analysis/src/ dmb-transform/src/ | grep -v "\.ok()" | grep -v "\.and_then" | grep -v test
grep -r "/ " dmb-segue-analysis/src/ dmb-transform/src/ | grep "as f64" | head -20
grep -r "\[.*\]" dmb-segue-analysis/src/ dmb-transform/src/ | grep -v "//" | head -30
```

### Validate Changes
```bash
# Diff before/after
git diff dmb-segue-analysis/src/predictor.rs
git diff dmb-segue-analysis/src/similarity.rs
git diff dmb-segue-analysis/src/lib.rs

# Commit with message
git commit -m "fix: add guards against panic risks in WASM prediction modules"
```

---

## Rollback Plan

If issues arise after deployment:

```bash
# Identify the commit
git log --oneline | head -20

# Revert if needed
git revert <commit-hash>
git push origin main

# Or fast-forward to previous known good state
git reset --hard origin/previous-stable-tag
git push -f origin main
```

---

## Performance Impact

**Expected**: Negligible (< 1% overhead)

**Reason**: Fixes add only:
- 2-3 conditional branches per function call
- 1-2 `.saturating_sub()` operations (single CPU cycle)
- Early `continue` statements (skip loop iteration)

**Verification**: Run benchmarks before/after:
```bash
# Use wasm-pack bench or custom perf test suite
wasm-pack build --target web --release
# Load in browser, measure time on same dataset
```

---

## Additional Resources

- Rust Error Handling Guide: https://doc.rust-lang.org/book/ch09-00-error-handling.html
- wasm-bindgen JsError Docs: https://docs.rs/wasm-bindgen/latest/wasm_bindgen/
- WASM Performance Tips: https://rustwasm.org/docs/book/

---

## Contact

Questions about specific fixes? Reference the file path and line number in the analysis document above.
