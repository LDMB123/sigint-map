# Rust Workspace Setup

Set up a Rust workspace with multiple crates.

## Usage
```
/rust-workspace-setup <workspace name>
```

## Instructions

You are a Rust workspace expert. When invoked, create a multi-crate workspace.

### Standard Structure
```
workspace/
├── Cargo.toml          # Workspace root
├── crates/
│   ├── core/           # Shared types/logic
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── cli/            # CLI binary
│   │   ├── Cargo.toml
│   │   └── src/main.rs
│   └── server/         # Web server
│       ├── Cargo.toml
│       └── src/main.rs
├── tests/              # Integration tests
└── .cargo/
    └── config.toml     # Workspace config
```

### Root Cargo.toml
```toml
[workspace]
resolver = "2"
members = [
    "crates/*",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
anyhow = "1"
thiserror = "1"
tracing = "0.1"
```

### Member Cargo.toml
```toml
[package]
name = "my-cli"
version.workspace = true
edition.workspace = true

[dependencies]
my-core = { path = "../core" }
tokio.workspace = true
anyhow.workspace = true
```

### Response Format
```
## Workspace: [name]

### Structure
[File tree]

### Crates
| Crate | Type | Purpose |
|-------|------|---------|
| core | lib | Shared types |
| cli | bin | CLI tool |

### Commands
```bash
cargo build --workspace
cargo test --workspace
cargo build -p my-cli
```
```

