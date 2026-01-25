# Skill: WASM Runtime Performance Tuning

**ID**: `wasm-performance-tuning`
**Category**: WASM Optimization
**Agent**: Full-Stack Developer

---

## When to Use

- Optimizing WASM runtime performance
- Reducing JavaScript-WASM boundary overhead
- Improving computational throughput
- Optimizing memory access patterns
- Maximizing SIMD utilization

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| wasm_module | string | Yes | Path to WASM module |
| benchmark_target | string | No | Specific function to optimize |

---

## Steps

### Step 1: Profile for Speed

```toml
# Cargo.toml - Performance-focused profile
[profile.release]
opt-level = 3              # Maximum optimization
lto = "fat"                # Aggressive LTO
codegen-units = 1          # Better optimization
panic = "abort"            # Faster unwinding

# Enable CPU features
[build]
rustflags = ["-C", "target-cpu=native"]
```

**For WASM specifically:**
```toml
[profile.release]
opt-level = 3

[profile.release.package."*"]
opt-level = 3

# WASM-specific flags
[target.wasm32-unknown-unknown]
rustflags = [
    "-C", "link-arg=-z",
    "-C", "link-arg=stack-size=1048576",  # 1MB stack
]
```

### Step 2: Optimize Memory Layout

```rust
// Bad: Lots of small allocations
fn process_items(items: Vec<Item>) -> Vec<Result> {
    items.iter()
        .map(|item| process_one(item))  // Many allocations
        .collect()
}

// Good: Pre-allocate and reuse
fn process_items(items: &[Item], results: &mut Vec<Result>) {
    results.clear();
    results.reserve(items.len());
    for item in items {
        results.push(process_one(item));
    }
}

// Better: Use with_capacity
fn process_items(items: &[Item]) -> Vec<Result> {
    let mut results = Vec::with_capacity(items.len());
    for item in items {
        results.push(process_one(item));
    }
    results
}
```

**Memory Layout Patterns:**
```rust
use std::mem;

// Align data for better cache performance
#[repr(C, align(64))]  // Cache line alignment
struct CacheAligned {
    data: [u8; 64],
}

// Pack structs to reduce memory
#[repr(C, packed)]
struct Packed {
    a: u8,
    b: u32,
    c: u8,
}

// Use array-of-structs vs struct-of-arrays based on access pattern
// AOS: Better if accessing all fields of one item
struct AOS {
    items: Vec<Item>,  // Item = {x, y, z}
}

// SOA: Better if processing one field across all items
struct SOA {
    x_values: Vec<f32>,
    y_values: Vec<f32>,
    z_values: Vec<f32>,
}
```

### Step 3: Minimize JS Boundary Crossings

```rust
use wasm_bindgen::prelude::*;

// Bad: Multiple boundary crossings
#[wasm_bindgen]
pub fn process_bad(len: usize) -> f64 {
    let mut sum = 0.0;
    for i in 0..len {
        sum += get_value(i);  // JS call each iteration!
    }
    sum
}

// Good: Batch transfer
#[wasm_bindgen]
pub fn process_good(values: &[f64]) -> f64 {
    values.iter().sum()  // All in WASM
}

// Better: Use typed arrays
#[wasm_bindgen]
pub fn process_typed(values: &js_sys::Float64Array) -> f64 {
    values.to_vec().iter().sum()
}

// Best: Work directly on shared memory
#[wasm_bindgen]
pub fn process_memory(ptr: *const f64, len: usize) -> f64 {
    unsafe {
        std::slice::from_raw_parts(ptr, len)
            .iter()
            .sum()
    }
}
```

**Batching Pattern:**
```rust
// Instead of many small calls
// BAD:
for item in items {
    wasm.process_one(item);
}

// Good: Single batch call
wasm.process_batch(items);
```

### Step 4: Enable and Use SIMD

```toml
# Cargo.toml
[dependencies]
packed_simd = "0.3"
```

