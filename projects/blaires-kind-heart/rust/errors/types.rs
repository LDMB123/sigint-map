//! Error type definitions with severity levels.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AppError {
    DatabaseInit {
        backend: String,
        reason: String,
    },
    DatabaseOperation {
        operation: String,
        sql: String,
        error: String,
    },
    GpuTimeout {
        timeout_ms: u32,
        context: String,
    },
    OfflineQueueFlush {
        failed_count: usize,
        reason: String,
    },
    StickerMapping {
        skill_name: String,
        available_skills: Vec<String>,
    },
    RenderPanic {
        component: String,
        info: String,
    },
    StorageQuota {
        requested_bytes: usize,
        available_bytes: usize,
    },
    WebLockTimeout {
        lock_name: String,
        timeout_ms: u32,
    },
    Generic {
        message: String,
        context: Option<String>,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ErrorSeverity {
    Critical,  // App-breaking, requires immediate attention
    Error,     // Functionality broken, but app continues
    Warning,   // Degraded functionality, user should know
    Info,      // FYI, no action needed
}

impl AppError {
    /// Get the severity level for this error type.
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            AppError::DatabaseInit { .. } => ErrorSeverity::Critical,
            AppError::RenderPanic { .. } => ErrorSeverity::Critical,
            AppError::StorageQuota { .. } => ErrorSeverity::Critical,
            AppError::DatabaseOperation { .. } => ErrorSeverity::Error,
            AppError::OfflineQueueFlush { .. } => ErrorSeverity::Error,
            AppError::StickerMapping { .. } => ErrorSeverity::Error,
            AppError::WebLockTimeout { .. } => ErrorSeverity::Error,
            AppError::GpuTimeout { .. } => ErrorSeverity::Warning,
            AppError::Generic { .. } => ErrorSeverity::Info,
        }
    }

    /// Get a short title for display.
    #[allow(dead_code)]
    pub fn title(&self) -> String {
        match self {
            AppError::DatabaseInit { backend, .. } => format!("DB Init Failed ({})", backend),
            AppError::DatabaseOperation { operation, .. } => format!("DB {} Failed", operation),
            AppError::GpuTimeout { .. } => "GPU Timeout".to_string(),
            AppError::OfflineQueueFlush { failed_count, .. } => {
                format!("Queue Flush Failed ({} items)", failed_count)
            }
            AppError::StickerMapping { skill_name, .. } => {
                format!("Unknown Skill: {}", skill_name)
            }
            AppError::RenderPanic { component, .. } => format!("Render Panic: {}", component),
            AppError::StorageQuota { .. } => "Storage Quota Exceeded".to_string(),
            AppError::WebLockTimeout { lock_name, .. } => format!("Lock Timeout: {}", lock_name),
            AppError::Generic { message, .. } => message.clone(),
        }
    }

    /// Get a detailed description for display.
    pub fn description(&self) -> String {
        match self {
            AppError::DatabaseInit { backend, reason } => {
                format!("Failed to initialize {} database: {}", backend, reason)
            }
            AppError::DatabaseOperation { operation, sql, error } => {
                format!("Operation '{}' failed on query '{}': {}", operation, sql, error)
            }
            AppError::GpuTimeout { timeout_ms, context } => {
                format!("GPU init timed out after {}ms: {}", timeout_ms, context)
            }
            AppError::OfflineQueueFlush { failed_count, reason } => {
                format!("{} offline mutations failed to flush: {}", failed_count, reason)
            }
            AppError::StickerMapping { skill_name, available_skills } => {
                format!(
                    "Skill '{}' not found. Available: {}",
                    skill_name,
                    available_skills.join(", ")
                )
            }
            AppError::RenderPanic { component, info } => {
                format!("Component '{}' panicked during render: {}", component, info)
            }
            AppError::StorageQuota { requested_bytes, available_bytes } => {
                format!(
                    "Storage quota exceeded. Requested: {} bytes, Available: {} bytes",
                    requested_bytes, available_bytes
                )
            }
            AppError::WebLockTimeout { lock_name, timeout_ms } => {
                format!("Failed to acquire lock '{}' after {}ms", lock_name, timeout_ms)
            }
            AppError::Generic { message, context } => {
                if let Some(ctx) = context {
                    format!("{} ({})", message, ctx)
                } else {
                    message.clone()
                }
            }
        }
    }
}

impl std::fmt::Display for ErrorSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ErrorSeverity::Critical => write!(f, "CRITICAL"),
            ErrorSeverity::Error => write!(f, "ERROR"),
            ErrorSeverity::Warning => write!(f, "WARNING"),
            ErrorSeverity::Info => write!(f, "INFO"),
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.severity(), self.description())
    }
}
