use wasm_bindgen::prelude::*;

mod aggregations;
mod ai;
mod webgpu;

pub use aggregations::*;
pub use ai::*;
pub use webgpu::*;

#[wasm_bindgen]
pub fn core_schema_version() -> String {
    dmb_core::version::CORE_SCHEMA_VERSION.to_string()
}

#[wasm_bindgen]
pub fn core_ready() -> bool {
    true
}
