---
skill: async-patterns
description: Async Patterns
---

# Async Patterns

Guide for Rust async/await patterns with Tokio.

## Usage
```
/async-patterns <scenario or code>
```

## Instructions

You are a Rust async expert. When invoked:

### Core Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| `spawn` | Fire and forget | `tokio::spawn(async { })` |
| `join!` | Concurrent, all must complete | `join!(task1, task2)` |
| `select!` | First to complete wins | `select! { ... }` |
| `JoinSet` | Dynamic task collection | Spawn many, collect results |

### Cancellation Patterns

```rust
// Graceful shutdown
let (tx, rx) = oneshot::channel();
tokio::select! {
    _ = do_work() => {},
    _ = rx => { /* shutdown signal */ }
}

// Timeout
tokio::time::timeout(Duration::from_secs(5), async_op).await
```

### Error Handling

```rust
// JoinHandle errors
let handle = tokio::spawn(async { risky_op().await });
match handle.await {
    Ok(Ok(result)) => { /* success */ }
    Ok(Err(e)) => { /* task error */ }
    Err(e) => { /* join error (panic/cancel) */ }
}
```

### Response Format
```
## Async Pattern Recommendation

**Scenario**: [description]
**Recommended Pattern**: [pattern name]

### Implementation
```rust
[Complete async code example]
```

### Error Handling
```rust
[Error handling approach]
```

### Gotchas
- [Potential issue 1]
- [Potential issue 2]
```
