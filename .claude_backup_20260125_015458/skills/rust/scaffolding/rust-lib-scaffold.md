# Skill: Library Crate Scaffold

**ID**: `rust-lib-scaffold`
**Category**: Scaffolding
**Agent**: Rust Project Architect

---

## When to Use

- Creating a reusable Rust library
- Publishing to crates.io
- Designing public APIs
- Setting up documentation and examples

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Library name |
| description | string | Yes | Brief description |

---

## Steps

### Step 1: Create Project

```bash
cargo new my-lib --lib
cd my-lib
```

### Step 2: Configure Cargo.toml

```toml
[package]
name = "my-lib"
version = "0.1.0"
edition = "2021"
rust-version = "1.70"
authors = ["Your Name <email@example.com>"]
description = "A brief description of what this library does"
license = "MIT OR Apache-2.0"
repository = "https://github.com/username/my-lib"
documentation = "https://docs.rs/my-lib"
readme = "README.md"
keywords = ["keyword1", "keyword2"]
categories = ["category"]

[dependencies]
thiserror = "1"
serde = { version = "1", features = ["derive"], optional = true }

[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[features]
default = []
serde = ["dep:serde"]

[[bench]]
name = "benchmarks"
harness = false

[lints.rust]
unsafe_code = "forbid"
missing_docs = "warn"

[lints.clippy]
all = "warn"
pedantic = "warn"

[package.metadata.docs.rs]
all-features = true
rustdoc-args = ["--cfg", "docsrs"]
```

### Step 3: Project Structure

```
my-lib/
├── Cargo.toml
├── LICENSE-MIT
├── LICENSE-APACHE
├── README.md
├── CHANGELOG.md
├── src/
│   ├── lib.rs          # Public API, re-exports
│   ├── error.rs        # Error types
│   ├── types.rs        # Core types
│   └── builder.rs      # Builder patterns
├── examples/
│   ├── basic.rs
│   └── advanced.rs
├── benches/
│   └── benchmarks.rs
└── tests/
    └── integration.rs
```

### Step 4: Implement Library

**src/lib.rs**
```rust
//! # My Library
//!
//! `my-lib` provides functionality for X.
//!
//! ## Quick Start
//!
//! ```rust
//! use my_lib::Widget;
//!
//! let widget = Widget::new("example");
//! let result = widget.process()?;
//! # Ok::<(), my_lib::Error>(())
//! ```
//!
//! ## Features
//!
//! - `serde`: Enable serialization support
//!
//! ## Examples
//!
//! See the [examples](https://github.com/username/my-lib/tree/main/examples)
//! directory for more usage examples.

#![warn(missing_docs)]
#![cfg_attr(docsrs, feature(doc_cfg))]

mod error;
mod types;
mod builder;

pub use error::{Error, Result};
pub use types::Widget;
pub use builder::WidgetBuilder;

/// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
```

**src/error.rs**
```rust
//! Error types for the library.

use thiserror::Error;

/// Errors that can occur when using this library.
#[derive(Error, Debug)]
pub enum Error {
    /// The input was invalid.
    #[error("invalid input: {0}")]
    InvalidInput(String),

    /// An I/O error occurred.
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    /// A configuration error.
    #[error("configuration error: {0}")]
    Config(String),
}

/// A specialized Result type for this library.
pub type Result<T> = std::result::Result<T, Error>;
```

**src/types.rs**
```rust
//! Core types for the library.

use crate::{Error, Result};

/// A widget that performs useful operations.
///
/// # Examples
///
/// ```rust
/// use my_lib::Widget;
///
/// let widget = Widget::new("my-widget");
/// assert_eq!(widget.name(), "my-widget");
/// ```
#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Widget {
    name: String,
    capacity: usize,
}

impl Widget {
    /// Creates a new widget with the given name.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use my_lib::Widget;
    ///
    /// let widget = Widget::new("example");
    /// ```
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            capacity: 100,
        }
    }

    /// Returns the widget's name.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Returns the widget's capacity.
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Processes the widget and returns a result.
    ///
    /// # Errors
    ///
    /// Returns an error if the widget name is empty.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use my_lib::Widget;
    ///
    /// let widget = Widget::new("example");
    /// let result = widget.process()?;
    /// assert_eq!(result, "Processed: example");
    /// # Ok::<(), my_lib::Error>(())
    /// ```
    pub fn process(&self) -> Result<String> {
        if self.name.is_empty() {
            return Err(Error::InvalidInput("name cannot be empty".into()));
        }
        Ok(format!("Processed: {}", self.name))
    }
}

