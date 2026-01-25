# Skill: Lifetime Annotation Guide

**ID**: `lifetime-annotation`
**Category**: Features
**Agent**: Rust Semantics Engineer

---

## When to Use

- Adding lifetimes to structs holding references
- Writing functions that return references
- Implementing traits with lifetime bounds
- Understanding lifetime elision rules
- Designing APIs with borrowed data

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| code_snippet | string | Yes | Code that needs lifetime annotations |
| error_message | string | No | Compiler error if any |

---

## Steps

### Step 1: Understand Lifetime Elision Rules

The compiler automatically infers lifetimes in these cases:

```rust
// Rule 1: Each input reference gets its own lifetime
fn foo(x: &str) -> ...
// Becomes: fn foo<'a>(x: &'a str) -> ...

fn foo(x: &str, y: &str) -> ...
// Becomes: fn foo<'a, 'b>(x: &'a str, y: &'b str) -> ...

// Rule 2: If exactly one input lifetime, output gets same lifetime
fn foo(x: &str) -> &str
// Becomes: fn foo<'a>(x: &'a str) -> &'a str

// Rule 3: If &self or &mut self, output gets self's lifetime
impl MyStruct {
    fn foo(&self) -> &str
    // Becomes: fn foo<'a>(&'a self) -> &'a str
}
```

### Step 2: When Explicit Lifetimes Are Needed

#### Multiple Input References, Output Reference

```rust
// Compiler can't know which input the output comes from
fn longest(x: &str, y: &str) -> &str  // ERROR

// Fix: Explicit lifetime shows relationship
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// If output only from one input:
fn first<'a, 'b>(x: &'a str, _y: &'b str) -> &'a str {
    x
}
```

#### Structs with References

```rust
// Struct holding references needs lifetime
struct ImportantExcerpt<'a> {
    part: &'a str,
}

impl<'a> ImportantExcerpt<'a> {
    // Methods that return references to self
    fn get_part(&self) -> &str {
        self.part  // Elision: returns &'a str
    }

    // Methods with additional borrowed parameters
    fn announce_and_return(&self, announcement: &str) -> &str {
        println!("Attention: {}", announcement);
        self.part  // Returns self's lifetime, not announcement's
    }
}
```

#### Multiple Lifetimes in Structs

```rust
// When fields have different lifetimes
struct Context<'a, 'b> {
    config: &'a Config,
    data: &'b Data,
}

impl<'a, 'b> Context<'a, 'b> {
    fn get_config(&self) -> &'a Config {
        self.config
    }

    fn get_data(&self) -> &'b Data {
        self.data
    }
}
```

### Step 3: Common Lifetime Patterns

#### Struct Outlives Reference

```rust
// Parser borrows source, must not outlive it
struct Parser<'input> {
    source: &'input str,
    position: usize,
}

impl<'input> Parser<'input> {
    fn new(source: &'input str) -> Parser<'input> {
        Parser { source, position: 0 }
    }

    fn next_token(&mut self) -> Option<&'input str> {
        // Returns slice of original source
        if self.position < self.source.len() {
            let start = self.position;
            // ... find token end
            let end = start + 5;
            self.position = end;
            Some(&self.source[start..end])
        } else {
            None
        }
    }
}
```

#### Static Lifetime

```rust
// 'static: Lives for entire program
// String literals are 'static
let s: &'static str = "hello";

// Owned data satisfies 'static (no borrowed data)
fn takes_static<T: 'static>(value: T) {
    // T contains no borrowed references
}

takes_static(String::from("hello"));  // OK
takes_static(42i32);  // OK

let s = String::from("temp");
// takes_static(&s);  // ERROR: &s is not 'static
```

#### Lifetime Bounds on Traits

```rust
// Trait object with lifetime
trait MyTrait {
    fn process(&self) -> &str;
}

// Box<dyn MyTrait + 'a> means trait object may borrow data with lifetime 'a
fn use_trait<'a>(obj: Box<dyn MyTrait + 'a>) -> &'a str {
    obj.process()
}

// 'static trait object (common case)
fn use_static_trait(obj: Box<dyn MyTrait + 'static>) -> &str {
    obj.process()
}
```

#### Higher-Ranked Trait Bounds (HRTB)

```rust
// When a function works for ANY lifetime
fn call_with_ref<F>(f: F)
where
    F: for<'a> Fn(&'a str) -> &'a str,  // Works for any lifetime
{
    let s = String::from("hello");
    let result = f(&s);
    println!("{}", result);
}

// Equivalent using impl Fn
fn call_with_ref2(f: impl for<'a> Fn(&'a str) -> &'a str) {
    let s = String::from("hello");
    let result = f(&s);
    println!("{}", result);
}
```

### Step 4: Lifetime Variance

```rust
// Covariant: Can use shorter lifetime where longer expected
fn covariant<'a>(long: &'a str) {
    let short: &'a str = long;  // OK: same lifetime
}

// Invariant: Must use exact lifetime (mutable references)
fn invariant<'a>(data: &'a mut Vec<&'a str>) {
    // Vec<&'a str> is invariant in 'a
}

// Contravariant: Can use longer lifetime where shorter expected
// (rare, mainly in function pointers)
```

---

## Anti-Patterns

### Unnecessary Lifetimes

```rust
// WRONG: Explicit lifetimes where elision works
fn first<'a>(s: &'a str) -> &'a str {
    &s[..1]
}

// CORRECT: Let elision handle it
fn first(s: &str) -> &str {
    &s[..1]
}
```

### Overly Restrictive Lifetimes

```rust
// WRONG: Forces both inputs to have same lifetime
fn process<'a>(config: &'a Config, data: &'a Data) -> &'a str

// BETTER: Separate lifetimes when they're independent
fn process<'c, 'd>(config: &'c Config, data: &'d Data) -> &'c str
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Annotated code | stdout | Code with lifetime annotations |
| Explanation | stdout | Why each annotation is needed |

---

## Output Template

```markdown
## Lifetime Annotation Analysis

### Original Code
```rust
[code without lifetimes]
```

### Annotated Code
```rust
[code with lifetimes]
```

### Lifetime Relationships
```
'a: [----input_source----]
'b:     [--struct--]
              ^ must not outlive 'a
```

### Explanation
[Why each lifetime is needed]

### Elision Rules Applied
- Rule X applied to [location]

### Verification
```bash
cargo check
```
```
