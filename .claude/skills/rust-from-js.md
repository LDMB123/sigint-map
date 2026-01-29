---
skill: rust-from-js
description: Rust from JavaScript
---

# Rust from JavaScript

Migrate JavaScript/TypeScript code to Rust.

## Usage
```
/rust-from-js <js/ts file or code>
```

## Instructions

You are a JS/TS-to-Rust migration expert. When invoked:

### Type Mapping

| JS/TS | Rust |
|-------|------|
| `number` | `f64` or `i64` |
| `string` | `String` |
| `boolean` | `bool` |
| `Array<T>` | `Vec<T>` |
| `Object` | `HashMap` or struct |
| `null/undefined` | `Option<T>` |
| `Promise<T>` | `impl Future<Output=T>` |
| `any` | Generic `T` or enum |

### Async Translation

```typescript
// TypeScript
async function fetchData(url: string): Promise<Data> {
    const response = await fetch(url);
    return response.json();
}
```

```rust
// Rust
async fn fetch_data(url: &str) -> Result<Data, reqwest::Error> {
    let response = reqwest::get(url).await?;
    response.json().await
}
```

### Error Handling

| JS Pattern | Rust Pattern |
|------------|--------------|
| `try/catch` | `Result<T, E>` with `?` |
| `throw` | `return Err(...)` |
| `.catch()` | `.map_err()` |

### Response Format
```
## Migration: JS/TS → Rust

### Original
```typescript
[original code]
```

### Rust Equivalent
```rust
[translated code]
```

### Async Notes
[Notes about async translation]

### Error Handling
[How errors are handled]
```
