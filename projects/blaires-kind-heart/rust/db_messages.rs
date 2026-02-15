//! Typed messages between Rust and the SQLite Web Worker.
//! serde handles serialization. The Worker does the SQL.
//! WorkerMessage wraps DbRequest + request_id for postMessage — eliminates Reflect calls.

use serde::{Deserialize, Serialize};

pub const DB_WORKER_API_VERSION: u16 = 1;

/// Wrapper sent to the Worker via postMessage.
/// Replaces manual `js_sys::Object::new()` + `Reflect::set()` with typed serde serialization.
#[derive(Serialize)]
pub struct WorkerMessage {
    pub api_version: u16,
    pub request: DbRequest,
    pub request_id: u32,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum DbRequest {
    Init,
    Exec { sql: String, params: Vec<String> },
    Query { sql: String, params: Vec<String> },
    Batch { statements: Vec<(String, Vec<String>)> },
    Export,
    Restore { snapshot_json: String, },
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum DbResponse {
    Ok { request_id: u32 },
    Rows { request_id: u32, data: serde_json::Value },
    Error { request_id: u32, message: String },
}
