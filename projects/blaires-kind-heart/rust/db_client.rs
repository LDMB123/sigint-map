//! Async DB client — sends messages to the SQLite Web Worker.
//! Uses oneshot channels for request/response. Web Locks for write coordination.
//! The Worker + SQLite do all the real work.

use std::cell::RefCell;
use std::collections::HashMap;

use futures_channel::oneshot;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::MessageEvent;

use crate::{
    bindings,
    browser_apis,
    db_messages::{DbRequest, DbResponse, WorkerMessage, DB_WORKER_API_VERSION},
};

// Safari 26.2 always uses Trusted Types — WorkerHandle enum removed.
// TrustedWorker is the only variant used; no need for abstraction.

// Phase 3: In-memory mutation queue for batch writes
#[derive(Clone)]
struct QueuedMutation {
    sql: String,
    params: Vec<String>,
}

thread_local! {
    static DB_CLIENT: RefCell<Option<DbClientInner>> = const { RefCell::new(None) };
    static NEXT_ID: RefCell<u32> = const { RefCell::new(1) };
    /// Oneshot receiver for the Init response (request_id=0). Taken once by `wait_for_ready()`.
    static INIT_RX: RefCell<Option<oneshot::Receiver<DbResponse>>> = const { RefCell::new(None) };
    /// Phase 3: In-memory mutation queue (flushed on pagehide only)
    static MUTATION_QUEUE: RefCell<Vec<QueuedMutation>> = const { RefCell::new(Vec::new()) };
}

struct DbClientInner {
    worker: bindings::TrustedWorker,
    pending: RefCell<HashMap<u32, oneshot::Sender<DbResponse>>>,
}

fn next_id() -> u32 {
    NEXT_ID.with(|c| {
        let mut id = c.borrow_mut();
        let val = *id;
        *id = val.wrapping_add(1);
        val
    })
}

/// Initialize DB client with a TrustedWorker (Trusted Types always active in Safari 26.2).
pub fn init(worker: bindings::TrustedWorker) {
    let pending: RefCell<HashMap<u32, oneshot::Sender<DbResponse>>> = RefCell::new(HashMap::new());

    // Register sender for Init response (request_id=0) so `wait_for_ready()` can await it
    let (init_tx, init_rx) = oneshot::channel::<DbResponse>();
    pending.borrow_mut().insert(0, init_tx);
    INIT_RX.with(|c| { *c.borrow_mut() = Some(init_rx); });

    // Listen for messages from the Worker
    let cb = Closure::<dyn FnMut(MessageEvent)>::new(move |event: MessageEvent| {
        let data = event.data();
        if let Ok(resp) = serde_wasm_bindgen::from_value::<DbResponse>(data) {
            let req_id = match &resp {
                DbResponse::Ok { request_id } => *request_id,
                DbResponse::Rows { request_id, .. } => *request_id,
                DbResponse::Error { request_id, .. } => *request_id,
            };
            DB_CLIENT.with(|c| {
                if let Some(client) = c.borrow().as_ref() {
                    if let Some(tx) = client.pending.borrow_mut().remove(&req_id) {
                        let _ = tx.send(resp);
                    }
                }
            });
        }
    });
    worker.set_onmessage(Some(cb.as_ref().unchecked_ref()));
    cb.forget();

    // Send Init before storing — typed serde serialization, zero Reflect calls
    let envelope = WorkerMessage {
        api_version: DB_WORKER_API_VERSION,
        request: DbRequest::Init,
        request_id: 0,
    };
    if let Ok(msg) = serde_wasm_bindgen::to_value(&envelope) {
        let _ = worker.post_message(&msg);
    }

    let client = DbClientInner {
        worker,
        pending,
    };
    DB_CLIENT.with(|c| {
        *c.borrow_mut() = Some(client);
    });
}

/// Execute a write statement (INSERT, UPDATE, DELETE).
/// Wrapped in a Web Lock for exclusive write access.
/// Use this for immediate writes that need locks (e.g., critical updates).
pub async fn exec(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
    let sql = sql.to_string();
    browser_apis::with_web_lock("kindheart-db", move || async move {
        send_request(DbRequest::Exec { sql, params }).await?;
        Ok(())
    })
    .await
}

/// Dead Code Cleanup: flush_mutations() removed - never called
/// Pagehide flush uses flush_sync() which inlines the logic synchronously
///
/// Execute a read query (SELECT).
/// Wrapped in a shared Web Lock to allow concurrent reads while preventing dirty reads.
pub async fn query(sql: &str, params: Vec<String>) -> Result<serde_json::Value, JsValue> {
    let sql = sql.to_string();
    browser_apis::with_web_lock_mode("kindheart-db", browser_apis::LockMode::Shared, move || async move {
        let req = DbRequest::Query {
            sql,
            params,
        };
        let resp = send_request(req).await?;
        match resp {
            DbResponse::Rows { data, .. } => Ok(data),
            DbResponse::Error { message, .. } => Err(JsValue::from_str(&message)),
            _ => Ok(serde_json::Value::Null),
        }
    })
    .await
}

