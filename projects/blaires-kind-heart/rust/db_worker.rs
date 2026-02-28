use crate::{bindings, db_client, dom};
use web_sys::{WorkerOptions, WorkerType};
pub fn init() {
    let opts = WorkerOptions::new();
    opts.set_type(WorkerType::Module);
    opts.set_name("kindheart-db");
    let Some(trusted_url) = dom::trusted_script_url("./db-worker.js") else {
        web_sys::console::error_1(
            &"[db] Trusted Types policy unavailable - database disabled".into(),
        );
        return;
    };
    match bindings::TrustedWorker::new_with_options(&trusted_url, &opts) {
        Ok(worker) => {
            db_client::init(worker);
        }
        Err(e) => {
            web_sys::console::error_1(&format!("[db] Worker spawn failed: {e:?}").into());
        }
    }
}
