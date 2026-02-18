use std::path::Path;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

use super::{
    SQLITE_BUSY_TIMEOUT, SQLITE_POOL_ACQUIRE_TIMEOUT, SQLITE_POOL_IDLE_TIMEOUT,
    SQLITE_POOL_MAX_CONNECTIONS, SQLITE_POOL_MAX_LIFETIME, SQLITE_POOL_MIN_CONNECTIONS,
};

pub(super) async fn init_db_pool() -> Option<SqlitePool> {
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

    let candidates = ["data/dmb-almanac.db"];
    for path in candidates {
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