/// Restore a full DB snapshot via the worker contract.
pub async fn restore_snapshot(snapshot_json: String) -> Result<(), JsValue> {
    browser_apis::with_web_lock("kindheart-db", move || async move {
        let req = DbRequest::Restore { snapshot_json };
        let resp = send_request(req).await?;
        match resp {
            DbResponse::Ok { .. } => Ok(()),
            DbResponse::Error { message, .. } => Err(JsValue::from_str(&message)),
            _ => Err(JsValue::from_str("Unexpected restore response")),
        }
    })
    .await
}

async fn send_request(request: DbRequest) -> Result<DbResponse, JsValue> {
    let id = next_id();
    let (tx, rx) = oneshot::channel::<DbResponse>();

    DB_CLIENT.with(|c| {
        let borrow = c.borrow();
        let client = borrow.as_ref().ok_or_else(|| JsValue::from_str("DB not initialized"))?;
        client.pending.borrow_mut().insert(id, tx);

        // Typed serde serialization — zero Reflect calls
        let envelope = WorkerMessage {
            api_version: DB_WORKER_API_VERSION,
            request,
            request_id: id,
        };
        if let Ok(msg) = serde_wasm_bindgen::to_value(&envelope) {
            let _ = client.worker.post_message(&msg);
        }
        Ok::<(), JsValue>(())
    })?;

    rx.await.map_err(|_| JsValue::from_str("DB request cancelled"))
}

/// Fire-and-forget DB write with offline queue — logs errors to console instead of silently dropping them.
/// Guarantees persistence even if offline via automatic queueing and retry.
/// Use this for fire-and-forget game score saves, sticker inserts, etc.
pub fn exec_fire_and_forget(label: &'static str, sql: &str, params: Vec<String>) {
    let sql = sql.to_string();
    browser_apis::spawn_local_logged(label, async move {
        crate::offline_queue::queued_exec(&sql, params).await
    });
}

/// Synchronous flush for pagehide: sends queued mutations + export to worker without awaiting.
/// Used in pagehide handler where async operations won't complete.
/// Phase 3 fix: Send mutations directly to worker as fire-and-forget Batch request.
pub fn flush_sync() {
    // Get queued mutations without clearing (will clear after successful send)
    let mutations = MUTATION_QUEUE.with(|queue| {
        let q = queue.borrow();
        q.clone()
    });

    // If we have mutations, send them as a batch (fire-and-forget)
    if !mutations.is_empty() {
        let statements: Vec<(String, Vec<String>)> = mutations
            .iter()
            .map(|m| (m.sql.clone(), m.params.clone()))
            .collect();

        let batch_envelope = WorkerMessage {
            api_version: DB_WORKER_API_VERSION,
            request: DbRequest::Batch { statements },
            request_id: 0, // Fire-and-forget
        };

        if let Ok(msg) = serde_wasm_bindgen::to_value(&batch_envelope) {
            DB_CLIENT.with(|c| {
                if let Some(client) = c.borrow().as_ref() {
                    let _ = client.worker.post_message(&msg);
                }
            });

            // Clear queue after sending
            MUTATION_QUEUE.with(|queue| {
                queue.borrow_mut().clear();
            });
        }
    }

    // OPFS export (fire-and-forget)
    let envelope = WorkerMessage {
        api_version: DB_WORKER_API_VERSION,
        request: DbRequest::Export,
        request_id: 0,
    };
    if let Ok(msg) = serde_wasm_bindgen::to_value(&envelope) {
        DB_CLIENT.with(|c| {
            if let Some(client) = c.borrow().as_ref() {
                let _ = client.worker.post_message(&msg);
            }
        });
    }
}

/// Extract a COUNT(*) or integer column from the first row of a query result.
/// SQLite integers arrive as serde_json f64 — converts via as_f64() then casts.
/// Returns 0 if the key is missing or the query returned no rows.
pub fn extract_count(rows: &serde_json::Value, key: &str) -> i64 {
    rows.as_array()
        .and_then(|arr| arr.first())
        .and_then(|row| row.get(key))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as i64
}

/// Wait for the DB worker to finish initialization (Init response for request_id=0).
/// Call once during boot instead of a fixed `sleep_ms(200)` delay.
/// Times out after 5 seconds to prevent boot from hanging if the worker fails.
pub async fn wait_for_ready() {
    let rx = INIT_RX.with(|c| c.borrow_mut().take());
    if let Some(rx) = rx {
        // Race: await the Init response vs a 5-second timeout.
        // Use pin + poll-style via a shared flag.
        let got_init = std::rc::Rc::new(std::cell::Cell::new(false));
        let flag = got_init.clone();

        // Spawn the receiver await — it sets the flag when done
        wasm_bindgen_futures::spawn_local(async move {
            if rx.await.is_ok() {
                flag.set(true);
            }
        });

        // Poll the flag with 50ms sleeps, up to 5 seconds (100 iterations)
        for _ in 0..100 {
            if got_init.get() {
                web_sys::console::log_1(&"[db] Worker ready (Init response received)".into());
                return;
            }
            browser_apis::sleep_ms(50).await;
        }
        web_sys::console::warn_1(&"[db] Worker init timed out after 5s — proceeding anyway".into());
    }
    // If rx is None, either already consumed or init wasn't called — proceed anyway
}
