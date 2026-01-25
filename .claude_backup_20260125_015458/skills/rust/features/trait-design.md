# Skill: Trait Design Patterns

**ID**: `trait-design`
**Category**: Features
**Agent**: Rust Semantics Engineer

---

## When to Use

- Designing generic APIs
- Creating extensible abstractions
- Implementing polymorphism
- Choosing between generics and trait objects
- Understanding trait bounds and associated types

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| abstraction_goal | string | Yes | What behavior to abstract |
| constraints | string | No | Performance or API requirements |

---

## Steps

### Step 1: Define the Trait

```rust
// Basic trait
pub trait Summary {
    fn summarize(&self) -> String;
}

// With default implementation
pub trait Summary {
    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }

    fn summarize_author(&self) -> String;
}

// With associated types
pub trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}

// With associated constants
pub trait Bounded {
    const MIN: Self;
    const MAX: Self;
}
```

### Step 2: Choose Generic vs Trait Object

| Feature | Generics (`impl Trait`) | Trait Objects (`dyn Trait`) |
|---------|------------------------|----------------------------|
| Performance | Monomorphization, inlined | Virtual dispatch |
| Binary size | Larger (code duplication) | Smaller |
| Heterogeneous collections | No | Yes |
| Known at compile time | Yes | No |

```rust
// Generics: Fast, but type must be known at compile time
fn process<T: Summary>(item: T) {
    println!("{}", item.summarize());
}

// Trait object: Dynamic dispatch, heterogeneous collections
fn process_dyn(item: &dyn Summary) {
    println!("{}", item.summarize());
}

// Heterogeneous collection with trait objects
let items: Vec<Box<dyn Summary>> = vec![
    Box::new(article),
    Box::new(tweet),  // Different types!
];
```

### Step 3: Trait Bounds

```rust
// Single bound
fn print<T: Display>(item: T) {
    println!("{}", item);
}

// Multiple bounds
fn print_debug<T: Display + Debug>(item: T) {
    println!("{} (debug: {:?})", item, item);
}

// Where clause for readability
fn complex<T, U>(t: T, u: U) -> i32
where
    T: Clone + Display,
    U: Clone + Debug,
{
    // ...
}

// Bounds on associated types
fn process<I>(iter: I)
where
    I: Iterator,
    I::Item: Display,
{
    for item in iter {
        println!("{}", item);
    }
}
```

### Step 4: Common Trait Patterns

#### Extension Trait

```rust
// Extend existing types with new methods
pub trait StringExt {
    fn truncate_with_ellipsis(&self, max_len: usize) -> String;
}

impl StringExt for str {
    fn truncate_with_ellipsis(&self, max_len: usize) -> String {
        if self.len() <= max_len {
            self.to_string()
        } else {
            format!("{}...", &self[..max_len.saturating_sub(3)])
        }
    }
}

// Usage
use crate::StringExt;
let truncated = "Hello, World!".truncate_with_ellipsis(8);
```

#### Marker Trait

```rust
// Traits that mark capability without methods
pub trait Sealed {}  // Private, prevents external impl

pub trait MyPublicTrait: Sealed {
    fn do_thing(&self);
}

// Only types we impl Sealed for can impl MyPublicTrait
impl Sealed for MyType {}
impl MyPublicTrait for MyType {
    fn do_thing(&self) {}
}
```

#### Builder Pattern with Traits

```rust
pub trait Builder {
    type Output;
    fn build(self) -> Result<Self::Output, BuildError>;
}

pub struct ServerBuilder {
    port: Option<u16>,
    host: Option<String>,
}

impl Builder for ServerBuilder {
    type Output = Server;

    fn build(self) -> Result<Server, BuildError> {
        Ok(Server {
            port: self.port.ok_or(BuildError::MissingPort)?,
            host: self.host.unwrap_or_else(|| "localhost".into()),
        })
    }
}
```

#### Newtype for Trait Impl

```rust
// Can't impl external trait on external type
// impl Display for Vec<i32> {}  // ERROR

// Newtype pattern
struct Wrapper(Vec<i32>);

impl Display for Wrapper {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        write!(f, "[{}]", self.0.iter()
            .map(|n| n.to_string())
            .collect::<Vec<_>>()
            .join(", "))
    }
}
```

### Step 5: Blanket Implementations

```rust
// Implement trait for all types matching a bound
impl<T: Display> Summary for T {
    fn summarize(&self) -> String {
        format!("{}", self)
    }
}

// Common in std: impl<T: Clone> ToOwned for T
// All Clone types get to_owned() for free
```

### Step 6: Supertraits

```rust
// Require another trait
pub trait OutlinePrint: Display {
    fn outline_print(&self) {
        let output = self.to_string();  // Uses Display
        let len = output.len();
        println!("{}", "*".repeat(len + 4));
        println!("*{}*", " ".repeat(len + 2));
        println!("* {} *", output);
        println!("*{}*", " ".repeat(len + 2));
        println!("{}", "*".repeat(len + 4));
    }
}

// Implementors must also implement Display
impl OutlinePrint for Point {}  // Only if Point: Display
```

### Step 7: Object Safety

```rust
// Object-safe trait (can use `dyn Trait`)
pub trait ObjectSafe {
    fn method(&self);
}

// NOT object-safe (cannot use `dyn Trait`)
pub trait NotObjectSafe {
    fn generic_method<T>(&self, t: T);  // Generic method
    fn returns_self(self) -> Self;       // Returns Self
    fn static_method();                   // No self parameter
}

// Make partially object-safe with where Self: Sized
pub trait PartiallyObjectSafe {
    fn object_safe_method(&self);

    fn not_object_safe(&self) -> Self where Self: Sized;  // Excluded from dyn
}
```

---

## Associated Types vs Generic Parameters

```rust
// Associated type: One implementation per type
trait Iterator {
    type Item;  // Each impl chooses ONE Item type
    fn next(&mut self) -> Option<Self::Item>;
}

impl Iterator for Counter {
    type Item = u32;  // Counter always yields u32
    fn next(&mut self) -> Option<u32> { ... }
}

// Generic parameter: Multiple implementations per type
trait From<T> {
    fn from(value: T) -> Self;
}

impl From<u32> for MyType { ... }
impl From<String> for MyType { ... }  // Same type, different From impls
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Trait design | stdout | Recommended trait structure |
| Example impl | stdout | How to implement the trait |

---

## Output Template

```markdown
## Trait Design Recommendation

### Goal
[What the trait should abstract]

### Trait Definition
```rust
[trait code]
```

### Example Implementation
```rust
[impl code]
```

### Usage Pattern
```rust
[how to use the trait]
```

### Trade-offs
- **Generics**: [When to use]
- **Trait Objects**: [When to use]

### Object Safety
[Is it object-safe? Why/why not?]
```
