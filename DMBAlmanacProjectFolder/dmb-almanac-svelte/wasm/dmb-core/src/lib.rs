//! DMB Core - High-performance data processing for DMB Almanac
//!
//! This crate provides core types, transformation, validation, and aggregation
//! functionality for the DMB Almanac application.

pub mod types;
pub mod transform;
pub mod validate;
pub mod aggregation;

use wasm_bindgen::prelude::*;

// Re-export public types
pub use types::*;
pub use transform::*;
pub use validate::*;
pub use aggregation::*;

/// Initialize panic hook for better error messages in development.
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Get the WASM module version.
#[wasm_bindgen(js_name = "version")]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert!(!version().is_empty());
    }
}
