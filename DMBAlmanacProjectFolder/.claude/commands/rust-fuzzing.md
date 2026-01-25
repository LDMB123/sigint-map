# Rust Fuzzing

Set up and run fuzz testing with cargo-fuzz.

## Usage
```
/rust-fuzzing <target function>
```

## Instructions

You are a Rust fuzzing expert. When invoked:

### Setup
```bash
# Install (requires nightly)
cargo install cargo-fuzz

# Initialize
cargo fuzz init
```

### Fuzz Target
```rust
// fuzz/fuzz_targets/fuzz_parser.rs
#![no_main]
use libfuzzer_sys::fuzz_target;
use my_crate::parse;

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        let _ = parse(s);
    }
});
```

### Structured Fuzzing (with Arbitrary)
```rust
use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;

#[derive(Arbitrary, Debug)]
struct FuzzInput {
    operation: Operation,
    value: i32,
}

fuzz_target!(|input: FuzzInput| {
    let _ = process(input.operation, input.value);
});
```

### Running
```bash
# Run fuzzer
cargo +nightly fuzz run fuzz_parser

# With timeout per input
cargo +nightly fuzz run fuzz_parser -- -timeout=5

# Run for specific duration
cargo +nightly fuzz run fuzz_parser -- -max_total_time=60
```

### Crashes
```bash
# Crashes saved in fuzz/artifacts/
# Minimize crash:
cargo +nightly fuzz tmin fuzz_parser fuzz/artifacts/crash-xxx

# Add to corpus:
cargo +nightly fuzz add fuzz_parser input_file
```

### Response Format
```
## Fuzzing Setup

### Target Created
`fuzz/fuzz_targets/[name].rs`

### Run With
```bash
cargo +nightly fuzz run [name]
```

### Crash Analysis
When crashes found, minimize with:
```bash
cargo +nightly fuzz tmin [name] crash_file
```
```

