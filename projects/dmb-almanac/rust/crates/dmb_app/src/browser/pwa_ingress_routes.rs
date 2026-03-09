use super::*;
use dmb_core::Release;
use std::{collections::HashMap, sync::OnceLock};

pub(super) fn trimmed_non_empty(value: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

pub(super) fn json_text_field(value: &serde_json::Value, key: &str) -> Option<String> {
    value.get(key).and_then(|value| match value {
        serde_json::Value::String(inner) => trimmed_non_empty(inner),
        serde_json::Value::Number(inner) => Some(inner.to_string()),
        _ => None,
    })
}

pub(super) fn json_object_field<'a>(
    value: &'a serde_json::Value,
    key: &str,
) -> Option<&'a serde_json::Map<String, serde_json::Value>> {
    value.get(key)?.as_object()
}

pub(super) fn normalized_entity_type(raw: &str) -> String {
    raw.trim().to_ascii_lowercase().replace(['_', '-', ' '], "")
}

#[derive(Clone, Copy, Debug, Default)]
pub(super) struct RouteHints<'a> {
    pub(super) entity_type: Option<&'a str>,
    pub(super) title: Option<&'a str>,
    pub(super) notes: Option<&'a str>,
}

impl<'a> RouteHints<'a> {
    pub(super) fn new(
        entity_type: Option<&'a str>,
        title: Option<&'a str>,
        notes: Option<&'a str>,
    ) -> Self {
        Self {
            entity_type,
            title,
            notes,
        }
    }
}

fn normalized_title_lookup_key(raw: &str) -> String {
    let mut normalized = String::new();
    let mut last_was_space = false;
    for ch in raw.trim().chars().flat_map(char::to_lowercase) {
        if ch.is_alphanumeric() {
            normalized.push(ch);
            last_was_space = false;
        } else if !last_was_space && !normalized.is_empty() {
            normalized.push(' ');
            last_was_space = true;
        }
    }
    normalized.trim().to_string()
}

fn normalized_local_app_route(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.starts_with('/') && !trimmed.starts_with("//") {
        Some(trimmed.to_string())
    } else {
        None
    }
}

fn trusted_almanac_path(raw: &str) -> Option<&str> {
    let trimmed = raw.trim();
    trimmed
        .strip_prefix("https://dmbalmanac.com")
        .or_else(|| trimmed.strip_prefix("http://dmbalmanac.com"))
        .or_else(|| trimmed.strip_prefix("https://www.dmbalmanac.com"))
        .or_else(|| trimmed.strip_prefix("http://www.dmbalmanac.com"))
}

fn release_slug_lookup() -> &'static HashMap<String, String> {
    static RELEASES_BY_TITLE: OnceLock<HashMap<String, String>> = OnceLock::new();
    RELEASES_BY_TITLE.get_or_init(|| {
        serde_json::from_str::<Vec<Release>>(include_str!(
            "../../../../../data/static-data/releases.json"
        ))
        .unwrap_or_default()
        .into_iter()
        .map(|release| (normalized_title_lookup_key(&release.title), release.slug))
        .collect()
    })
}

fn release_route_from_title(title: Option<&str>) -> Option<String> {
    let title = title?;
    let key = normalized_title_lookup_key(title);
    if key.is_empty() {
        return None;
    }
    release_slug_lookup()
        .get(&key)
        .map(|slug| format!("/releases/{slug}"))
}

fn release_route_from_legacy_id(query: &str) -> Option<String> {
    let slug = match query_param_value(query, "release")?.as_str() {
        "14" => "away-from-the-world",
        "16" => "come-tomorrow",
        "1570" => "walk-around-the-moon",
        _ => return None,
    };
    Some(format!("/releases/{slug}"))
}

fn legacy_show_route_lookup() -> &'static HashMap<String, String> {
    static ROUTES_BY_LEGACY_ID: OnceLock<HashMap<String, String>> = OnceLock::new();
    ROUTES_BY_LEGACY_ID.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../../data/static-data/legacy-show-route-map.json"
        ))
        .unwrap_or_default()
    })
}

fn show_route_from_legacy_id(query: &str) -> Option<String> {
    let legacy_id = query_param_value(query, "id")?;
    legacy_show_route_lookup().get(&legacy_id).cloned()
}

