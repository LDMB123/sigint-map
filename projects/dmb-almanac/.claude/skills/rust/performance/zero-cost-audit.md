# Skill: Zero-Cost Abstraction Audit

**ID**: `zero-cost-audit`
**Category**: Performance
**Agent**: Rust Performance Engineer

---

## When to Use

- Verifying abstractions don't add overhead
- Checking if iterators compile to loops
- Ensuring generics are monomorphized
- Auditing inline behavior

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | Code to audit |
| function | string | No | Specific function to check |

---

## Steps

### Step 1: Generate Assembly

```bash
# Install cargo-show-asm
cargo install cargo-show-asm

# Show assembly for a function
cargo asm --lib my_crate::my_function

# With Rust source interleaved
cargo asm --lib my_crate::my_function --rust

# Release mode (important!)
cargo asm --release --lib my_crate::my_function
```

### Step 2: Check Iterator Optimization

```rust
// These should compile to similar assembly:

// Iterator version
fn sum_iter(data: &[i32]) -> i32 {
    data.iter().sum()
}

// Loop version
fn sum_loop(data: &[i32]) -> i32 {
    let mut sum = 0;
    for x in data {
        sum += x;
    }
    sum
}
```

```bash
# Compare assembly
cargo asm --lib my_crate::sum_iter
cargo asm --lib my_crate::sum_loop
# Should be nearly identical (likely SIMD vectorized)
```

### Step 3: Verify Inlining

```rust
// Force inlining for critical paths
#[inline(always)]
fn critical_hot_path(x: i32) -> i32 {
    x * 2 + 1
}

// Prevent inlining for debugging/code size
#[inline(never)]
fn cold_error_path() {
    panic!("error");
}

// Suggest inlining (compiler decides)
#[inline]
fn warm_path(x: i32) -> i32 {
    x + 1
}
```

### Step 4: Check Monomorphization

```rust
// Generic function - should be monomorphized
fn process<T: std::fmt::Display>(value: T) -> String {
    format!("{}", value)
}

// Each call site gets specialized version:
let s1 = process(42i32);    // process::<i32>
let s2 = process("hello");  // process::<&str>
```

```bash
# See all monomorphized versions
cargo asm --lib | grep "process"
# Should see multiple specialized versions
```

### Step 5: Audit Zero-Cost Patterns

#### Pattern 1: Option<&T> is pointer-sized

```rust
// These have the same size:
use std::mem::size_of;

assert_eq!(size_of::<Option<&i32>>(), size_of::<*const i32>());
// Option uses null pointer optimization
```

#### Pattern 2: Vec iteration is direct

```rust
// These compile to the same assembly:
for x in &vec { process(x); }
for x in vec.iter() { process(x); }
vec.iter().for_each(|x| process(x));
```

#### Pattern 3: Result unwrap is branch-free when optimized

```rust
// In optimized builds, this is often branch-predicted:
let value = result.unwrap();
```

### Step 6: Identify Hidden Costs

```rust
// HIDDEN COST: Box allocation
let boxed: Box<[i32]> = vec![1, 2, 3].into_boxed_slice();

// HIDDEN COST: Format string allocation
let s = format!("value: {}", x);

// HIDDEN COST: dyn trait virtual dispatch
fn process(reader: &dyn Read) { }  // Virtual call

// NO COST: Generic - monomorphized
fn process<R: Read>(reader: &R) { }  // Static dispatch
```

---

## Common Zero-Cost Verifications

### Newtype Wrapper

```rust
struct Meters(f64);

// Should have identical assembly:
fn double_raw(x: f64) -> f64 { x * 2.0 }
fn double_meters(x: Meters) -> Meters { Meters(x.0 * 2.0) }
```

### Enum vs Union

```rust
// Option<NonZeroU64> is same size as u64
use std::num::NonZeroU64;
assert_eq!(
    std::mem::size_of::<Option<NonZeroU64>>(),
    std::mem::size_of::<u64>()
);
```

### Iterator Chains

```rust
// Complex chains still optimize well:
let result: i32 = data
    .iter()
    .filter(|x| **x > 0)
    .map(|x| x * 2)
    .take(100)
    .sum();
// Compiles to efficient loop, no intermediate allocations
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Assembly output | stdout | Generated machine code |
| Size comparison | stdout | Type size analysis |

---

## Output Template

```markdown
## Zero-Cost Abstraction Audit

### Code Analyzed
```rust
[code]
```

### Assembly Check
- Iterator to loop: ✓ Equivalent
- Inlining: ✓ As expected
- Monomorphization: ✓ Specialized

### Size Verification
| Type | Size | Expected |
|------|------|----------|
| Option<&T> | 8 | 8 (pointer) |
| ... | ... | ... |

### Hidden Costs Found
1. [If any]

### Recommendations
1. [If any needed]
```
