# Skill: Unsafe Code Guidelines

**ID**: `unsafe-guidelines`
**Category**: Features
**Agent**: Rust Safety Auditor

---

## When to Use

- Implementing low-level data structures
- Creating FFI bindings
- Optimizing performance-critical code
- Deciding whether unsafe is necessary
- Understanding what unsafe allows

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| use_case | string | Yes | Why unsafe might be needed |
| current_code | string | No | Existing safe code (for comparison) |

---

## Steps

### Step 1: Determine If Unsafe Is Necessary

**Try safe alternatives first:**

| Need | Safe Alternative |
|------|------------------|
| Unchecked indexing | `.get()` with bounds check |
| Mutable static | `Mutex<T>`, `AtomicT`, `OnceCell` |
| Raw pointers | References, `Box`, `Rc`, `Arc` |
| Type punning | `bytemuck`, `zerocopy` crates |
| FFI | Safe wrappers with validation |

### Step 2: What Unsafe Allows

```rust
unsafe {
    // 1. Dereference raw pointers
    let ptr: *const i32 = &10;
    let value = *ptr;

    // 2. Call unsafe functions
    std::ptr::write(ptr as *mut i32, 20);

    // 3. Access mutable statics
    static mut COUNTER: i32 = 0;
    COUNTER += 1;

    // 4. Implement unsafe traits
    // (outside of block, at impl level)

    // 5. Access union fields
    union IntOrFloat { i: i32, f: f32 }
    let u = IntOrFloat { i: 42 };
    let _i = u.i;
}
```

### Step 3: Write Safe Abstractions

```rust
// Encapsulate unsafe in safe API
pub struct MyVec<T> {
    ptr: *mut T,
    len: usize,
    cap: usize,
}

impl<T> MyVec<T> {
    pub fn new() -> Self {
        MyVec {
            ptr: std::ptr::NonNull::dangling().as_ptr(),
            len: 0,
            cap: 0,
        }
    }

    // Safe public API
    pub fn push(&mut self, value: T) {
        if self.len == self.cap {
            self.grow();
        }
        // SAFETY: We just ensured capacity
        unsafe {
            std::ptr::write(self.ptr.add(self.len), value);
        }
        self.len += 1;
    }

    pub fn get(&self, index: usize) -> Option<&T> {
        if index < self.len {
            // SAFETY: Bounds checked above
            Some(unsafe { &*self.ptr.add(index) })
        } else {
            None
        }
    }

    fn grow(&mut self) {
        // ... allocation logic with unsafe
    }
}

impl<T> Drop for MyVec<T> {
    fn drop(&mut self) {
        // SAFETY: We own this memory and have tracked len correctly
        unsafe {
            std::ptr::drop_in_place(std::slice::from_raw_parts_mut(self.ptr, self.len));
            // ... deallocate
        }
    }
}
```

### Step 4: Document Safety Requirements

```rust
/// Creates a slice from raw parts.
///
/// # Safety
///
/// The caller must ensure that:
///
/// * `data` must be [valid] for reads for `len * mem::size_of::<T>()` bytes
/// * `data` must be properly aligned
/// * `data` must point to `len` consecutive initialized values of type `T`
/// * The memory must not be mutated while the slice exists
/// * The total size must not exceed `isize::MAX` bytes
///
/// [valid]: std::ptr#safety
///
/// # Examples
///
/// ```
/// let x = [1, 2, 3];
/// let ptr = x.as_ptr();
/// // SAFETY: ptr is valid, aligned, and points to 3 initialized i32s
/// let slice = unsafe { from_raw_parts(ptr, 3) };
/// ```
pub unsafe fn from_raw_parts<'a, T>(data: *const T, len: usize) -> &'a [T] {
    // SAFETY: Caller guarantees all requirements
    std::slice::from_raw_parts(data, len)
}
```

### Step 5: Common Unsafe Patterns

#### NonNull for Null-Optimized Pointers

```rust
use std::ptr::NonNull;

struct Node<T> {
    value: T,
    next: Option<NonNull<Node<T>>>,  // Same size as *mut Node<T>
}

impl<T> Node<T> {
    fn new(value: T) -> Box<Self> {
        Box::new(Node { value, next: None })
    }

    fn set_next(&mut self, next: Box<Node<T>>) {
        // SAFETY: Box::into_raw returns valid, non-null pointer
        self.next = Some(unsafe {
            NonNull::new_unchecked(Box::into_raw(next))
        });
    }
}
```

#### ManuallyDrop for Controlled Destruction

```rust
use std::mem::ManuallyDrop;

struct MyStruct {
    data: ManuallyDrop<String>,
}

impl Drop for MyStruct {
    fn drop(&mut self) {
        // Manually decide when to drop
        // SAFETY: We're in Drop, data won't be accessed again
        unsafe {
            ManuallyDrop::drop(&mut self.data);
        }
    }
}
```

#### MaybeUninit for Uninitialized Memory

```rust
use std::mem::MaybeUninit;

fn init_array() -> [u32; 1000] {
    let mut array: [MaybeUninit<u32>; 1000] = unsafe {
        MaybeUninit::uninit().assume_init()
    };

    for (i, elem) in array.iter_mut().enumerate() {
        elem.write(i as u32);
    }

    // SAFETY: All elements have been initialized
    unsafe {
        std::mem::transmute::<_, [u32; 1000]>(array)
    }
}
```

### Step 6: FFI Safety

```rust
// C header: void process(const char* data, size_t len);
extern "C" {
    fn process(data: *const u8, len: usize);
}

// Safe Rust wrapper
pub fn safe_process(data: &[u8]) {
    // SAFETY:
    // - data.as_ptr() is valid for data.len() bytes
    // - data is immutable during this call
    // - process() doesn't store the pointer
    unsafe {
        process(data.as_ptr(), data.len());
    }
}
```

---

## Safety Checklist

### For Raw Pointer Dereference

- [ ] Pointer is non-null
- [ ] Pointer is aligned for type
- [ ] Points to initialized memory
- [ ] Memory is valid for the type
- [ ] No data races
- [ ] Within allocation bounds

### For Transmute

- [ ] Same size types
- [ ] Valid bit patterns
- [ ] Alignment satisfied
- [ ] No invalid values created

### For FFI

- [ ] Types match ABI
- [ ] Null pointers handled
- [ ] Memory ownership clear
- [ ] No panic across boundary

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Safety analysis | stdout | Whether unsafe is needed |
| Safe alternative | stdout | If possible |
| Unsafe implementation | stdout | With safety docs |

---

## Output Template

```markdown
## Unsafe Analysis

### Use Case
[Description]

### Is Unsafe Necessary?
[Yes/No and why]

### Safe Alternative
```rust
[safe code if possible]
```

### Unsafe Implementation
```rust
[unsafe code with SAFETY comments]
```

### Safety Invariants
1. [Invariant 1]
2. [Invariant 2]

### Testing
```bash
cargo +nightly miri test
```
```
