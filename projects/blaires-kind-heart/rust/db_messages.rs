use serde::{Deserialize, Serialize};

include!("db_contract_generated.rs");
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
    Exec {
        sql: String,
        params: Vec<String>,
    },
    Query {
        sql: String,
        params: Vec<String>,
    },
    Batch {
        statements: Vec<(String, Vec<String>)>,
    },
    Export,
    Restore {
        snapshot_json: String,
    },
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum DbResponse {
    Ok {
        request_id: u32,
    },
    Rows {
        request_id: u32,
        data: serde_json::Value,
    },
    Error {
        request_id: u32,
        message: String,
    },
}
