# Skill: Performance Profiling

**ID**: `rust-profiling`
**Category**: Performance
**Agent**: Rust Performance Engineer

---

## When to Use

- Identifying performance bottlenecks
- Finding hot paths in code
- Analyzing CPU usage
- Generating flamegraphs

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| binary | string | Yes | Path to binary or cargo target |
| args | string | No | Arguments for the binary |

---

## Steps

### Step 1: Build with Debug Symbols

```bash
# Release build with debug info
cargo build --release

# Or configure in Cargo.toml
[profile.release]
debug = true  # Include debug symbols
```

### Step 2: Choose Profiling Tool

#### Flamegraph (Recommended)

```bash
# Install
cargo install flamegraph

# Profile
cargo flamegraph --bin my-app -- [args]

# Output: flamegraph.svg
```

#### perf (Linux)

```bash
# Record
perf record -g target/release/my-app [args]

# Report
perf report

# Annotate function
perf annotate function_name

# Generate flamegraph from perf data
perf script | stackcollapse-perf.pl | flamegraph.pl > perf.svg
```

#### Instruments (macOS)

```bash
# Install cargo-instruments
cargo install cargo-instruments

# CPU Time profiling
cargo instruments --release -t time

# Allocations profiling
cargo instruments --release -t Allocations
```

#### samply (Cross-platform)

```bash
# Install
cargo install samply

# Profile
samply record target/release/my-app [args]

# Opens in Firefox Profiler
```

### Step 3: Analyze Results

**Flamegraph Reading:**
- Width = time spent (wider = more time)
- Top = leaf functions (actual work)
- Bottom = entry points
- Look for wide "plateaus" = optimization targets

**Key Metrics:**
- Hot functions: >5% of total time
- Unexpected allocations
- System call overhead
- Lock contention

### Step 4: Common Bottlenecks

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Wide `malloc` | Excessive allocations | Pre-allocate, reuse buffers |
| Wide `clone` | Unnecessary copying | Use references, Cow |
| Wide `drop` | Complex destructors | Simplify types |
| Wide `hash` | HashMap overhead | Use FxHashMap, cache hashes |
| Wide syscalls | I/O bound | Buffer, async I/O |

---

## Advanced Profiling

### CPU Cache Analysis

```bash
# Cache misses
perf stat -e cache-references,cache-misses ./target/release/my-app

# Branch mispredictions
perf stat -e branches,branch-misses ./target/release/my-app
```

### DHAT (Heap Profiling with Miri)

```bash
# Use DHAT via Miri (nightly)
cargo +nightly miri run --features dhat-heap
```

### Tracing Integration

```rust
use tracing::{instrument, info_span};

#[instrument]
fn expensive_operation(data: &[u8]) -> Result<Output> {
    let _span = info_span!("processing").entered();
    // ... work ...
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| flamegraph.svg | ./ | Visual profile |
| perf.data | ./ | Raw perf data |

---

## Output Template

```markdown
## Profiling Report

### Tool Used
[flamegraph / perf / instruments]

### Hot Functions
| Function | Time % | Notes |
|----------|--------|-------|
| ... | ... | ... |

### Bottlenecks Identified
1. [Bottleneck]: [Description]

### Recommendations
1. [Optimization suggestion]

### Commands
```bash
cargo flamegraph --bin my-app
```
```
