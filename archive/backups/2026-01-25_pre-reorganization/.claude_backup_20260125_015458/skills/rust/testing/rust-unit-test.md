# Skill: Unit Testing Setup

**ID**: `rust-unit-test`
**Category**: Testing
**Agent**: Rust QA Engineer

---

## When to Use

- Writing unit tests for Rust code
- Setting up test infrastructure
- Mocking dependencies
- Testing private functions

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| module | string | Yes | Module or function to test |
| coverage_target | number | No | Target coverage percentage |

---

## Steps

### Step 1: Basic Test Structure

```rust
// src/lib.rs or src/module.rs

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_positive() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-2, -3), -5);
    }

    #[test]
    fn test_add_zero() {
        assert_eq!(add(0, 0), 0);
    }
}
```

### Step 2: Test Assertions

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_assertions() {
        // Equality
        assert_eq!(actual, expected);
        assert_ne!(a, b);

        // Boolean
        assert!(condition);
        assert!(!condition);

        // With custom message
        assert_eq!(result, 42, "Expected 42, got {}", result);

        // Approximate equality for floats
        assert!((actual - expected).abs() < 0.001);

        // Or use approx crate
        // assert_relative_eq!(actual, expected, epsilon = 0.001);
    }

    #[test]
    #[should_panic]
    fn test_panic() {
        panic!("This should panic");
    }

    #[test]
    #[should_panic(expected = "specific message")]
    fn test_panic_message() {
        panic!("specific message");
    }

    #[test]
    fn test_result() -> Result<(), String> {
        let result = operation()?;
        assert_eq!(result, expected);
        Ok(())
    }
}
```

### Step 3: Testing Private Functions

```rust
// Private function
fn internal_helper(x: i32) -> i32 {
    x * 2
}

#[cfg(test)]
mod tests {
    use super::*;  // Can access private items in same module

    #[test]
    fn test_internal_helper() {
        assert_eq!(internal_helper(5), 10);
    }
}
```

### Step 4: Test Organization

```rust
// Separate test modules for organization
#[cfg(test)]
mod tests {
    use super::*;

    mod parsing {
        use super::*;

        #[test]
        fn test_parse_valid() { }

        #[test]
        fn test_parse_invalid() { }
    }

    mod validation {
        use super::*;

        #[test]
        fn test_validate_input() { }
    }
}
```

### Step 5: Test Fixtures

```rust
#[cfg(test)]
mod tests {
    use super::*;

    struct TestFixture {
        db: MockDatabase,
        service: MyService,
    }

    impl TestFixture {
        fn new() -> Self {
            let db = MockDatabase::new();
            let service = MyService::new(db.clone());
            Self { db, service }
        }

        fn with_data(mut self, data: Vec<Item>) -> Self {
            for item in data {
                self.db.insert(item);
            }
            self
        }
    }

    #[test]
    fn test_with_fixture() {
        let fixture = TestFixture::new()
            .with_data(vec![Item::new("test")]);

        let result = fixture.service.query("test");
        assert!(result.is_some());
    }
}
```

### Step 6: Mocking with mockall

```toml
# Cargo.toml
[dev-dependencies]
mockall = "0.12"
```

```rust
use mockall::automock;

#[automock]
trait Database {
    fn get(&self, key: &str) -> Option<String>;
    fn set(&mut self, key: &str, value: &str);
}

struct Service<D: Database> {
    db: D,
}

impl<D: Database> Service<D> {
    fn process(&self, key: &str) -> String {
        self.db.get(key).unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;

    #[test]
    fn test_service_with_mock() {
        let mut mock = MockDatabase::new();

        mock.expect_get()
            .with(eq("test-key"))
            .times(1)
            .returning(|_| Some("test-value".to_string()));

        let service = Service { db: mock };
        let result = service.process("test-key");

        assert_eq!(result, "test-value");
    }
}
```

### Step 7: Running Tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run tests in specific module
cargo test module_name::

# Run tests with output
cargo test -- --nocapture

# Run ignored tests
cargo test -- --ignored

# Run single-threaded
cargo test -- --test-threads=1

# Show all test names
cargo test -- --list
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Test code | src/*.rs | Unit tests |
| Test results | stdout | Pass/fail output |

---

## Output Template

```markdown
## Unit Test Report

### Module Tested
`path::to::module`

### Tests Added
| Test | Description |
|------|-------------|
| test_x | Tests X behavior |
| test_y | Tests Y edge case |

### Coverage
- Functions: X%
- Lines: Y%

### Commands
```bash
cargo test
cargo test -- --nocapture
```
```
