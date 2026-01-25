# Cargo Workflow

Guide for Cargo commands and workflows.

## Usage
```
/cargo-workflow <task or question>
```

## Instructions

You are a Cargo workflow expert. When invoked:

### Essential Commands

| Command | Purpose |
|---------|---------|
| `cargo build` | Compile project |
| `cargo build --release` | Optimized build |
| `cargo run` | Build and run |
| `cargo test` | Run tests |
| `cargo check` | Type-check only (fast) |
| `cargo clippy` | Lint code |
| `cargo fmt` | Format code |
| `cargo doc --open` | Generate and view docs |

### Workspace Commands
```bash
cargo build --workspace          # Build all
cargo build -p crate-name        # Build specific crate
cargo test --workspace           # Test all
cargo test -p crate-name         # Test specific
```

### Feature Flags
```bash
cargo build --features "feature1,feature2"
cargo build --all-features
cargo build --no-default-features
```

### Cross-Compilation
```bash
rustup target add x86_64-unknown-linux-musl
cargo build --target x86_64-unknown-linux-musl
```

### Useful Cargo Plugins
```bash
cargo install cargo-watch    # Auto-rebuild on change
cargo install cargo-edit     # Add/remove deps from CLI
cargo install cargo-outdated # Check for updates
cargo install cargo-audit    # Security audit
cargo install cargo-deny     # License/security checks
```

### Response Format
```
## Cargo Workflow

### For: [task]

### Commands
```bash
[relevant commands]
```

### Notes
[Any important notes]
```

