use scraper::Html;
use serde_json::Value;

use super::super::primitives::record_selector_missing_snippet;
use super::super::{selector_or_warn, warn_if_missing_value, warn_missing_field};
use super::support_parsing::normalize_whitespace;

pub(crate) fn select_first_text_quiet(document: &Html, selectors: &[&str]) -> Option<String> {
    for selector in selectors {
        if let Some(sel) = selector_or_warn("select_first_text", selector) {
            if let Some(el) = document.select(&sel).next() {
                let text = el.text().collect::<String>();
                let normalized = normalize_whitespace(&text);
                if !normalized.is_empty() {
                    return Some(normalized);
                }
            }
        }
    }
    None
}

pub(crate) fn select_first_text(document: &Html, selectors: &[&str]) -> String {
    if let Some(text) = select_first_text_quiet(document, selectors) {
        return text;
    }
    tracing::warn!(selectors = ?selectors, "select_first_text: no selector matched");
    String::new()
}

pub(crate) fn select_first_text_with_fallback(
    document: &Html,
    context: &str,
    label: &str,
    primary: &[&str],
    fallback: &[&str],
) -> String {
    if let Some(text) = select_first_text_quiet(document, primary) {
        return text;
    }
    if let Some(text) = select_first_text_quiet(document, fallback) {
        tracing::warn!(
            context,
            label,
            primary = ?primary,
            fallback = ?fallback,
            "fallback selector used"
        );
        return text;
    }
    warn_missing_field(context, label);
    String::new()
}

pub(crate) fn warn_if_no_selector_match(
    document: &Html,
    context: &str,
    label: &str,
    selectors: &[&str],
) {
    if select_first_text_quiet(document, selectors).is_none() {
        warn_missing_field(context, label);
        let snippet = normalize_whitespace(
            &document
                .root_element()
                .text()
                .collect::<Vec<_>>()
                .join(" ")
                .chars()
                .take(200)
                .collect::<String>(),
        );
        record_selector_missing_snippet(context, label, &snippet);
    }
}

pub(crate) fn validate_required_fields(context: &str, value: &Value, required: &[&str]) {
    let Some(obj) = value.as_object() else {
        for field in required {
            warn_missing_field(context, field);
        }
        return;
    };
    for field in required {
        let entry = obj.get(*field);
        warn_if_missing_value(context, field, entry);
    }
}

pub(crate) fn warn_if_out_of_range(context: &str, field: &str, value: i64, min: i64, max: i64) {
    if value < min || value > max {
        warn_missing_field(context, field);
        tracing::warn!(
            context,
            field,
            value,
            min,
            max,
            "value outside expected range"
        );
    }
}
