# Skill: Ownership & Borrowing Patterns

**ID**: `ownership-patterns`
**Category**: Features
**Agent**: Rust Semantics Engineer

---

## When to Use

- Designing new data structures
- Deciding between clone vs borrow
- Choosing smart pointer types
- Implementing interior mutability
- Optimizing for zero-copy designs

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| use_case | string | Yes | What you're trying to build |
| constraints | string | No | Performance/memory requirements |

---

## Steps

### Step 1: Understand Ownership Fundamentals

```rust
// OWNERSHIP: Each value has exactly one owner
let s1 = String::from("hello");
let s2 = s1;  // s1 moved to s2, s1 invalid

// BORROWING: Temporary access without ownership
let s = String::from("hello");
let len = calculate_length(&s);  // Borrow
println!("{} has length {}", s, len);  // s still valid

// MUTABLE BORROWING: Exclusive access
let mut s = String::from("hello");
change(&mut s);  // Mutable borrow
```

### Step 2: Choose Ownership Pattern

#### Pattern 1: Move (Transfer Ownership)

```rust
// Use when: Consumer needs to own the data
fn take_ownership(s: String) {
    // s is owned here, will be dropped at end
}

// Example: Builder pattern final step
impl ConfigBuilder {
    fn build(self) -> Config {  // Takes ownership of builder
        Config { /* ... */ }
    }
}
```

#### Pattern 2: Shared Borrow (&T)

```rust
// Use when: Multiple readers, no modification needed
fn read_data(data: &[u8]) -> usize {
    data.len()
}

// Example: Query operations
impl Database {
    fn get(&self, key: &str) -> Option<&Value> {
        self.data.get(key)
    }
}
```

#### Pattern 3: Exclusive Borrow (&mut T)

```rust
// Use when: Need to modify, single writer
fn append_data(data: &mut Vec<u8>, new: &[u8]) {
    data.extend_from_slice(new);
}

// Example: In-place modification
impl Buffer {
    fn clear(&mut self) {
        self.data.clear();
    }
}
```

#### Pattern 4: Clone (Copy Data)

```rust
// Use when: Need independent copy, data is small/cheap
#[derive(Clone)]
struct Point { x: i32, y: i32 }

let p1 = Point { x: 0, y: 0 };
let p2 = p1.clone();  // Independent copy

// Use when: Breaking borrow checker deadlock
let data = expensive_data.clone();  // Clone to avoid borrow issues
```

### Step 3: Smart Pointer Selection

| Type | Use Case | Thread-Safe | Clone Cost |
|------|----------|-------------|------------|
| `Box<T>` | Heap allocation, recursive types | If T: Send | Deep copy |
| `Rc<T>` | Shared ownership, single thread | No | Reference count |
| `Arc<T>` | Shared ownership, multi-thread | Yes | Atomic ref count |
| `Cow<'a, T>` | Clone-on-write | If T: Send | Only if modified |

```rust
// Box: Heap allocation
let boxed: Box<[u8]> = vec![0u8; 1024].into_boxed_slice();

// Rc: Single-threaded shared ownership
use std::rc::Rc;
let shared = Rc::new(vec![1, 2, 3]);
let clone = Rc::clone(&shared);  // Cheap, just increments counter

// Arc: Multi-threaded shared ownership
use std::sync::Arc;
let shared = Arc::new(vec![1, 2, 3]);
std::thread::spawn(move || {
    println!("{:?}", shared);
});

// Cow: Clone-on-write
use std::borrow::Cow;
fn maybe_modify(input: &str) -> Cow<str> {
    if needs_change(input) {
        Cow::Owned(input.to_uppercase())
    } else {
        Cow::Borrowed(input)
    }
}
```

### Step 4: Interior Mutability

| Type | Use Case | Thread-Safe | Panics |
|------|----------|-------------|--------|
| `Cell<T>` | Copy types, no references | No | Never |
| `RefCell<T>` | Runtime borrow checking | No | On violation |
| `Mutex<T>` | Thread-safe mutation | Yes | On poison |
| `RwLock<T>` | Many readers, one writer | Yes | On poison |
| `OnceCell<T>` | Initialize once | No | Never |

```rust
// Cell: For Copy types
use std::cell::Cell;
struct Counter {
    value: Cell<i32>,
}
impl Counter {
    fn increment(&self) {
        self.value.set(self.value.get() + 1);
    }
}

// RefCell: Runtime borrow checking
use std::cell::RefCell;
let data = RefCell::new(vec![1, 2, 3]);
data.borrow_mut().push(4);
println!("{:?}", data.borrow());

// Mutex: Thread-safe
use std::sync::Mutex;
let counter = Mutex::new(0);
*counter.lock().unwrap() += 1;

// RwLock: Many readers
use std::sync::RwLock;
let data = RwLock::new(vec![1, 2, 3]);
println!("{:?}", data.read().unwrap());  // Multiple readers OK
data.write().unwrap().push(4);  // Exclusive writer
```

### Step 5: Zero-Copy Patterns

```rust
// Use slices instead of owned collections
fn process(data: &[u8]) -> &[u8] {
    &data[..data.len().min(100)]
}

// Use Cow for conditional copying
fn normalize(s: &str) -> Cow<str> {
    if s.chars().all(|c| c.is_lowercase()) {
        Cow::Borrowed(s)
    } else {
        Cow::Owned(s.to_lowercase())
    }
}

// Use references in structs
struct Parser<'a> {
    input: &'a str,  // Borrows input, doesn't own
}

// Use iterators instead of collecting
fn find_matches<'a>(data: &'a [Item], predicate: impl Fn(&Item) -> bool) -> impl Iterator<Item = &'a Item> {
    data.iter().filter(move |item| predicate(item))
}
```

---

## Common Patterns

### Entry API for Maps

```rust
use std::collections::HashMap;

let mut map: HashMap<String, Vec<i32>> = HashMap::new();

// Avoid: Multiple lookups
if !map.contains_key("key") {
    map.insert("key".to_string(), Vec::new());
}
map.get_mut("key").unwrap().push(1);

// Better: Entry API
map.entry("key".to_string())
    .or_insert_with(Vec::new)
    .push(1);
```

### Take Pattern

```rust
// Temporarily take ownership, then restore
struct Container {
    data: Option<Vec<u8>>,
}

impl Container {
    fn process(&mut self) {
        if let Some(mut data) = self.data.take() {
            // Process data
            data.push(0);
            self.data = Some(data);
        }
    }
}
```

### Replace Pattern

```rust
use std::mem;

fn update_in_place(value: &mut String) -> String {
    mem::replace(value, String::new())  // Take old, leave new
}

// Or with take for Option-like
let old = mem::take(&mut optional_value);  // Take, leave default
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Design recommendation | stdout | Best ownership pattern |
| Example code | stdout | Implementation example |

---

## Output Template

```markdown
## Ownership Pattern Recommendation

### Use Case
[Description of the use case]

### Recommended Pattern
[Pattern name]

### Rationale
[Why this pattern is best]

### Implementation
```rust
[Example code]
```

### Alternatives Considered
1. **[Alternative 1]**: [Why not chosen]
2. **[Alternative 2]**: [Why not chosen]

### Performance Notes
- Memory: [Heap/stack, allocation frequency]
- CPU: [Copy costs, reference counting]
```