impl Default for Widget {
    fn default() -> Self {
        Self::new("default")
    }
}
```

**src/builder.rs**
```rust
//! Builder pattern for complex widget construction.

use crate::{Error, Result, Widget};

/// Builder for creating widgets with custom configuration.
///
/// # Examples
///
/// ```rust
/// use my_lib::WidgetBuilder;
///
/// let widget = WidgetBuilder::new()
///     .name("custom")
///     .capacity(200)
///     .build()?;
/// # Ok::<(), my_lib::Error>(())
/// ```
#[derive(Debug, Default)]
pub struct WidgetBuilder {
    name: Option<String>,
    capacity: Option<usize>,
}

impl WidgetBuilder {
    /// Creates a new widget builder.
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets the widget name.
    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    /// Sets the widget capacity.
    pub fn capacity(mut self, capacity: usize) -> Self {
        self.capacity = Some(capacity);
        self
    }

    /// Builds the widget.
    ///
    /// # Errors
    ///
    /// Returns an error if the name is not set.
    pub fn build(self) -> Result<Widget> {
        let name = self.name.ok_or_else(|| Error::Config("name is required".into()))?;

        let mut widget = Widget::new(name);
        if let Some(capacity) = self.capacity {
            widget = Widget {
                capacity,
                ..widget
            };
        }

        Ok(widget)
    }
}
```

**examples/basic.rs**
```rust
//! Basic usage example.

use my_lib::Widget;

fn main() -> my_lib::Result<()> {
    let widget = Widget::new("example");
    println!("Widget: {:?}", widget);

    let result = widget.process()?;
    println!("Result: {}", result);

    Ok(())
}
```

**benches/benchmarks.rs**
```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use my_lib::Widget;

fn widget_process(c: &mut Criterion) {
    let widget = Widget::new("benchmark");

    c.bench_function("widget process", |b| {
        b.iter(|| widget.process().unwrap())
    });
}

criterion_group!(benches, widget_process);
criterion_main!(benches);
```

**tests/integration.rs**
```rust
use my_lib::{Widget, WidgetBuilder};

#[test]
fn test_widget_creation() {
    let widget = Widget::new("test");
    assert_eq!(widget.name(), "test");
}

#[test]
fn test_widget_builder() {
    let widget = WidgetBuilder::new()
        .name("custom")
        .capacity(500)
        .build()
        .unwrap();

    assert_eq!(widget.name(), "custom");
    assert_eq!(widget.capacity(), 500);
}

#[test]
fn test_widget_process() {
    let widget = Widget::new("test");
    let result = widget.process().unwrap();
    assert!(result.contains("test"));
}
```

### Step 5: Documentation and README

**README.md**
```markdown
# my-lib

[![Crates.io](https://img.shields.io/crates/v/my-lib.svg)](https://crates.io/crates/my-lib)
[![Documentation](https://docs.rs/my-lib/badge.svg)](https://docs.rs/my-lib)
[![CI](https://github.com/username/my-lib/workflows/CI/badge.svg)](https://github.com/username/my-lib/actions)

A brief description of what this library does.

## Installation

Add this to your `Cargo.toml`:

\`\`\`toml
[dependencies]
my-lib = "0.1"
\`\`\`

## Usage

\`\`\`rust
use my_lib::Widget;

fn main() -> my_lib::Result<()> {
    let widget = Widget::new("example");
    let result = widget.process()?;
    println!("{}", result);
    Ok(())
}
\`\`\`

## Features

- `serde`: Enable serialization support

## License

Licensed under either of Apache License, Version 2.0 or MIT license at your option.
```

### Step 6: Build and Test

```bash
cargo build
cargo test
cargo doc --open
cargo run --example basic
cargo bench
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Library crate | ./ | Complete library |
| Documentation | target/doc/ | Generated docs |

---

## Output Template

```markdown
## Library Crate Created

### Project: [name]

### Public API
- `Widget` - Main type
- `WidgetBuilder` - Builder pattern
- `Error` / `Result` - Error handling

### Commands
```bash
cargo build
cargo test
cargo doc --open
cargo publish --dry-run
```
```
