//! Error types for DMB Almanac data transformation.
//!
//! Provides structured error types that can be serialized to JavaScript
//! for detailed error reporting.

use serde::Serialize;
use std::fmt;

/// Transform error types.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TransformError {
    /// JSON parsing failed
    ParseError {
        message: String,
        /// Optional position in JSON where error occurred
        position: Option<usize>,
    },

    /// Required field is missing
    MissingField {
        entity_type: String,
        entity_id: Option<i64>,
        field: String,
    },

    /// Field has invalid type
    InvalidType {
        entity_type: String,
        entity_id: Option<i64>,
        field: String,
        expected: String,
        actual: String,
    },

    /// Invalid enum value
    InvalidEnum {
        entity_type: String,
        entity_id: Option<i64>,
        field: String,
        value: String,
        valid_values: Vec<String>,
    },

    /// Foreign key reference is invalid
    InvalidReference {
        entity_type: String,
        entity_id: i64,
        field: String,
        referenced_type: String,
        referenced_id: i64,
    },

    /// Date parsing failed
    InvalidDate {
        entity_type: String,
        entity_id: Option<i64>,
        field: String,
        value: String,
    },

    /// Serialization to JS failed
    SerializationError { message: String },
}

impl fmt::Display for TransformError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TransformError::ParseError { message, position } => {
                write!(f, "JSON parse error: {}", message)?;
                if let Some(pos) = position {
                    write!(f, " at position {}", pos)?;
                }
                Ok(())
            }

            TransformError::MissingField {
                entity_type,
                entity_id,
                field,
            } => {
                write!(f, "Missing required field '{}' in {}", field, entity_type)?;
                if let Some(id) = entity_id {
                    write!(f, " (id: {})", id)?;
                }
                Ok(())
            }

            TransformError::InvalidType {
                entity_type,
                entity_id,
                field,
                expected,
                actual,
            } => {
                write!(
                    f,
                    "Invalid type for field '{}' in {}: expected {}, got {}",
                    field, entity_type, expected, actual
                )?;
                if let Some(id) = entity_id {
                    write!(f, " (id: {})", id)?;
                }
                Ok(())
            }

            TransformError::InvalidEnum {
                entity_type,
                entity_id,
                field,
                value,
                valid_values,
            } => {
                write!(
                    f,
                    "Invalid value '{}' for field '{}' in {}: valid values are {:?}",
                    value, field, entity_type, valid_values
                )?;
                if let Some(id) = entity_id {
                    write!(f, " (id: {})", id)?;
                }
                Ok(())
            }

            TransformError::InvalidReference {
                entity_type,
                entity_id,
                field,
                referenced_type,
                referenced_id,
            } => {
                write!(
                    f,
                    "Invalid reference in {} (id: {}): field '{}' references non-existent {} (id: {})",
                    entity_type, entity_id, field, referenced_type, referenced_id
                )
            }

            TransformError::InvalidDate {
                entity_type,
                entity_id,
                field,
                value,
            } => {
                write!(
                    f,
                    "Invalid date '{}' for field '{}' in {}",
                    value, field, entity_type
                )?;
                if let Some(id) = entity_id {
                    write!(f, " (id: {})", id)?;
                }
                Ok(())
            }

            TransformError::SerializationError { message } => {
                write!(f, "Serialization error: {}", message)
            }
        }
    }
}

impl std::error::Error for TransformError {}

impl From<serde_json::Error> for TransformError {
    fn from(err: serde_json::Error) -> Self {
        TransformError::ParseError {
            message: err.to_string(),
            position: Some(err.column()),
        }
    }
}

// ==================== TESTS ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = TransformError::MissingField {
            entity_type: "song".to_string(),
            entity_id: Some(42),
            field: "title".to_string(),
        };
        assert_eq!(
            err.to_string(),
            "Missing required field 'title' in song (id: 42)"
        );
    }

    #[test]
    fn test_error_serialization() {
        let err = TransformError::ParseError {
            message: "unexpected token".to_string(),
            position: Some(123),
        };

        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("parseError"));
        assert!(json.contains("unexpected token"));
    }
}
