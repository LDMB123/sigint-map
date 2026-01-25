# Skill: Property-Based Testing

**ID**: `rust-property-test`
**Category**: Testing
**Agent**: Rust QA Engineer

---

## When to Use

- Testing invariants that should hold for all inputs
- Finding edge cases automatically
- Testing serialization roundtrips
- Verifying algebraic properties

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| function | string | Yes | Function to test |
| property | string | Yes | Property to verify |

---

## Steps

### Step 1: Setup proptest

```toml
# Cargo.toml
[dev-dependencies]
proptest = "1"
```

### Step 2: Basic Property Tests

```rust
use proptest::prelude::*;

fn reverse<T: Clone>(vec: &[T]) -> Vec<T> {
    vec.iter().rev().cloned().collect()
}

proptest! {
    #[test]
    fn test_reverse_twice_is_identity(vec: Vec<i32>) {
        let reversed = reverse(&vec);
        let reversed_twice = reverse(&reversed);
        prop_assert_eq!(vec, reversed_twice);
    }

    #[test]
    fn test_reverse_preserves_length(vec: Vec<i32>) {
        let reversed = reverse(&vec);
        prop_assert_eq!(vec.len(), reversed.len());
    }
}
```

### Step 3: Custom Strategies

```rust
use proptest::prelude::*;

// Custom strategy for valid usernames
fn username_strategy() -> impl Strategy<Value = String> {
    "[a-z][a-z0-9_]{2,15}".prop_map(|s| s)
}

// Custom strategy for email addresses
fn email_strategy() -> impl Strategy<Value = String> {
    ("[a-z]{1,10}", "[a-z]{2,5}")
        .prop_map(|(user, domain)| format!("{}@{}.com", user, domain))
}

// Complex struct strategy
#[derive(Debug, Clone)]
struct User {
    name: String,
    age: u8,
    email: String,
}

fn user_strategy() -> impl Strategy<Value = User> {
    (
        "[A-Za-z]{1,20}",
        0u8..120,
        email_strategy(),
    ).prop_map(|(name, age, email)| User { name, age, email })
}

proptest! {
    #[test]
    fn test_user_serialization(user in user_strategy()) {
        let json = serde_json::to_string(&user).unwrap();
        let parsed: User = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(user.name, parsed.name);
        prop_assert_eq!(user.age, parsed.age);
    }
}
```

### Step 4: Testing Roundtrips

```rust
use proptest::prelude::*;

proptest! {
    // Serialization roundtrip
    #[test]
    fn test_json_roundtrip(value: MyStruct) {
        let json = serde_json::to_string(&value)?;
        let parsed: MyStruct = serde_json::from_str(&json)?;
        prop_assert_eq!(value, parsed);
    }

    // Parse-format roundtrip
    #[test]
    fn test_parse_roundtrip(n: i64) {
        let s = n.to_string();
        let parsed: i64 = s.parse()?;
        prop_assert_eq!(n, parsed);
    }

    // Encode-decode roundtrip
    #[test]
    fn test_base64_roundtrip(data: Vec<u8>) {
        use base64::{encode, decode};
        let encoded = encode(&data);
        let decoded = decode(&encoded)?;
        prop_assert_eq!(data, decoded);
    }
}
```

### Step 5: Testing Invariants

```rust
use proptest::prelude::*;

struct SortedVec {
    inner: Vec<i32>,
}

impl SortedVec {
    fn new(mut data: Vec<i32>) -> Self {
        data.sort();
        Self { inner: data }
    }

    fn insert(&mut self, value: i32) {
        let pos = self.inner.binary_search(&value).unwrap_or_else(|p| p);
        self.inner.insert(pos, value);
    }
}

proptest! {
    #[test]
    fn test_sorted_vec_invariant(data: Vec<i32>, new_values: Vec<i32>) {
        let mut sorted = SortedVec::new(data);

        for value in new_values {
            sorted.insert(value);
            // Invariant: always sorted
            prop_assert!(sorted.inner.windows(2).all(|w| w[0] <= w[1]));
        }
    }
}
```

### Step 6: Shrinking

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_with_shrinking(vec: Vec<i32>) {
        // If this fails, proptest will find minimal failing case
        // e.g., [0] instead of [1, 2, 3, 0, 4, 5]
        prop_assert!(vec.iter().all(|&x| x > 0));
    }
}

// Custom shrinking for complex types
impl Arbitrary for MyComplexType {
    type Parameters = ();
    type Strategy = BoxedStrategy<Self>;

    fn arbitrary_with(_: Self::Parameters) -> Self::Strategy {
        (any::<i32>(), any::<String>())
            .prop_map(|(id, name)| MyComplexType { id, name })
            .boxed()
    }
}
```

### Step 7: Configuration

```rust
use proptest::prelude::*;

// Configure test cases
proptest! {
    #![proptest_config(ProptestConfig {
        cases: 1000,  // Run 1000 test cases
        max_shrink_iters: 10000,
        ..ProptestConfig::default()
    })]

    #[test]
    fn thorough_test(data: Vec<u8>) {
        // ...
    }
}

// Or per-test configuration
#[test]
fn configurable_test() {
    let config = ProptestConfig {
        cases: 500,
        ..Default::default()
    };

    proptest!(config, |(data: Vec<i32>)| {
        // test
    });
}
```

---

## Common Properties to Test

| Property | Description | Example |
|----------|-------------|---------|
| Identity | f(f(x)) = x | reverse, encode/decode |
| Idempotent | f(f(x)) = f(x) | sort, dedupe |
| Commutative | f(a, b) = f(b, a) | add, max |
| Associative | f(f(a, b), c) = f(a, f(b, c)) | add, concat |
| Distributive | f(a, g(b, c)) = g(f(a, b), f(a, c)) | multiply over add |

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Property tests | src/*.rs | Test code |
| Failing cases | stderr | Minimal counterexample |

---

## Output Template

```markdown
## Property Test Report

### Function Tested
`fn name(args) -> Result`

### Properties Verified
1. Roundtrip: encode/decode returns original
2. Invariant: output always sorted
3. Identity: f(f(x)) = x

### Test Cases
- Generated: 1000
- Passed: 1000
- Failed: 0

### Commands
```bash
cargo test -- --nocapture
```
```
