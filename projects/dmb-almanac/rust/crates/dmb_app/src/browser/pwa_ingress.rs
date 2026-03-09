use super::*;

#[path = "pwa_ingress_payloads.rs"]
mod payloads;
#[path = "pwa_ingress_routes.rs"]
mod routes;

use payloads::resolve_open_file_destination;
#[cfg(test)]
pub(crate) use routes::normalized_app_route;
pub(crate) use routes::normalized_item_route;
use routes::trimmed_non_empty;

#[derive(Clone, Debug, PartialEq, Eq)]
struct IngressRoute {
    route: String,
    query: Option<String>,
}

fn normalize_non_empty(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
fn join_search_terms(values: impl IntoIterator<Item = Option<String>>) -> Option<String> {
    let combined = values
        .into_iter()
        .flatten()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    if combined.is_empty() {
        None
    } else {
        Some(combined.join(" "))
    }
}

#[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
pub fn current_search_query_seed() -> Option<String> {
    let explicit_query = normalize_non_empty(crate::browser::runtime::location_search_param("q"));
    if explicit_query.is_some() {
        return explicit_query;
    }

    join_search_terms([
        crate::browser::runtime::location_search_param("text"),
        crate::browser::runtime::location_search_param("title"),
        crate::browser::runtime::location_search_param("url"),
    ])
}

#[cfg(not(all(feature = "hydrate", target_arch = "wasm32")))]
pub fn current_search_query_seed() -> Option<String> {
    None
}

pub fn current_search_destination() -> IngressDestination {
    resolve_ingress_destination(IngressSource::SearchQuery(current_search_query_seed()))
        .unwrap_or_else(|| IngressDestination {
            route: "/search".to_string(),
            query: None,
            label: "Open shared search".to_string(),
        })
}

#[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
fn encoded_query_string(query: &str, filter: &str) -> Option<String> {
    let params = web_sys::UrlSearchParams::new_with_str("").ok()?;
    let query = query.trim();
    if !query.is_empty() {
        params.set("q", query);
    }
    let filter = filter.trim();
    if !filter.is_empty() && filter != "all" {
        params.set("type", filter);
    }
    Some(params.to_string().as_string().unwrap_or_default())
}

#[cfg(not(all(feature = "hydrate", target_arch = "wasm32")))]
fn encoded_query_string(query: &str, filter: &str) -> Option<String> {
    let mut params = Vec::new();
    let query = query.trim();
    if !query.is_empty() {
        params.push(format!("q={query}"));
    }
    let filter = filter.trim();
    if !filter.is_empty() && filter != "all" {
        params.push(format!("type={filter}"));
    }
    Some(params.join("&"))
}

pub fn build_search_location(pathname: &str, hash: &str, query: &str, filter: &str) -> String {
    let encoded = encoded_query_string(query, filter).unwrap_or_default();
    let query_string = if encoded.is_empty() {
        String::new()
    } else {
        format!("?{encoded}")
    };
    format!("{pathname}{query_string}{hash}")
}

fn decode_protocol_url(raw: &str) -> String {
    raw.replace("%3A", ":")
        .replace("%2F", "/")
        .replace("%3F", "?")
        .replace("%3D", "=")
        .replace("%26", "&")
        .replace("%20", " ")
}

fn search_ingress_route(query: Option<String>) -> IngressRoute {
    let query = query.and_then(|value| trimmed_non_empty(&value));
    IngressRoute {
        route: build_search_location("/search", "", query.as_deref().unwrap_or_default(), "all"),
        query,
    }
}

fn destination_from_ingress_route(
    route: IngressRoute,
    search_label: &str,
    route_label: &str,
) -> IngressDestination {
    let is_search = route.route.starts_with("/search");
    IngressDestination {
        query: route.query,
        label: if is_search {
            search_label.to_string()
        } else {
            route_label.to_string()
        },
        route: route.route,
    }
}

pub fn parse_protocol_payload(raw: Option<String>) -> ProtocolPayload {
    let Some(raw_value) = normalize_non_empty(raw) else {
        return ProtocolPayload {
            raw: None,
            route: "/protocol".to_string(),
            query: None,
            status: "No protocol payload.".to_string(),
        };
    };

    let decoded = decode_protocol_url(&raw_value);
    let normalized = decoded.trim();

    if normalized.contains("search") || normalized.contains("q=") {
        let query = normalized
            .split("q=")
            .nth(1)
            .map(|value| {
                value
                    .split('&')
                    .next()
                    .unwrap_or_default()
                    .trim()
                    .to_string()
            })
            .filter(|value| !value.is_empty());
        return ProtocolPayload {
            raw: Some(raw_value),
            route: "/search".to_string(),
            query: query.clone(),
            status: if query.is_some() {
                "Protocol payload mapped to search.".to_string()
            } else {
                "Protocol payload routed to search.".to_string()
            },
        };
    }

    let route = normalized
        .find("shows/")
        .or_else(|| normalized.find("songs/"))
        .or_else(|| normalized.find("venues/"))
        .or_else(|| normalized.find("guests/"))
        .or_else(|| normalized.find("tours/"))
        .or_else(|| normalized.find("releases/"))
        .map(|index| format!("/{}", &normalized[index..]));

    if let Some(route) = route {
        return ProtocolPayload {
            raw: Some(raw_value),
            route,
            query: None,
            status: "Protocol payload mapped to an in-app route.".to_string(),
        };
    }

    ProtocolPayload {
        raw: Some(raw_value),
        route: "/protocol".to_string(),
        query: None,
        status: "Protocol payload is not recognized by this build.".to_string(),
    }
}

pub fn protocol_destination(payload: &ProtocolPayload) -> Option<IngressDestination> {
    resolve_ingress_destination(IngressSource::Protocol(payload.clone()))
}
pub use payloads::{describe_open_file_request, open_file_destination};

pub fn resolve_ingress_destination(source: IngressSource) -> Option<IngressDestination> {
    match source {
        IngressSource::SearchQuery(query) => Some(destination_from_ingress_route(
            search_ingress_route(query),
            "Open shared search",
            "Open linked destination",
        )),
        IngressSource::Protocol(payload) => {
            if payload.route == "/protocol" {
                return None;
            }

            let route = if payload.route == "/search" {
                search_ingress_route(payload.query)
            } else {
                IngressRoute {
                    route: payload.route,
                    query: payload.query,
                }
            };

            Some(destination_from_ingress_route(
                route,
                "Open search results",
                "Open linked destination",
            ))
        }
        IngressSource::OpenFile(request) => resolve_open_file_destination(&request),
    }
}
