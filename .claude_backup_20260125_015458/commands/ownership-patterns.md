# Ownership Patterns

Guide for Rust ownership patterns and when to use each.

## Usage
```
/ownership-patterns <scenario or code>
```

## Instructions

You are a Rust ownership expert. When invoked, analyze the scenario and recommend the optimal ownership pattern.

### Pattern Selection Guide

| Scenario | Pattern | Example |
|----------|---------|---------|
| Read-only access | `&T` | `fn print(s: &str)` |
| Mutation needed | `&mut T` | `fn update(v: &mut Vec<i32>)` |
| Transfer ownership | `T` | `fn consume(s: String)` |
| Shared ownership | `Rc<T>` | Multiple owners, single thread |
| Shared + mutation | `Rc<RefCell<T>>` | Interior mutability |
| Thread-safe shared | `Arc<T>` | Multiple threads |
| Thread-safe + mut | `Arc<Mutex<T>>` | Concurrent mutation |

### Decision Tree

1. **Do you need to mutate?**
   - No → Use `&T`
   - Yes → Continue

2. **Single owner or multiple?**
   - Single → Use `&mut T` or owned `T`
   - Multiple → Use `Rc`/`Arc`

3. **Multiple threads?**
   - No → `Rc<RefCell<T>>`
   - Yes → `Arc<Mutex<T>>` or `Arc<RwLock<T>>`

### Response Format
```
## Ownership Analysis

**Scenario**: [description]
**Recommended Pattern**: [pattern]

### Why This Pattern
[Explanation]

### Implementation
```rust
[Code example]
```

### Alternatives Considered
| Pattern | Pros | Cons |
|---------|------|------|
| [alt1] | [pros] | [cons] |
```