```rust
use std::simd::*;

// Manual SIMD with std::simd (requires nightly)
#[target_feature(enable = "simd128")]
unsafe fn add_arrays_simd(a: &[f32], b: &[f32], out: &mut [f32]) {
    assert_eq!(a.len(), b.len());
    assert_eq!(a.len(), out.len());

    let lanes = 4;
    let chunks = a.len() / lanes;

    for i in 0..chunks {
        let offset = i * lanes;
        let va = f32x4::from_slice(&a[offset..]);
        let vb = f32x4::from_slice(&b[offset..]);
        let vout = va + vb;
        vout.copy_to_slice(&mut out[offset..]);
    }

    // Handle remainder
    for i in (chunks * lanes)..a.len() {
        out[i] = a[i] + b[i];
    }
}

// Auto-vectorization friendly code
fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    // Compiler can auto-vectorize this
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| x * y)
        .sum()
}
```

**Enable SIMD in build:**
```bash
# Build with SIMD support
RUSTFLAGS="-C target-feature=+simd128" \
  cargo build --release --target wasm32-unknown-unknown

# Verify SIMD in output
wasm-objdump -d output.wasm | grep -i simd
```

**Performance Gain:** 2-4x for suitable workloads

### Step 5: Avoid Allocations in Hot Paths

```rust
use std::cell::RefCell;

// Thread-local buffer reuse (in single-threaded WASM)
thread_local! {
    static BUFFER: RefCell<Vec<u8>> = RefCell::new(Vec::with_capacity(4096));
}

pub fn process_with_buffer(data: &[u8]) -> Vec<u8> {
    BUFFER.with(|buf| {
        let mut buf = buf.borrow_mut();
        buf.clear();
        // Use buf for intermediate work
        buf.extend_from_slice(data);
        // ... processing ...
        buf.clone()  // Only allocate for return value
    })
}

// Object pooling
struct Pool<T> {
    items: Vec<T>,
}

impl<T: Default> Pool<T> {
    fn acquire(&mut self) -> T {
        self.items.pop().unwrap_or_default()
    }

    fn release(&mut self, item: T) {
        self.items.push(item);
    }
}

// Use SmallVec for stack-allocated small vectors
use smallvec::SmallVec;

// Allocates on stack if ≤8 items
let mut vec: SmallVec<[u32; 8]> = SmallVec::new();
```

### Step 6: Optimize Data Structures

```rust
// Use FxHash for faster hashing (non-cryptographic)
use rustc_hash::FxHashMap;

let mut map = FxHashMap::default();  // ~3x faster than HashMap

// Use BTreeMap when range queries needed
use std::collections::BTreeMap;

// Use specialized data structures
use indexmap::IndexMap;  // Preserves insertion order
use ahash::AHashMap;      // Fast non-DoS-resistant hash

// Benchmark different options
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_hashmaps(c: &mut Criterion) {
    c.bench_function("std HashMap", |b| {
        b.iter(|| {
            let mut map = std::collections::HashMap::new();
            for i in 0..1000 {
                map.insert(i, i * 2);
            }
            black_box(map);
        });
    });

    c.bench_function("FxHashMap", |b| {
        b.iter(|| {
            let mut map = FxHashMap::default();
            for i in 0..1000 {
                map.insert(i, i * 2);
            }
            black_box(map);
        });
    });
}
```

### Step 7: Inline Critical Functions

```rust
// Force inlining for small hot functions
#[inline(always)]
fn critical_calculation(x: f64, y: f64) -> f64 {
    x * x + y * y
}

// Prevent inlining for code size
#[inline(never)]
fn rarely_called_large_function() {
    // ...
}

// Let compiler decide (default)
#[inline]
fn normal_function() {
    // ...
}
```

---

## Advanced Techniques

### Streaming Compilation

```javascript
// JavaScript side - compile while downloading
async function loadWasmStreaming(url) {
    const response = await fetch(url);
    const module = await WebAssembly.compileStreaming(response);
    const instance = await WebAssembly.instantiate(module, imports);
    return instance.exports;
}

// vs non-streaming (waits for full download)
async function loadWasmNonStreaming(url) {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    const instance = await WebAssembly.instantiate(module, imports);
    return instance.exports;
}
```

**Performance:** 10-30% faster time-to-interactive

### Memory Growth Strategy

```javascript
// Pre-allocate memory to avoid growth
const memory = new WebAssembly.Memory({
    initial: 256,  // 16MB
    maximum: 512,  // 32MB
});

// vs letting it grow dynamically (can cause pauses)
```

