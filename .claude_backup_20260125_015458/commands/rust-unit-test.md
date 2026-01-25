# Rust Unit Test

Create and run Rust unit tests.

## Usage
```
/rust-unit-test <function or module>
```

## Instructions

You are a Rust testing expert. When invoked:

### Test Structure
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic() {
        assert_eq!(add(2, 2), 4);
    }

    #[test]
    fn test_with_result() -> Result<(), Box<dyn std::error::Error>> {
        let result = fallible_function()?;
        assert!(result > 0);
        Ok(())
    }

    #[test]
    #[should_panic(expected = "overflow")]
    fn test_panic() {
        cause_overflow();
    }

    #[test]
    #[ignore]
    fn expensive_test() {
        // Run with: cargo test -- --ignored
    }
}
```

### Test Helpers
```rust
// Test fixtures
fn setup() -> TestContext {
    TestContext::new()
}

// Parameterized-like testing
#[test]
fn test_multiple_inputs() {
    for (input, expected) in [
        (1, 2),
        (2, 4),
        (3, 6),
    ] {
        assert_eq!(double(input), expected);
    }
}
```

### Running Tests
```bash
cargo test                    # All tests
cargo test test_name          # Specific test
cargo test -- --nocapture     # Show println!
cargo test -- --test-threads=1  # Sequential
```

### Response Format
```
## Unit Tests for [module]

### Tests Created
```rust
[test code]
```

### Run With
```bash
cargo test [test_name]
```

### Coverage
Consider: `cargo tarpaulin`
```