fn show_date_query(raw: &str) -> Option<String> {
    let token = trimmed_non_empty(raw)?;
    let date = if token.contains('.') || token.contains('/') {
        let normalized = token.replace('/', ".");
        let mut parts = normalized.split('.');
        let month = parts.next()?.parse::<u32>().ok()?;
        let day = parts.next()?.parse::<u32>().ok()?;
        let year = parts.next()?;
        if parts.next().is_some() {
            return None;
        }
        let year = match year.len() {
            2 => {
                let short_year = year.parse::<i32>().ok()?;
                if short_year >= 70 {
                    1900 + short_year
                } else {
                    2000 + short_year
                }
            }
            4 => year.parse::<i32>().ok()?,
            _ => return None,
        };
        (year, month, day)
    } else {
        let mut parts = token.split('-');
        let year = parts.next()?.parse::<i32>().ok()?;
        let month = parts.next()?.parse::<u32>().ok()?;
        let day = parts.next()?.parse::<u32>().ok()?;
        if parts.next().is_some() {
            return None;
        }
        (year, month, day)
    };
    let (year, month, day) = date;
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }
    Some(format!("{year:04}-{month:02}-{day:02}"))
}

fn show_date_query_from_notes(notes: Option<&str>) -> Option<String> {
    let notes = notes?;
    notes
        .split(|ch: char| {
            ch.is_whitespace() || matches!(ch, '|' | ',' | ';' | '(' | ')' | '[' | ']')
        })
        .find_map(show_date_query)
}

fn show_route_from_context(title: Option<&str>, notes: Option<&str>) -> Option<String> {
    let query = title
        .and_then(show_date_query)
        .or_else(|| show_date_query_from_notes(notes))?;
    Some(search_ingress_route(Some(query)).route)
}

fn query_param_value(query: &str, key: &str) -> Option<String> {
    query
        .split('&')
        .find_map(|pair| pair.split_once('=').filter(|(name, _)| *name == key))
        .map(|(_, value)| value.trim())
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn is_legacy_show_path(path: &str) -> bool {
    path.eq_ignore_ascii_case("tourshowset.aspx") || path.eq_ignore_ascii_case("showsetlist.aspx")
}

fn legacy_show_route_with_query(query: &str, hints: RouteHints<'_>) -> Option<String> {
    show_route_from_context(hints.title, hints.notes)
        .or_else(|| show_route_from_legacy_id(query))
        .or_else(|| Some("/shows".to_string()))
}

fn legacy_release_route_with_query(query: &str, hints: RouteHints<'_>) -> Option<String> {
    release_route_from_title(hints.title)
        .or_else(|| release_route_from_legacy_id(query))
        .or_else(|| Some("/releases".to_string()))
}

fn legacy_venue_route(query: &str) -> Option<String> {
    query_param_value(query, "vid")
        .map(|id| format!("/venues/{id}"))
        .or_else(|| Some("/venues".to_string()))
}

fn legacy_almanac_route(raw: &str, hints: RouteHints<'_>) -> Option<String> {
    let trimmed = raw.trim();
    let legacy_path = trimmed.trim_start_matches('/');
    if legacy_path.is_empty() {
        return None;
    }
    let (path, query) = legacy_path.split_once('?').unwrap_or((legacy_path, ""));
    match path.to_ascii_lowercase().as_str() {
        "tourshowset.aspx" | "showsetlist.aspx" => legacy_show_route_with_query(query, hints),
        "venuestats.aspx" => legacy_venue_route(query),
        "releaseview.aspx" => legacy_release_route_with_query(query, hints),
        "releases.aspx" => Some("/releases".to_string()),
        "songstats.aspx" | "summary.aspx" | "songs/summary.aspx" => Some("/songs".to_string()),
        "gueststats.aspx" | "tourguestshows.aspx" => Some("/guests".to_string()),
        "tours.aspx" => Some("/tours".to_string()),
        _ => match hints.entity_type.map(normalized_entity_type).as_deref() {
            Some("release") if path.eq_ignore_ascii_case("releaseview.aspx") => {
                legacy_release_route_with_query(query, hints)
            }
            Some("show") if is_legacy_show_path(path) => legacy_show_route_with_query(query, hints),
            Some("venue") if path.eq_ignore_ascii_case("venuestats.aspx") => {
                legacy_venue_route(query)
            }
            _ => None,
        },
    }
}

pub(super) fn normalized_item_route_with_hints(raw: &str, hints: RouteHints<'_>) -> Option<String> {
    let trimmed = raw.trim();
    if let Some(route) = legacy_almanac_route(trimmed, hints) {
        return Some(route);
    }
    if let Some(route) = normalized_local_app_route(trimmed) {
        return Some(route);
    }
    let path = trusted_almanac_path(trimmed)?;
    if let Some(route) = legacy_almanac_route(path, hints) {
        return Some(route);
    }
    normalized_local_app_route(path)
}

pub(crate) fn normalized_item_route(
    raw: &str,
    entity_type: Option<&str>,
    title: Option<&str>,
    notes: Option<&str>,
) -> Option<String> {
    normalized_item_route_with_hints(raw, RouteHints::new(entity_type, title, notes))
}

#[cfg(test)]
pub(crate) fn normalized_app_route(raw: &str) -> Option<String> {
    normalized_item_route(raw, None, None, None)
}
