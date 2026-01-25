# Skill: Fuzz Testing

**ID**: `rust-fuzzing`
**Category**: Testing
**Agent**: Rust QA Engineer

---

## When to Use

- Finding security vulnerabilities
- Testing parser robustness
- Discovering edge cases
- Testing untrusted input handling

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| target_function | string | Yes | Function to fuzz |
| input_type | string | No | Type of input data |

---

## Steps

### Step 1: Setup cargo-fuzz

```bash
# Install (requires nightly)
cargo install cargo-fuzz

# Initialize fuzzing in project
cd my-crate
cargo +nightly fuzz init
```

### Step 2: Create Fuzz Target

```rust
// fuzz/fuzz_targets/parse_input.rs
#![no_main]
use libfuzzer_sys::fuzz_target;
use my_crate::parse;

fuzz_target!(|data: &[u8]| {
    // Should not panic on any input
    if let Ok(s) = std::str::from_utf8(data) {
        let _ = parse(s);
    }
});
```

### Step 3: Structured Fuzzing

```rust
// fuzz/fuzz_targets/structured.rs
#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;

#[derive(Debug, Arbitrary)]
struct FuzzInput {
    command: Command,
    data: Vec<u8>,
    count: u32,
}

#[derive(Debug, Arbitrary)]
enum Command {
    Read,
    Write,
    Delete,
}

fuzz_target!(|input: FuzzInput| {
    let _ = process_command(input.command, &input.data, input.count);
});
```

### Step 4: Run Fuzzer

```bash
# Run fuzz target
cargo +nightly fuzz run parse_input

# Run with time limit (seconds)
cargo +nightly fuzz run parse_input -- -max_total_time=300

# Run with corpus
cargo +nightly fuzz run parse_input corpus/parse_input

# Run with specific number of jobs
cargo +nightly fuzz run parse_input -- -jobs=4

# Run until first crash
cargo +nightly fuzz run parse_input -- -runs=0
```

### Step 5: Working with Crashes

```bash
# List crashes
ls fuzz/artifacts/parse_input/

# Reproduce crash
cargo +nightly fuzz run parse_input fuzz/artifacts/parse_input/crash-XXX

# Minimize crash
cargo +nightly fuzz tmin parse_input fuzz/artifacts/parse_input/crash-XXX

# Coverage report
cargo +nightly fuzz coverage parse_input
```

### Step 6: Corpus Management

```bash
# Create corpus directory
mkdir -p fuzz/corpus/parse_input

# Add seed inputs
echo -n '{"valid": "json"}' > fuzz/corpus/parse_input/seed1
echo -n '<xml>test</xml>' > fuzz/corpus/parse_input/seed2

# Merge corpus (remove duplicates)
cargo +nightly fuzz cmin parse_input
```

### Step 7: Advanced Patterns

#### Dictionary-Based Fuzzing

```bash
# Create dictionary file
cat > fuzz/dict.txt << 'EOF'
"{"
"}"
"["
"]"
":"
","
"null"
"true"
"false"
EOF

# Run with dictionary
cargo +nightly fuzz run parse_input -- -dict=fuzz/dict.txt
```

#### Comparison Fuzzing

```rust
// fuzz/fuzz_targets/compare.rs
#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Compare two implementations
    if let Ok(s) = std::str::from_utf8(data) {
        let result_old = old_parser::parse(s);
        let result_new = new_parser::parse(s);

        // Should produce same output
        assert_eq!(
            result_old.is_ok(),
            result_new.is_ok(),
            "Divergence on input: {:?}", s
        );

        if let (Ok(a), Ok(b)) = (result_old, result_new) {
            assert_eq!(a, b, "Different output for: {:?}", s);
        }
    }
});
```

#### Resource Limits

```rust
// fuzz/fuzz_targets/with_limits.rs
#![no_main]
use libfuzzer_sys::fuzz_target;
use std::time::Duration;

fuzz_target!(|data: &[u8]| {
    // Limit input size
    if data.len() > 10_000 {
        return;
    }

    // Could also use timeout
    let _ = std::panic::catch_unwind(|| {
        process(data)
    });
});
```

---

## CI Integration

```yaml
# .github/workflows/fuzz.yml
name: Fuzz

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@nightly
      - run: cargo install cargo-fuzz

      - name: Run fuzzer
        run: |
          cargo +nightly fuzz run parse_input -- \
            -max_total_time=600 \
            -jobs=2

      - name: Upload crashes
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: fuzz-crashes
          path: fuzz/artifacts/
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Crashes | fuzz/artifacts/ | Crashing inputs |
| Corpus | fuzz/corpus/ | Test inputs |
| Coverage | fuzz/coverage/ | Code coverage |

---

## Output Template

```markdown
## Fuzz Testing Report

### Target
`fuzz_targets/parse_input.rs`

### Duration
X hours

### Results
- Executions: X million
- Crashes found: Y
- Corpus size: Z inputs

### Crashes
| File | Type | Minimized |
|------|------|-----------|
| crash-XXX | panic | Yes |

### Coverage
- Functions: X%
- Lines: Y%

### Commands
```bash
cargo +nightly fuzz run parse_input -- -max_total_time=3600
cargo +nightly fuzz tmin parse_input crash-XXX
```
```
