use wasm_bindgen::prelude::*;

mod ai;
#[path = "../../../aggregations/src/debuts.rs"]
mod debuts;
#[path = "../../../aggregations/src/histogram.rs"]
mod histogram;
#[path = "../../../aggregations/src/multi_field.rs"]
mod multi_field;
#[path = "../../../aggregations/src/percentile.rs"]
mod percentile;
#[path = "../../../aggregations/src/top_songs.rs"]
mod top_songs;
#[path = "../../../aggregations/src/unique.rs"]
mod unique;
mod webgpu;

pub use ai::*;
pub use debuts::*;
pub use histogram::*;
pub use multi_field::*;
pub use percentile::*;
pub use top_songs::*;
pub use unique::*;
pub use webgpu::*;

#[wasm_bindgen]
pub fn core_schema_version() -> String {
    dmb_core::version::CORE_SCHEMA_VERSION.to_string()
}

#[wasm_bindgen]
pub fn core_ready() -> bool {
    true
}
