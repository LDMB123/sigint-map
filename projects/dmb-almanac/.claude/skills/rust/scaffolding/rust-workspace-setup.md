# Skill: Cargo Workspace Setup

**ID**: `rust-workspace-setup`
**Category**: Scaffolding
**Agent**: Rust Project Architect

---

## When to Use

- Managing multiple related crates
- Sharing dependencies across crates
- Building monorepo-style projects
- Splitting large projects into modules

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Workspace name |
| crates | string[] | Yes | List of crate names |

---

## Steps

### Step 1: Create Workspace Structure

```bash
mkdir my-workspace
cd my-workspace

# Create root Cargo.toml
touch Cargo.toml

# Create crates directory
mkdir -p crates/{core,cli,server,common}
```

### Step 2: Configure Root Cargo.toml

```toml
# Cargo.toml (workspace root)
[workspace]
resolver = "2"
members = [
    "crates/*",
]

# Shared package metadata
[workspace.package]
version = "0.1.0"
edition = "2021"
rust-version = "1.75"
license = "MIT OR Apache-2.0"
repository = "https://github.com/org/my-workspace"
authors = ["Your Name <email@example.com>"]

# Shared dependencies - specify version once
[workspace.dependencies]
# Internal crates
my-core = { path = "crates/core" }
my-common = { path = "crates/common" }

# External dependencies
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
thiserror = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
clap = { version = "4", features = ["derive"] }
axum = "0.7"

# Shared lints
[workspace.lints.rust]
unsafe_code = "forbid"
missing_docs = "warn"

[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
```

### Step 3: Create Member Crates

**crates/common/Cargo.toml**
```toml
[package]
name = "my-common"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
description = "Common utilities and types"

[dependencies]
serde.workspace = true
thiserror.workspace = true

[lints]
workspace = true
```

**crates/common/src/lib.rs**
```rust
//! Common utilities shared across the workspace.

mod error;
mod types;

pub use error::{Error, Result};
pub use types::*;
```

**crates/core/Cargo.toml**
```toml
[package]
name = "my-core"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
description = "Core business logic"

[dependencies]
my-common.workspace = true
serde.workspace = true
tracing.workspace = true
tokio = { workspace = true, optional = true }

[features]
default = []
async = ["tokio"]

[lints]
workspace = true
```

**crates/core/src/lib.rs**
```rust
//! Core business logic for the application.

use my_common::{Error, Result};

pub struct Engine {
    // ...
}

impl Engine {
    pub fn new() -> Self {
        Self {}
    }

    pub fn process(&self, input: &str) -> Result<String> {
        Ok(format!("Processed: {}", input))
    }
}
```

**crates/cli/Cargo.toml**
```toml
[package]
name = "my-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
description = "Command-line interface"

[[bin]]
name = "my-cli"
path = "src/main.rs"

[dependencies]
my-core.workspace = true
my-common.workspace = true
clap.workspace = true
anyhow.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true

[lints]
workspace = true
```

**crates/cli/src/main.rs**
```rust
use clap::Parser;
use my_core::Engine;

#[derive(Parser)]
#[command(name = "my-cli")]
#[command(about = "A CLI tool")]
struct Cli {
    /// Input to process
    input: String,

    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Setup logging
    tracing_subscriber::fmt()
        .with_max_level(if cli.verbose {
            tracing::Level::DEBUG
        } else {
            tracing::Level::INFO
        })
        .init();

    let engine = Engine::new();
    let result = engine.process(&cli.input)?;
    println!("{}", result);

    Ok(())
}
```

**crates/server/Cargo.toml**
```toml
[package]
name = "my-server"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
description = "HTTP server"

[[bin]]
name = "my-server"
path = "src/main.rs"

[dependencies]
my-core = { workspace = true, features = ["async"] }
my-common.workspace = true
axum.workspace = true
tokio.workspace = true
serde.workspace = true
serde_json.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true

[lints]
workspace = true
```

### Step 4: Final Structure

```
my-workspace/
├── Cargo.toml                 # Workspace root
├── Cargo.lock                 # Shared lockfile
├── crates/
│   ├── common/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── error.rs
│   │       └── types.rs
│   ├── core/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   ├── cli/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── main.rs
│   └── server/
│       ├── Cargo.toml
│       └── src/
│           └── main.rs
├── tests/                     # Workspace-level integration tests
├── .github/
│   └── workflows/
│       └── ci.yml
└── README.md
```

### Step 5: Workspace Commands

```bash
# Build all crates
cargo build

# Build specific crate
cargo build -p my-cli

# Run specific binary
cargo run -p my-cli -- --help
cargo run -p my-server

# Test all crates
cargo test

# Test specific crate
cargo test -p my-core

# Check all
cargo check --all-targets --all-features

# Clippy all
cargo clippy --all-targets --all-features

# Format all
cargo fmt --all

# Update all dependencies
cargo update

# Publish crates (in order)
cargo publish -p my-common
cargo publish -p my-core
cargo publish -p my-cli
```

### Step 6: CI Configuration

**.github/workflows/ci.yml**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - run: cargo check --all-targets --all-features

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - run: cargo test --all-features

  clippy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy
      - uses: Swatinem/rust-cache@v2
      - run: cargo clippy --all-targets --all-features -- -D warnings

  fmt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt
      - run: cargo fmt --all -- --check
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Workspace | ./ | Complete workspace structure |
| Member crates | crates/ | Individual crate modules |
| CI config | .github/ | GitHub Actions workflow |

---

## Output Template

```markdown
## Workspace Created

### Structure
```
[directory tree]
```

### Crates
| Crate | Type | Description |
|-------|------|-------------|
| my-common | lib | Shared utilities |
| my-core | lib | Core logic |
| my-cli | bin | CLI tool |
| my-server | bin | HTTP server |

### Commands
```bash
cargo build                    # Build all
cargo test                     # Test all
cargo run -p my-cli -- --help  # Run CLI
cargo run -p my-server         # Run server
```
```
