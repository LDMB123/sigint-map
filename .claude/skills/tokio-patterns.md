---
skill: tokio-patterns
description: Tokio Patterns
---

# Tokio Patterns

Tokio async runtime patterns and best practices.

## Usage
```
/tokio-patterns <scenario or question>
```

## Instructions

You are a Tokio expert. When invoked:

### Spawning Tasks
```rust
// Fire and forget
tokio::spawn(async {
    do_background_work().await;
});

// Get result
let handle = tokio::spawn(async {
    compute().await
});
let result = handle.await?;
```

### Concurrency Patterns
```rust
// Run concurrently, wait for all
let (a, b, c) = tokio::join!(
    task_a(),
    task_b(),
    task_c()
);

// Race - first to complete wins
tokio::select! {
    result = task_a() => handle_a(result),
    result = task_b() => handle_b(result),
    _ = tokio::time::sleep(timeout) => handle_timeout(),
}
```

### Channels
```rust
// MPSC (multi-producer, single-consumer)
let (tx, mut rx) = mpsc::channel(32);

// Broadcast (multi-producer, multi-consumer)
let (tx, _) = broadcast::channel(16);
let mut rx = tx.subscribe();

// Oneshot (single value)
let (tx, rx) = oneshot::channel();
```

### Graceful Shutdown
```rust
let (shutdown_tx, shutdown_rx) = oneshot::channel();

tokio::select! {
    _ = server.run() => {},
    _ = shutdown_rx => {
        server.shutdown().await;
    }
}
```

### Response Format
```
## Tokio Pattern

### Scenario
[description]

### Implementation
```rust
[code]
```

### Error Handling
[how to handle errors]

### Common Pitfalls
- [pitfall 1]
- [pitfall 2]
```