```rust
// Rust side - configure stack size
#[link_section = ".stack_sizes"]
static STACK_SIZE: usize = 1024 * 1024;  // 1MB
```

### Table-Based Dispatch

```rust
// Instead of match/if-else chains
const HANDLERS: &[fn(&Data) -> Result] = &[
    handler_0,
    handler_1,
    handler_2,
    // ...
];

fn dispatch(id: usize, data: &Data) -> Result {
    HANDLERS[id](data)
}

// vs
fn dispatch_slow(id: usize, data: &Data) -> Result {
    match id {
        0 => handler_0(data),
        1 => handler_1(data),
        2 => handler_2(data),
        // ...
        _ => panic!("unknown"),
    }
}
```

---

## Benchmarks

### JS Boundary Overhead

| Pattern | Time (ms) | Relative |
|---------|-----------|----------|
| 10,000 small calls | 45.2 | 100% |
| 1,000 medium calls | 8.7 | 19% |
| 100 large calls | 2.3 | 5% |
| 1 batch call | 1.1 | 2.4% |

**Takeaway:** Minimize boundary crossings

### Memory Layout Impact

| Pattern | Time (ms) | Cache Misses |
|---------|-----------|--------------|
| Random access | 156 | High |
| Sequential access | 23 | Low |
| Cache-aligned | 18 | Very Low |

### SIMD Performance

| Operation | Scalar (ms) | SIMD (ms) | Speedup |
|-----------|-------------|-----------|---------|
| Vector add | 12.4 | 3.2 | 3.9x |
| Dot product | 15.6 | 4.1 | 3.8x |
| Matrix multiply | 89.3 | 24.7 | 3.6x |

---

## Measurement

### Browser Performance API

```javascript
// Measure execution time
const start = performance.now();
wasm.expensive_operation();
const end = performance.now();
console.log(`Took ${end - start}ms`);

// Memory usage
const memBefore = performance.memory.usedJSHeapSize;
wasm.operation();
const memAfter = performance.memory.usedJSHeapSize;
console.log(`Allocated ${memAfter - memBefore} bytes`);
```

### Rust-side Benchmarking

```rust
use std::time::Instant;

#[wasm_bindgen]
pub fn benchmark() -> f64 {
    let start = Instant::now();

    // Operation to benchmark
    heavy_computation();

    start.elapsed().as_secs_f64()
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| benchmark-results.json | ./ | Performance metrics |
| profile.json | ./ | Chrome DevTools profile |
| optimization-report.md | ./ | Changes and impact |

---

## Output Template

```markdown
## Performance Tuning Report

### Baseline
- Execution time: [time]ms
- Memory usage: [size]MB
- Bottlenecks identified: [list]

### Optimizations Applied
- [ ] Memory layout improved
- [ ] SIMD enabled for [operations]
- [ ] JS boundary crossings reduced
- [ ] Hot path allocations removed
- [ ] Inlining directives added

### Results
- Execution time: [time]ms ([improvement]% faster)
- Memory usage: [size]MB ([change]% change)

### Benchmark Comparison
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total time | ...ms | ...ms | ...% |
| Peak memory | ...MB | ...MB | ...% |
| Throughput | .../sec | .../sec | ...% |

### Key Optimizations
1. [Optimization]: [Impact]
2. [Optimization]: [Impact]

### Next Steps
- [ ] [Further optimization opportunity]
```

---

## Best Practices

1. **Profile First**: Measure before optimizing
2. **Batch Operations**: Minimize JS-WASM crossings
3. **Pre-allocate**: Avoid allocations in hot loops
4. **Use SIMD**: For data-parallel operations
5. **Inline Strategically**: Hot small functions
6. **Cache-Friendly**: Sequential memory access patterns
7. **Benchmark**: Use criterion for Rust, performance API for JS

---

## Common Pitfalls

- Premature optimization without profiling
- Too many JS-WASM boundary crossings
- Allocating in hot paths
- Not enabling SIMD when applicable
- Cache-unfriendly memory access patterns
- Over-inlining (code bloat)
- Not testing performance across browsers
