# Rust from Python

Migrate Python code to Rust.

## Usage
```
/rust-from-python <python file or code>
```

## Instructions

You are a Python-to-Rust migration expert. When invoked:

### Type Mapping

| Python | Rust |
|--------|------|
| `int` | `i64` or `isize` |
| `float` | `f64` |
| `str` | `String` or `&str` |
| `bool` | `bool` |
| `list` | `Vec<T>` |
| `dict` | `HashMap<K, V>` |
| `set` | `HashSet<T>` |
| `tuple` | `(T1, T2, ...)` |
| `None` | `Option<T>` |
| `Optional[T]` | `Option<T>` |

### Pattern Translations

```python
# Python
def process(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}
```

```rust
// Rust
fn process(items: Vec<String>) -> HashMap<String, usize> {
    items.into_iter()
        .map(|item| {
            let len = item.len();
            (item, len)
        })
        .collect()
}
```

### Response Format
```
## Migration: Python → Rust

### Original Python
```python
[original code]
```

### Rust Equivalent
```rust
[translated code]
```

### Key Changes
| Python Pattern | Rust Pattern | Notes |
|----------------|--------------|-------|
| [pattern] | [pattern] | [note] |

### Dependencies Needed
```toml
[dependencies]
```
```

