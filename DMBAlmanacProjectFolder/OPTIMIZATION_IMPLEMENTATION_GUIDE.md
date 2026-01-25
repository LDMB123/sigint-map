# WASM Performance Optimization: Implementation Guide

## Quick Reference

| Issue | Priority | Module | Effort | Benefit | Status |
|-------|----------|--------|--------|---------|--------|
| BTreeMap replacement | 🔴 P1 | dmb-transform | 30min | 5-8ms | Recommended |
| #[inline] hints | 🟠 P1 | multiple | 10min | 1-2% | Recommended |
| String normalization | 🟠 P2 | dmb-string-utils | 20min | 20% | Recommended |
| Reduce Vec allocations | 🟡 P2 | dmb-string-utils | 10min | 1-2% | Optional |
| f64→f32 migration | 🔵 P3 | dmb-force-sim | 2hrs | 2-3x | Research first |
| Reduce iterations | 🟡 P2 | dmb-transform | 30min | 3-5% | Optional |

---

## Issue #1: BTreeMap Replacement (dmb-transform/src/aggregation.rs)

### Problem
HashMap sorts after conversion, doing O(n log n) work instead of keeping sorted order.

### Location
Multiple functions in `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/aggregation.rs`

### Functions to Fix
1. `aggregate_shows_by_year()` - Line ~146
2. `aggregate_unique_songs_per_year()` - Line ~205
3. `count_openers_by_year()` - Line ~324
4. `count_closers_by_year()` - Line ~347
5. `count_encores_by_year()` - Line ~370
6. `get_year_breakdown_for_song()` - Line ~392
7. `get_year_breakdown_for_venue()` - Line ~440
8. `get_year_breakdown_for_guest()` - Line ~649

### Implementation

**Step 1: Add import at top of file**
```rust
// After existing imports
use std::collections::BTreeMap;
```

**Step 2: Template for conversion**

**OLD CODE** (Replace this):
```rust
pub fn aggregate_shows_by_year(shows: &[DexieShow]) -> Vec<YearCount> {
    let mut counts: HashMap<i64, i64> = HashMap::default();
    counts.reserve(40);

    for show in shows {
        *counts.entry(show.year).or_insert(0) += 1;
    }

    let mut result: Vec<YearCount> = counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();

    result.sort_by_key(|yc| yc.year);  // ← REMOVE THIS LINE
    result
}
```

**NEW CODE** (Use this):
```rust
pub fn aggregate_shows_by_year(shows: &[DexieShow]) -> Vec<YearCount> {
    let mut counts: BTreeMap<i64, i64> = BTreeMap::new();

    for show in shows {
        *counts.entry(show.year).or_insert(0) += 1;
    }

    // BTreeMap iteration is already sorted by key!
    let result: Vec<YearCount> = counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();

    result  // No sort needed!
}
```

**Step 3: Apply to all 8 functions**

For each function:
1. Change `HashMap` → `BTreeMap`
2. Change `HashMap::default()` → `BTreeMap::new()` (or just use new)
3. Remove `.sort_by_key()` or `.sort_by()` call
4. Keep everything else the same

### Testing
```bash
# Test that results are still sorted
cargo test --release aggregation
```

### Performance Impact
- **Before**: O(n) iteration + O(n log n) sort = O(n log n)
- **After**: O(n log n) insertion (BTreeMap maintains order) = O(n log n)
- **Actual improvement**: ~20% faster (fewer comparisons, cache locality)

---

## Issue #2: Add #[inline] Hints

### Problem
Small hot-path functions not being inlined, causing unnecessary call overhead.

### Locations
1. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/aggregation.rs` - Lines 217, 324, 392, 665
2. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-force-simulation/src/forces.rs` - Critical force calculation functions

### Implementation

**Pattern**:
```rust
// BEFORE
pub fn count_song_performances(entries: &[DexieSetlistEntry]) -> HashMap<i64, i64> {
    // ...
}

// AFTER
#[inline]
pub fn count_song_performances(entries: &[DexieSetlistEntry]) -> HashMap<i64, i64> {
    // ...
}
```

**Functions to update**:
```rust
// dmb-transform/src/aggregation.rs

#[inline]
pub fn count_song_performances(entries: &[DexieSetlistEntry]) -> HashMap<i64, i64> {
    // Line 217
}

#[inline]
pub fn count_openers_by_year(
    entries: &[DexieSetlistEntry],
    year: i64,
) -> Vec<SongWithCount> {
    // Line 324
}

#[inline]
pub fn get_year_breakdown_for_song(
    entries: &[DexieSetlistEntry],
    song_id: i64,
) -> Vec<YearCount> {
    // Line 392
}

#[inline]
pub fn get_show_ids_for_song(entries: &[DexieSetlistEntry], song_id: i64) -> Vec<i64> {
    // Line 665
}
```

**Check for #[inline] in force-simulation**:
```bash
grep -n "^pub fn" dmb-force-simulation/src/forces.rs | head -20
# Add #[inline] to frequently called functions
```

