# Skill: Web Service Scaffold

**ID**: `rust-web-scaffold`
**Category**: Scaffolding
**Agent**: Rust Project Architect

---

## When to Use

- Creating a new web API service
- Setting up Axum or Actix-web
- Configuring database connections
- Implementing REST endpoints

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Project name |
| framework | string | No | axum (default) or actix |
| database | string | No | postgres, sqlite, or none |

---

## Steps

### Step 1: Create Project

```bash
cargo new my-api
cd my-api
```

### Step 2: Add Dependencies (Axum)

```toml
# Cargo.toml
[package]
name = "my-api"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Error handling
anyhow = "1"
thiserror = "1"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Database (optional)
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid"], optional = true }

# Configuration
dotenvy = "0.15"

# Validation
validator = { version = "0.16", features = ["derive"] }

[features]
default = []
postgres = ["sqlx"]

[dev-dependencies]
axum-test = "14"
```

### Step 3: Project Structure

```
my-api/
├── Cargo.toml
├── .env
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── config.rs
│   ├── error.rs
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── health.rs
│   │   └── users.rs
│   ├── handlers/
│   │   ├── mod.rs
│   │   └── users.rs
│   ├── models/
│   │   ├── mod.rs
│   │   └── user.rs
│   ├── db/
│   │   ├── mod.rs
│   │   └── users.rs
│   └── middleware/
│       └── mod.rs
├── migrations/
└── tests/
    └── api_tests.rs
```

### Step 4: Implement Core Files

**src/error.rs**
```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Internal server error")]
    Internal(#[from] anyhow::Error),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".into())
            }
            AppError::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
```

**src/config.rs**
```rust
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: Option<String>,
    pub log_level: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse()
                .expect("PORT must be a number"),
            database_url: env::var("DATABASE_URL").ok(),
            log_level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".into()),
        }
    }

    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
```

**src/models/user.rs**
```rust
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUser {
    #[validate(length(min = 1, max = 100))]
    pub name: String,

    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUser {
    #[validate(length(min = 1, max = 100))]
    pub name: Option<String>,

    #[validate(email)]
    pub email: Option<String>,
}
```

**src/handlers/users.rs**
```rust
use axum::{
    extract::{Path, State},
    Json,
};
use validator::Validate;

use crate::{
    error::{AppError, Result},
    models::user::{CreateUser, UpdateUser, User},
    AppState,
};

pub async fn list_users(State(state): State<AppState>) -> Result<Json<Vec<User>>> {
    let users = state.db.list_users().await?;
    Ok(Json(users))
}

pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<User>> {
    let user = state.db.get_user(id).await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))?;
    Ok(Json(user))
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUser>,
) -> Result<Json<User>> {
    payload.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let user = state.db.create_user(payload).await?;
    Ok(Json(user))
}

pub async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateUser>,
) -> Result<Json<User>> {
    payload.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let user = state.db.update_user(id, payload).await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))?;
    Ok(Json(user))
}

pub async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<()> {
    state.db.delete_user(id).await?;
    Ok(())
}
```

**src/routes/mod.rs**
```rust
use axum::{
    routing::{get, post, put, delete},
    Router,
};

use crate::{handlers, AppState};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .nest("/api", api_routes())
        .with_state(state)
}

async fn health() -> &'static str {
    "OK"
}

fn api_routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(handlers::users::list_users))
        .route("/users", post(handlers::users::create_user))
        .route("/users/:id", get(handlers::users::get_user))
        .route("/users/:id", put(handlers::users::update_user))
        .route("/users/:id", delete(handlers::users::delete_user))
}
```

**src/main.rs**
```rust
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use my_api::{config::Config, routes, AppState, Database};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load config
    let config = Config::from_env();

    // Setup logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(&config.log_level))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Setup database (in-memory for now)
    let db = Database::new();

    // Create app state
    let state = AppState { db, config: config.clone() };

    // Create router
    let app = routes::create_router(state)
        .layer(TraceLayer::new_for_http());

    // Start server
    let addr = config.address();
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
```

**src/lib.rs**
```rust
pub mod config;
pub mod error;
pub mod handlers;
pub mod models;
pub mod routes;

use std::sync::Arc;
use tokio::sync::RwLock;

use config::Config;
use models::user::User;

// Simple in-memory database for demo
#[derive(Debug, Default, Clone)]
pub struct Database {
    users: Arc<RwLock<Vec<User>>>,
    next_id: Arc<RwLock<i64>>,
}

impl Database {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn list_users(&self) -> error::Result<Vec<User>> {
        Ok(self.users.read().await.clone())
    }

    pub async fn get_user(&self, id: i64) -> error::Result<Option<User>> {
        Ok(self.users.read().await.iter().find(|u| u.id == id).cloned())
    }

    pub async fn create_user(&self, input: models::user::CreateUser) -> error::Result<User> {
        let mut id = self.next_id.write().await;
        *id += 1;
        let user = User {
            id: *id,
            name: input.name,
            email: input.email,
        };
        self.users.write().await.push(user.clone());
        Ok(user)
    }

    pub async fn update_user(&self, id: i64, input: models::user::UpdateUser) -> error::Result<Option<User>> {
        let mut users = self.users.write().await;
        if let Some(user) = users.iter_mut().find(|u| u.id == id) {
            if let Some(name) = input.name {
                user.name = name;
            }
            if let Some(email) = input.email {
                user.email = email;
            }
            Ok(Some(user.clone()))
        } else {
            Ok(None)
        }
    }

    pub async fn delete_user(&self, id: i64) -> error::Result<()> {
        self.users.write().await.retain(|u| u.id != id);
        Ok(())
    }
}

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub config: Config,
}
```

### Step 5: Build and Run

```bash
cargo build
cargo run

# Test endpoints
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Project files | ./ | Complete web service |
| API routes | src/routes/ | REST endpoints |

---

## Output Template

```markdown
## Web Service Scaffold Created

### Project: [name]

### Endpoints
- `GET /health` - Health check
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Run
```bash
cargo run
```

### Test
```bash
curl http://localhost:3000/health
```
```
