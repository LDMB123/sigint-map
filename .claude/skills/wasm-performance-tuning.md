---
skill: wasm-performance-tuning
description: WASM Performance Tuning
---

# WASM Performance Tuning

## Usage

```
/wasm-performance-tuning [optimization-target] [performance-profile]
```

## Instructions

You are an expert WebAssembly performance engineer with deep knowledge of browser runtime internals, memory management, SIMD optimization, and JavaScript/WASM interop boundaries. You understand V8, SpiderMonkey, and JavaScriptCore optimization strategies.

Analyze the codebase and provide comprehensive runtime performance optimizations for WASM modules.

## Optimization Techniques

### Cargo.toml Performance Profile

| Setting | Value | Performance Impact | Trade-off |
|---------|-------|-------------------|-----------|
| `opt-level` | `3` | +20-40% speed | Larger binary |
| `lto` | `"fat"` | +10-20% speed | Slower compile |
| `target-cpu` | `"generic"` | Baseline | Maximum compatibility |
| `codegen-units` | `1` | +5-10% speed | Slower compile |

```toml
# Cargo.toml - Optimized for runtime performance
[profile.release]
opt-level = 3            # Maximum speed optimization
lto = "fat"              # Full link-time optimization
codegen-units = 1        # Single codegen unit
panic = "abort"          # No unwinding overhead

[profile.release-perf]
inherits = "release"
debug = true             # Enable profiling symbols
```

### wasm-opt Performance Flags

| Flag | Speed Impact | Description |
|------|--------------|-------------|
| `-O3` | +15-25% | Aggressive speed optimization |
| `--inline-functions` | +5-15% | Inline small functions |
| `--precompute` | +2-5% | Evaluate constants at compile time |
| `--optimize-instructions` | +3-8% | Peephole optimizations |
| `--reorder-locals` | +1-3% | Better register allocation |

```bash
# Performance optimization pipeline
wasm-opt -O3 \
  --inline-functions \
  --precompute \
  --optimize-instructions \
  --reorder-locals \
  --reorder-functions \
  --dae-optimizing \
  --remove-unused-module-elements \
  input.wasm -o output.wasm
```

### Memory Management Optimization

```rust
// Pre-allocate memory to avoid runtime growth
#[link_section = "memory"]
static MEMORY: [u8; 1024 * 1024] = [0; 1024 * 1024]; // 1MB pre-allocated

// Use typed arrays for bulk data
#[repr(C, align(16))]  // SIMD-friendly alignment
pub struct DataBuffer {
    data: [f32; 1024],
}

// Avoid frequent small allocations
pub struct ObjectPool<T, const N: usize> {
    objects: [Option<T>; N],
    free_list: Vec<usize>,
}

impl<T: Default + Copy, const N: usize> ObjectPool<T, N> {
    pub fn acquire(&mut self) -> Option<&mut T> {
        self.free_list.pop().map(|idx| {
            self.objects[idx] = Some(T::default());
            self.objects[idx].as_mut().unwrap()
        })
    }

    pub fn release(&mut self, idx: usize) {
        self.objects[idx] = None;
        self.free_list.push(idx);
    }
}

// Use arena allocation for related objects
pub struct Arena {
    buffer: Vec<u8>,
    offset: usize,
}

impl Arena {
    pub fn alloc<T>(&mut self, value: T) -> *mut T {
        let align = std::mem::align_of::<T>();
        let size = std::mem::size_of::<T>();

        // Align offset
        self.offset = (self.offset + align - 1) & !(align - 1);

        let ptr = unsafe { self.buffer.as_mut_ptr().add(self.offset) as *mut T };
        unsafe { ptr.write(value) };

        self.offset += size;
        ptr
    }

    pub fn reset(&mut self) {
        self.offset = 0;
    }
}
```

### JS/WASM Boundary Optimization

```rust
// Minimize boundary crossings - batch operations
// BAD: Call JS for each item
#[wasm_bindgen]
pub fn process_item(item: &JsValue) { /* ... */ }

// GOOD: Process entire buffer in WASM
#[wasm_bindgen]
pub fn process_buffer(buffer: &[f32]) -> Vec<f32> {
    buffer.iter().map(|x| x * 2.0).collect()
}

// Use TypedArrays for zero-copy data transfer
#[wasm_bindgen]
pub fn process_typed_array(data: &js_sys::Float32Array) -> js_sys::Float32Array {
    let len = data.length() as usize;
    let mut result = vec![0f32; len];

    // Copy in
    data.copy_to(&mut result);

    // Process in WASM (fast)
    for x in &mut result {
        *x *= 2.0;
    }

    // Return typed array (fast transfer)
    js_sys::Float32Array::from(&result[..])
}

// Expose linear memory directly for maximum performance
#[wasm_bindgen]
pub fn get_memory() -> JsValue {
    wasm_bindgen::memory()
}

#[wasm_bindgen]
pub fn get_buffer_ptr() -> *const f32 {
    static mut BUFFER: [f32; 4096] = [0.0; 4096];
    unsafe { BUFFER.as_ptr() }
}
```

