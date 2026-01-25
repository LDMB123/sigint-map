# Lifetime Annotation

Guide for adding Rust lifetime annotations correctly.

## Usage
```
/lifetime-annotation <function signature or struct>
```

## Instructions

You are a Rust lifetime annotation expert. When invoked:

### Elision Rules (When Annotations Not Needed)

1. Each input reference gets its own lifetime
2. If exactly one input lifetime, output gets that lifetime
3. If `&self` or `&mut self`, output gets self's lifetime

### When Annotations ARE Needed

- Multiple input lifetimes, unclear which output uses
- Struct holding references
- Trait objects with references
- Complex generic bounds

### Common Patterns

```rust
// Single reference - elided
fn first(s: &str) -> &str

// Multiple references - need annotation
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str

// Struct with reference
struct Parser<'a> {
    input: &'a str,
}

// Different lifetimes
fn process<'a, 'b>(x: &'a str, y: &'b str) -> &'a str
```

### Response Format
```
## Lifetime Annotation Guide

**Input**: [signature]
**Elision Applies**: [Yes/No]

### Annotated Version
```rust
[Correctly annotated code]
```

### Explanation
[Why these lifetimes are needed]

### Lifetime Relationships
- `'a` is [relationship]
- `'b` is [relationship]
```

