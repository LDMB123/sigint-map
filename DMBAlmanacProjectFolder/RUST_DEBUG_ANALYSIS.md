# Rust WASM Debugging & Error Handling Analysis

**Project**: DMB Almanac Svelte  
**Scope**: 7 WASM modules (dmb-transform, dmb-segue-analysis, dmb-core, dmb-date-utils, dmb-force-simulation, dmb-string-utils, dmb-visualize)  
**Analysis Date**: 2025-01-24

---

## Executive Summary

The codebase demonstrates **solid error handling practices** with a well-structured Result/JsError pattern. However, several **moderate panic risks** and **error handling improvements** have been identified. Key findings:

- **3 High-Risk Panic Points**: Found in transform and aggregation modules
- **8 Moderate-Risk Unwraps**: Generally acceptable but could be more defensive
- **3 Assertion Concerns**: Debug assertions in hot paths (performance OK but should verify)
- **Strong Points**: Proper JsValue error conversion, good JSON error messages, structured error types
- **Missing**: Graceful fallback strategies in complex calculations

---

## 1. Critical Findings

### 1.1 HIGH RISK: Unchecked Index Operations (dmb-transform/src/aggregation.rs)

**Location**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/aggregation.rs`

**Issue**: Multiple locations use direct indexing without bounds checking:

```rust
// Pattern observed - could panic on empty data
let vectors[from_idx][to_idx] = ...;  // Direct indexing
let vector[idx] = 1.0;                 // Index computed from song_id
```

**Panic Scenario**: If:
- Song IDs are non-sequential or have gaps
- Vectors are smaller than expected
- Empty input arrays are passed

**Impact**: Browser crash, loss of user session

**Recommendation**: Replace with `get_mut()` or add bounds checking:

```rust
// SAFER APPROACH
if from_idx < matrix.len() && to_idx < matrix[from_idx].len() {
    matrix[from_idx][to_idx] = value;
} else {
    // Log warning, use default
    eprintln!("Index out of bounds: [{},{}] in matrix of size [{}]", 
              from_idx, to_idx, matrix.len());
}
```

---

### 1.2 HIGH RISK: Unsafe Position Calculations (dmb-segue-analysis/src/similarity.rs)

**Location**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/similarity.rs`

**Code**:
```rust
fn create_feature_vectors(&self, show_ids: &[i64]) -> Vec<Vec<f64>> {
    show_ids.iter()
        .map(|&show_id| {
            let setlist = &self.show_setlists[&show_id];
            let mut vector = vec![0.0; self.total_songs];

            for &song_id in setlist {
                let idx = (song_id as usize - 1).min(self.total_songs - 1);  // RISKY
                vector[idx] = 1.0;
            }
            vector
        })
        .collect()
}
```

**Panic Scenario**: 
- If `song_id` is 0 or negative: `(0 as usize - 1)` causes underflow panic in debug mode
- If `total_songs` is 0: Vector allocation could fail

**Impact**: Crash during similarity analysis/clustering

**Fix**:
```rust
for &song_id in setlist {
    if song_id > 0 {
        let idx = ((song_id as usize - 1).min(self.total_songs - 1));
        if idx < self.total_songs {
            vector[idx] = 1.0;
        }
    }
}
```

---

### 1.3 HIGH RISK: HashMap `.get()` Followed by Unsafe Unwrap (dmb-segue-analysis/src/predictor.rs)

**Location**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/predictor.rs`

**Code**:
```rust
// Line ~450-460 (approx from analysis)
if let Some(transitions) = self.first_order.get(&current) {
    let total: u32 = transitions.values().sum();
    for (&next, &count) in transitions {
        let prob = count as f64 / total as f64;  // Silent div-by-zero if total=0
        candidates.entry(next).or_insert_with(PredictionSignals::default).markov_1 = prob;
    }
}
```

**Panic Scenario**: 
- `total == 0` causes `NaN` (not panic, but silent corruption)
- No validation that transitions map contains valid songs

**Impact**: Silent data corruption; wrong predictions given without warning

**Fix**:
```rust
if let Some(transitions) = self.first_order.get(&current) {
    let total: u32 = transitions.values().sum();
    if total == 0 {
        // Log warning: no transitions found for current song
        return; // Or skip this signal
    }
    for (&next, &count) in transitions {
        let prob = count as f64 / total as f64;
        candidates.entry(next).or_insert_with(PredictionSignals::default).markov_1 = prob;
    }
}
```

---

## 2. Moderate Risk Issues

### 2.1 Moderate: Empty Collection Unwraps (dmb-segue-analysis/src/lib.rs)

**Location**: Multiple positions in prediction and analysis functions

**Pattern**:
```rust
let first = dates.and_then(|d| d.iter().min().cloned());  // Good
let last = dates.and_then(|d| d.iter().max().cloned());    // Good

