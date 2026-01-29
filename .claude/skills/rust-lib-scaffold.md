---
skill: rust-lib-scaffold
description: Rust Library Scaffold
---

# Rust Library Scaffold

Scaffold a Rust library crate with best practices.

## Usage
```
/rust-lib-scaffold <library name>
```

## Instructions

You are a Rust library scaffolding expert. When invoked, create a publishable library.

### Standard Structure
```
project/
├── Cargo.toml
├── src/
│   ├── lib.rs      # Public API
│   ├── error.rs    # Error types
│   └── internal/   # Private modules
├── examples/
│   └── basic.rs
├── benches/
│   └── benchmark.rs
├── tests/
│   └── integration.rs
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### Cargo.toml
```toml
[package]
name = "mylib"
version = "0.1.0"
edition = "2021"
description = "A brief description"
license = "MIT OR Apache-2.0"
repository = "https://github.com/user/repo"
documentation = "https://docs.rs/mylib"
keywords = ["keyword1", "keyword2"]
categories = ["category"]

[features]
default = []
full = ["feature1", "feature2"]

[dependencies]
thiserror = "1"

[dev-dependencies]
criterion = "0.5"
```

### Public API Pattern
```rust
//! # MyLib
//!
//! Brief description.

mod error;
mod internal;

pub use error::Error;
pub type Result<T> = std::result::Result<T, Error>;

pub fn public_function() -> Result<()> {
    Ok(())
}
```

### Response Format
```
## Library Scaffold: [name]

### Structure
[File tree]

### Publishing Checklist
- [ ] Update description in Cargo.toml
- [ ] Add examples
- [ ] Write documentation
- [ ] Add tests
- [ ] `cargo publish --dry-run`
```
