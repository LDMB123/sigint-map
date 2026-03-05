#![cfg_attr(not(test), deny(clippy::unwrap_used, clippy::expect_used))]

use wasm_bindgen::prelude::*;

mod aggregations;
mod webgpu;

pub use aggregations::*;
pub use webgpu::*;

#[wasm_bindgen]
pub fn core_schema_version() -> String {
    dmb_core::version::CORE_SCHEMA_VERSION.to_string()
}
