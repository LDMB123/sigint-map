//! Typed helpers for parsing SQLite worker rows (`serde_json::Value`).
//! SQLite numeric columns arrive as JSON numbers, so booleans/integers are
//! normalized here to keep one canonical parse path across modules.

use serde_json::Value;

/// Return the first row from a query result array.
pub fn first_row(rows: &Value) -> Option<&Value> {
    rows.as_array()?.first()
}

/// Parse a string column from a row.
pub fn get_string(row: &Value, key: &str) -> Option<String> {
    row.get(key)?.as_str().map(ToString::to_string)
}

/// Parse a numeric column as `f64`.
pub fn get_f64(row: &Value, key: &str) -> Option<f64> {
    row.get(key)?.as_f64()
}

fn f64_to_i64(value: f64) -> Option<i64> {
    if !value.is_finite() || value.fract() != 0.0 {
        return None;
    }
    if value < i64::MIN as f64 || value > i64::MAX as f64 {
        return None;
    }
    Some(value as i64)
}

/// Parse a numeric column as `i32`.
pub fn get_i32(row: &Value, key: &str) -> Option<i32> {
    get_i64(row, key).and_then(|n| i32::try_from(n).ok())
}

/// Parse a numeric column as `i64`.
pub fn get_i64(row: &Value, key: &str) -> Option<i64> {
    get_f64(row, key).and_then(f64_to_i64)
}

/// Parse SQLite boolean stored as INTEGER 0/1.
pub fn get_bool_sqlite(row: &Value, key: &str) -> Option<bool> {
    get_f64(row, key).map(|n| n != 0.0)
}

/// Parse standard `COUNT(*) as count` query result.
pub fn count(rows: &Value) -> i64 {
    first_row(rows)
        .and_then(|row| get_i64(row, "count"))
        .unwrap_or(0)
}
