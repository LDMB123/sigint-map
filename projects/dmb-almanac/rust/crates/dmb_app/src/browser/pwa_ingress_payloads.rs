use super::routes::{
    RouteHints, json_object_field, json_text_field, normalized_entity_type,
    normalized_item_route_with_hints, trimmed_non_empty,
};
use super::*;

fn route_from_typed_entity(value: &serde_json::Value) -> Option<String> {
    let entity_type = json_text_field(value, "type")
        .or_else(|| json_text_field(value, "kind"))
        .or_else(|| json_text_field(value, "entityType"))
        .or_else(|| json_text_field(value, "resultType"))
        .or_else(|| json_text_field(value, "entity_type"))
        .or_else(|| json_text_field(value, "result_type"))
        .or_else(|| json_text_field(value, "itemType"))
        .or_else(|| json_text_field(value, "item_type"))?;

    match normalized_entity_type(&entity_type).as_str() {
        "show" => json_text_field(value, "showId")
            .or_else(|| json_text_field(value, "show_id"))
            .or_else(|| json_text_field(value, "id"))
            .map(|id| format!("/shows/{id}")),
        "song" => json_text_field(value, "songSlug")
            .or_else(|| json_text_field(value, "song_slug"))
            .or_else(|| json_text_field(value, "slug"))
            .map(|slug| format!("/songs/{slug}")),
        "venue" => json_text_field(value, "venueId")
            .or_else(|| json_text_field(value, "venue_id"))
            .or_else(|| json_text_field(value, "id"))
            .map(|id| format!("/venues/{id}")),
        "guest" => json_text_field(value, "guestSlug")
            .or_else(|| json_text_field(value, "guest_slug"))
            .or_else(|| json_text_field(value, "slug"))
            .map(|slug| format!("/guests/{slug}")),
        "tour" => json_text_field(value, "tourYear")
            .or_else(|| json_text_field(value, "tour_year"))
            .or_else(|| json_text_field(value, "year"))
            .or_else(|| json_text_field(value, "id"))
            .map(|year| format!("/tours/{year}")),
        "release" => json_text_field(value, "releaseSlug")
            .or_else(|| json_text_field(value, "release_slug"))
            .or_else(|| json_text_field(value, "slug"))
            .map(|slug| format!("/releases/{slug}")),
        _ => None,
    }
}

fn route_from_nested_entity(value: &serde_json::Value) -> Option<String> {
    let nested = [
        ("show", "show"),
        ("song", "song"),
        ("venue", "venue"),
        ("guest", "guest"),
        ("tour", "tour"),
        ("release", "release"),
    ];

    for (key, entity_type) in nested {
        let Some(nested_value) = json_object_field(value, key) else {
            continue;
        };
        let payload = match entity_type {
            "show" => serde_json::json!({
                "type": entity_type,
                "id": nested_value.get("id").and_then(|inner| inner.as_i64()),
                "showId": nested_value.get("showId").and_then(|inner| inner.as_i64()),
                "show_id": nested_value.get("show_id").and_then(|inner| inner.as_i64())
            }),
            "venue" => serde_json::json!({
                "type": entity_type,
                "id": nested_value.get("id").and_then(|inner| inner.as_i64()),
                "venueId": nested_value.get("venueId").and_then(|inner| inner.as_i64()),
                "venue_id": nested_value.get("venue_id").and_then(|inner| inner.as_i64())
            }),
            "tour" => serde_json::json!({
                "type": entity_type,
                "id": nested_value.get("id").and_then(|inner| inner.as_i64()),
                "year": nested_value.get("year").and_then(|inner| inner.as_i64()),
                "tourYear": nested_value.get("tourYear").and_then(|inner| inner.as_i64()),
                "tour_year": nested_value.get("tour_year").and_then(|inner| inner.as_i64())
            }),
            _ => serde_json::json!({
                "type": entity_type,
                "id": nested_value.get("id").and_then(|inner| inner.as_i64()),
                "slug": nested_value.get("slug").and_then(|inner| inner.as_str())
            }),
        };
        if let Some(route) = route_from_typed_entity(&payload) {
            return Some(route);
        }
    }

    None
}

fn normalized_item_route_from_json_fields(
    value: &serde_json::Value,
    fields: &[&str],
    hints: RouteHints<'_>,
) -> Option<String> {
    fields.iter().find_map(|field| {
        json_text_field(value, field)
            .and_then(|route| normalized_item_route_with_hints(&route, hints))
    })
}

