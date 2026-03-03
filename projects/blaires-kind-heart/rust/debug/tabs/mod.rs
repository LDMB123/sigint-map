//! Debug panel tab implementations.

pub mod database;
pub mod errors;
pub mod memory;
pub mod performance;
pub mod queue;

/// Escapes HTML special characters for safe interpolation into debug output.
pub(super) fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
