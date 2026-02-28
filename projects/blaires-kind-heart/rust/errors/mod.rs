//! Structured error types and reporting infrastructure.

mod reporter;
mod types;

pub use reporter::init_schema;
#[allow(unused_imports)] // Used in conditional compilation
pub use reporter::{clear_old_errors, get_recent_errors, log_diagnostic, report};
#[allow(unused_imports)] // Used in conditional compilation
pub use types::{AppError, ErrorSeverity};
