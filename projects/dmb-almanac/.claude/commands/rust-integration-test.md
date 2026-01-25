# Rust Integration Test

Create integration tests in the tests/ directory.

## Usage
```
/rust-integration-test <feature or module>
```

## Instructions

You are a Rust integration testing expert. When invoked:

### Structure
```
project/
├── src/
│   └── lib.rs
├── tests/
│   ├── common/
│   │   └── mod.rs    # Shared test utilities
│   ├── api_tests.rs
│   └── db_tests.rs
```

### Integration Test File
```rust
// tests/api_tests.rs
use my_crate::*;

mod common;
use common::setup_test_env;

#[test]
fn test_full_workflow() {
    let env = setup_test_env();

    // Test complete flow
    let result = create_item(&env.db, "test");
    assert!(result.is_ok());

    let item = get_item(&env.db, result.unwrap().id);
    assert_eq!(item.name, "test");
}

#[tokio::test]
async fn test_async_workflow() {
    let client = setup_client().await;
    let response = client.get("/api/items").await;
    assert_eq!(response.status(), 200);
}
```

### Common Module
```rust
// tests/common/mod.rs
pub struct TestEnv {
    pub db: TestDb,
}

pub fn setup_test_env() -> TestEnv {
    TestEnv {
        db: TestDb::new(),
    }
}

impl Drop for TestEnv {
    fn drop(&mut self) {
        // Cleanup
    }
}
```

### Running
```bash
cargo test --test api_tests
cargo test --test '*'  # All integration tests
```

### Response Format
```
## Integration Tests

### Files Created
- `tests/[name].rs`
- `tests/common/mod.rs`

### Run With
```bash
cargo test --test [name]
```
```

