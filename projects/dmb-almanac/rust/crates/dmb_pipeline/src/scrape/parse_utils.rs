use super::*;

pub(super) fn select_first_text_quiet(document: &Html, selectors: &[&str]) -> Option<String> {
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

pub(super) fn select_first_text(document: &Html, selectors: &[&str]) -> String {
    if let Some(text) = select_first_text_quiet(document, selectors) {
        return text;
    }
    tracing::warn!(selectors = ?selectors, "select_first_text: no selector matched");
    String::new()
}

pub(super) fn select_first_text_with_fallback(
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

pub(super) fn warn_if_no_selector_match(
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
        record_warning_event_with_snippet("selector_missing", context, label, &snippet);
    }
}

pub(super) fn validate_required_fields(context: &str, value: &Value, required: &[&str]) {
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

pub(super) fn warn_if_out_of_range(context: &str, field: &str, value: i64, min: i64, max: i64) {
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

pub(super) fn normalize_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub(super) fn slugify(value: &str) -> String {
    let lower = value.to_lowercase();
    let cleaned: String = lower
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { ' ' })
        .collect();
    cleaned
        .split_whitespace()
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

pub(super) fn create_sort_title(value: &str) -> String {
    let lower = value.to_lowercase();
    let trimmed = lower.trim();
    for prefix in ["the ", "a ", "an "] {
        if let Some(stripped) = trimmed.strip_prefix(prefix) {
            return stripped.to_string();
        }
    }
    trimmed.to_string()
}

pub(super) fn build_search_text(parts: &[&str]) -> String {
    parts
        .iter()
        .filter(|part| !part.trim().is_empty())
        .map(|part| part.to_lowercase())
        .collect::<Vec<_>>()
        .join(" ")
}

pub(super) fn parse_date(value: &str) -> String {
    let trimmed = value.trim();
    if regex(r"^\d{4}-\d{2}-\d{2}$").is_match(trimmed) {
        return trimmed.to_string();
    }

    if let Some(cap) = regex(r"^(\d{1,2})/(\d{1,2})/(\d{4})$").captures(trimmed) {
        let month = cap
            .get(1)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let day = cap
            .get(2)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let year = cap
            .get(3)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1970);
        return format!("{year:04}-{month:02}-{day:02}");
    }

    if let Some(cap) = regex(r"^(\d{4})/(\d{1,2})/(\d{1,2})$").captures(trimmed) {
        let year = cap
            .get(1)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1970);
        let month = cap
            .get(2)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let day = cap
            .get(3)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        return format!("{year:04}-{month:02}-{day:02}");
    }

    if let Some(cap) = regex(r"(?i)(\w+)\s+(\d{1,2}),?\s+(\d{4})").captures(trimmed) {
        let month_name = cap
            .get(1)
            .map(|m| m.as_str().to_lowercase())
            .unwrap_or_default();
        let month = match &month_name[..] {
            "january" => 1,
            "february" => 2,
            "march" => 3,
            "april" => 4,
            "may" => 5,
            "june" => 6,
            "july" => 7,
            "august" => 8,
            "september" => 9,
            "october" => 10,
            "november" => 11,
            "december" => 12,
            _ => 1,
        };
        let day = cap
            .get(2)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1);
        let year = cap
            .get(3)
            .and_then(|m| m.as_str().parse::<u32>().ok())
            .unwrap_or(1970);
        return format!("{year:04}-{month:02}-{day:02}");
    }

    trimmed.to_string()
}