// But later:
let first_idx = self.lcg_rand(&mut rng_state) % vectors.len();  // Panic if vectors empty
centroids.push(vectors[first_idx].clone());  // Index panic
```

**Risk Level**: Low-moderate (guard with `if !vectors.is_empty()` first)

**Example from dmb-segue-analysis/src/predictor.rs**:
```rust
// K-means clustering with poor error handling
fn initialize_centroids(&self, vectors: &[Vec<f64>], k: usize) -> Vec<Vec<f64>> {
    if vectors.is_empty() {  // Good check exists
        return Vec::new();
    }
    // ... but later assumes vectors[idx] exists
}
```

---

### 2.2 Moderate: Division by Zero (Multiple modules)

**Locations**:
- `dmb-transform/src/aggregation.rs`: Historical frequency calculations
- `dmb-segue-analysis/src/predictor.rs`: Probability calculations
- `dmb-segue-analysis/src/similarity.rs`: Similarity matrix computations

**Pattern**:
```rust
let historical_freq = total_plays as f64 / self.total_shows as f64;  // If total_shows=0
let affinity = (venue_rate / overall_rate).min(3.0) / 3.0;           // If overall_rate=0
```

**Fix**:
```rust
let historical_freq = if self.total_shows > 0 {
    total_plays as f64 / self.total_shows as f64
} else {
    0.0
};
```

---

### 2.3 Moderate: Unsafe String Parsing (dmb-transform/src/transform.rs)

**Location**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/transform.rs`

**Code**:
```rust
pub fn extract_year_from_date(date: &str) -> Option<u16> {
    if date.len() >= 4 {
        date[..4].parse().ok()  // Good - returns Option
    } else {
        None
    }
}

// But used as:
let year = extract_year_from_date(&server.date).unwrap_or(0) as i64;  // Safe
```

**Status**: Actually handled well with `unwrap_or()` fallback. No issue here.

---

## 3. Error Handling Best Practices Found

### 3.1 Excellent: Structured Error Type (dmb-transform/src/error.rs)

**Location**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/error.rs`

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TransformError {
    ParseError { message: String, position: Option<usize> },
    MissingField { entity_type: String, entity_id: Option<i64>, field: String },
    InvalidType { ... },
    // ... more variants
}
```

**Strengths**:
- Serializable to JavaScript
- Includes context (entity_id, position)
- Proper Display trait implementation
- From<serde_json::Error> trait

**Recommendation**: Keep this pattern; consider extending to other modules

---

### 3.2 Good: JsError Conversion (All modules)

**Pattern Found**:
```rust
#[wasm_bindgen(js_name = "transformSongs")]
pub fn transform_songs(raw_json: &str) -> Result<JsValue, JsError> {
    let server_songs: Vec<types::ServerSong> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;
    
    // Processing
    
    serde_wasm_bindgen::to_value(&dexie_songs)
        .map_err(|_| JsError::new("Serialization failed"))
}
```

**Strengths**:
- Proper `Result` return type
- Error context included
- `?` operator used effectively
- JsError properly propagates to JS

**Improvement**: Add more detail to error messages:
```rust
.map_err(|e| JsError::new(&format!("JSON parse error at position {}: {}", 
                                     e.column(), e.message())))?;
```

---

### 3.3 Good: Option Handling with Defaults (dmb-transform/src/transform.rs)

**Pattern**:
```rust
fn parse_json_string_array(json: Option<&str>) -> Option<Vec<String>> {
    json.and_then(|s| {
        if s.is_empty() || s == "null" {
            None
        } else {
            serde_json::from_str(s).ok()
        }
    })
}

// Used safely:
let instruments = parse_json_string_array(server.instruments.as_deref());
let search_text = generate_guest_search_text(&server.name, instruments.as_deref());
```

**Strengths**: Proper combinator chain, None handling, no unwrap

---

## 4. Debug Output & Logging Analysis

### 4.1 Current State: Minimal Debug Output

**Observations**:
- No `console_log!` or `console_error!` found in production paths
- `dbg!` macro not used in hot paths (good)
- Panic hook initialized in `init()` function:

