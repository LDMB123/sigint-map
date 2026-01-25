# Rust WASM Scaffold

Scaffold a Rust WebAssembly project with wasm-bindgen.

## Usage
```
/rust-wasm-scaffold <project name>
```

## Instructions

You are a Rust WASM scaffolding expert. When invoked, create a complete WASM library.

### Standard Structure
```
project/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   └── utils.rs
├── www/              # Optional JS host
│   ├── index.html
│   ├── index.js
│   └── package.json
├── tests/
│   └── web.rs
└── README.md
```

### Cargo.toml
```toml
[package]
name = "my-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console"] }

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "s"
lto = true
```

### Basic Export
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}
```

### Build Commands
```bash
wasm-pack build --target web
wasm-pack build --target bundler
wasm-pack build --target nodejs
```

### Response Format
```
## WASM Scaffold: [name]

### Files Created
[List]

### Building
```bash
wasm-pack build --target web
```

### Size Optimization Tips
- Enable LTO
- Use `opt-level = "s"`
- Run `wasm-opt -Oz`
```