```javascript
// JavaScript side - direct memory access
const memory = wasm.get_memory();
const ptr = wasm.get_buffer_ptr();
const view = new Float32Array(memory.buffer, ptr, 4096);

// Modify directly without copying
for (let i = 0; i < view.length; i++) {
    view[i] = Math.random();
}

// WASM can now read the data without any copying
wasm.process_in_place();
```

### SIMD Optimization

```rust
// Enable SIMD in Cargo.toml
// [target.wasm32-unknown-unknown]
// rustflags = ["-C", "target-feature=+simd128"]

#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

#[cfg(target_arch = "wasm32")]
pub fn vector_add_simd(a: &[f32], b: &[f32], result: &mut [f32]) {
    let chunks = a.len() / 4;

    for i in 0..chunks {
        let offset = i * 4;
        unsafe {
            let va = v128_load(a.as_ptr().add(offset) as *const v128);
            let vb = v128_load(b.as_ptr().add(offset) as *const v128);
            let vr = f32x4_add(va, vb);
            v128_store(result.as_mut_ptr().add(offset) as *mut v128, vr);
        }
    }

    // Handle remainder
    for i in (chunks * 4)..a.len() {
        result[i] = a[i] + b[i];
    }
}

// Matrix multiplication with SIMD
#[cfg(target_arch = "wasm32")]
pub fn mat4_mul_simd(a: &[f32; 16], b: &[f32; 16]) -> [f32; 16] {
    let mut result = [0.0f32; 16];

    unsafe {
        for i in 0..4 {
            let row = v128_load(a.as_ptr().add(i * 4) as *const v128);

            for j in 0..4 {
                let col = f32x4(b[j], b[j + 4], b[j + 8], b[j + 12]);
                let prod = f32x4_mul(row, col);

                // Horizontal sum
                let sum = f32x4_extract_lane::<0>(prod)
                    + f32x4_extract_lane::<1>(prod)
                    + f32x4_extract_lane::<2>(prod)
                    + f32x4_extract_lane::<3>(prod);

                result[i * 4 + j] = sum;
            }
        }
    }

    result
}
```

### Hot Path Optimization

```rust
// Mark hot functions for inlining
#[inline(always)]
fn hot_inner_loop(data: &mut [f32]) {
    for x in data.iter_mut() {
        *x = (*x * 2.0).sqrt();
    }
}

// Use const generics to unroll loops
fn process_fixed<const N: usize>(data: &mut [f32; N]) {
    for i in 0..N {
        data[i] *= 2.0;
    }
}

// Avoid bounds checking in critical paths
fn process_unchecked(data: &mut [f32]) {
    let len = data.len();
    for i in 0..len {
        // SAFETY: i is always < len
        unsafe {
            *data.get_unchecked_mut(i) *= 2.0;
        }
    }
}

// Use iterators for auto-vectorization
fn process_vectorizable(data: &mut [f32]) {
    data.iter_mut().for_each(|x| *x *= 2.0);
}
```

### Build Configuration for Performance

```toml
# .cargo/config.toml
[target.wasm32-unknown-unknown]
rustflags = [
    "-C", "target-feature=+simd128",      # Enable SIMD
    "-C", "link-arg=-zstack-size=131072", # 128KB stack
]

[build]
target = "wasm32-unknown-unknown"
```

```bash
# Build with performance flags
RUSTFLAGS="-C target-feature=+simd128 -C opt-level=3" \
cargo build --release --target wasm32-unknown-unknown

# Optimize with wasm-opt
wasm-opt -O3 \
  --enable-simd \
  --inline-functions \
  --precompute \
  target/wasm32-unknown-unknown/release/app.wasm \
  -o dist/app.wasm
```

### Profiling and Benchmarking

```rust
// Simple WASM timing
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = performance)]
    fn now() -> f64;
}

pub fn benchmark<F: FnOnce()>(name: &str, f: F) {
    let start = now();
    f();
    let end = now();
    web_sys::console::log_1(&format!("{}: {:.2}ms", name, end - start).into());
}
```

```javascript
// JavaScript profiling
async function profileWasm() {
    const iterations = 1000;

    // Warmup
    for (let i = 0; i < 100; i++) {
        wasm.hot_function();
    }

    // Measure
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        wasm.hot_function();
    }
    const elapsed = performance.now() - start;

    console.log(`Average: ${elapsed / iterations}ms per call`);
}
```

### Response Format

```markdown
## WASM Performance Tuning Report

### Performance Profile
- Target: [Computation/Memory/Interop]
- Current bottleneck: [Identified area]

### Benchmark Results
| Operation | Current | Optimized | Improvement |
|-----------|---------|-----------|-------------|
| [Op 1] | X ms | Y ms | Z% |

### Identified Bottlenecks
1. **[Area]**: [Description and impact]
2. **[Area]**: [Description and impact]

### Optimization Recommendations

#### Critical Path Optimizations
```rust
// Before
[current code]

// After
[optimized code]
```

#### Memory Optimizations
- [Recommendation 1]
- [Recommendation 2]

#### JS/WASM Boundary Optimizations
```javascript
// Optimized interop pattern
```

### Updated Build Configuration
```toml
# Cargo.toml
[profile.release]
# Performance settings
```

```bash
# Build command
```

### Expected Performance Gains
- Computation: +X%
- Memory throughput: +Y%
- Interop overhead: -Z%
```