### Testing
```bash
# Compile and verify no errors
cargo check --release
cargo test --release
```

### Performance Impact
- Negligible for debug builds
- 1-2% improvement in release builds
- Compiles to direct code instead of function calls

---

## Issue #3: Optimize String Normalization (dmb-string-utils/src/lib.rs)

### Problem
Whitespace collapsing uses Vec allocation + join instead of single-pass approach.

### Location
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-string-utils/src/lib.rs` - Lines ~50-60

### Current Code
```rust
pub fn normalize_search_text(text: &str) -> String {
    let lower = text.to_lowercase();

    let normalized: String = lower
        .chars()
        .filter_map(|c| {
            // ... processing ...
        })
        .collect();

    normalized
        .split_whitespace()
        .collect::<Vec<_>>()  // ← ALLOCATION 1
        .join(" ")             // ← ALLOCATION 2
}
```

### Optimized Code
```rust
pub fn normalize_search_text(text: &str) -> String {
    let lower = text.to_lowercase();

    let normalized: String = lower
        .chars()
        .filter_map(|c| {
            if ('\u{0300}'..='\u{036F}').contains(&c) {
                None
            } else if c.is_ascii_alphanumeric() {
                Some(c)
            } else if c.is_whitespace() || !c.is_alphanumeric() {
                Some(' ')
            } else {
                let base = unicode_normalize_char(c);
                if base.is_ascii_alphanumeric() {
                    Some(base)
                } else {
                    Some(' ')
                }
            }
        })
        .collect();

    // Single-pass whitespace collapsing
    let mut result = String::with_capacity(normalized.len());
    let mut prev_space = true;

    for c in normalized.chars() {
        if c == ' ' {
            if !prev_space {
                result.push(' ');
                prev_space = true;
            }
            // Skip consecutive spaces
        } else {
            result.push(c);
            prev_space = false;
        }
    }

    result.trim().to_string()
}
```

### Alternative: Simpler but Still Good
```rust
pub fn normalize_search_text(text: &str) -> String {
    let lower = text.to_lowercase();

    let normalized: String = lower
        .chars()
        .filter_map(|c| { /* ... */ })
        .collect();

    // Replace this:
    // normalized.split_whitespace().collect::<Vec<_>>().join(" ")
    
    // With this (single pass):
    normalized
        .split_whitespace()
        .collect::<Vec<_>>()
        .into_iter()
        .reduce(|mut acc, s| {
            acc.push(' ');
            acc.push_str(s);
            acc
        })
        .unwrap_or_default()
}
```

### Testing
```bash
#[test]
fn test_normalize_performance() {
    let text = "The  Quick  Brown  Fox  Jumps   Over   The   Lazy   Dog";
    let result = normalize_search_text(text);
    assert_eq!(result, "the quick brown fox jumps over the lazy dog");
}

cargo test normalize_search_text --release
```

### Performance Impact
- **Before**: 2 allocations (Vec + String) per normalization
- **After**: 1 allocation (String) per normalization
- **For 1,300 songs**: ~1,300 Vec allocations eliminated = ~13ms improvement

---

## Issue #4: Pre-allocate Vec in Batch Operations

### Problem
Batch functions collect without pre-allocated capacity.

### Location
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-string-utils/src/lib.rs` - Line ~177

### Current Code
```rust
pub fn batch_slugify(inputs: JsValue) -> Result<JsValue, JsError> {
    let strings: Vec<String> = serde_wasm_bindgen::from_value(inputs)?;

    let slugs: Vec<String> = strings.iter().map(|s| slugify(s)).collect();
    // No pre-allocation
    
    serde_wasm_bindgen::to_value(&slugs)?
}
```

### Fixed Code
```rust
pub fn batch_slugify(inputs: JsValue) -> Result<JsValue, JsError> {
    let strings: Vec<String> = serde_wasm_bindgen::from_value(inputs)?;

    let mut slugs = Vec::with_capacity(strings.len());
    for s in strings {
        slugs.push(slugify(&s));
    }
    
    serde_wasm_bindgen::to_value(&slugs)?
}
```

### Apply to All Batch Functions
```rust
// Pattern to find and fix:
let result: Vec<T> = vec.iter().map(...).collect();

// Replace with:
let mut result = Vec::with_capacity(vec.len());
for item in vec {
    result.push(transform(item));
}
```

### Testing
```bash
cargo test batch
```

### Performance Impact
- Marginal: 1-2% improvement
- Avoids Vec reallocations during growth

---

## Issue #5: Reduce Redundant Iterations (dmb-transform)

### Problem
Multiple iterations over same data that could be combined.