pub(super) fn parse_show_date(value: &str) -> Option<String> {
    if let Some(cap) = regex(r"(\d{2})\.(\d{2})\.(\d{4})").captures(value) {
        let month = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let year = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    if let Some(cap) = regex(r"(\d{4})-(\d{2})-(\d{2})").captures(value) {
        let year = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let month = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    if let Some(cap) = regex(r"(\d{4})/(\d{2})/(\d{2})").captures(value) {
        let year = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let month = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    if let Some(cap) = regex(r"(\d{1,2})/(\d{1,2})/(\d{4})").captures(value) {
        let month = cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let day = cap.get(2).and_then(|m| m.as_str().parse::<u32>().ok())?;
        let year = cap.get(3).and_then(|m| m.as_str().parse::<u32>().ok())?;
        return Some(format!("{year:04}-{month:02}-{day:02}"));
    }
    None
}

pub(super) fn parse_location(text: &str) -> Option<(String, Option<String>, String)> {
    let text = normalize_whitespace(text);
    let us = regex(r"^([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?$");
    if let Some(cap) = us.captures(&text) {
        let city = cap.get(1)?.as_str().trim().to_string();
        let state = cap.get(2)?.as_str().trim().to_string();
        let country = cap
            .get(3)
            .map(|m| m.as_str().trim().to_string())
            .unwrap_or_else(|| "USA".to_string());
        return Some((city, Some(state), country));
    }

    let intl = regex(r"^([^,]+),\s*([A-Za-z\s]{2,})$");
    if let Some(cap) = intl.captures(&text) {
        let city = cap.get(1)?.as_str().trim().to_string();
        let country = cap.get(2)?.as_str().trim().to_string();
        return Some((city, None, country));
    }

    None
}

pub(super) fn guess_venue_type(name: &str, body: &str) -> Option<String> {
    let haystack = format!("{name} {body}").to_lowercase();
    for marker in [
        "amphitheater",
        "amphitheatre",
        "arena",
        "stadium",
        "theater",
        "theatre",
        "club",
        "festival",
        "coliseum",
        "pavilion",
        "ballpark",
        "field",
        "center",
        "centre",
        "garden",
        "hall",
        "park",
    ] {
        if haystack.contains(marker) {
            return Some(marker.to_string());
        }
    }
    None
}

pub(super) fn detect_release_type(body: &str) -> Option<String> {
    let lower = body.to_lowercase();
    let known = [
        ("live trax", "live_trax"),
        ("dmblive", "dmblive"),
        ("warehouse", "warehouse"),
        ("broadcast", "broadcast"),
        ("live album", "live"),
        ("live release", "live"),
        ("live recording", "live"),
        ("compilation", "compilation"),
        ("greatest hits", "compilation"),
        ("best of", "compilation"),
        ("dvd", "video"),
        ("blu-ray", "video"),
        ("video", "video"),
        ("box set", "box_set"),
        ("boxset", "box_set"),
        ("studio album", "studio"),
        ("studio release", "studio"),
        ("single", "single"),
    ];
    for (needle, release_type) in known {
        if lower.contains(needle) {
            return Some(release_type.to_string());
        }
    }
    if regex(r"\\bep\\b").is_match(&lower) {
        return Some("ep".to_string());
    }
    None
}

pub(super) fn stable_id_from_string(value: &str) -> i32 {
    if let Ok(parsed) = value.parse::<i32>() {
        return parsed;
    }
    let hash = blake3::hash(value.as_bytes());
    let bytes = hash.as_bytes();
    let raw = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    (raw % i32::MAX as u32) as i32
}

pub(super) fn parse_dot_date(value: &str) -> Option<String> {
    let caps = regex(r"(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})").captures(value)?;
    let mut year = caps.get(3)?.as_str().to_string();
    if year.len() == 2 {
        let year_num: i32 = year.parse().ok()?;
        year = if year_num > 50 {
            format!("19{year}")
        } else {
            format!("20{year}")
        };
    }
    let month = format!("{:02}", caps.get(1)?.as_str().parse::<u32>().ok()?);
    let day = format!("{:02}", caps.get(2)?.as_str().parse::<u32>().ok()?);
    Some(format!("{year}-{month}-{day}"))
}

pub(super) fn parse_mdy_any(value: &str) -> Option<String> {
    let caps = regex(r"(\\d{1,2})[\\./](\\d{1,2})[\\./](\\d{2,4})").captures(value)?;
    let month = caps.get(1)?.as_str().parse::<u32>().ok()?;
    let day = caps.get(2)?.as_str().parse::<u32>().ok()?;
    let mut year = caps.get(3)?.as_str().to_string();
    if year.len() == 2 {
        let year_num: i32 = year.parse().ok()?;
        year = if year_num > 50 {
            format!("19{year}")
        } else {
            format!("20{year}")
        };
    }
    Some(format!("{year}-{month:02}-{day:02}"))
}

pub(super) fn parse_date_any(value: &str) -> Option<String> {
    if let Some(parsed) = parse_mdy_any(value) {
        return Some(parsed);
    }
    let month_re = regex(
        r"(?i)\\b(january|february|march|april|may|june|july|august|september|october|november|december)\\b",
    );
    if month_re.is_match(value) {
        return Some(parse_date(value));
    }
    None
}