fn route_from_json_payload(value: &serde_json::Value) -> Option<IngressRoute> {
    const ROUTE_FIELDS: &[&str] = &[
        "route",
        "path",
        "href",
        "url",
        "link",
        "itemLink",
        "item_link",
    ];

    let item_type = json_text_field(value, "itemType")
        .or_else(|| json_text_field(value, "item_type"))
        .or_else(|| json_text_field(value, "type"))
        .or_else(|| json_text_field(value, "entityType"))
        .or_else(|| json_text_field(value, "entity_type"));
    let item_title = json_text_field(value, "itemTitle")
        .or_else(|| json_text_field(value, "item_title"))
        .or_else(|| json_text_field(value, "title"))
        .or_else(|| json_text_field(value, "name"));
    let item_notes = json_text_field(value, "itemNotes")
        .or_else(|| json_text_field(value, "item_notes"))
        .or_else(|| json_text_field(value, "notes"));
    let hints = RouteHints::new(
        item_type.as_deref(),
        item_title.as_deref(),
        item_notes.as_deref(),
    );
    let route =
        if let Some(route) = normalized_item_route_from_json_fields(value, ROUTE_FIELDS, hints) {
            Some(route)
        } else if let Some(show_id) = json_text_field(value, "showId") {
            Some(format!("/shows/{show_id}"))
        } else if let Some(show_id) = json_text_field(value, "show_id") {
            Some(format!("/shows/{show_id}"))
        } else if let Some(song_slug) = json_text_field(value, "songSlug") {
            Some(format!("/songs/{song_slug}"))
        } else if let Some(song_slug) = json_text_field(value, "song_slug") {
            Some(format!("/songs/{song_slug}"))
        } else if let Some(venue_id) = json_text_field(value, "venueId") {
            Some(format!("/venues/{venue_id}"))
        } else if let Some(venue_id) = json_text_field(value, "venue_id") {
            Some(format!("/venues/{venue_id}"))
        } else if let Some(guest_slug) = json_text_field(value, "guestSlug") {
            Some(format!("/guests/{guest_slug}"))
        } else if let Some(guest_slug) = json_text_field(value, "guest_slug") {
            Some(format!("/guests/{guest_slug}"))
        } else if let Some(release_slug) = json_text_field(value, "releaseSlug") {
            Some(format!("/releases/{release_slug}"))
        } else if let Some(release_slug) = json_text_field(value, "release_slug") {
            Some(format!("/releases/{release_slug}"))
        } else if let Some(route) = route_from_nested_entity(value) {
            Some(route)
        } else if let Some(route) = route_from_typed_entity(value) {
            Some(route)
        } else {
            json_text_field(value, "tourYear")
                .or_else(|| json_text_field(value, "tour_year"))
                .map(|tour_year| format!("/tours/{tour_year}"))
        }?;

    if route.starts_with("/search") {
        Some(IngressRoute {
            route,
            query: json_text_field(value, "query")
                .or_else(|| json_text_field(value, "text"))
                .or_else(|| json_text_field(value, "title")),
        })
    } else {
        Some(IngressRoute { route, query: None })
    }
}

pub(super) fn resolve_open_file_destination(
    request: &OpenFileRequest,
) -> Option<IngressDestination> {
    let trimmed = request.content.trim();

    if request.mime == "text/plain" || (!trimmed.starts_with('{') && !trimmed.starts_with('[')) {
        let query = trimmed_non_empty(trimmed)?;
        return Some(destination_from_ingress_route(
            search_ingress_route(Some(query)),
            "Search imported text",
            "Open imported destination",
        ));
    }

    let value = serde_json::from_str::<serde_json::Value>(trimmed).ok()?;
    if let Some(route) = route_from_json_payload(&value) {
        return Some(destination_from_ingress_route(
            route,
            "Search imported payload",
            "Open imported destination",
        ));
    }

    let query = json_text_field(&value, "query")
        .or_else(|| json_text_field(&value, "text"))
        .or_else(|| json_text_field(&value, "title"));
    query.map(|query| {
        destination_from_ingress_route(
            search_ingress_route(Some(query)),
            "Search imported payload",
            "Open imported destination",
        )
    })
}

pub fn describe_open_file_request(request: &OpenFileRequest) -> String {
    let trimmed = request.content.trim();
    if trimmed.starts_with('{') {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
            let top_level = value.as_object().map_or(0, serde_json::Map::len);
            return format!("JSON object with {top_level} top-level key(s)");
        }
        return "JSON-like payload with invalid syntax".to_string();
    }
    if trimmed.starts_with('[') {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
            let items = value.as_array().map_or(0, Vec::len);
            return format!("JSON array with {items} item(s)");
        }
        return "JSON-like array with invalid syntax".to_string();
    }
    let line_count = trimmed.lines().count().max(1);
    format!("Text payload with {line_count} line(s)")
}

pub fn open_file_destination(request: &OpenFileRequest) -> Option<IngressDestination> {
    resolve_ingress_destination(IngressSource::OpenFile(request.clone()))
}
