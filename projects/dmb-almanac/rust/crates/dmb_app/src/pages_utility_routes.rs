use super::*;

#[path = "pages_utility_catalog.rs"]
mod catalog;
#[path = "pages_utility_runtime.rs"]
mod runtime;

pub use catalog::{discography_page, liberation_page, visualizations_page};
pub use runtime::{open_file_page, protocol_page, test_wasm_page};
