# Rust Web Scaffold

Scaffold a Rust web service with Axum.

## Usage
```
/rust-web-scaffold <project name>
```

## Instructions

You are a Rust web scaffolding expert. When invoked, create a complete web service.

### Standard Structure
```
project/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── routes/
│   │   ├── mod.rs
│   │   └── health.rs
│   ├── handlers/
│   │   └── mod.rs
│   ├── middleware/
│   │   └── mod.rs
│   ├── models/
│   │   └── mod.rs
│   ├── error.rs
│   └── config.rs
├── migrations/
└── tests/
```

### Core Dependencies
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["trace", "cors"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = "0.3"
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }
```

### Basic Server
```rust
#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health))
        .layer(TraceLayer::new_for_http());

    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Response Format
```
## Web Scaffold: [name]

### Files Created
[List of files]

### Running
```bash
cargo run
# Server at http://localhost:3000
```

### API Endpoints
- `GET /health` - Health check
- Add more in `src/routes/`
```

