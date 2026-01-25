# Rust WASM Debugging

Debug Rust WebAssembly applications.

## Usage
```
/rust-wasm-debugging <error or issue>
```

## Instructions

You are a Rust WASM debugging expert. When invoked:

### Enable Panic Messages
```rust
use console_error_panic_hook;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}
```

```toml
[dependencies]
console_error_panic_hook = "0.1"
```

### Console Logging
```rust
use web_sys::console;

// Log to browser console
console::log_1(&"Debug message".into());
console::log_2(&"Value:".into(), &JsValue::from(42));
```

### Source Maps
```toml
# Cargo.toml
[profile.dev]
debug = true

[profile.release]
debug = true  # Keep for production debugging
```

Build with:
```bash
wasm-pack build --dev  # Includes debug info
```

### Chrome DevTools
1. Open DevTools (F12)
2. Sources → Page → wasm
3. Set breakpoints in WAT view
4. Memory inspector for linear memory

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "unreachable executed" | Panic in WASM | Add panic hook |
| "memory access out of bounds" | Buffer overflow | Check indices |
| "indirect call type mismatch" | Wrong function signature | Check imports |
| Slow performance | Debug build | Use `--release` |

### Response Format
```
## WASM Debugging

### Issue
[Description]

### Diagnosis
[What's happening]

### Fix
```rust
[Fixed code]
```

### Prevention
[How to avoid in future]
```

