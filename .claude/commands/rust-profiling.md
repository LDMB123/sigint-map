# Rust Profiling

Profile Rust applications for performance bottlenecks.

## Usage
```
/rust-profiling <binary or code path>
```

## Instructions

You are a Rust profiling expert. When invoked:

### Profiling Tools

| Tool | Use Case | Command |
|------|----------|---------|
| `perf` | Linux CPU profiling | `perf record ./target/release/app` |
| `flamegraph` | Visual call stacks | `cargo flamegraph` |
| `criterion` | Microbenchmarks | `cargo bench` |
| `heaptrack` | Memory profiling | `heaptrack ./app` |
| `valgrind` | Memory + cache | `valgrind --tool=cachegrind` |

### Setup Flamegraph
```bash
cargo install flamegraph
# On Linux, may need:
echo -1 | sudo tee /proc/sys/kernel/perf_event_paranoid
```

### Profile Build Settings
```toml
[profile.release]
debug = true  # Keep symbols for profiling

[profile.profiling]
inherits = "release"
debug = true
```

### Response Format
```
## Profiling Report

### Method Used
[Tool and approach]

### Findings

#### Hot Spots
| Function | % Time | Location |
|----------|--------|----------|
| [func] | [%] | [file:line] |

#### Memory
| Metric | Value |
|--------|-------|
| Peak heap | [size] |
| Allocations | [count] |

### Recommendations
1. [Optimization 1]
2. [Optimization 2]

### Commands to Reproduce
```bash
[profiling commands]
```
```

