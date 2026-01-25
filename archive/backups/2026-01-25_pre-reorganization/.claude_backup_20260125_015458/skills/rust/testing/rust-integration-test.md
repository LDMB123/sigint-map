# Skill: Integration Testing

**ID**: `rust-integration-test`
**Category**: Testing
**Agent**: Rust QA Engineer

---

## When to Use

- Testing public API behavior
- Testing multiple modules together
- End-to-end testing
- Testing with real dependencies

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| crate_name | string | Yes | Crate to test |
| test_scenario | string | No | Specific scenario to test |

---

## Steps

### Step 1: Create Integration Test Directory

```
my-crate/
├── src/
│   └── lib.rs
├── tests/               # Integration tests
│   ├── common/          # Shared test utilities
│   │   └── mod.rs
│   ├── api_tests.rs
│   └── cli_tests.rs
└── Cargo.toml
```

### Step 2: Basic Integration Test

```rust
// tests/api_tests.rs
use my_crate::{Config, Engine};

#[test]
fn test_engine_processes_input() {
    let config = Config::default();
    let engine = Engine::new(config);

    let result = engine.process("test input");

    assert!(result.is_ok());
    assert_eq!(result.unwrap().output, "expected output");
}

#[test]
fn test_engine_handles_invalid_input() {
    let engine = Engine::new(Config::default());

    let result = engine.process("");

    assert!(result.is_err());
}
```

### Step 3: Shared Test Utilities

```rust
// tests/common/mod.rs
use my_crate::{Config, Engine};
use std::path::PathBuf;
use tempfile::TempDir;

pub struct TestContext {
    pub temp_dir: TempDir,
    pub engine: Engine,
}

impl TestContext {
    pub fn new() -> Self {
        let temp_dir = TempDir::new().unwrap();
        let config = Config {
            data_dir: temp_dir.path().to_path_buf(),
            ..Default::default()
        };
        let engine = Engine::new(config);

        Self { temp_dir, engine }
    }

    pub fn create_test_file(&self, name: &str, content: &str) -> PathBuf {
        let path = self.temp_dir.path().join(name);
        std::fs::write(&path, content).unwrap();
        path
    }
}

pub fn setup_test_data() -> Vec<TestItem> {
    vec![
        TestItem::new("item1"),
        TestItem::new("item2"),
    ]
}

// tests/api_tests.rs
mod common;

#[test]
fn test_with_shared_context() {
    let ctx = common::TestContext::new();
    let test_file = ctx.create_test_file("input.txt", "test content");

    let result = ctx.engine.process_file(&test_file);
    assert!(result.is_ok());
}
```

### Step 4: Database Integration Tests

```rust
// tests/db_tests.rs
use my_crate::{Database, Config};
use sqlx::postgres::PgPoolOptions;

async fn setup_test_db() -> Database {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://test:test@localhost/test_db")
        .await
        .expect("Failed to connect to test database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    Database::new(pool)
}

#[tokio::test]
async fn test_database_crud() {
    let db = setup_test_db().await;

    // Create
    let item = db.create_item("test").await.unwrap();
    assert!(item.id > 0);

    // Read
    let found = db.get_item(item.id).await.unwrap();
    assert_eq!(found.name, "test");

    // Update
    db.update_item(item.id, "updated").await.unwrap();
    let updated = db.get_item(item.id).await.unwrap();
    assert_eq!(updated.name, "updated");

    // Delete
    db.delete_item(item.id).await.unwrap();
    let deleted = db.get_item(item.id).await;
    assert!(deleted.is_err());
}
```

### Step 5: HTTP API Testing

```rust
// tests/http_tests.rs
use axum_test::TestServer;
use my_crate::create_app;
use serde_json::json;

#[tokio::test]
async fn test_api_endpoints() {
    let app = create_app();
    let server = TestServer::new(app).unwrap();

    // GET request
    let response = server.get("/api/items").await;
    response.assert_status_ok();

    // POST request
    let response = server
        .post("/api/items")
        .json(&json!({ "name": "test" }))
        .await;
    response.assert_status_ok();

    let item: Item = response.json();
    assert_eq!(item.name, "test");

    // GET single item
    let response = server.get(&format!("/api/items/{}", item.id)).await;
    response.assert_status_ok();

    // DELETE
    let response = server.delete(&format!("/api/items/{}", item.id)).await;
    response.assert_status_no_content();
}
```

### Step 6: CLI Testing

```rust
// tests/cli_tests.rs
use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;

#[test]
fn test_cli_help() {
    Command::cargo_bin("my-cli")
        .unwrap()
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("Usage:"));
}

#[test]
fn test_cli_version() {
    Command::cargo_bin("my-cli")
        .unwrap()
        .arg("--version")
        .assert()
        .success()
        .stdout(predicate::str::contains(env!("CARGO_PKG_VERSION")));
}

#[test]
fn test_cli_process_file() {
    let temp_dir = TempDir::new().unwrap();
    let input_file = temp_dir.path().join("input.txt");
    std::fs::write(&input_file, "test content").unwrap();

    Command::cargo_bin("my-cli")
        .unwrap()
        .arg("process")
        .arg(&input_file)
        .assert()
        .success()
        .stdout(predicate::str::contains("Processed"));
}

#[test]
fn test_cli_invalid_input() {
    Command::cargo_bin("my-cli")
        .unwrap()
        .arg("process")
        .arg("nonexistent.txt")
        .assert()
        .failure()
        .stderr(predicate::str::contains("not found"));
}
```

### Step 7: Running Integration Tests

```bash
# Run all integration tests
cargo test --test '*'

# Run specific test file
cargo test --test api_tests

# Run specific test
cargo test --test api_tests test_name

# With features
cargo test --test db_tests --features postgres
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Test files | tests/*.rs | Integration tests |
| Common utilities | tests/common/ | Shared helpers |

---

## Output Template

```markdown
## Integration Test Report

### Test Suite
`tests/[name]_tests.rs`

### Tests
| Test | Status | Duration |
|------|--------|----------|
| test_x | Pass | 0.5s |
| test_y | Pass | 1.2s |

### Dependencies Tested
- Database: PostgreSQL
- External API: Mocked

### Commands
```bash
cargo test --test api_tests
```
```