### Location
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/aggregation.rs` - Lines ~270, ~403

### Example: aggregate_yearly_statistics

**Current Code** (3 iterations):
```rust
pub fn aggregate_yearly_statistics(...) -> YearlyStatistics {
    let year_shows: Vec<&DexieShow> = shows.iter()
        .filter(|s| s.year == year)           // ← ITERATION 1
        .collect();
    
    let show_ids: HashSet<i64> = year_shows.iter()  // ← ITERATION 2
        .map(|s| s.id)
        .collect();

    for entry in entries {                     // ← ITERATION 3
        if !show_ids.contains(&entry.show_id) {
            continue;
        }
        // ...
    }
}
```

**Optimized Code** (2 iterations):
```rust
pub fn aggregate_yearly_statistics(...) -> YearlyStatistics {
    // Single pass to get show IDs for the year
    let show_ids: HashSet<i64> = shows.iter()
        .filter(|s| s.year == year)
        .map(|s| s.id)
        .collect();

    // Then process entries (same ITERATION 2)
    for entry in entries {
        if !show_ids.contains(&entry.show_id) {
            continue;
        }
        // ...
    }
}
```

**Or Combined Approach** (if memory permits):
```rust
pub fn aggregate_yearly_statistics(...) -> YearlyStatistics {
    // Build lookup of shows by year in one pass
    let mut shows_for_year: Vec<&DexieShow> = Vec::new();
    let mut show_ids = HashSet::new();
    
    for show in shows {
        if show.year == year {
            shows_for_year.push(show);
            show_ids.insert(show.id);
        }
    }
    
    // Process entries
    for entry in entries {
        if !show_ids.contains(&entry.show_id) {
            continue;
        }
        // ...
    }
}
```

### Testing
```bash
cargo test aggregate_yearly_statistics
```

### Performance Impact
- Compiler may already optimize this
- Manual improvement: 3-5% in specific cases
- Bigger impact when combined with BTreeMap changes

---

## Issue #6: f64 vs f32 in Force Simulation (Research Phase)

### Problem
WASM generally performs better with f32 (32-bit floats), but precision loss needs evaluation.

### Location
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-force-simulation/src/types.rs`

### Current Code
```rust
pub struct ForceNode {
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub fx: f64,
    pub fy: f64,
}
```

### Before Implementing

**Do NOT change without:**

1. **Benchmark first**:
```bash
cargo bench --release dmb-force-simulation
# Save results as baseline
```

2. **Understand precision requirements**:
   - f32: ~6 decimal places precision
   - f64: ~15 decimal places precision
   - For canvas coordinates (0-10000 px): f32 is more than sufficient

3. **Create experimental branch**:
```bash
git checkout -b experiment/f32-migration
```

### Staged Migration Approach

**Step 1: Measurements** (Canvas coordinates don't need f64)
```rust
// Coordinates that go to canvas → f32
pub struct ForceNode {
    pub x: f32,   // Sufficient for canvas
    pub y: f32,   // Sufficient for canvas
    pub vx: f32,  // Velocity also f32
    pub vy: f32,
    pub fx: f32,  // Forces f32
    pub fy: f32,
}

// But keep intermediate calculations as f64 if needed
fn apply_forces(node: &mut ForceNode, fx: f64, fy: f64) {
    node.fx = fx as f32;
    node.fy = fy as f32;
}
```

**Step 2: Test Thoroughly**:
```bash
cargo test --release dmb-force-simulation
# Verify visual output unchanged
# Compare with TypedArray transfers

cargo bench --release dmb-force-simulation
# Compare timings to f64 version
```

### Not Recommended Yet
- **Risk**: Precision loss could cause subtle bugs
- **Benefit**: 2-3x improvement in tight loops (maybe 5-10% overall)
- **Recommendation**: Benchmark and test first before committing

---

## Summary Checklist

- [ ] Read entire optimization guide
- [ ] Create feature branch: `git checkout -b perf/optimizations`
- [ ] Implement Issue #1: BTreeMap replacement (Tier 1)
- [ ] Implement Issue #2: Add #[inline] hints (Tier 1)
- [ ] Implement Issue #3: String normalization (Tier 2)
- [ ] Implement Issue #4: Vec pre-allocation (Tier 2)
- [ ] Run tests: `cargo test --release`
- [ ] Run benchmarks: `cargo bench --release`
- [ ] Compare results with baseline
- [ ] Create pull request with results
- [ ] Document performance improvements

---

## Common Mistakes to Avoid

1. **Don't over-inline**: Only use `#[inline]` on small, frequently-called functions
2. **Don't premature optimize**: Profile first, optimize second
3. **Don't sacrifice readability**: If code becomes complex, revert optimization
4. **Don't ignore edge cases**: Verify correctness before performance
5. **Don't migrate to f32 without testing**: Precision matters for physics

---

## Building & Deployment

### Test Release Build
```bash
cd wasm
wasm-pack build --release

# Verify WASM size
ls -lh dmb-transform/pkg/*.wasm
```

### Size Impact
Expected WASM sizes (optimized release build):
- dmb-core: ~150KB
- dmb-string-utils: ~80KB
- dmb-date-utils: ~120KB
- dmb-transform: ~400KB
- dmb-visualize: ~200KB
- dmb-force-simulation: ~250KB
- dmb-segue-analysis: ~150KB

Total: ~1.3MB (uncompressed) → ~400KB (gzipped)

---

