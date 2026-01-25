# Skill: Memory Layout Optimization

**ID**: `memory-optimization`
**Category**: Performance
**Agent**: Rust Performance Engineer

---

## When to Use

- Reducing memory footprint
- Improving cache efficiency
- Optimizing struct layouts
- Implementing custom allocators

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| struct_def | string | Yes | Struct definition to optimize |
| constraint | string | No | Size or performance target |

---

## Steps

### Step 1: Measure Current Layout

```rust
use std::mem::{size_of, align_of};

#[derive(Debug)]
struct MyStruct {
    a: u8,
    b: u64,
    c: u8,
}

fn main() {
    println!("Size: {} bytes", size_of::<MyStruct>());
    println!("Alignment: {} bytes", align_of::<MyStruct>());
}
// Likely: Size = 24 bytes (due to padding)
```

### Step 2: Optimize Field Order

```rust
// BEFORE: Poor layout (24 bytes with padding)
struct BadLayout {
    a: u8,      // 1 byte + 7 padding (align to u64)
    b: u64,     // 8 bytes
    c: u8,      // 1 byte + 7 padding
}

// AFTER: Optimal layout (16 bytes)
struct GoodLayout {
    b: u64,     // 8 bytes (largest first)
    a: u8,      // 1 byte
    c: u8,      // 1 byte + 6 padding
}
```

### Step 3: Use Smaller Types

```rust
// BEFORE: Wasteful
struct LargeRecord {
    count: usize,     // 8 bytes
    flags: u64,       // 8 bytes
    is_active: bool,  // 1 byte + 7 padding
}  // 24 bytes

// AFTER: Compact
struct CompactRecord {
    count: u32,       // 4 bytes (if count < 4 billion)
    flags: u32,       // 4 bytes (if only 32 flags needed)
    is_active: bool,  // 1 byte + 3 padding
}  // 12 bytes
```

### Step 4: Use Niche Optimization

```rust
use std::num::NonZeroU64;

// Option<u64> = 16 bytes (tag + value)
// Option<NonZeroU64> = 8 bytes (uses 0 as None)

struct Optimized {
    id: Option<NonZeroU64>,  // 8 bytes, not 16!
}

// Similarly for references:
// Option<&T> = 8 bytes (uses null as None)
// Option<Box<T>> = 8 bytes
```

### Step 5: Pack with repr(C) or repr(packed)

```rust
// repr(C): Predictable layout (for FFI)
#[repr(C)]
struct CLayout {
    a: u8,
    b: u64,
    c: u8,
}
// Fields in declaration order, C-compatible padding

// repr(packed): No padding (use carefully!)
#[repr(packed)]
struct Packed {
    a: u8,
    b: u64,
    c: u8,
}
// 10 bytes, but unaligned access - potentially slow/unsafe!

// repr(align): Ensure alignment
#[repr(align(64))]  // Cache-line aligned
struct CacheAligned {
    data: [u8; 64],
}
```

### Step 6: Arena Allocation

```rust
use bumpalo::Bump;

// Arena allocator for many small allocations
fn process_with_arena(data: &[Input]) -> Vec<&Output> {
    let arena = Bump::new();

    let outputs: Vec<_> = data.iter()
        .map(|input| {
            // All allocations in arena
            arena.alloc(process(input))
        })
        .collect();

    outputs
    // Arena freed all at once when dropped
}
```

### Step 7: Small String/Vec Optimization

```rust
use smallvec::SmallVec;
use smallstr::SmallString;

// SmallVec: Stack allocation for small vectors
struct Node {
    // Up to 4 children on stack, heap for more
    children: SmallVec<[NodeRef; 4]>,
}

// SmallString: Stack allocation for small strings
struct Record {
    // Up to 23 bytes inline
    name: SmallString<[u8; 24]>,
}
```

---

## Cache Optimization

### Keep Hot Data Together

```rust
// COLD: Rarely accessed
struct ColdData {
    description: String,
    metadata: HashMap<String, String>,
}

// HOT: Frequently accessed
struct HotData {
    id: u64,
    count: u32,
    flags: u32,
}

// Separate hot and cold
struct Optimized {
    hot: HotData,            // Fits in cache line
    cold: Box<ColdData>,     // Separate allocation
}
```

### Array of Structs vs Struct of Arrays

```rust
// AoS: Good for single-entity access
struct Particle {
    x: f32, y: f32, z: f32,
    vx: f32, vy: f32, vz: f32,
}
let particles: Vec<Particle> = ...;

// SoA: Good for bulk operations on single field
struct Particles {
    x: Vec<f32>,
    y: Vec<f32>,
    z: Vec<f32>,
    vx: Vec<f32>,
    vy: Vec<f32>,
    vz: Vec<f32>,
}
// Better cache utilization when processing all x values
```

---

## Tools

```bash
# Check struct layout
cargo install --git https://github.com/nickel-org/struct-layout

# Or use println! debugging:
println!("offset of field: {:?}",
    std::mem::offset_of!(MyStruct, field_name));  // Rust 1.77+
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Optimized struct | stdout | New layout |
| Size comparison | stdout | Before/after |

---

## Output Template

```markdown
## Memory Optimization Report

### Original Layout
```rust
struct Original { ... }
```
Size: X bytes, Align: Y

### Optimized Layout
```rust
struct Optimized { ... }
```
Size: X bytes, Align: Y

### Savings
- Size reduced by X%
- Better cache alignment

### Techniques Used
1. Field reordering
2. Smaller integer types
3. Niche optimization

### Verification
```rust
assert_eq!(size_of::<Optimized>(), EXPECTED);
```
```
