use once_cell::sync::Lazy;
use serde_json::Value;
use std::collections::HashSet;
use std::sync::Mutex;

static PIPELINE_WARN_ONCE: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));

fn warn_once(key: String, f: impl FnOnce()) {
    let mut guard = match PIPELINE_WARN_ONCE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    if guard.insert(key) {
        f();
    }
}

pub(crate) fn json_i64_or_warn(value: Option<&Value>, context: &str, field: &str) -> i64 {
    if let Some(v) = value.and_then(serde_json::Value::as_i64) {
        return v;
    }
    if let Some(v) = value
        .and_then(|v| v.as_str())
        .and_then(|v| v.trim().parse::<i64>().ok())
    {
        return v;
    }
    let key = format!("{context}.{field}");
    warn_once(key, || {
        tracing::warn!(context, field, "missing or invalid i64; defaulting to 0");
    });
    0
}

pub(crate) fn json_i32_optional(value: Option<&Value>, context: &str, field: &str) -> Option<i32> {
    let value_i64 = if let Some(v) = value.and_then(serde_json::Value::as_i64) {
        v
    } else if let Some(v) = value
        .and_then(|v| v.as_str())
        .and_then(|v| v.trim().parse::<i64>().ok())
    {
        v
    } else {
        let key = format!("{context}.{field}");
        warn_once(key, || {
            tracing::warn!(context, field, "missing or invalid i64; skipping value");
        });
        return None;
    };

    match i32::try_from(value_i64) {
        Ok(value_i32) => Some(value_i32),
        Err(_) => {
            let key = format!("{context}.{field}.range");
            warn_once(key, || {
                tracing::warn!(
                    context,
                    field,
                    value = value_i64,
                    "i64 value out of i32 range; skipping value"
                );
            });
            None
        }
    }
}

pub(crate) fn json_i32_or_warn(value: Option<&Value>, context: &str, field: &str) -> i32 {
    json_i32_optional(value, context, field).unwrap_or(0)
}
