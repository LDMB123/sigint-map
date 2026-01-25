# Skill: Pre-Migration Dependency Audit

**ID**: `dependency-audit-migration`
**Category**: Migration
**Agent**: Rust Migration Engineer

---

## When to Use

- Before migrating from another language to Rust
- Identifying Rust crate equivalents for source dependencies
- Assessing migration complexity based on ecosystem support

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| source_deps | string | Yes | Dependency list from source project |
| source_lang | string | Yes | python, javascript, go, or c |

---

## Steps

### Step 1: Extract Dependencies

**Python (requirements.txt or pyproject.toml)**
```bash
pip freeze > requirements.txt
# Or parse pyproject.toml
```

**JavaScript (package.json)**
```bash
cat package.json | jq '.dependencies, .devDependencies'
```

**Go (go.mod)**
```bash
cat go.mod
```

### Step 2: Map to Rust Equivalents

#### Python to Rust

| Python | Rust Crate | Notes |
|--------|------------|-------|
| `requests` | `reqwest` | HTTP client |
| `aiohttp` | `reqwest` + `tokio` | Async HTTP |
| `flask` | `axum`, `actix-web` | Web framework |
| `django` | `axum` + `diesel` | Full-stack |
| `fastapi` | `axum` | API framework |
| `sqlalchemy` | `diesel`, `sqlx` | ORM/SQL |
| `pandas` | `polars` | DataFrames |
| `numpy` | `ndarray` | Numeric arrays |
| `pydantic` | `serde` + `validator` | Data validation |
| `pytest` | Built-in + `rstest` | Testing |
| `click` | `clap` | CLI arguments |
| `celery` | `tokio` + custom | Task queue |
| `redis-py` | `redis` | Redis client |
| `boto3` | `aws-sdk-rust` | AWS SDK |
| `pillow` | `image` | Image processing |
| `cryptography` | `ring`, `rustcrypto` | Cryptography |
| `pyjwt` | `jsonwebtoken` | JWT |
| `python-dotenv` | `dotenvy` | Env files |
| `loguru` | `tracing` | Logging |
| `httpx` | `reqwest` | Modern HTTP |

#### JavaScript to Rust

| JavaScript | Rust Crate | Notes |
|------------|------------|-------|
| `express` | `axum`, `actix-web` | Web framework |
| `koa` | `axum` | Web framework |
| `fastify` | `axum` | Fast web framework |
| `axios` | `reqwest` | HTTP client |
| `node-fetch` | `reqwest` | HTTP client |
| `lodash` | `itertools`, stdlib | Utilities |
| `moment` / `dayjs` | `chrono`, `time` | Date/time |
| `uuid` | `uuid` | UUID generation |
| `jsonwebtoken` | `jsonwebtoken` | JWT |
| `bcrypt` | `bcrypt` | Password hashing |
| `winston` | `tracing` | Logging |
| `jest` | Built-in + `rstest` | Testing |
| `socket.io` | `tokio-tungstenite` | WebSockets |
| `mongoose` | `mongodb` | MongoDB |
| `sequelize` | `diesel`, `sea-orm` | ORM |
| `redis` | `redis` | Redis client |
| `aws-sdk` | `aws-sdk-rust` | AWS SDK |
| `sharp` | `image` | Image processing |
| `zod` | `serde` + `validator` | Validation |
| `commander` | `clap` | CLI |
| `dotenv` | `dotenvy` | Env files |

#### Go to Rust

| Go | Rust Crate | Notes |
|----|------------|-------|
| `net/http` | `reqwest`, `hyper` | HTTP |
| `gin` | `axum` | Web framework |
| `echo` | `axum` | Web framework |
| `gorm` | `diesel`, `sqlx` | ORM |
| `viper` | `config` | Configuration |
| `cobra` | `clap` | CLI |
| `logrus` / `zap` | `tracing` | Logging |
| `testify` | Built-in + `rstest` | Testing |
| `jwt-go` | `jsonwebtoken` | JWT |
| `go-redis` | `redis` | Redis |
| `aws-sdk-go` | `aws-sdk-rust` | AWS |
| `protobuf` | `prost` | Protocol Buffers |
| `grpc` | `tonic` | gRPC |
| `gorilla/websocket` | `tokio-tungstenite` | WebSockets |
| `uuid` | `uuid` | UUID |
| `godotenv` | `dotenvy` | Env files |

### Step 3: Identify Gaps

**No Direct Equivalent:**
- Document custom implementations needed
- Consider FFI bindings if C library available
- Evaluate effort for custom implementation

**Partial Equivalent:**
- Note feature gaps
- Plan for supplementary crates or custom code

### Step 4: Assess Migration Complexity

| Complexity | Criteria |
|------------|----------|
| **Low** | Direct crate equivalent exists with similar API |
| **Medium** | Equivalent exists but API differs significantly |
| **High** | No equivalent; requires custom implementation |
| **Very High** | Requires FFI or major architectural changes |

### Step 5: Generate Report

```markdown
## Dependency Audit Report

### Source: [language]
### Dependencies Analyzed: [count]

### Direct Equivalents (Low Complexity)
| Source | Rust | Confidence |
|--------|------|------------|
| requests | reqwest | High |
| ... | ... | ... |

### Partial Equivalents (Medium Complexity)
| Source | Rust | Gap |
|--------|------|-----|
| pandas | polars | Different API |
| ... | ... | ... |

### No Equivalent (High Complexity)
| Source | Recommendation |
|--------|----------------|
| custom-lib | Custom implementation |
| ... | ... |

### Recommended Rust Dependencies
```toml
[dependencies]
reqwest = "0.11"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
# ...
```

### Migration Effort Estimate
- Low complexity: X dependencies
- Medium complexity: Y dependencies
- High complexity: Z dependencies

### Recommended Migration Order
1. Start with isolated utilities
2. Migrate core business logic
3. Migrate I/O and integrations last
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Audit report | stdout | Dependency mapping |
| Cargo.toml snippet | stdout | Recommended deps |

---

## Output Template

```markdown
## Dependency Migration Audit

### Summary
- Total dependencies: X
- Direct mappings: Y
- Needs custom work: Z

### Dependency Map
[table]

### Recommended Cargo.toml
```toml
[dependencies]
...
```

### Migration Risks
- [Risk 1]
- [Risk 2]
```
