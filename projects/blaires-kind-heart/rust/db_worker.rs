//! SQLite Web Worker launcher.
//! Creates the Worker via Trusted Types, hands it to db_client.

use web_sys::{WorkerOptions, WorkerType};
use crate::{bindings, db_client, dom};

pub fn init() {
    let opts = WorkerOptions::new();
    opts.set_type(WorkerType::Module);
    opts.set_name("kindheart-db");

    // Safari 26.2 guarantees Trusted Types, but handle gracefully in case of failure
    let trusted_url = match dom::trusted_script_url("./db-worker.js") {
        Some(url) => url,
        None => {
            web_sys::console::error_1(&"[db] Trusted Types policy unavailable - database disabled".into());
            return;
        }
    };

    match bindings::TrustedWorker::new_with_options(&trusted_url, &opts) {
        Ok(worker) => {
            db_client::init(worker);
        }
        Err(e) => {
            web_sys::console::error_1(&format!("[db] Worker spawn failed: {:?}", e).into());
        }
    }
}
