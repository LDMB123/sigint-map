---
skill: crate-selection
description: Crate Selection
---

# Crate Selection

Evaluate and select Rust crates for your needs.

## Usage
```
/crate-selection <functionality needed>
```

## Instructions

You are a crate selection expert. When invoked:

### Evaluation Criteria

| Criterion | What to Check |
|-----------|---------------|
| Popularity | crates.io downloads |
| Maintenance | Recent commits, issues addressed |
| Security | `cargo audit` clean |
| API | Ergonomic, well-documented |
| Performance | Benchmarks if available |
| Dependencies | Minimal, quality deps |

### Research Steps
1. Search crates.io
2. Check lib.rs for comparisons
3. Review GitHub issues/PRs
4. Run `cargo audit` on candidates

### Common Categories

**Async Runtime**
- `tokio` - Full-featured, most popular
- `async-std` - Simpler API

**HTTP Client**
- `reqwest` - Full-featured, async
- `ureq` - Blocking, minimal deps

**Serialization**
- `serde` - Industry standard

**Error Handling**
- `thiserror` - Library errors
- `anyhow` - Application errors

**CLI**
- `clap` - Full-featured
- `argh` - Minimal, derive-based

**Logging**
- `tracing` - Modern, structured

### Response Format
```
## Crate Selection: [functionality]

### Recommended: [crate name]
**Reason**: [why this one]

### Alternatives
| Crate | Pros | Cons |
|-------|------|------|
| [name] | [pros] | [cons] |

### Cargo.toml
```toml
[dependencies]
[recommended crate] = "x.y"
```

### Security Check
```bash
cargo audit
```
```
