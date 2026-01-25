# Skill: Lifetime Error Debugging

**ID**: `lifetime-debug`
**Category**: Debugging
**Agent**: Rust Semantics Engineer

---

## When to Use

- Error E0106: "missing lifetime specifier"
- Error E0621: "explicit lifetime required"
- Error E0495: "cannot infer an appropriate lifetime"
- Error E0597: "borrowed value does not live long enough"
- Any error mentioning lifetimes or "does not live long enough"

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| error_message | string | Yes | Full compiler error output |
| file_path | string | Yes | Path to the file with error |
| function_signature | string | No | The function/struct signature |

---

## Steps

### Step 1: Understand Lifetime Elision Rules

```rust
// Rule 1: Each input reference gets its own lifetime
fn foo(x: &i32) -> ...           // fn foo<'a>(x: &'a i32) -> ...
fn foo(x: &i32, y: &i32) -> ...  // fn foo<'a, 'b>(x: &'a i32, y: &'b i32) -> ...

// Rule 2: If exactly one input lifetime, it's assigned to all outputs
fn foo(x: &i32) -> &i32          // fn foo<'a>(x: &'a i32) -> &'a i32

// Rule 3: If &self or &mut self, self's lifetime is assigned to outputs
impl Foo {
    fn bar(&self) -> &str        // fn bar<'a>(&'a self) -> &'a str
}
```

### Step 2: Diagnose Common Patterns

#### E0106: Missing Lifetime Specifier

```rust
// PROBLEM: Struct with references needs lifetime
struct BadStruct {
    data: &str,  // ERROR: missing lifetime
}

// FIX: Add lifetime parameter
struct GoodStruct<'a> {
    data: &'a str,
}
```

#### E0621: Explicit Lifetime Required

```rust
// PROBLEM: Multiple input references, output reference
fn bad(x: &str, y: &str) -> &str {  // ERROR
    if x.len() > y.len() { x } else { y }
}

// FIX: Add explicit lifetime
fn good<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// ALT: Different lifetimes if only one is returned
fn alt<'a, 'b>(x: &'a str, _y: &'b str) -> &'a str {
    x  // Only x is returned
}
```

#### E0597: Does Not Live Long Enough

```rust
// PROBLEM: Reference outlives the value
fn bad() -> &str {
    let s = String::from("hello");
    &s  // ERROR: s dropped at end of function
}

// FIX 1: Return owned value
fn good() -> String {
    String::from("hello")
}

// FIX 2: Accept reference from caller
fn good2(s: &str) -> &str {
    &s[..1]  // OK: same lifetime as input
}

// FIX 3: Static lifetime for constants
fn good3() -> &'static str {
    "hello"  // String literals are 'static
}
```

#### E0495: Cannot Infer Appropriate Lifetime

```rust
// PROBLEM: Closure capturing reference with complex lifetime
fn bad<'a>(x: &'a str) -> impl Fn() -> &'a str {
    move || x  // Complex lifetime inference
}

// FIX: Use explicit lifetime bounds
fn good<'a>(x: &'a str) -> impl Fn() -> &'a str + 'a {
    move || x
}
```

### Step 3: Apply Fix Pattern

#### Struct Lifetimes

```rust
// When struct holds references, add lifetime parameter
struct Parser<'input> {
    source: &'input str,
    position: usize,
}

impl<'input> Parser<'input> {
    fn new(source: &'input str) -> Self {
        Parser { source, position: 0 }
    }

    // Methods can return references with same lifetime
    fn current(&self) -> &'input str {
        &self.source[self.position..]
    }
}
```

#### Multiple Lifetimes

```rust
// When references have different lifetimes
struct Context<'s, 'd> {
    schema: &'s Schema,
    data: &'d Data,
}

impl<'s, 'd> Context<'s, 'd> {
    fn get_schema(&self) -> &'s Schema {
        self.schema
    }

    fn get_data(&self) -> &'d Data {
        self.data
    }
}
```

#### Lifetime Bounds on Traits

```rust
// When trait object needs lifetime
trait Parser {
    fn parse(&self, input: &str) -> Result<Output, Error>;
}

// Storing trait object with lifetime
struct Container<'a> {
    parser: Box<dyn Parser + 'a>,
}

// 'static if no lifetime dependence
struct StaticContainer {
    parser: Box<dyn Parser + 'static>,
}
```

### Step 4: Verify

```bash
cargo check
cargo clippy -- -D warnings
```

---

## Common Issues

### Issue 1: Returning Reference to Local

```rust
// PROBLEM
fn get_ref() -> &String {
    let s = String::from("hello");
    &s  // ERROR!
}

// FIX: Return owned value
fn get_owned() -> String {
    String::from("hello")
}
```

### Issue 2: Self-Referential Struct

```rust
// PROBLEM: Struct referencing itself
struct Bad {
    data: String,
    slice: &str,  // Cannot reference data!
}

// FIX 1: Store indices
struct Good {
    data: String,
    start: usize,
    end: usize,
}

impl Good {
    fn get_slice(&self) -> &str {
        &self.data[self.start..self.end]
    }
}

// FIX 2: Use Pin and unsafe (advanced)
// FIX 3: Use crate like `ouroboros` or `self_cell`
```

### Issue 3: Closure Lifetimes

```rust
// PROBLEM: Closure needs explicit lifetime
fn bad<F>(f: F) -> impl Fn()
where F: Fn() -> &str {  // ERROR
    f
}

// FIX: Add lifetime bounds
fn good<'a, F>(f: F) -> impl Fn() -> &'a str + 'a
where F: Fn() -> &'a str + 'a {
    f
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Lifetime analysis | stdout | Explanation of lifetime relationships |
| Fixed code | edited file | Corrected signatures |

---

## Output Template

```markdown
## Lifetime Error Resolution

### Error
```
[Full error message]
```

### Lifetime Diagram
```
'a: [----input_reference----]
'b:     [--output_ref--]
         ^ borrowed here
                       ^ lifetime ends here
```

### Root Cause
[Why the lifetime error occurred]

### Fix Applied
```rust
// Before
[original signature]

// After
[fixed signature with lifetimes]
```

### Explanation
[How the lifetime annotations fix the issue]

### Verification
```bash
cargo check  # ✓ Pass
```
```
