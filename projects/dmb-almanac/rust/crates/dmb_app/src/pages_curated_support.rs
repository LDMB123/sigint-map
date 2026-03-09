use super::*;

pub(super) async fn load_curated_lists_source() -> Vec<CuratedList> {
    #[cfg(feature = "hydrate")]
    {
        let local = spawn_local_to_send(async move { dmb_idb::list_curated_lists().await.ok() })
            .await
            .unwrap_or_default();
        if !local.is_empty() {
            return local;
        }
    }

    #[cfg(any(feature = "hydrate", feature = "ssr"))]
    {
        get_curated_lists().await.unwrap_or_default()
    }
    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

pub(super) async fn load_curated_list_meta(list_id: i32) -> Option<CuratedList> {
    load_curated_lists_source()
        .await
        .into_iter()
        .find(|list| list.id == list_id)
}

pub(super) async fn load_curated_list_items_source(
    _list_id: i32,
    _limit: usize,
) -> Vec<CuratedListItem> {
    #[cfg(feature = "hydrate")]
    {
        let local = spawn_local_to_send(async move {
            dmb_idb::list_curated_list_items(_list_id, _limit).await.ok()
        })
        .await
        .unwrap_or_default();
        if !local.is_empty() {
            return local;
        }
    }

    #[cfg(any(feature = "hydrate", feature = "ssr"))]
    {
        get_curated_list_items(_list_id, i32::try_from(_limit).unwrap_or(i32::MAX))
            .await
            .unwrap_or_default()
    }
    #[cfg(not(any(feature = "hydrate", feature = "ssr")))]
    {
        Vec::new()
    }
}

pub(super) fn normalized_curated_item_type(raw: &str) -> String {
    normalized_nonempty_lower(Some(raw), "other")
}

pub(super) fn curated_item_type_label(type_key: &str) -> String {
    match type_key {
        "show" => "Show".to_string(),
        "song" => "Song".to_string(),
        "venue" => "Venue".to_string(),
        "guest" => "Guest".to_string(),
        "release" => "Release".to_string(),
        "tour" => "Tour".to_string(),
        "other" => "Other".to_string(),
        custom => titleize_words_with_fallback(custom, "Other"),
    }
}

pub(super) fn curated_item_type_counts(items: &[CuratedListItem]) -> Vec<(String, usize)> {
    let mut counts = BTreeMap::<String, usize>::new();
    for item in items {
        let key = normalized_curated_item_type(&item.item_type);
        *counts.entry(key).or_insert(0) += 1;
    }

    let priority = ["show", "song", "venue", "guest", "release", "tour", "other"];
    let mut ordered = Vec::with_capacity(counts.len());
    for key in priority {
        if let Some(count) = counts.remove(key) {
            ordered.push((key.to_string(), count));
        }
    }
    ordered.extend(counts);
    ordered
}

pub(crate) fn curated_item_href(item: &CuratedListItem) -> Option<String> {
    if let Some(route) = item.item_link.as_deref().and_then(|route| {
        crate::browser::pwa::normalized_item_route(
            route,
            Some(&item.item_type),
            item.item_title.as_deref(),
            item.notes.as_deref(),
        )
    }) {
        return Some(route);
    }

    match normalized_curated_item_type(&item.item_type).as_str() {
        "show" => item.show_id.map(|id| format!("/shows/{id}")),
        "venue" => item.venue_id.map(|id| format!("/venues/{id}")),
        _ => None,
    }
}

pub(super) fn curated_item_context(item: &CuratedListItem) -> Option<String> {
    let mut pieces = Vec::new();
    if let Some(show_id) = item.show_id {
        pieces.push(format!("Show #{show_id}"));
    }
    if let Some(song_id) = item.song_id {
        pieces.push(format!("Song #{song_id}"));
    }
    if let Some(venue_id) = item.venue_id {
        pieces.push(format!("Venue #{venue_id}"));
    }
    if let Some(guest_id) = item.guest_id {
        pieces.push(format!("Guest #{guest_id}"));
    }
    if let Some(release_id) = item.release_id {
        pieces.push(format!("Release #{release_id}"));
    }

    if pieces.is_empty() {
        None
    } else {
        Some(pieces.join(" • "))
    }
}

pub(super) fn curated_item_title(item: &CuratedListItem) -> String {
    item.item_title
        .as_deref()
        .map(str::trim)
        .filter(|title| !title.is_empty())
        .map_or_else(
            || {
                let type_label =
                    curated_item_type_label(&normalized_curated_item_type(&item.item_type));
                format!("{type_label} #{id}", id = item.id)
            },
            ToString::to_string,
        )
}

pub(super) fn curated_item_matches_query(item: &CuratedListItem, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_title = optional_text_matches_query(item.item_title.as_deref(), query);
    let in_notes = optional_text_matches_query(item.notes.as_deref(), query);
    let in_type = text_matches_query(&item.item_type, query);
    in_title || in_notes || in_type
}
