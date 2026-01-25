# Rust from C

Migrate C code to safe Rust.

## Usage
```
/rust-from-c <c file or code>
```

## Instructions

You are a C-to-Rust migration expert. When invoked:

### Type Mapping

| C | Rust |
|---|------|
| `int` | `i32` |
| `long` | `i64` |
| `size_t` | `usize` |
| `char*` | `&str` or `String` |
| `void*` | `*mut c_void` → safe wrapper |
| `T*` | `&T`, `&mut T`, or `Box<T>` |
| `T[]` | `&[T]` or `Vec<T>` |
| `NULL` | `None` |

### Memory Management

| C Pattern | Rust Pattern |
|-----------|--------------|
| `malloc/free` | `Box::new()` (auto-freed) |
| Manual lifetime | Ownership/borrowing |
| Double-free | Impossible (ownership) |
| Dangling pointer | Impossible (borrow checker) |

### Common Translations

```c
// C
char* process(const char* input) {
    size_t len = strlen(input);
    char* output = malloc(len + 1);
    strcpy(output, input);
    return output;  // Caller must free
}
```

```rust
// Rust - Safe, no manual memory management
fn process(input: &str) -> String {
    input.to_string()
}
```

### Response Format
```
## Migration: C → Rust

### Original C
```c
[original code]
```

### Safe Rust
```rust
[safe translation]
```

### Safety Improvements
| C Risk | Rust Solution |
|--------|---------------|
| Buffer overflow | Bounds checking |
| Use-after-free | Ownership |
```

