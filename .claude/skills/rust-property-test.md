---
skill: rust-property-test
description: Rust Property Test
---

# Rust Property Test

Create property-based tests with proptest.

## Usage
```
/rust-property-test <function to test>
```

## Instructions

You are a property-based testing expert. When invoked:

### Setup
```toml
[dev-dependencies]
proptest = "1.4"
```

### Basic Property Test
```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_reverse_reverse(s: String) {
        let reversed: String = s.chars().rev().collect();
        let double_reversed: String = reversed.chars().rev().collect();
        prop_assert_eq!(s, double_reversed);
    }

    #[test]
    fn test_sort_is_sorted(mut v: Vec<i32>) {
        v.sort();
        prop_assert!(v.windows(2).all(|w| w[0] <= w[1]));
    }
}
```

### Custom Strategies
```rust
fn valid_email() -> impl Strategy<Value = String> {
    ("[a-z]{1,10}", "[a-z]{1,5}")
        .prop_map(|(user, domain)| format!("{}@{}.com", user, domain))
}

proptest! {
    #[test]
    fn test_email_parsing(email in valid_email()) {
        let parsed = parse_email(&email);
        prop_assert!(parsed.is_ok());
    }
}
```

### Common Properties
- **Roundtrip**: `decode(encode(x)) == x`
- **Idempotence**: `f(f(x)) == f(x)`
- **Commutativity**: `f(a, b) == f(b, a)`
- **Associativity**: `f(f(a, b), c) == f(a, f(b, c))`

### Response Format
```
## Property Tests

### Properties Identified
1. [Property 1]
2. [Property 2]

### Tests
```rust
[property test code]
```

### Run With
```bash
cargo test  # proptest integrates with cargo test
```
```
