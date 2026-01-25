# Skill: Benchmarking Setup

**ID**: `rust-benchmarking`
**Category**: Performance
**Agent**: Rust Performance Engineer

---

## When to Use

- Measuring code performance accurately
- Detecting performance regressions
- Comparing implementations
- Setting performance baselines

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| function | string | Yes | Function or code to benchmark |
| baseline | string | No | Comparison baseline |

---

## Steps

### Step 1: Setup Criterion

```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

### Step 2: Create Benchmark

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    // Simple benchmark
    c.bench_function("fib 20", |b| {
        b.iter(|| fibonacci(black_box(20)))
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```

### Step 3: Parameterized Benchmarks

```rust
use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};

fn bench_sizes(c: &mut Criterion) {
    let mut group = c.benchmark_group("vector_push");

    for size in [100, 1000, 10000].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            size,
            |b, &size| {
                b.iter(|| {
                    let mut v = Vec::new();
                    for i in 0..size {
                        v.push(i);
                    }
                    v
                });
            },
        );
    }

    group.finish();
}

criterion_group!(benches, bench_sizes);
criterion_main!(benches);
```

### Step 4: Comparing Implementations

```rust
fn bench_compare(c: &mut Criterion) {
    let mut group = c.benchmark_group("string_concat");

    let data: Vec<String> = (0..1000).map(|i| i.to_string()).collect();

    group.bench_function("push_str", |b| {
        b.iter(|| {
            let mut result = String::new();
            for s in &data {
                result.push_str(s);
            }
            result
        })
    });

    group.bench_function("join", |b| {
        b.iter(|| data.join(""))
    });

    group.bench_function("collect", |b| {
        b.iter(|| data.iter().map(|s| s.as_str()).collect::<String>())
    });

    group.finish();
}
```

### Step 5: Run Benchmarks

```bash
# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench -- string_concat

# Save baseline
cargo bench -- --save-baseline main

# Compare to baseline
cargo bench -- --baseline main

# Generate only (no run)
cargo bench -- --no-run
```

### Step 6: Analyze Results

**Output Location:** `target/criterion/`

**HTML Report:** `target/criterion/report/index.html`

**Key Metrics:**
- **Mean**: Average time per iteration
- **Std Dev**: Variation in measurements
- **Median**: Middle value (more robust to outliers)
- **Throughput**: Operations per second

---

## Best Practices

### Use black_box

```rust
// Prevents compiler from optimizing away the result
use criterion::black_box;

b.iter(|| {
    let result = expensive_computation();
    black_box(result)  // Prevents dead code elimination
});
```

### Control Inputs

```rust
// Setup outside the benchmark loop
let input = generate_input();

b.iter(|| {
    process(black_box(&input))
});
```

### Benchmark Real Workloads

```rust
// Use realistic data sizes and patterns
let data = load_real_dataset();

c.bench_function("process_real_data", |b| {
    b.iter(|| process(&data))
});
```

### Custom Measurement

```rust
use criterion::measurement::WallTime;

let mut group = c.benchmark_group("custom");
group.measurement_time(Duration::from_secs(10));
group.sample_size(100);
group.warm_up_time(Duration::from_secs(3));
```

---

## CI Integration

```yaml
# .github/workflows/bench.yml
name: Benchmarks

on:
  push:
    branches: [main]
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2

      - name: Run benchmarks
        run: cargo bench -- --noplot

      - name: Store benchmark result
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'cargo'
          output-file-path: target/criterion/**/new/estimates.json
          github-token: ${{ secrets.GITHUB_TOKEN }}
          auto-push: true
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| HTML report | target/criterion/report/ | Visual results |
| JSON data | target/criterion/**/estimates.json | Raw data |

---

## Output Template

```markdown
## Benchmark Report

### Results
| Benchmark | Time | Throughput |
|-----------|------|------------|
| ... | ... | ... |

### Comparison to Baseline
| Benchmark | Change | Significant |
|-----------|--------|-------------|
| ... | +/-X% | Yes/No |

### Recommendations
1. [Performance insight]

### Commands
```bash
cargo bench
cargo bench -- --save-baseline before
# make changes
cargo bench -- --baseline before
```
```
