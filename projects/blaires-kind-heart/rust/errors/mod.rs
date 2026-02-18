//! Structured error types and reporting infrastructure.

mod types;
mod reporter;

#[allow(unused_imports)]  // Used in conditional compilation
pub use types::{AppError, ErrorSeverity};
#[allow(unused_imports)]  // Used in conditional compilation
pub use reporter::{report, clear_old_errors, get_recent_errors, log_diagnostic};
pub use reporter::init_schema;
