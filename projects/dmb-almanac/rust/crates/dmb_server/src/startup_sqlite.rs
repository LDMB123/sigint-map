use std::path::Path;
use std::time::Duration;

use sqlx::SqlitePool;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

const SQLITE_POOL_MAX_CONNECTIONS: u32 = 8;
const SQLITE_POOL_MIN_CONNECTIONS: u32 = 1;
const SQLITE_POOL_ACQUIRE_TIMEOUT: Duration = Duration::from_secs(5);
const SQLITE_POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(600);
const SQLITE_POOL_MAX_LIFETIME: Duration = Duration::from_secs(1800);
const SQLITE_BUSY_TIMEOUT: Duration = Duration::from_secs(5);
const DEFAULT_SQLITE_CANDIDATES: &[&str] = &[
    "data/dmb-almanac.db",
    "../data/dmb-almanac.db",
    "../../data/dmb-almanac.db",
];

pub(crate) fn default_sqlite_candidates() -> &'static [&'static str] {
    DEFAULT_SQLITE_CANDIDATES
}

pub(crate) async fn init_db_pool() -> Option<SqlitePool> {
    if let Ok(path) = std::env::var("DMB_SQLITE_PATH") {
        let path = path.trim();
        if !path.is_empty() {
            if Path::new(path).exists() {
                match connect_sqlite(path).await {
                    Ok(pool) => {
                        tracing::info!("connected to sqlite at {} (DMB_SQLITE_PATH)", path);
                        return Some(pool);
                    }
                    Err(err) => {
                        tracing::warn!("failed to open sqlite {} (DMB_SQLITE_PATH): {}", path, err);
                    }
                }
            } else {
                tracing::warn!(
                    "sqlite database not found at {} (DMB_SQLITE_PATH); falling back",
                    path
                );
            }
        }
    }

    for path in default_sqlite_candidates() {
        if !Path::new(path).exists() {
            continue;
        }
        match connect_sqlite(path).await {
            Ok(pool) => {
                tracing::info!("connected to sqlite at {}", path);
                return Some(pool);
            }
            Err(err) => {
                tracing::warn!("failed to open sqlite {}: {}", path, err);
            }
        }
    }
    tracing::warn!("sqlite database not found; SSR data will be limited");
    None
}

async fn connect_sqlite(path: &str) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .read_only(true)
        .busy_timeout(SQLITE_BUSY_TIMEOUT)
        .pragma("query_only", "ON")
        .pragma("temp_store", "MEMORY")
        .pragma("cache_size", "-20000");

    SqlitePoolOptions::new()
        .max_connections(SQLITE_POOL_MAX_CONNECTIONS)
        .min_connections(SQLITE_POOL_MIN_CONNECTIONS)
        .acquire_timeout(SQLITE_POOL_ACQUIRE_TIMEOUT)
        .idle_timeout(Some(SQLITE_POOL_IDLE_TIMEOUT))
        .max_lifetime(Some(SQLITE_POOL_MAX_LIFETIME))
        .connect_with(options)
        .await
}
