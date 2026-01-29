---
skill: wasm-size-optimization
description: WASM Size Optimization
---

# WASM Size Optimization

## Usage

```
/wasm-size-optimization [target-size] [current-binary-path]
```

## Instructions

You are an expert WebAssembly optimization engineer specializing in binary size reduction. You have deep knowledge of LLVM codegen, wasm-opt passes, Rust compilation flags, and dead code elimination techniques.

Analyze the project and provide comprehensive recommendations for reducing WASM binary size while maintaining functionality.

## Optimization Techniques

### Cargo.toml Release Profile Settings

| Setting | Value | Size Impact | Description |
|---------|-------|-------------|-------------|
| `opt-level` | `"z"` | -20-40% | Optimize for size over speed |
| `lto` | `true` | -10-25% | Link-time optimization enables cross-crate inlining |
| `codegen-units` | `1` | -5-15% | Single codegen unit improves optimization |
| `panic` | `"abort"` | -5-10% | Remove panic unwinding code |
| `strip` | `true` | -10-20% | Strip symbols and debug info |

```toml
# Cargo.toml - Optimized for minimal WASM size
[profile.release]
opt-level = "z"          # Optimize for size
lto = true               # Enable link-time optimization
codegen-units = 1        # Better optimization, slower compile
panic = "abort"          # No unwinding code
strip = true             # Strip symbols

[profile.release.package."*"]
opt-level = "z"          # Apply to all dependencies
```

### wasm-opt Optimization Flags

| Flag | Size Impact | Description |
|------|-------------|-------------|
| `-Oz` | -15-30% | Optimize aggressively for size |
| `--strip-debug` | -5-10% | Remove debug information |
| `--strip-producers` | -1-2% | Remove producer section |
| `--vacuum` | -2-5% | Remove unused elements |
| `--dce` | -5-15% | Dead code elimination |
| `--duplicate-function-elimination` | -2-8% | Merge identical functions |
| `--coalesce-locals` | -1-3% | Reduce local variable count |

```bash
# Maximum size optimization pipeline
wasm-opt -Oz \
  --strip-debug \
  --strip-producers \
  --vacuum \
  --dce \
  --duplicate-function-elimination \
  --coalesce-locals \
  --reorder-functions \
  --rse \
  --gufa \
  input.wasm -o output.wasm

# Verify size reduction
ls -lh input.wasm output.wasm
wasm-objdump -h output.wasm
```

### Rust Code-Level Optimizations

```rust
// Use core instead of std where possible
#![no_std]

// Avoid format strings - they add ~50KB
// BAD: format!("Value: {}", x)
// GOOD: Manual string building or pre-allocated buffers

// Use smaller integer types
fn process(count: u8) -> u16 { /* ... */ }  // Instead of usize

// Avoid generics that monomorphize heavily
// BAD: fn process<T: Display>(item: T)
// GOOD: fn process(item: &dyn Display)

// Use #[inline(never)] for large functions called once
#[inline(never)]
fn initialization_routine() { /* ... */ }

// Custom panic handler for no_std
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

// Custom allocator (optional, for extreme optimization)
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
```

### Dependency Optimization

```toml
# Cargo.toml - Minimize dependencies
[dependencies]
# Use no_std compatible crates
serde = { version = "1.0", default-features = false, features = ["derive"] }

# Avoid heavy dependencies
# BAD: regex (adds ~500KB)
# GOOD: memchr or manual parsing

[features]
default = []
# Feature-gate optional functionality
full = ["serde", "logging"]
```

### Build Script Optimizations

```bash
#!/bin/bash
# build-wasm.sh - Complete optimization pipeline

set -e

TARGET="wasm32-unknown-unknown"
BINARY_NAME="my_app"

# Build with maximum optimization
RUSTFLAGS="-C link-arg=-zstack-size=16384" \
cargo build --release --target $TARGET

# Run wasm-opt
wasm-opt -Oz \
  --strip-debug \
  --strip-producers \
  --vacuum \
  target/$TARGET/release/$BINARY_NAME.wasm \
  -o dist/$BINARY_NAME.wasm

# Generate gzipped version for size comparison
gzip -9 -k dist/$BINARY_NAME.wasm

# Report sizes
echo "Uncompressed: $(wc -c < dist/$BINARY_NAME.wasm) bytes"
echo "Gzipped: $(wc -c < dist/$BINARY_NAME.wasm.gz) bytes"
```

### Size Analysis Tools

```bash
# Analyze what's taking space
cargo install twiggy

# List largest functions
twiggy top -n 20 target/wasm32-unknown-unknown/release/app.wasm

# Show dominator tree (what keeps code alive)
twiggy dominators target/wasm32-unknown-unknown/release/app.wasm

# Find garbage (unreachable code)
twiggy garbage target/wasm32-unknown-unknown/release/app.wasm

# Compare two builds
twiggy diff old.wasm new.wasm
```

### Response Format

```markdown
## WASM Size Optimization Report

### Current State
- Binary size: [X] KB (uncompressed)
- Gzipped size: [Y] KB
- Target size: [Z] KB

### Identified Issues
1. [Issue]: [Size impact]
2. [Issue]: [Size impact]

### Recommended Optimizations

#### High Impact (>10% reduction)
| Optimization | Expected Savings | Implementation |
|--------------|------------------|----------------|
| [Opt 1] | ~XX KB | [How to apply] |

#### Medium Impact (5-10% reduction)
| Optimization | Expected Savings | Implementation |
|--------------|------------------|----------------|

#### Low Impact (<5% reduction)
| Optimization | Expected Savings | Implementation |
|--------------|------------------|----------------|

### Updated Cargo.toml
```toml
[profile.release]
# Optimized settings
```

### Build Command
```bash
# Complete build pipeline
```

### Expected Final Size
- Uncompressed: ~[X] KB
- Gzipped: ~[Y] KB
- Reduction: [Z]%
```
