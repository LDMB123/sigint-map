# Skill: Borrow Checker Error Resolution

**ID**: `borrow-checker-debug`
**Category**: Debugging
**Agent**: Rust Semantics Engineer

---

## When to Use

- Error E0502: "cannot borrow as mutable because it is also borrowed as immutable"
- Error E0499: "cannot borrow as mutable more than once"
- Error E0505: "cannot move out of borrowed content"
- Error E0507: "cannot move out of borrowed content"
- Any compiler error involving borrowing, moving, or references

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| error_message | string | Yes | Full compiler error output |
| file_path | string | Yes | Path to the file with error |
| code_context | string | No | Additional surrounding code |

---

## Steps

### Step 1: Capture Full Error

```bash
# Get complete error with help
cargo check 2>&1

# Get explanation of error code
rustc --explain E0502
```

### Step 2: Identify Conflict Type

| Error Code | Conflict Type | Description |
|------------|---------------|-------------|
| E0502 | Mutable + Immutable | Cannot have &mut while & exists |
| E0499 | Multiple Mutable | Cannot have two &mut to same data |
| E0505 | Move vs Borrow | Cannot move while borrowed |
| E0507 | Move out of Borrow | Cannot move out of &T or &mut T |

### Step 3: Apply Fix Strategy

#### For E0502 (Mutable + Immutable Conflict)

```rust
// PROBLEM: Immutable borrow still active when mutable borrow occurs
let mut vec = vec![1, 2, 3];
let first = &vec[0];      // immutable borrow
vec.push(4);              // mutable borrow - ERROR!
println!("{}", first);    // immutable borrow used here

// FIX 1: Copy the value (if Copy)
let mut vec = vec![1, 2, 3];
let first = vec[0];       // Copy, not borrow
vec.push(4);
println!("{}", first);

// FIX 2: Scope the borrow
let mut vec = vec![1, 2, 3];
{
    let first = &vec[0];
    println!("{}", first);
}  // borrow ends
vec.push(4);

// FIX 3: Clone if needed
let mut vec = vec![1, 2, 3];
let first = vec[0].clone();
vec.push(4);
```

#### For E0499 (Multiple Mutable Borrows)

```rust
// PROBLEM: Two mutable borrows
let mut s = String::from("hello");
let r1 = &mut s;
let r2 = &mut s;  // ERROR!

// FIX 1: Sequential borrows
let mut s = String::from("hello");
{
    let r1 = &mut s;
    r1.push_str(" world");
}
let r2 = &mut s;
r2.push_str("!");

// FIX 2: Use split_at_mut for slices
let mut arr = [1, 2, 3, 4];
let (left, right) = arr.split_at_mut(2);
left[0] = 10;   // OK
right[0] = 30;  // OK
```

#### For E0505 (Move vs Borrow Conflict)

```rust
// PROBLEM: Value moved while still borrowed
let s = String::from("hello");
let r = &s;
let s2 = s;  // Move - ERROR!
println!("{}", r);

// FIX 1: Clone instead of move
let s = String::from("hello");
let r = &s;
let s2 = s.clone();
println!("{}", r);

// FIX 2: Finish using borrow first
let s = String::from("hello");
let r = &s;
println!("{}", r);  // Use it
drop(r);            // Optional: explicit drop
let s2 = s;         // Now move is OK
```

#### For E0507 (Move Out of Borrow)

```rust
// PROBLEM: Moving out of reference
struct Container { data: String }

fn bad(c: &Container) -> String {
    c.data  // ERROR: Cannot move out of &Container
}

// FIX 1: Clone
fn good_clone(c: &Container) -> String {
    c.data.clone()
}

// FIX 2: Return reference
fn good_ref(c: &Container) -> &str {
    &c.data
}

// FIX 3: Take ownership of whole thing
fn good_owned(c: Container) -> String {
    c.data
}

// FIX 4: Use Option::take for Option fields
fn take_data(c: &mut Container) -> Option<String> {
    std::mem::take(&mut c.data).into()
}
```

### Step 4: Verify Fix

```bash
cargo check
cargo clippy -- -D warnings
cargo test
```

---

## Common Issues

### Issue 1: Loop Mutation

```rust
// PROBLEM: Mutating collection while iterating
for item in &vec {
    if condition(item) {
        vec.push(new_item);  // ERROR!
    }
}

// FIX: Collect changes, apply after
let to_add: Vec<_> = vec.iter()
    .filter(|item| condition(item))
    .map(|_| new_item.clone())
    .collect();
vec.extend(to_add);
```

### Issue 2: Method Chain Borrow

```rust
// PROBLEM: Method returns reference, then mutate
let map = HashMap::new();
let value = map.get("key");
map.insert("key2", "value2");  // ERROR if value used after

// FIX: Use entry API
map.entry("key")
    .or_insert("default");
```

### Issue 3: Struct Field Borrows

```rust
// PROBLEM: Borrowing multiple fields
struct Data { a: Vec<i32>, b: Vec<i32> }

fn bad(data: &mut Data) {
    let a = &data.a;
    data.b.push(1);  // ERROR in older Rust, OK in NLL
}

// FIX (if still error): Destructure
fn good(data: &mut Data) {
    let Data { a, b } = data;
    let _ = &a[0];
    b.push(1);  // OK, different fields
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Fix analysis | stdout | Explanation of the fix |
| Code patch | edited file | Applied changes |

---

## Output Template

```markdown
## Borrow Checker Resolution

### Error
```
[Full error message]
```

### Error Code
`E0XXX` - [Error name]

### Root Cause
[Why this error occurred]

### Fix Applied
```rust
// Before
[original code]

// After
[fixed code]
```

### Explanation
[Why the fix works]

### Verification
```bash
cargo check  # ✓ Pass
```
```