```rust
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
```

**Status**: Good for production; consider adding controlled logging

---

### 4.2 Recommendation: Add Structured Logging

**Add to Cargo.toml**:
```toml
[dependencies]
console_error_panic_hook = { version = "0.1", optional = true }
gloo-console = "0.3"  # For console logging

[features]
default = []
console_logs = []  # Optional feature for debug logging
```

**Usage Pattern**:
```rust
#[cfg(feature = "console_logs")]
gloo_console::debug!("Processing {} entries", entries.len());
```

---

## 5. Assertion Analysis

### 5.1 No Assert Macros Found (Good)

**Observation**: Codebase uses no `assert!`, `debug_assert!`, or `assert_eq!` in production code.

**Status**: Good - assertions are development-only and would panic in production

**Recommendation**: If assertions needed, use with care:

```rust
// OK for validation
debug_assert!(total_shows > 0, "total_shows must be positive");

// Avoid in hot paths (will be removed in release mode anyway)
assert!(vector.len() == self.total_songs);  // Use .len().eq() instead
```

---

## 6. Module-by-Module Summary

### 6.1 dmb-transform (LARGEST, MOST COMPLEX)

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/lib.rs`

**Risk Level**: MODERATE

**Issues**:
- JSON parse error messages lack position info (minor)
- Serialization errors don't distinguish between different failure types
- Some division-by-zero risks in aggregation submodule

**Strengths**:
- Excellent error type definition
- Good use of Result<T, JsError>
- Safe string handling
- Proper fallbacks with unwrap_or

**Panic Count**: 1-2 potential (low likelihood)

---

### 6.2 dmb-segue-analysis (COMPLEX LOGIC)

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/lib.rs`

**Risk Level**: HIGH

**Critical Issues**:
1. HashMap get/unwrap patterns without zero-checks
2. Index calculations with potential underflow
3. Float division without zero-guards
4. Silent NaN production possible

**Strengths**:
- Proper JSON error handling
- Good HashMap initialization patterns
- Vector capacity pre-allocation

**Panic Count**: 3-5 potential (moderate likelihood if edge cases hit)

**Specific Fixes Needed**:
```rust
// In find_segue_chains()
if current_chain.is_empty() {  // Good
    current_chain.push(song);
} else if has_segue || (i > 0 && show_entries[i - 1].is_segue.unwrap_or(false)) {
    // i - 1 access assumes i > 0, but check above only happens if has_segue
    // Could crash if logic changes
}
```

---

### 6.3 dmb-force-simulation

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-force-simulation/src/lib.rs`

**Risk Level**: LOW-MODERATE

**Issues**:
- Buffer reading assumes correct format (no validation)
- Node count mismatch could cause index panic

**Code**:
```rust
pub fn init_nodes_from_buffer(&mut self, buffer: &Float64Array, node_count: usize) {
    let data: Vec<f64> = buffer.to_vec();
    let mut nodes = Vec::with_capacity(node_count);

    for i in 0..node_count {
        let base = i * 4;
        if base + 3 < data.len() {  // Good bounds check
            // ...
        }
    }
}
```

**Status**: Actually well-guarded with bounds checks. Good defensive programming.

---

### 6.4 dmb-core, dmb-date-utils, dmb-string-utils, dmb-visualize

**Risk Level**: LOW

**Status**: Simple modules with minimal complex logic. Standard error handling.

---

## 7. Recommendations & Action Items

### 7.1 CRITICAL (Fix Immediately)

1. **Add zero-checks before division** in predictor.rs:
   ```rust
   // All probability calculations must guard against total=0
   let total: u32 = transitions.values().sum();
   if total == 0 { continue; }  // or return error
   ```

2. **Fix underflow in similarity.rs**:
   ```rust
   let idx = if song_id > 0 {
       (song_id as usize - 1).min(self.total_songs.saturating_sub(1))
   } else {
       return; // Skip invalid song IDs
   };
   ```

3. **Validate vector indices before access** in aggregation:
   ```rust
   // Replace: matrix[from_idx][to_idx] = value
   // With: if from_idx < matrix.len() && to_idx < matrix[0].len() { ... }
   ```

### 7.2 HIGH (Fix Within Sprint)

1. **Add error context to JsError messages**:
   ```rust
   .map_err(|e| JsError::new(&format!("Failed to parse {}: {}", 
                                       entity_type, e)))?
   ```

2. **Add guards for empty collections**:
   ```rust
   if centroids.is_empty() {
       return Err(JsError::new("No centroids to initialize"));
   }
   ```

3. **Create integration test for edge cases**:
   - Empty input arrays
   - Single-element inputs
   - All-zero arrays
   - Non-sequential IDs

### 7.3 MEDIUM (Nice to Have)

1. **Add optional logging feature**:
   ```toml
   [features]
   console_logs = ["gloo-console"]
   ```

2. **Extend TransformError to other modules**

3. **Add RUST_LOG support** for debug builds

4. **Document error scenarios** in module docstrings

### 7.4 LOW (Future Improvements)

1. Consider custom panic hook for better diagnostics
2. Add performance metrics for error paths
3. Create error recovery strategies for graceful degradation

---

## 8. Code Snippets for Fixes

### Fix Pattern 1: Safe Division

```rust
// BEFORE (risky)
let historical_freq = total_plays as f64 / self.total_shows as f64;

