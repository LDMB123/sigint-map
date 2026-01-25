# Skill: CLI Application Scaffold

**ID**: `rust-cli-scaffold`
**Category**: Scaffolding
**Agent**: Rust Project Architect

---

## When to Use

- Creating a new command-line tool
- Setting up clap argument parsing
- Configuring logging and error handling
- Establishing project structure for CLIs

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Project name |
| description | string | Yes | Brief description |
| subcommands | string[] | No | List of subcommands |

---

## Steps

### Step 1: Create Project

```bash
cargo new my-cli
cd my-cli
```

### Step 2: Add Dependencies

```toml
# Cargo.toml
[package]
name = "my-cli"
version = "0.1.0"
edition = "2021"
description = "A command-line tool for X"
license = "MIT OR Apache-2.0"

[dependencies]
clap = { version = "4", features = ["derive", "env"] }
anyhow = "1"
thiserror = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"], optional = true }

[features]
default = []
async = ["tokio"]

[profile.release]
lto = true
codegen-units = 1
strip = true
```

### Step 3: Project Structure

```
my-cli/
├── Cargo.toml
├── src/
│   ├── main.rs           # Entry point
│   ├── lib.rs            # Core logic (for testing)
│   ├── cli.rs            # CLI definitions
│   ├── config.rs         # Configuration
│   ├── error.rs          # Error types
│   └── commands/
│       ├── mod.rs
│       ├── init.rs
│       └── run.rs
├── tests/
│   └── integration.rs
└── README.md
```

### Step 4: Implement Core Files

**src/error.rs**
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid argument: {0}")]
    InvalidArgument(String),

    #[error("{0}")]
    Other(#[from] anyhow::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
```

**src/cli.rs**
```rust
use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "my-cli")]
#[command(author, version, about, long_about = None)]
pub struct Cli {
    /// Enable verbose output
    #[arg(short, long, global = true)]
    pub verbose: bool,

    /// Configuration file path
    #[arg(short, long, env = "MY_CLI_CONFIG")]
    pub config: Option<std::path::PathBuf>,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Initialize a new project
    Init {
        /// Project name
        #[arg(short, long)]
        name: String,

        /// Project directory
        #[arg(default_value = ".")]
        path: std::path::PathBuf,
    },

    /// Run the application
    Run {
        /// Input file
        input: std::path::PathBuf,

        /// Output format
        #[arg(short, long, default_value = "json")]
        format: String,
    },
}
```

**src/config.rs**
```rust
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub verbose: bool,

    #[serde(default)]
    pub output_dir: Option<String>,
}

impl Config {
    pub fn load(path: &Path) -> crate::Result<Self> {
        let contents = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&contents)
            .map_err(|e| crate::Error::Config(e.to_string()))?;
        Ok(config)
    }

    pub fn load_or_default(path: Option<&Path>) -> Self {
        path.and_then(|p| Self::load(p).ok())
            .unwrap_or_default()
    }
}
```

**src/commands/mod.rs**
```rust
mod init;
mod run;

pub use init::init;
pub use run::run;
```

**src/commands/init.rs**
```rust
use std::path::Path;
use tracing::info;

pub fn init(name: &str, path: &Path) -> crate::Result<()> {
    info!("Initializing project '{}' at {:?}", name, path);

    // Create directory structure
    std::fs::create_dir_all(path)?;

    // Create config file
    let config_path = path.join("config.json");
    let config = crate::Config::default();
    let json = serde_json::to_string_pretty(&config)?;
    std::fs::write(&config_path, json)?;

    info!("Project initialized successfully");
    Ok(())
}
```

**src/commands/run.rs**
```rust
use std::path::Path;
use tracing::{info, debug};

pub fn run(input: &Path, format: &str) -> crate::Result<()> {
    info!("Running with input {:?}, format {}", input, format);

    let contents = std::fs::read_to_string(input)?;
    debug!("Read {} bytes", contents.len());

    // Process contents...

    Ok(())
}
```

**src/lib.rs**
```rust
mod cli;
mod config;
mod error;
mod commands;

pub use cli::{Cli, Commands};
pub use config::Config;
pub use error::{Error, Result};
pub use commands::*;
```

**src/main.rs**
```rust
use clap::Parser;
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

use my_cli::{Cli, Commands, Config};

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Setup logging
    let level = if cli.verbose { Level::DEBUG } else { Level::INFO };
    let subscriber = FmtSubscriber::builder()
        .with_max_level(level)
        .with_target(false)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    // Load config
    let config = Config::load_or_default(cli.config.as_deref());

    // Run command
    match cli.command {
        Commands::Init { name, path } => {
            my_cli::init(&name, &path)?;
        }
        Commands::Run { input, format } => {
            my_cli::run(&input, &format)?;
        }
    }

    Ok(())
}
```

### Step 5: Add Tests

**tests/integration.rs**
```rust
use assert_cmd::Command;
use predicates::prelude::*;

#[test]
fn test_help() {
    let mut cmd = Command::cargo_bin("my-cli").unwrap();
    cmd.arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("Usage:"));
}

#[test]
fn test_version() {
    let mut cmd = Command::cargo_bin("my-cli").unwrap();
    cmd.arg("--version")
        .assert()
        .success();
}
```

### Step 6: Build and Test

```bash
cargo build
cargo test
cargo run -- --help
cargo run -- init --name myproject ./output
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Project files | ./ | Complete CLI structure |
| Cargo.toml | ./Cargo.toml | Dependencies configured |

---

## Output Template

```markdown
## CLI Scaffold Created

### Project: [name]

### Structure
```
[directory tree]
```

### Commands
- `my-cli init --name NAME [PATH]`
- `my-cli run INPUT [--format FORMAT]`

### Next Steps
1. Implement command logic in `src/commands/`
2. Add more subcommands as needed
3. Write integration tests
4. Update README.md

### Build & Run
```bash
cargo build --release
./target/release/my-cli --help
```
```
