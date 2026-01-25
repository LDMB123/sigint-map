# Skill: Unsafe Code Audit

**ID**: `unsafe-audit`
**Category**: Debugging
**Agent**: Rust Safety Auditor

---

## When to Use

- Reviewing code that contains `unsafe` blocks
- Verifying FFI boundary safety
- Checking for undefined behavior
- Auditing before release
- Debugging mysterious crashes or corruption

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| file_paths | string[] | Yes | Files containing unsafe code |
| context | string | No | What the unsafe code is trying to achieve |

---

## Steps

### Step 1: Identify All Unsafe Code

```bash
# Find all unsafe blocks and functions
grep -rn "unsafe" --include="*.rs" .

# More precise (finds unsafe blocks/fn/impl)
grep -rn "unsafe\s*{\\|unsafe\s*fn\\|unsafe\s*impl" --include="*.rs" .
```

### Step 2: Categorize Unsafe Operations

| Operation | What It Allows | Common Errors |
|-----------|----------------|---------------|
| Raw pointer deref | `*ptr` | Null, dangling, unaligned |
| Unsafe function call | `mem::transmute` | Type confusion |
| Mutable static access | `GLOBAL += 1` | Data races |
| Unsafe trait impl | `impl Send` | Incorrect sync guarantees |
| Union field access | `union.field` | Type confusion |

### Step 3: Verify Each Unsafe Block

#### Checklist for Pointer Dereference

```rust
// For each `*ptr`:
// □ ptr is non-null
// □ ptr is properly aligned for T
// □ ptr points to initialized memory
// □ Memory is valid for T
// □ No data races (single writer OR multiple readers)
// □ Pointer is within allocation bounds

unsafe fn example(ptr: *const i32) -> i32 {
    // SAFETY:
    // - Caller guarantees ptr is non-null
    // - Caller guarantees ptr is aligned
    // - Caller guarantees ptr points to valid i32
    // - This read is atomic, no data race possible
    *ptr
}
```

#### Checklist for Transmute

```rust
// For each transmute:
// □ Source and target have same size
// □ Target type is valid for the bit pattern
// □ Alignment requirements satisfied
// □ No invalid values created (bool, enum, references)

// BAD: Creates invalid bool
let b: bool = unsafe { std::mem::transmute(2u8) }; // UB!

// OK: Same size, valid bit pattern
let x: u32 = unsafe { std::mem::transmute([1u8, 2, 3, 4]) };
```

#### Checklist for FFI

```rust
// For each FFI boundary:
// □ Types match C ABI exactly
// □ Null pointers handled
// □ Memory ownership is clear
// □ Strings are null-terminated where expected
// □ No panic unwinding across boundary

extern "C" {
    fn c_function(data: *const u8, len: usize) -> i32;
}

fn safe_wrapper(data: &[u8]) -> Result<i32, Error> {
    // SAFETY:
    // - data.as_ptr() is valid for data.len() bytes
    // - data is not modified during the call
    // - c_function does not store the pointer
    let result = unsafe {
        c_function(data.as_ptr(), data.len())
    };

    if result < 0 {
        Err(Error::from_code(result))
    } else {
        Ok(result)
    }
}
```

### Step 4: Run Miri

```bash
# Install Miri
rustup +nightly component add miri

# Run tests under Miri
cargo +nightly miri test

# Run binary under Miri
cargo +nightly miri run

# With strict provenance checking
MIRIFLAGS="-Zmiri-strict-provenance" cargo +nightly miri test

# Check for leaks
MIRIFLAGS="-Zmiri-track-leaks" cargo +nightly miri test
```

### Step 5: Document Safety

```rust
/// Reads a value from a raw pointer.
///
/// # Safety
///
/// The caller must ensure:
/// - `ptr` is non-null
/// - `ptr` is properly aligned for `T`
/// - `ptr` points to a valid, initialized `T`
/// - No other code is writing to `*ptr` concurrently
///
/// # Examples
///
/// ```
/// let x: i32 = 42;
/// let ptr = &x as *const i32;
/// // SAFETY: ptr is valid, aligned, initialized, no concurrent writes
/// let value = unsafe { read_ptr(ptr) };
/// ```
pub unsafe fn read_ptr<T>(ptr: *const T) -> T {
    // SAFETY: Caller guarantees all preconditions
    ptr.read()
}
```

---

## Common Vulnerabilities

### 1. Use After Free

```rust
// VULNERABLE
let ptr = {
    let data = vec![1, 2, 3];
    data.as_ptr()  // ptr dangles after this block
};
unsafe { *ptr }  // UB!

// FIX: Ensure lifetime
fn safe<'a>(data: &'a [i32]) -> &'a i32 {
    &data[0]  // Reference tied to data's lifetime
}
```

### 2. Buffer Overflow

```rust
// VULNERABLE
unsafe fn read_at(buf: &[u8], index: usize) -> u8 {
    *buf.as_ptr().add(index)  // No bounds check!
}

// FIX: Check bounds or use safe indexing
fn read_at(buf: &[u8], index: usize) -> Option<u8> {
    buf.get(index).copied()
}
```

### 3. Type Confusion

```rust
// VULNERABLE
unsafe fn as_slice<T>(ptr: *const T, len: usize) -> &[T] {
    std::slice::from_raw_parts(ptr, len)  // What if ptr is wrong type?
}

// FIX: Encapsulate with safe API
struct TypedBuffer<T> {
    ptr: *const T,
    len: usize,
    _marker: PhantomData<T>,
}

impl<T> TypedBuffer<T> {
    pub fn as_slice(&self) -> &[T] {
        // SAFETY: TypedBuffer maintains invariant that ptr/len are valid
        unsafe { std::slice::from_raw_parts(self.ptr, self.len) }
    }
}
```

### 4. Data Race

```rust
// VULNERABLE
static mut COUNTER: i32 = 0;

fn increment() {
    unsafe { COUNTER += 1; }  // Data race if called from multiple threads!
}

// FIX: Use atomic or mutex
use std::sync::atomic::{AtomicI32, Ordering};
static COUNTER: AtomicI32 = AtomicI32::new(0);

fn increment() {
    COUNTER.fetch_add(1, Ordering::SeqCst);
}
```

---

## Miri Error Reference

| Error | Meaning |
|-------|---------|
| `Undefined Behavior: dereferencing pointer failed` | Invalid pointer dereference |
| `Undefined Behavior: reading uninitialized memory` | Using MaybeUninit wrong |
| `Undefined Behavior: type validation failed` | Invalid value for type |
| `data race detected` | Concurrent mutable access |
| `memory leaked` | Forgot to deallocate |

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Audit report | stdout | Safety analysis |
| Miri output | stdout | UB detection results |

---

## Output Template

```markdown
## Unsafe Audit Report

### Summary
- Unsafe blocks found: X
- Unsafe functions: Y
- Issues found: Z

### Findings

#### Finding 1: [Title]
- **Severity**: Critical/High/Medium/Low
- **Location**: `file:line`
- **Code**:
```rust
[unsafe code]
```
- **Issue**: [Description]
- **Fix**: [Recommendation]

### Safety Documentation Status

| Location | Has SAFETY Comment | Valid |
|----------|-------------------|-------|
| src/lib.rs:42 | Yes | Yes |
| src/ffi.rs:100 | No | N/A |

### Miri Results
```
[Miri output or "No issues found"]
```

### Recommendations
1. [Add SAFETY comments to X]
2. [Replace unsafe with safe alternative in Y]
3. [Add bounds checking in Z]

### Verification
```bash
cargo +nightly miri test
cargo clippy -- -W clippy::undocumented_unsafe_blocks
```
```
