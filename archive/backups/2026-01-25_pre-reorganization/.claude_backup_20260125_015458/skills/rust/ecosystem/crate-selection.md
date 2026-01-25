# Skill: Crate Selection Guide

**ID**: `crate-selection`
**Category**: Ecosystem
**Agent**: Rust Build Engineer

---

## When to Use

- Choosing between similar crates
- Evaluating crate quality
- Finding crates for specific tasks
- Assessing security and maintenance

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Yes | What functionality needed |
| constraints | string | No | Size, features, license requirements |

---

## Steps

### Step 1: Discovery

```bash
# Search crates.io
cargo search "http client"

# Or use web
# https://crates.io/search?q=http+client
# https://lib.rs/search?q=http+client
```

### Step 2: Evaluation Criteria

| Criteria | How to Check |
|----------|--------------|
| Downloads | crates.io page |
| Recent updates | Last release date |
| Documentation | docs.rs quality |
| Maintenance | GitHub issues/PRs |
| Dependencies | `cargo tree` |
| License | Cargo.toml |
| Security | `cargo audit` |

### Step 3: Recommended Crates by Category

#### HTTP Client
| Crate | Use Case | Features |
|-------|----------|----------|
| `reqwest` | General purpose | Async, easy API |
| `hyper` | Low-level, perf | HTTP/1+2, client+server |
| `ureq` | Sync, minimal | Blocking, small |

#### Web Framework
| Crate | Use Case | Features |
|-------|----------|----------|
| `axum` | Modern async | Tower ecosystem, ergonomic |
| `actix-web` | Performance | Actor model, fast |
| `warp` | Composable | Filters, type-safe |
| `rocket` | Rapid dev | Macros, simple |

#### Serialization
| Crate | Use Case | Features |
|-------|----------|----------|
| `serde` | All formats | Derive, ecosystem |
| `serde_json` | JSON | Fast, standard |
| `simd-json` | JSON perf | SIMD acceleration |
| `rmp-serde` | MessagePack | Binary, compact |
| `bincode` | Binary | Fast, compact |

#### Database
| Crate | Use Case | Features |
|-------|----------|----------|
| `sqlx` | Async SQL | Compile-time checked |
| `diesel` | Type-safe ORM | Migrations, query builder |
| `sea-orm` | Async ORM | Active record style |
| `rusqlite` | SQLite | Embedded, sync |
| `mongodb` | MongoDB | Official driver |
| `redis` | Redis | Full-featured |

#### CLI
| Crate | Use Case | Features |
|-------|----------|----------|
| `clap` | Full-featured | Derive, completions |
| `argh` | Simple | Derive, small |
| `pico-args` | Minimal | Zero deps, tiny |

#### Error Handling
| Crate | Use Case | Features |
|-------|----------|----------|
| `thiserror` | Library errors | Derive, std Error |
| `anyhow` | App errors | Context, backtraces |
| `eyre` | Fancy reporting | Customizable |
| `miette` | Diagnostics | Fancy output |

#### Async Runtime
| Crate | Use Case | Features |
|-------|----------|----------|
| `tokio` | Full-featured | Most ecosystem support |
| `async-std` | std-like API | Simpler learning |
| `smol` | Minimal | Composable |

#### Logging
| Crate | Use Case | Features |
|-------|----------|----------|
| `tracing` | Structured | Spans, async-aware |
| `log` | Simple | Facade, widely supported |
| `env_logger` | Dev logging | Simple setup |

#### Testing
| Crate | Use Case | Features |
|-------|----------|----------|
| `proptest` | Property-based | Shrinking, strategies |
| `criterion` | Benchmarking | Statistics, reports |
| `mockall` | Mocking | Automock derive |
| `rstest` | Fixtures | Parameterized tests |

#### Crypto
| Crate | Use Case | Features |
|-------|----------|----------|
| `ring` | Performance | BoringSSL-based |
| `rustcrypto/*` | Pure Rust | No C deps |
| `argon2` | Password hashing | Secure, configurable |
| `bcrypt` | Password hashing | Classic algorithm |

#### Date/Time
| Crate | Use Case | Features |
|-------|----------|----------|
| `chrono` | Full-featured | Timezones, parsing |
| `time` | Modern | No deprecated |
| `jiff` | New standard | Duration, timezone |

---

### Step 4: Security Audit

```bash
# Install audit tool
cargo install cargo-audit

# Check for vulnerabilities
cargo audit

# With JSON output
cargo audit --json

# Update advisory database
cargo audit fetch
```

### Step 5: License Compliance

```bash
# Install cargo-deny
cargo install cargo-deny

# Initialize config
cargo deny init

# Check licenses
cargo deny check licenses
```

```toml
# deny.toml
[licenses]
allow = [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "Zlib",
]
```

### Step 6: Dependency Analysis

```bash
# Dependency tree
cargo tree

# Find why dep is included
cargo tree -i dep-name

# Find duplicates
cargo tree --duplicates

# Unused dependencies
cargo install cargo-udeps
cargo +nightly udeps
```

---

## Red Flags

| Warning Sign | What to Do |
|--------------|------------|
| No updates in 2+ years | Check for maintained fork |
| Many open security issues | Avoid or evaluate risk |
| Yanked versions | Check why, update |
| Heavy dependencies | Consider alternatives |
| No documentation | Evaluate source directly |
| License incompatible | Find alternative |

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Recommendations | stdout | Crate suggestions |
| Security report | stdout | Audit results |

---

## Output Template

```markdown
## Crate Selection Report

### Need
[What functionality is required]

### Recommended
| Crate | Version | Reason |
|-------|---------|--------|
| name | X.Y | Best for use case |

### Alternatives Considered
| Crate | Why Not |
|-------|---------|
| alt1 | Too heavy |

### Security Check
- Vulnerabilities: None found

### License
- Compatible: Yes (MIT)

### Cargo.toml
```toml
[dependencies]
recommended-crate = "X.Y"
```
```
