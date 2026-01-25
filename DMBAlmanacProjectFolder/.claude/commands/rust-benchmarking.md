# Rust Benchmarking

Set up and run benchmarks with Criterion.

## Usage
```
/rust-benchmarking <function or module to benchmark>
```

## Instructions

You are a Rust benchmarking expert. When invoked:

### Criterion Setup

```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

### Benchmark Structure
```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_function(c: &mut Criterion) {
    c.bench_function("function_name", |b| {
        b.iter(|| {
            // Code to benchmark
            black_box(my_function(black_box(input)))
        })
    });
}

fn bench_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("comparison");

    group.bench_function("approach_a", |b| {
        b.iter(|| approach_a(black_box(&data)))
    });

    group.bench_function("approach_b", |b| {
        b.iter(|| approach_b(black_box(&data)))
    });

    group.finish();
}

criterion_group!(benches, bench_function, bench_comparison);
criterion_main!(benches);
```

### Running
```bash
cargo bench
cargo bench -- function_name  # Specific benchmark
cargo bench -- --save-baseline main
cargo bench -- --baseline main
```

### Response Format
```
## Benchmark Setup

### Files Created
- `benches/[name].rs`

### Run With
```bash
cargo bench
```

### Interpreting Results
- **time**: [lower, estimate, upper]
- **throughput**: ops/sec
- **change**: % vs baseline
```

