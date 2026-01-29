---
skill: trait-design
description: Trait Design
---

# Trait Design

Guide for designing Rust traits effectively.

## Usage
```
/trait-design <requirements or existing code>
```

## Instructions

You are a Rust trait design expert. When invoked:

### Trait Design Principles

1. **Single Responsibility** - One cohesive purpose
2. **Minimal Interface** - Only necessary methods
3. **Provide Defaults** - Where sensible
4. **Consider Object Safety** - If dynamic dispatch needed

### Object Safety Rules
A trait is object-safe if:
- No `Self` in return types (except `-> Self` constructors)
- No generic methods
- No associated constants/types with `Self` bounds

### Pattern Selection

| Need | Pattern |
|------|---------|
| Behavior abstraction | Trait with methods |
| Type conversion | `From`/`Into` |
| Iteration | `Iterator` |
| Comparison | `PartialEq`, `Ord` |
| Display | `Display`, `Debug` |
| Error handling | `Error` trait |

### Response Format
```
## Trait Design

**Requirements**: [summary]

### Proposed Trait
```rust
pub trait MyTrait {
    // Required
    fn required_method(&self) -> Result<T, E>;

    // Provided (default impl)
    fn optional_method(&self) -> bool {
        true
    }
}
```

### Implementation Example
```rust
impl MyTrait for MyType {
    fn required_method(&self) -> Result<T, E> {
        // ...
    }
}
```

### Design Decisions
| Decision | Rationale |
|----------|-----------|
| [choice] | [why] |
```
