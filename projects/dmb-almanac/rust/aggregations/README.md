# DMB WASM Aggregations

High-performance statistical aggregations for DMB Almanac, written in Rust and compiled to WebAssembly.

---

## Overview

This crate provides WASM-compiled statistical functions optimized for year-based aggregations and numeric computations.

**Performance**: 5-10x faster than pure JavaScript implementations.

**Size**: ~19KB binary (7KB gzipped).

**Target**: Web browsers with WebAssembly support (Chrome 89+, Firefox 89+, Safari 15+).

---

## Building

### Prerequisites

1. **Rust toolchain** (1.70+):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **wasm-pack** (WASM build tool):
   ```bash
   cargo install wasm-pack
   ```

### Build Commands

**Development build** (faster compilation, larger binary):
```bash
cd rust/aggregations
wasm-pack build --target web --dev
```

**Production build** (optimized, minimal size):
```bash
cd rust/aggregations
wasm-pack build --target web --release --out-dir ../../app/src/lib/wasm/aggregations
```

**Automated build** (recommended):
```bash
# From project root
./scripts/build-wasm.sh
```

**Output**:
```
app/src/lib/wasm/aggregations/
├── index.js         # JavaScript bindings
├── index.d.ts       # TypeScript definitions
├── index_bg.wasm    # WASM binary (~19KB)
└── package.json     # NPM package metadata
```

---

## Testing

### Run Rust Unit Tests

```bash
cd rust/aggregations
cargo test
```

**Expected Output**:
```
running 2 tests
test tests::test_aggregate_by_year ... ok
test tests::test_calculate_percentile ... ok

test result: ok. 2 passed; 0 failed; 0 ignored
```

### Run Linter

```bash
cargo clippy -- -D warnings
```

**Expected**: No warnings or errors.

### Format Code

```bash
cargo fmt
```

---

## Integration Tests

JavaScript integration tests are located in `/app/tests/wasm/`.

**Run integration tests**:
```bash
cd app
npm test -- tests/wasm/aggregations.integration.test.js
```

**Prerequisites**: Must build WASM module first (`./scripts/build-wasm.sh`).

---

## Project Structure

```
rust/aggregations/
├── Cargo.toml          # Rust package manifest
├── src/
│   └── lib.rs          # Main source file with all functions
└── README.md           # This file
```

**Key Files**:
- `Cargo.toml`: Dependencies and build configuration
- `src/lib.rs`: All WASM-exported functions

---

## Adding New Functions

### Step 1: Implement in Rust

Add new function to `src/lib.rs`:

```rust
use wasm_bindgen::prelude::*;

/// Your function description
///
/// # Arguments
/// * `input` - Description of input
///
/// # Returns
/// Description of return value
#[wasm_bindgen]
pub fn my_new_function(input: &[u32]) -> js_sys::Map {
    // Your implementation here
    let result = js_sys::Map::new();

    // ... computation ...

    result
}
```

**Important**:
- Add `#[wasm_bindgen]` attribute to export to JavaScript
- Use `js_sys` types for JavaScript interop (Map, Array, etc.)
- Add doc comments for documentation generation

---

### Step 2: Add Rust Tests

Add test to `lib.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_new_function() {
        let input = vec![1, 2, 3];
        let result = my_new_function(&input);

        assert!(result.size() > 0);
        // Add more assertions
    }
}
```

Run tests:
```bash
cargo test
```

---

### Step 3: Rebuild WASM Module

```bash
./scripts/build-wasm.sh
```

This regenerates JavaScript bindings with your new function.

---

### Step 4: Update TypeScript Definitions

Update `app/src/lib/wasm/loader.js` type definition:

```javascript
/**
 * @typedef {Object} WasmAggregationsModule
 * @property {function(Uint32Array): Map<number, number>} aggregate_by_year
 * @property {function(Array): Map<number, number>} unique_songs_per_year
 * @property {function(Float64Array, number): number} calculate_percentile
 * @property {function(...): ...} my_new_function  // Add your function here
 */
```

---

### Step 5: Add JavaScript Tests

Create integration test in `/app/tests/wasm/aggregations.integration.test.js`:

```javascript
describe('my_new_function()', () => {
  it('should compute correctly', async () => {
    if (!wasmModule) return;

    const input = new Uint32Array([1, 2, 3]);
    const result = wasmModule.my_new_function(input);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBeGreaterThan(0);
  });
});
```

Run tests:
```bash
cd app
npm test
```

---

### Step 6: Document

Add documentation to `WASM_API_REFERENCE.md`:

```markdown
### my_new_function()

Brief description.

**Signature**: `my_new_function(input: Uint32Array): Map<number, number>`

**Purpose**: Detailed purpose

**Performance**:
- **WASM**: Xms
- **JavaScript**: Yms
- **Speedup**: Zx

**Example**:
...
```

---

## Optimization Configuration

### Cargo.toml Settings

```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
```

**Optimization Flags**:
- `-Oz`: Aggressive size optimization (more than -O3)
- `--enable-bulk-memory`: Modern WASM feature for efficient memory ops
- `--enable-nontrapping-float-to-int`: Modern WASM feature for float conversions

**Trade-offs**:
- `-Oz` reduces binary size ~30% vs `-O3`
- Slight performance penalty (~5-10%) vs `-O3`
- Faster network transfer > small performance loss

