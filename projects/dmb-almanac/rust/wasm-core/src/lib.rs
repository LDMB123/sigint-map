use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn core_schema_version() -> String {
    "2026-02-04".to_string()
}

#[wasm_bindgen]
pub fn core_ready() -> bool {
    true
}

// NOTE: Feature-gated modules will be wired in migration phase 3.
// This crate provides a consolidated boundary for WASM exports.
