use crate::{db_client, dom};
use serde::{Deserialize, Serialize};
use std::cell::Cell;
use wasm_bindgen::JsValue;
#[derive(Serialize, Deserialize, Clone)]
struct QueuedMutation {
    sql: String,
    params: Vec<String>,
    timestamp: f64,
}
thread_local! {
    static FLUSH_IN_PROGRESS: Cell<bool> = const { Cell::new(false) };
}
pub async fn queued_exec(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
    match db_client::exec(sql, params.clone()).await {
        Ok(()) => Ok(()),
        Err(e) => {
            queue_mutation(sql, params).await?;
            Err(e)
        }
    }
}
const MAX_QUEUE_SIZE: usize = 500;
async fn queue_mutation(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
    let count = db_client::query("SELECT COUNT(*) as cnt FROM offline_queue", vec![])
        .await
        .ok()
        .and_then(|rows| rows.get(0)?.get("cnt")?.as_u64())
        .unwrap_or(0) as usize;
    if count >= MAX_QUEUE_SIZE {
        let drop_count = MAX_QUEUE_SIZE / 10;
        let _ = db_client::exec(
            &format!(
                "DELETE FROM offline_queue WHERE id IN \
                (SELECT id FROM offline_queue ORDER BY timestamp ASC LIMIT {drop_count})"
            ),
            vec![],
        )
        .await;
        crate::dom::warn(&format!(
            "[offline_queue] Queue full ({count}), dropped oldest {drop_count} entries"
        ));
    }
    let mutation = QueuedMutation {
        sql: sql.to_string(),
        params,
        timestamp: crate::browser_apis::now_ms(),
    };
    let sql = "INSERT INTO offline_queue (sql, params, timestamp) VALUES (?1, ?2, ?3)";
    let params = vec![
        mutation.sql,
        serde_json::to_string(&mutation.params).unwrap_or_else(|_| "[]".to_string()),
        mutation.timestamp.to_string(),
    ];
    db_client::exec(sql, params).await
}
pub async fn flush_queue() -> Result<(), JsValue> {
    let already_flushing = FLUSH_IN_PROGRESS.with(|cell| cell.replace(true));
    if already_flushing {
        dom::warn("[offline_queue] Flush already in progress, skipping");
        return Ok(());
    }
    let result = flush_queue_locked().await;
    FLUSH_IN_PROGRESS.with(|cell| cell.set(false));
    result
}
async fn flush_queue_locked() -> Result<(), JsValue> {
    let cutoff = crate::browser_apis::now_ms() - (24.0 * 60.0 * 60.0 * 1000.0);
    let _ = db_client::exec(
        "DELETE FROM offline_queue WHERE timestamp < ?1",
        vec![cutoff.to_string()],
    )
    .await;
    let rows = db_client::query(
        "SELECT id, sql, params FROM offline_queue ORDER BY timestamp ASC",
        vec![],
    )
    .await?;
    let Some(arr) = rows.as_array() else {
        return Ok(());
    };
    let mut success_count = 0u32;
    let mut fail_count = 0u32;
    let mut successful_ids: Vec<String> = Vec::new();
    for row in arr {
        let Some(id) = row.get("id").and_then(|v| v.as_f64()) else {
            continue;
        };
        let Some(sql) = row.get("sql").and_then(|v| v.as_str()) else {
            continue;
        };
        let params_json = row.get("params").and_then(|v| v.as_str()).unwrap_or("[]");
        let params: Vec<String> = serde_json::from_str(params_json).unwrap_or_else(|e| {
            dom::warn(&format!("[offline_queue] Corrupt params for mutation {id}: {e}"));
            vec![]
        });
        match db_client::exec(sql, params).await {
            Ok(()) => {
                successful_ids.push(id.to_string());
                success_count += 1;
            }
            Err(e) => {
                fail_count += 1;
                dom::warn(&format!("[offline_queue] Mutation {id} failed: {e:?}"));
                crate::errors::report(crate::errors::AppError::DatabaseOperation {
                    operation: "offline_queue_flush".to_string(),
                    sql: sql.to_string(),
                    error: format!("{e:?}"),
                });
            }
        }
    }
    if !successful_ids.is_empty() {
        let placeholders = (1..=successful_ids.len())
            .map(|i| format!("?{i}"))
            .collect::<Vec<_>>()
            .join(", ");
        let delete_sql = format!("DELETE FROM offline_queue WHERE id IN ({placeholders})");
        if let Err(e) = db_client::exec(&delete_sql, successful_ids).await {
            dom::warn(&format!(
                "[offline_queue] Failed to batch delete {success_count} entries: {e:?}"
            ));
        }
    }
    if success_count > 0 || fail_count > 0 {
        dom::warn(&format!(
            "[offline_queue] Flushed {success_count} mutations ({fail_count} failed, will retry later)"
        ));
    }
    if fail_count > 0 {
        dom::toast("Couldn't save right now \u{2014} tap again later \u{1F495}");
    }
    Ok(())
}
// Schema (created in db-worker.js SCHEMA Wave 9):
// CREATE TABLE IF NOT EXISTS offline_queue (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   sql TEXT NOT NULL,
//   params TEXT NOT NULL DEFAULT '[]',
//   timestamp REAL NOT NULL
// );
pub async fn init() -> Result<(), JsValue> {
    flush_queue().await
}
