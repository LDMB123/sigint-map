use once_cell::sync::Lazy;
use regex::Regex;
use scraper::{Html, Selector};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;

use super::{
    ScrapeErrorKind, record_empty_selector, record_scrape_error, record_warning_event_with_snippet,
};

static REGEX_CACHE: Lazy<Mutex<HashMap<String, &'static Regex>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static REGEX_FALLBACK: Lazy<Regex> = Lazy::new(|| match Regex::new(r"\b\B") {
    Ok(re) => re,
    Err(primary_err) => match Regex::new("$^") {
        Ok(re) => re,
        Err(secondary_err) => {
            tracing::error!(
                ?primary_err,
                ?secondary_err,
                "failed to compile fallback regexes; aborting"
            );
            std::process::abort();
        }
    },
});

pub(super) fn regex(pattern: &str) -> &'static Regex {
    let normalized = if pattern.contains("\\\\") {
        pattern.replace("\\\\", "\\")
    } else {
        pattern.to_string()
    };
    let mut cache = match REGEX_CACHE.lock() {
        Ok(cache) => cache,
        Err(poisoned) => {
            tracing::warn!("regex cache poisoned; continuing with recovered cache");
            poisoned.into_inner()
        }
    };
    if let Some(re) = cache.get(&normalized) {
        return re;
    }
    let compiled = match Regex::new(&normalized) {
        Ok(re) => re,
        Err(err) => {
            tracing::warn!(pattern, normalized, error = ?err, "invalid regex pattern");
            record_scrape_error(
                ScrapeErrorKind::RegexParse,
                "regex",
                pattern,
                Some(&format!("{err:?}")),
            );
            return &REGEX_FALLBACK;
        }
    };
    let leaked: &'static Regex = Box::leak(Box::new(compiled));
    cache.insert(normalized, leaked);
    leaked
}

pub(super) fn selector_or_warn(name: &str, selector: &str) -> Option<Selector> {
    match Selector::parse(selector) {
        Ok(sel) => Some(sel),
        Err(err) => {
            tracing::warn!(selector, error = ?err, "selector parse failed: {name}");
            record_scrape_error(
                ScrapeErrorKind::SelectorParse,
                "selector",
                selector,
                Some(&format!("{err:?}")),
            );
            None
        }
    }
}

pub(super) fn warn_if_empty(document: &Html, selector: &Selector, context: &str, label: &str) {
    if document.select(selector).next().is_none() {
        record_empty_selector(context, label);
        tracing::warn!(context, selector = label, "selector matched no elements");
    }
}

pub(super) fn warn_missing_field(context: &str, field: &str) {
    super::record_missing_field(context, field);
    tracing::warn!(context, field, "missing critical field");
}

pub(super) fn parse_i32_or_warn(raw: Option<&str>, context: &str, field: &str) -> i32 {
    let Some(text) = raw.map(str::trim).filter(|text| !text.is_empty()) else {
        warn_missing_field(context, field);
        return 0;
    };
    match text.parse::<i32>() {
        Ok(value) => value,
        Err(err) => {
            tracing::warn!(context, field, value = text, error = ?err, "failed to parse i32");
            warn_missing_field(context, field);
            0
        }
    }
}

pub(super) fn parse_i64_or_warn(raw: Option<&str>, context: &str, field: &str) -> i64 {
    let Some(text) = raw.map(str::trim).filter(|text| !text.is_empty()) else {
        warn_missing_field(context, field);
        return 0;
    };
    match text.parse::<i64>() {
        Ok(value) => value,
        Err(err) => {
            tracing::warn!(context, field, value = text, error = ?err, "failed to parse i64");
            warn_missing_field(context, field);
            0
        }
    }
}

pub(super) fn parse_f64_or_warn(raw: Option<&str>, context: &str, field: &str) -> f64 {
    let Some(text) = raw.map(str::trim).filter(|text| !text.is_empty()) else {
        warn_missing_field(context, field);
        return 0.0;
    };
    match text.parse::<f64>() {
        Ok(value) => value,
        Err(err) => {
            tracing::warn!(context, field, value = text, error = ?err, "failed to parse f64");
            warn_missing_field(context, field);
            0.0
        }
    }
}

pub(super) fn warn_if_empty_text(context: &str, field: &str, text: &str) {
    if text.trim().is_empty() {
        warn_missing_field(context, field);
    }
}

pub(super) fn warn_if_missing_value(context: &str, field: &str, value: Option<&Value>) {
    match value {
        None => warn_missing_field(context, field),
        Some(Value::Null) => warn_missing_field(context, field),
        Some(Value::String(text)) if text.trim().is_empty() => warn_missing_field(context, field),
        Some(Value::Array(values)) if values.is_empty() => warn_missing_field(context, field),
        _ => {}
    }
}

pub(super) fn warn_if_missing_text(context: &str, field: &str, value: Option<&str>) {
    match value {
        None => warn_missing_field(context, field),
        Some(text) if text.trim().is_empty() => warn_missing_field(context, field),
        _ => {}
    }
}

pub(super) fn object_all_zero(value: &Value) -> bool {
    match value {
        Value::Object(map) => map.values().all(|entry| entry.as_i64() == Some(0)),
        _ => false,
    }
}

pub(super) fn record_selector_missing_snippet(context: &str, label: &str, snippet: &str) {
    record_warning_event_with_snippet("selector_missing", context, label, snippet);
}
