//! Offline mutation queue for guaranteed write persistence.
//! Wraps db_client::exec() with automatic retry on failure.
//! Queue stored in IndexedDB for persistence across sessions.

use std::cell::RefCell;

use wasm_bindgen::JsValue;
use serde::{Deserialize, Serialize};
use crate::{db_client, dom};

/// Queued mutation that failed to execute.
#[derive(Serialize, Deserialize, Clone)]
struct QueuedMutation {
    sql: String,
    params: Vec<String>,
    timestamp: f64,
}

// Thread-local lock flag to prevent concurrent flush operations
thread_local! {
    static FLUSH_IN_PROGRESS: RefCell<bool> = const { RefCell::new(false) };
}

/// Execute a write with automatic queuing on failure.
/// If the write succeeds, returns Ok(()).
/// If the write fails, queues it for retry and returns the error.
pub async fn queued_exec(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
    match db_client::exec(sql, params.clone()).await {
        Ok(()) => Ok(()),
        Err(e) => {
            // Write failed — queue for retry
            queue_mutation(sql, params).await?;
            Err(e)
        }
    }
}

/// Store a failed mutation in IndexedDB for later retry.
async fn queue_mutation(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
    let mutation = QueuedMutation {
        sql: sql.to_string(),
        params,
        timestamp: crate::browser_apis::now_ms(),
    };

    // Store in IndexedDB using the db-worker
    let sql = "INSERT INTO offline_queue (sql, params, timestamp) VALUES (?1, ?2, ?3)";
    let params = vec![
        mutation.sql,
        serde_json::to_string(&mutation.params).unwrap_or_default(),
        mutation.timestamp.to_string(),
    ];

    // Direct write to avoid recursion
    db_client::exec(sql, params).await
}

/// Flush all queued mutations (retry them in order).
/// Call this on visibility restore or reconnect.
/// Uses a simple mutex flag to prevent concurrent flush operations.
pub async fn flush_queue() -> Result<(), JsValue> {
    // Check if flush is already in progress (simple mutex)
    let already_flushing = FLUSH_IN_PROGRESS.with(|cell| {
        let mut guard = cell.borrow_mut();
        if *guard {
            return true; // Already flushing, skip
        }
        *guard = true; // Acquire lock
        false
    });

    if already_flushing {
        web_sys::console::log_1(&"[offline_queue] Flush already in progress, skipping".into());
        return Ok(());
    }

    // Execute flush and release lock on completion
    let result = flush_queue_locked().await;

    FLUSH_IN_PROGRESS.with(|cell| {
        *cell.borrow_mut() = false; // Release lock
    });

    result
}

/// Internal flush implementation — called while holding the mutex flag.
async fn flush_queue_locked() -> Result<(), JsValue> {
    // Load all queued mutations from IndexedDB WITH IDs for selective deletion
    let rows = db_client::query(
        "SELECT id, sql, params FROM offline_queue ORDER BY timestamp ASC",
        vec![],
    ).await?;

    let Some(arr) = rows.as_array() else {
        return Ok(());
    };

    let mut success_count = 0u32;
    let mut fail_count = 0u32;
    let mut successful_ids: Vec<String> = Vec::new();

    for row in arr {
        let Some(id) = row.get("id").and_then(|v| v.as_f64()) else { continue };
        let Some(sql) = row.get("sql").and_then(|v| v.as_str()) else { continue };
        let params_json = row.get("params").and_then(|v| v.as_str()).unwrap_or("[]");
        let params: Vec<String> = serde_json::from_str(params_json).unwrap_or_default();

        // Attempt to execute
        match db_client::exec(sql, params).await {
            Ok(()) => {
                // Collect ID for batch delete
                successful_ids.push(id.to_string());
                success_count += 1;
            }
            Err(e) => {
                // Keep failed mutation in queue for retry
                fail_count += 1;
                web_sys::console::warn_1(&format!(
                    "[offline_queue] Mutation {} failed: {:?}",
                    id, e
                ).into());
            }
        }
    }

    // Phase 3: Batch delete all successful mutations in 1 query (N+1 → 2 queries)
    if !successful_ids.is_empty() {
        let placeholders = successful_ids
            .iter()
            .enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>()
            .join(", ");

        let delete_sql = format!("DELETE FROM offline_queue WHERE id IN ({})", placeholders);

        if let Err(e) = db_client::exec(&delete_sql, successful_ids).await {
            // Failed to batch delete — log warning but continue
            web_sys::console::warn_1(&format!(
                "[offline_queue] Failed to batch delete {} successful entries: {:?}",
                success_count, e
            ).into());
        }
    }

    web_sys::console::log_1(&format!(
        "[offline_queue] Flushed {} mutations ({} failed, will retry later)",
        success_count, fail_count
    ).into());

    // Show user-visible error if any mutations failed to flush
    if fail_count > 0 {
        dom::toast("Couldn't save right now \u{2014} tap again later \u{1F495}");
    }

    Ok(())
}


/// Initialize the offline queue table (called during boot).
pub async fn init() -> Result<(), JsValue> {
    db_client::exec(
        "CREATE TABLE IF NOT EXISTS offline_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sql TEXT NOT NULL,
            params TEXT NOT NULL,
            timestamp REAL NOT NULL
        )",
        vec![],
    ).await
}
