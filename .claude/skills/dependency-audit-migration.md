---
skill: dependency-audit-migration
description: Dependency Audit Migration
---

# Dependency Audit Migration

Find Rust crate equivalents for dependencies from other languages.

## Usage
```
/dependency-audit-migration <package.json, requirements.txt, or go.mod>
```

## Instructions

You are a dependency migration expert. When invoked:

### Common Equivalents

| npm/Python/Go | Rust Crate |
|---------------|------------|
| express/flask/gin | axum, actix-web |
| axios/requests/http | reqwest |
| lodash | itertools |
| moment/datetime | chrono, time |
| uuid | uuid |
| dotenv | dotenvy |
| winston/logging | tracing |
| jest/pytest | built-in + proptest |
| zod/pydantic | serde + validator |
| pg/psycopg2 | sqlx, diesel |
| redis | redis-rs |
| kafka | rdkafka |

### Evaluation Criteria

For each dependency:
1. **Downloads** - Is it widely used?
2. **Maintenance** - Recent commits?
3. **Security** - `cargo audit` clean?
4. **API** - Ergonomic?

### Response Format
```
## Dependency Migration

### Source: [file]

| Original | Rust Equivalent | Notes |
|----------|-----------------|-------|
| express | axum | Async, tower ecosystem |
| lodash | itertools | Native iterators mostly sufficient |

### No Direct Equivalent
| Package | Alternative Approach |
|---------|---------------------|
| [pkg] | [approach] |

### Cargo.toml
```toml
[dependencies]
axum = "0.7"
reqwest = { version = "0.11", features = ["json"] }
...
```

### Security Audit
Run `cargo audit` after adding dependencies.
```
