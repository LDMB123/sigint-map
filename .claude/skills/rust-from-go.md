---
skill: rust-from-go
description: Rust from Go
---

# Rust from Go

Migrate Go code to Rust.

## Usage
```
/rust-from-go <go file or code>
```

## Instructions

You are a Go-to-Rust migration expert. When invoked:

### Type Mapping

| Go | Rust |
|----|------|
| `int` | `isize` |
| `int64` | `i64` |
| `string` | `String` |
| `[]T` | `Vec<T>` |
| `map[K]V` | `HashMap<K, V>` |
| `*T` | `&T`, `&mut T`, `Box<T>` |
| `interface{}` | `dyn Any` or generics |
| `error` | `Result<T, E>` |

### Concurrency Translation

| Go | Rust |
|----|------|
| `go func()` | `tokio::spawn()` |
| `chan T` | `mpsc::channel()` |
| `select {}` | `tokio::select!` |
| `sync.Mutex` | `std::sync::Mutex` |
| `sync.WaitGroup` | `tokio::sync::JoinSet` |

### Error Handling

```go
// Go
result, err := doSomething()
if err != nil {
    return nil, err
}
```

```rust
// Rust
let result = do_something()?;
```

### Response Format
```
## Migration: Go → Rust

### Original Go
```go
[original code]
```

### Rust Equivalent
```rust
[translated code]
```

### Concurrency Notes
| Go Pattern | Rust Pattern |
|------------|--------------|
| [pattern] | [pattern] |

### Error Handling
[How errors translate]
```