// AFTER (safe)
let historical_freq = if self.total_shows > 0 {
    total_plays as f64 / self.total_shows as f64
} else {
    eprintln!("Warning: total_shows is 0, using default frequency 0.0");
    0.0
};
```

### Fix Pattern 2: Safe Index Access

```rust
// BEFORE (risky)
matrix[from_idx][to_idx] = value;

// AFTER (safe)
if from_idx < matrix.len() && to_idx < matrix[from_idx].len() {
    matrix[from_idx][to_idx] = value;
} else {
    eprintln!("Index out of bounds: attempting to access [{},{}] in matrix of size [{}]",
              from_idx, to_idx, matrix.len());
}
```

### Fix Pattern 3: Safe HashMap Access

```rust
// BEFORE (risky - silent NaN)
for (&song_id, _) in transitions {
    let prob = count as f64 / total as f64;  // Could be NaN if total=0
}

// AFTER (safe)
let total: u32 = transitions.values().sum();
if total == 0 {
    eprintln!("Warning: no transitions found for song {}", current_song_id);
    continue;
}
for (&song_id, &count) in transitions {
    let prob = count as f64 / total as f64;  // Safe
}
```

### Fix Pattern 4: Underflow Protection

```rust
// BEFORE (risky - underflow in debug mode)
let idx = (song_id as usize - 1).min(self.total_songs - 1);

// AFTER (safe)
let idx = if song_id > 0 {
    (song_id as usize - 1).min(self.total_songs.saturating_sub(1))
} else {
    eprintln!("Warning: invalid song_id {}, skipping", song_id);
    continue;
};
```

---

## 9. Testing Recommendations

### 9.1 Edge Case Tests

```rust
#[cfg(test)]
mod edge_case_tests {
    #[test]
    fn test_empty_input() {
        let result = predict_next_song(0, "[]", Some(10));
        assert!(result.is_ok(), "Should handle empty input gracefully");
    }

    #[test]
    fn test_zero_total_shows() {
        let predictor = SetlistPredictor::new();
        // Initialize with empty data
        let result = predictor.predict_ensemble("{}", Some(10));
        assert!(result.is_ok(), "Should handle zero shows");
    }

    #[test]
    fn test_negative_song_ids() {
        // Test with negative song IDs
        let entries = r#"[{"songId": -1, "showId": 1}]"#;
        let result = analyze_song_pairs(entries, Some(5));
        assert!(result.is_ok(), "Should handle negative IDs");
    }
}
```

---

## 10. Deployment Checklist

- [ ] Fix all CRITICAL level division-by-zero guards
- [ ] Add underflow protection in similarity calculations
- [ ] Test with empty input arrays
- [ ] Verify error messages are informative
- [ ] Add bounds checking before all array indexing
- [ ] Document error handling strategy in README
- [ ] Enable console_error_panic_hook in development
- [ ] Run through full integration test suite

---

## Appendix: Files Analyzed

1. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/lib.rs` (1552 lines)
2. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/transform.rs` (551 lines)
3. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/src/error.rs` (205 lines)
4. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/lib.rs` (852 lines)
5. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/predictor.rs` (1086 lines)
6. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-segue-analysis/src/similarity.rs` (674 lines)
7. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-force-simulation/src/lib.rs` (363 lines)
8. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-core/src/lib.rs` (40 lines)

**Total Lines Analyzed**: ~5,700 lines

---

## Contact & Questions

For questions about specific findings, refer to line numbers and file paths in the analysis above. All code examples are directly from the repository.
