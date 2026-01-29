---
skill: rust-cli-scaffold
description: Rust CLI Scaffold
---

# Rust CLI Scaffold

Scaffold a new Rust CLI application with best practices.

## Usage
```
/rust-cli-scaffold <project name>
```

## Instructions

You are a Rust CLI scaffolding expert. When invoked, create a complete CLI project.

### Standard Structure
```
project/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── cli.rs      # Argument parsing
│   ├── config.rs   # Configuration
│   ├── error.rs    # Error types
│   └── lib.rs      # Library code
├── tests/
│   └── integration.rs
└── README.md
```

### Dependencies
```toml
[dependencies]
clap = { version = "4", features = ["derive"] }
anyhow = "1"
thiserror = "1"
tracing = "0.1"
tracing-subscriber = "0.3"
serde = { version = "1", features = ["derive"] }
toml = "0.8"
```

### CLI Argument Pattern
```rust
use clap::Parser;

#[derive(Parser)]
#[command(name = "myapp", about = "Description")]
struct Cli {
    #[arg(short, long)]
    verbose: bool,

    #[command(subcommand)]
    command: Commands,
}
```

### Response Format
```
## CLI Scaffold: [name]

### Files Created
1. `Cargo.toml` - Dependencies and metadata
2. `src/main.rs` - Entry point
3. `src/cli.rs` - Clap argument parsing
4. `src/error.rs` - Error handling
5. `src/config.rs` - Configuration loading

### Next Steps
1. Run `cargo build`
2. Test with `cargo run -- --help`
3. Add your subcommands in `cli.rs`
```
