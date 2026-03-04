use crate::{
    bindings, browser_apis,
    db_messages::{DbRequest, DbResponse, WorkerMessage, DB_WORKER_API_VERSION},
    dom,
};
use futures::channel::oneshot;
use futures::future::Either;
use std::cell::RefCell;
use std::collections::HashMap;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::MessageEvent;

const DB_REQUEST_TIMEOUT_MS: i32 = 15_000;
thread_local! {
    static DB_CLIENT: RefCell<Option<DbClientInner>> = const { RefCell::new(None) };
    static NEXT_ID: RefCell<u32> = const { RefCell::new(1) };
    static INIT_RX: RefCell<Option<oneshot::Receiver<DbResponse>>> = const { RefCell::new(None) };
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
pub fn init(worker: bindings::TrustedWorker) {
    let pending: RefCell<HashMap<u32, oneshot::Sender<DbResponse>>> = RefCell::new(HashMap::new());
    let (init_tx, init_rx) = oneshot::channel::<DbResponse>();
    pending.borrow_mut().insert(0, init_tx);
    INIT_RX.with(|c| {
        *c.borrow_mut() = Some(init_rx);
    });
    let cb = Closure::<dyn FnMut(MessageEvent)>::new(move |event: MessageEvent| {
        let data = event.data();
        // Handle non-protocol messages from worker (e.g. quota warnings)
        if let Some(msg_type) = js_sys::Reflect::get(&data, &JsValue::from_str("type"))
            .ok()
            .and_then(|v| v.as_string())
        {
            if msg_type == "quota-warning" {
                dom::toast("\u{1F4BE} Storage space is getting low!");
                return;
            }
        }
        if let Ok(resp) = serde_wasm_bindgen::from_value::<DbResponse>(data) {
            let req_id = match &resp {
                DbResponse::Ok { request_id }
                | DbResponse::Rows { request_id, .. }
                | DbResponse::Error { request_id, .. } => *request_id,
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
    let envelope = WorkerMessage {
        api_version: DB_WORKER_API_VERSION,
        request: DbRequest::Init,
        request_id: 0,
    };
    if let Ok(msg) = serde_wasm_bindgen::to_value(&envelope) {
        let _ = worker.post_message(&msg);
    }
    let client = DbClientInner { worker, pending };
    DB_CLIENT.with(|c| {
        *c.borrow_mut() = Some(client);
    });
}
pub async fn exec(sql: &str, params: Vec<String>) -> Result<(), JsValue> {
    let sql = sql.to_string();
    browser_apis::with_web_lock("kindheart-db", move || async move {
        send_request(DbRequest::Exec { sql, params }).await?;
        Ok(())
    })
    .await
}
pub async fn query(sql: &str, params: Vec<String>) -> Result<serde_json::Value, JsValue> {
    let sql = sql.to_string();
    browser_apis::with_web_lock_mode(
        "kindheart-db",
        browser_apis::LockMode::Shared,
        move || async move {
            let req = DbRequest::Query { sql, params };
            let resp = send_request(req).await?;
            match resp {
                DbResponse::Rows { data, .. } => Ok(data),
                DbResponse::Error { message, .. } => Err(JsValue::from_str(&message)),
                DbResponse::Ok { .. } => Ok(serde_json::Value::Null),
            }
        },
    )
    .await
}
pub async fn restore_snapshot(snapshot_json: String) -> Result<(), JsValue> {
    browser_apis::with_web_lock("kindheart-db", move || async move {
        let req = DbRequest::Restore { snapshot_json };
        let resp = send_request(req).await?;
        match resp {
            DbResponse::Ok { .. } => Ok(()),
            DbResponse::Error { message, .. } => Err(JsValue::from_str(&message)),
            DbResponse::Rows { .. } => Err(JsValue::from_str("Unexpected restore response")),
        }
    })
    .await
}
async fn send_request(request: DbRequest) -> Result<DbResponse, JsValue> {
    let id = next_id();
    let (tx, rx) = oneshot::channel::<DbResponse>();
    DB_CLIENT.with(|c| {
        let borrow = c.borrow();
        let client = borrow
            .as_ref()
            .ok_or_else(|| JsValue::from_str("DB not initialized"))?;
        let envelope = WorkerMessage {
            api_version: DB_WORKER_API_VERSION,
            request,
            request_id: id,
        };
        match serde_wasm_bindgen::to_value(&envelope) {
            Ok(msg) => {
                client.pending.borrow_mut().insert(id, tx);
                if let Err(post_err) = client.worker.post_message(&msg) {
                    let _ = client.pending.borrow_mut().remove(&id);
                    return Err(JsValue::from_str(&format!(
                        "Failed to post DB request: {post_err:?}"
                    )));
                }
            }
            Err(_) => {
                // Serialization failed — send error via oneshot so caller doesn't hang forever
                let _ = tx.send(DbResponse::Error {
                    message: "Failed to serialize DB request".to_string(),
                    request_id: id,
                });
            }
        }
        Ok::<(), JsValue>(())
    })?;

    match futures::future::select(
        Box::pin(rx),
        Box::pin(browser_apis::sleep_ms(DB_REQUEST_TIMEOUT_MS)),
    )
    .await
    {
        Either::Left((resp, _)) => resp.map_err(|_| JsValue::from_str("DB request cancelled")),
        Either::Right((_, _pending_rx)) => {
            DB_CLIENT.with(|c| {
                if let Some(client) = c.borrow().as_ref() {
                    let _ = client.pending.borrow_mut().remove(&id);
                }
            });
            Err(JsValue::from_str(&format!(
                "DB request timed out after {DB_REQUEST_TIMEOUT_MS}ms"
            )))
        }
    }
}
pub fn exec_fire_and_forget(label: &'static str, sql: &str, params: Vec<String>) {
    let sql = sql.to_string();
    browser_apis::spawn_local_logged(label, async move {
        crate::offline_queue::queued_exec(&sql, params).await
    });
}
pub fn flush_sync() {
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
pub fn extract_count(rows: &serde_json::Value, key: &str) -> i64 {
    rows.as_array()
        .and_then(|arr| arr.first())
        .and_then(|row| row.get(key))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0) as i64
}
pub async fn get_setting(key: &str) -> Option<String> {
    let rows = query(
        "SELECT value FROM settings WHERE key = ?1",
        vec![key.to_string()],
    )
    .await
    .ok()?;
    rows.get(0)?.get("value")?.as_str().map(String::from)
}
pub async fn set_setting(key: &str, value: &str) {
    let _ = exec(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        vec![key.to_string(), value.to_string()],
    )
    .await;
}
pub async fn wait_for_ready() {
    let rx = INIT_RX.with(|c| c.borrow_mut().take());
    if let Some(rx) = rx {
        let got_init = std::rc::Rc::new(std::cell::Cell::new(false));
        let flag = got_init.clone();
        wasm_bindgen_futures::spawn_local(async move {
            if let Ok(resp) = rx.await {
                match resp {
                    DbResponse::Ok { .. } => flag.set(true),
                    DbResponse::Error { message, .. } => {
                        dom::warn(&format!("[db] Worker init returned error: {message}"));
                        crate::errors::report(crate::errors::AppError::DatabaseInit {
                            backend: "sqlite-opfs".to_string(),
                            reason: message,
                        });
                    }
                    DbResponse::Rows { .. } => {
                        dom::warn("[db] Worker init returned unexpected response");
                    }
                }
            }
        });
        for _ in 0..200 {
            if got_init.get() {
                dom::warn("[db] Worker ready (Init response received)");
                return;
            }
            browser_apis::sleep_ms(50).await;
        }
        dom::warn("[db] Worker init timed out after 10s — proceeding anyway");
        dom::toast("Oops! Your progress might not save right now.");
        crate::errors::report(crate::errors::AppError::DatabaseInit {
            backend: "sqlite-opfs".to_string(),
            reason: "Worker init timed out after 10s".to_string(),
        });
    }
}
