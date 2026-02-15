//! Error reporting and persistence to IndexedDB.

use super::types::AppError;
use crate::db_client;
use std::cell::RefCell;
use wasm_bindgen_futures::spawn_local;
use web_sys::console;

thread_local! {
    static ERROR_BUFFER: RefCell<Vec<ErrorRecord>> = const { RefCell::new(Vec::new()) };
}

#[derive(Debug, Clone)]
struct ErrorRecord {
    pub error: AppError,
    pub timestamp: f64,
}

/// Report an error: log to console, store to IndexedDB, and buffer for debug panel.
#[allow(dead_code)]
pub fn report(error: AppError) {
    let timestamp = js_sys::Date::now();
    let severity = error.severity();
    let description = error.description();

    // Console logging with severity
    console::error_1(&format!("[{}] {}", severity, description).into());

    // Buffer for debug panel (keep last 100 errors in memory)
    ERROR_BUFFER.with(|buf| {
        let mut buffer = buf.borrow_mut();
        buffer.push(ErrorRecord {
            error: error.clone(),
            timestamp,
        });

        // Trim to last 100
        let len = buffer.len();
        if len > 100 {
            buffer.drain(0..len - 100);
        }
    });

    // Persist to IndexedDB asynchronously
    let error_clone = error.clone();
    spawn_local(async move {
        if let Err(e) = persist_error(error_clone, timestamp).await {
            console::warn_1(&format!("[error_reporter] Failed to persist error: {:?}", e).into());
        }
    });
}

/// Persist error to IndexedDB errors table.
#[allow(dead_code)]
async fn persist_error(error: AppError, timestamp: f64) -> Result<(), String> {
    let error_json = serde_json::to_string(&error)
        .map_err(|e| format!("Serialization failed: {}", e))?;

    let sql = "INSERT INTO errors (timestamp, severity, error_json) VALUES (?, ?, ?)";
    let params = vec![
        timestamp.to_string(),
        (error.severity() as u8).to_string(),
        error_json,
    ];

    db_client::exec(sql, params)
        .await
        .map_err(|e| format!("DB insert failed: {:?}", e))?;

    Ok(())
}

/// Get recent errors from in-memory buffer (for debug panel).
#[allow(dead_code)]
pub fn get_recent_errors(limit: usize) -> Vec<(AppError, f64)> {
    ERROR_BUFFER.with(|buf| {
        let buffer = buf.borrow();
        let start = buffer.len().saturating_sub(limit);

        buffer[start..]
            .iter()
            .map(|record| (record.error.clone(), record.timestamp))
            .collect()
    })
}

/// Clear old errors from IndexedDB (older than 7 days).
#[allow(dead_code)]
pub async fn clear_old_errors() -> Result<usize, String> {
    let seven_days_ago = js_sys::Date::now() - (7.0 * 24.0 * 60.0 * 60.0 * 1000.0);

    let sql = "DELETE FROM errors WHERE timestamp < ?";
    let params = vec![seven_days_ago.to_string()];

    db_client::exec(sql, params)
        .await
        .map_err(|e| format!("Cleanup failed: {:?}", e))?;

    // Return count would require SELECT changes_count, using 0 for now
    Ok(0)
}

/// Initialize errors table schema if not exists.
pub async fn init_schema() -> Result<(), String> {
    let create_table_sql = r#"
        CREATE TABLE IF NOT EXISTS errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            severity INTEGER NOT NULL,
            error_json TEXT NOT NULL
        );
    "#;
    db_client::exec(create_table_sql, vec![])
        .await
        .map_err(|e| format!("Schema table init failed: {:?}", e))?;

    let create_index_sql = "CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp);";
    db_client::exec(create_index_sql, vec![])
        .await
        .map_err(|e| format!("Schema index init failed: {:?}", e))?;

    Ok(())
}
