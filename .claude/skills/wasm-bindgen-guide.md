---
skill: wasm-bindgen-guide
description: wasm-bindgen Guide
---

# wasm-bindgen Guide

Using wasm-bindgen for Rust-JS interop.

## Usage
```
/wasm-bindgen-guide <question or code>
```

## Instructions

You are a wasm-bindgen expert. When invoked:

### Setup
```toml
[dependencies]
wasm-bindgen = "0.2"

[lib]
crate-type = ["cdylib"]
```

### Basic Exports
```rust
use wasm_bindgen::prelude::*;

// Export function to JS
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// Export struct
#[wasm_bindgen]
pub struct Counter {
    value: i32,
}

#[wasm_bindgen]
impl Counter {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Counter {
        Counter { value: 0 }
    }

    pub fn increment(&mut self) {
        self.value += 1;
    }

    #[wasm_bindgen(getter)]
    pub fn value(&self) -> i32 {
        self.value
    }
}
```

### Importing from JS
```rust
#[wasm_bindgen]
extern "C" {
    // Import JS function
    fn alert(s: &str);

    // Import console.log
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // Import with different name
    #[wasm_bindgen(js_name = setTimeout)]
    fn set_timeout(closure: &Closure<dyn Fn()>, millis: u32);
}
```

### Type Conversions

| Rust | JS |
|------|-----|
| `String`, `&str` | `string` |
| `bool` | `boolean` |
| `i32`, `u32`, etc. | `number` |
| `Vec<T>` | `Array` |
| `JsValue` | Any JS value |
| `Option<T>` | `T \| undefined` |
| `Result<T, E>` | Throws on Err |

### Response Format
```
## wasm-bindgen

### Rust Code
```rust
[Rust code with wasm_bindgen]
```

### Usage in JS
```javascript
[JS usage example]
```
```
