# Skill: Cargo Workflow Optimization

**ID**: `cargo-workflow`
**Category**: Ecosystem
**Agent**: Rust Build Engineer

---

## When to Use

- Optimizing build times
- Managing complex workspaces
- Configuring cargo features
- Setting up cross-compilation
- Understanding cargo internals

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_type | string | No | binary, library, or workspace |
| issue | string | No | Specific build issue |

---

## Steps

### Step 1: Essential Cargo Commands

```bash
# Build
cargo build              # Debug build
cargo build --release    # Release build
cargo build -p my-crate  # Build specific crate

# Check (faster than build)
cargo check              # Type check only
cargo check --all-targets

# Test
cargo test               # Run all tests
cargo test --lib         # Library tests only
cargo test --doc         # Doc tests only
cargo test -- --nocapture  # Show output

# Run
cargo run                # Run default binary
cargo run -p my-cli      # Run specific binary
cargo run --release      # Run release build

# Documentation
cargo doc                # Build docs
cargo doc --open         # Build and open
cargo doc --no-deps      # Skip dependencies
```

### Step 2: Feature Flags

```toml
# Cargo.toml
[features]
default = ["std"]
std = []
alloc = []
full = ["feature-a", "feature-b"]
feature-a = []
feature-b = ["dep:optional-dep"]  # Optional dependency

[dependencies]
serde = { version = "1", optional = true }
optional-dep = { version = "1", optional = true }
```

```bash
# Use features
cargo build --features "feature-a,feature-b"
cargo build --all-features
cargo build --no-default-features
cargo build --no-default-features --features "alloc"
```

### Step 3: Workspace Management

```toml
# Root Cargo.toml
[workspace]
resolver = "2"
members = ["crates/*"]
exclude = ["experiments"]

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
```

```bash
# Workspace commands
cargo build --workspace        # Build all
cargo test --workspace         # Test all
cargo build -p specific-crate  # Build one
cargo check --all-targets --workspace
```

### Step 4: Build Optimization

```toml
# .cargo/config.toml

# Use mold linker (Linux, fastest)
[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=mold"]

# Use lld linker (cross-platform)
[target.x86_64-unknown-linux-gnu]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

# Use sccache
[build]
rustc-wrapper = "sccache"

# Parallel codegen (faster builds, maybe slower binary)
[build]
jobs = 8

# Split debug info (faster linking)
[profile.dev]
split-debuginfo = "unpacked"
```

```bash
# Install faster linker
# Linux: sudo apt install mold
# macOS: brew install lld
# Windows: Use rust-lld (default)

# Install sccache
cargo install sccache
export RUSTC_WRAPPER=sccache
```

### Step 5: Profile Configuration

```toml
# Cargo.toml

# Fast debug builds
[profile.dev]
opt-level = 0
debug = true
incremental = true

# Optimize deps in dev mode
[profile.dev.package."*"]
opt-level = 2

# Optimized release builds
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true

# Profile for profiling
[profile.profiling]
inherits = "release"
debug = true
strip = false

# Profile for testing
[profile.test]
opt-level = 2
```

```bash
# Use custom profile
cargo build --profile profiling
```

### Step 6: Cross-Compilation

```bash
# Add targets
rustup target add x86_64-unknown-linux-musl
rustup target add aarch64-unknown-linux-gnu
rustup target add x86_64-pc-windows-gnu
rustup target add wasm32-unknown-unknown

# Build for target
cargo build --target x86_64-unknown-linux-musl

# Install cross (easier cross-compilation)
cargo install cross

# Cross-compile with cross
cross build --target aarch64-unknown-linux-gnu
```

```toml
# .cargo/config.toml
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"
```

### Step 7: Useful Cargo Plugins

```bash
# Install essential plugins
cargo install cargo-watch    # Watch and rebuild
cargo install cargo-edit     # Add/remove deps from CLI
cargo install cargo-outdated # Check outdated deps
cargo install cargo-audit    # Security audit
cargo install cargo-deny     # License/security policy
cargo install cargo-expand   # Expand macros
cargo install cargo-bloat    # Find binary bloat
cargo install cargo-tree     # Dependency tree
cargo install cargo-udeps    # Find unused deps

# Usage
cargo watch -x check         # Watch mode
cargo add serde --features derive
cargo outdated
cargo audit
cargo tree
cargo bloat --release
```

---

## Debugging Build Issues

```bash
# Verbose output
cargo build -v
cargo build -vv  # Even more verbose

# Build timings
cargo build --timings

# Clean and rebuild
cargo clean
cargo build

# Check specific dep
cargo tree -i problematic-dep

# Why is this dep included?
cargo tree --invert --package dep-name
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Config | .cargo/config.toml | Cargo configuration |
| Profiles | Cargo.toml | Build profiles |

---

## Output Template

```markdown
## Cargo Workflow Report

### Configuration Applied
- Linker: mold
- Cache: sccache
- Profiles: dev, release, profiling

### Build Times
| Profile | Before | After |
|---------|--------|-------|
| dev | Xs | Ys |
| release | Xs | Ys |

### Commands
```bash
cargo build --release
cargo test --workspace
```
```