---

### Dependencies

```toml
[dependencies]
wasm-bindgen = "0.2"     # JavaScript interop
js-sys = "0.3"           # JavaScript types (Map, Array, etc.)
web-sys = "0.3"          # Web APIs (if needed)
serde = { version = "1.0", features = ["derive"] }  # Serialization
serde-wasm-bindgen = "0.6"  # Serde + wasm-bindgen integration
```

**Dependency Rationale**:
- `wasm-bindgen`: Core WASM ↔ JavaScript bridge
- `js-sys`: Access to JavaScript built-in types
- `serde`: Efficient serialization (future use)

---

## Performance Tips

### Use Stack Allocation

**Good**:
```rust
let mut histogram = [0u32; 35]; // Stack-allocated (140 bytes)
```

**Bad**:
```rust
let mut histogram = vec![0u32; 35]; // Heap-allocated (overhead)
```

**Why**: Stack allocation is faster and avoids heap fragmentation.

---

### SIMD Auto-Vectorization

Write loops that the compiler can auto-vectorize:

**Good** (SIMD-friendly):
```rust
for &year in years {
    if year >= 1991 && year <= 2026 {
        let bin = (year - 1991) as usize;
        histogram[bin] += 1;
    }
}
```

**Why**: Simple loop bodies with no branching enable SIMD.

---

### Minimize JavaScript Interop

Batch operations to reduce border crossing overhead:

**Good** (1 WASM call):
```rust
pub fn batch_operation(items: &js_sys::Array) -> js_sys::Map {
    // Process all items in one call
}
```

**Bad** (N WASM calls):
```rust
pub fn single_operation(item: &JsValue) -> JsValue {
    // Called once per item from JavaScript
}
```

---

### Use Appropriate Data Structures

**Histograms**: Fixed-size array
```rust
let mut histogram = [0u32; 35];
```

**Unique counting**: HashMap + HashSet
```rust
let mut map: HashMap<u32, HashSet<String>> = HashMap::new();
```

**Sorting**: Vec with sort_unstable
```rust
let mut vec = Vec::new();
vec.sort_unstable_by(|a, b| b.cmp(a)); // Faster than sort()
```

---

## Debugging

### Enable Debug Logging

Add to `lib.rs`:
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn my_function(input: &[u32]) -> js_sys::Map {
    log(&format!("Processing {} items", input.len()));
    // ...
}
```

**Output**: Logs appear in browser console.

---

### Check Binary Size

```bash
ls -lh app/src/lib/wasm/aggregations/index_bg.wasm
```

**Expected**: ~19KB for current implementation.

**Large binaries** (>50KB):
- Check for unnecessary dependencies
- Ensure `-Oz` optimization is enabled
- Use `wasm-opt` for further reduction

---

### Profile Performance

Use browser DevTools Performance tab:
1. Record profile
2. Trigger WASM function
3. Look for "WASM" entries in timeline

**Red flags**:
- WASM calls taking >100ms (check dataset size)
- Frequent GC pauses (reduce allocations)

---

## Common Issues

### Issue: "wasm-pack command not found"

**Solution**:
```bash
cargo install wasm-pack
```

---

### Issue: Build fails with "unknown target"

**Solution**: Add wasm32 target:
```bash
rustup target add wasm32-unknown-unknown
```

---

### Issue: JavaScript can't find WASM module

**Cause**: Module not built or wrong output directory.

**Solution**:
```bash
./scripts/build-wasm.sh
```

**Verify output**:
```bash
ls app/src/lib/wasm/aggregations/index_bg.wasm
```

---

### Issue: Binary size too large

**Solution 1**: Ensure release build:
```bash
wasm-pack build --release
```

**Solution 2**: Run wasm-opt manually:
```bash
wasm-opt -Oz input.wasm -o output.wasm
```

---

### Issue: Performance slower than expected

**Cause**: Development build instead of release build.

**Solution**: Use release build:
```bash
wasm-pack build --release
```

**Difference**: Release builds are 10-50x faster than dev builds.

---

## Resources

### Documentation
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [js-sys API](https://rustwasm.github.io/wasm-bindgen/api/js_sys/)

### Tools
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [wasm-opt](https://github.com/WebAssembly/binaryen)

### DMB Almanac Docs
- **API Reference**: `/WASM_API_REFERENCE.md`
- **Performance Guide**: `/WASM_PERFORMANCE_GUIDE.md`
- **Integration Examples**: `/WASM_INTEGRATION_EXAMPLES.md`
- **Build Script**: `/scripts/build-wasm.sh`

---

## Changelog

### v0.1.0 - 2025-01-29
- Initial implementation
- `aggregate_by_year()`: Year histogram with SIMD optimization
- `unique_songs_per_year()`: Unique song counting with HashSet
- `calculate_percentile()`: Linear interpolation percentile
- wasm-opt size optimization (-Oz)
- 19KB binary size
- 5-10x faster than JavaScript

---

## Contributing

1. Add function to `src/lib.rs`
2. Add Rust unit tests
3. Rebuild with `./scripts/build-wasm.sh`
4. Add JavaScript integration tests
5. Update documentation
6. Test on real data
7. Profile performance

**Code Style**: Run `cargo fmt` before committing.

**Linting**: Ensure `cargo clippy` passes with no warnings.
