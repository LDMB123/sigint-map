use super::*;

fn normalized_set_key(raw: Option<&str>) -> String {
    normalized_nonempty_lower(raw, "unspecified")
}

fn setlist_set_label(key: &str) -> String {
    if key == "unspecified" {
        "Unspecified".to_string()
    } else {
        titleize_words_with_fallback(key, "Unknown")
    }
}

pub(crate) fn setlist_set_counts(items: &[SetlistEntry]) -> Vec<(String, usize)> {
    let mut counts = Vec::<(String, usize)>::new();
    for entry in items {
        let key = normalized_set_key(entry.set_name.as_deref());
        if let Some((_, count)) = counts.iter_mut().find(|(existing, _)| existing == &key) {
            *count += 1;
        } else {
            counts.push((key, 1));
        }
    }
    counts
}

fn setlist_entry_matches_query(entry: &SetlistEntry, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_song_title = entry
        .song
        .as_ref()
        .is_some_and(|song| text_matches_query(&song.title, query));
    let in_slot = optional_text_matches_query(entry.slot.as_deref(), query);
    let in_set = optional_text_matches_query(entry.set_name.as_deref(), query);
    let in_notes = optional_text_matches_query(entry.notes.as_deref(), query);
    in_song_title || in_slot || in_set || in_notes
}

fn render_setlist_filter_buttons(
    total_count: usize,
    set_counts: Vec<(String, usize)>,
    active_set: RwSignal<String>,
) -> impl IntoView {
    let active_set_for_class = active_set.clone();
    let active_set_for_aria = active_set.clone();
    let active_set_for_click = active_set.clone();

    view! {
        <div
            class="result-filters"
            role="group"
            aria-label="Setlist filters"
            aria-controls="show-setlist-results"
        >
            <button
                type="button"
                class="result-filter pill pill--ghost"
                class:result-filter--active=move || active_set_for_class.get() == "all"
                aria-pressed=move || active_set_for_aria.get() == "all"
                on:click=move |_| active_set_for_click.set("all".to_string())
            >
                {format!("All ({total_count})")}
            </button>
            {set_counts
                .into_iter()
                .map(|(set_key, count)| {
                    let label = setlist_set_label(&set_key);
                    let key_for_class = set_key.clone();
                    let key_for_aria = set_key.clone();
                    let key_for_click = set_key;
                    let class_active_set = active_set.clone();
                    let aria_active_set = active_set.clone();
                    let click_active_set = active_set.clone();

                    view! {
                        <button
                            type="button"
                            class="result-filter pill pill--ghost"
                            class:result-filter--active=move || class_active_set.get() == key_for_class
                            aria-pressed=move || aria_active_set.get() == key_for_aria
                            on:click=move |_| click_active_set.set(key_for_click.clone())
                        >
                            {format!("{label} ({count})")}
                        </button>
                    }
                })
                .collect::<Vec<_>>()}
        </div>
    }
}

fn render_setlist_entries_list(filtered_items: Vec<SetlistEntry>) -> impl IntoView {
    view! {
        <ol id="show-setlist-results" class="setlist" aria-label="Show setlist">
            {filtered_items
                .into_iter()
                .map(|entry| {
                    let label = entry.song.as_ref().map_or_else(
                        || format!("Song #{}", entry.song_id),
                        |song| song.title.clone(),
                    );
                    let slot = entry.slot.as_deref().map_or_else(
                        || "Song".to_string(),
                        |raw| titleize_words_with_fallback(raw, "Unknown"),
                    );
                    let set_label =
                        setlist_set_label(&normalized_set_key(entry.set_name.as_deref()));
                    let song_href = entry.song.as_ref().and_then(|song| {
                        let slug = song.slug.trim();
                        if slug.is_empty() {
                            None
                        } else {
                            Some(format!("/songs/{slug}"))
                        }
                    });
                    let title_view = match song_href {
                        Some(href) => view! {
                            <a class="setlist-title result-label" href=href>{label.clone()}</a>
                        }
                        .into_any(),
                        None => {
                            view! { <span class="setlist-title">{label.clone()}</span> }.into_any()
                        }
                    };

                    let mut context_parts = vec![format!("Set: {set_label}")];
                    if entry.is_segue.unwrap_or(false) {
                        context_parts.push("Segue".to_string());
                    }
                    if entry.is_tease.unwrap_or(false) {
                        context_parts.push("Tease".to_string());
                    }
                    if let Some(duration) = entry.duration_seconds
                        && duration > 0 {
                            context_parts.push(format!("{}:{:02}", duration / 60, duration % 60));
                        }
                    let context_line = context_parts.join(" • ");
                    let notes = entry
                        .notes
                        .as_deref()
                        .map(str::trim)
                        .filter(|notes| !notes.is_empty())
                        .map(ToString::to_string);

                    view! {
                        <li class="setlist-item">
                            <span class="setlist-pos">{entry.position}</span>
                            <div class="setlist-main">
                                {title_view}
                                <span class="setlist-context">{context_line}</span>
                                {notes.map(|notes_line| view! {
                                    <span class="setlist-note">{notes_line}</span>
                                })}
                            </div>
                            <span class="setlist-slot">{slot}</span>
                        </li>
                    }
                })
                .collect::<Vec<_>>()}
        </ol>
    }
}

fn render_setlist_empty_state(
    has_filters: bool,
    active_set: RwSignal<String>,
    setlist_query: RwSignal<String>,
) -> impl IntoView {
    view! {
        <section class="status-card status-card--empty">
            <p class="status-title">"No setlist entries match this view"</p>
            <p class="muted">"Try a different set filter or clear the search query."</p>
            {has_filters.then(|| {
                let active_set_signal = active_set.clone();
                let setlist_query_signal = setlist_query.clone();
                view! {
                    <div class="pill-row">
                        <button
                            type="button"
                            class="pill pill--ghost"
                            on:click=move |_| {
                                active_set_signal.set("all".to_string());
                                setlist_query_signal.set(String::new());
                            }
                        >
                            "Clear filters"
                        </button>
                    </div>
                }
            })}
        </section>
    }
}

pub(crate) fn render_show_setlist_content(
    items: Vec<SetlistEntry>,
    active_set: RwSignal<String>,
    setlist_query: RwSignal<String>,
) -> impl IntoView {
    if items.is_empty() {
        return empty_state(
            "Setlist unavailable",
            "No setlist rows were found for this show.",
        )
        .into_any();
    }

    let total_count = items.len();
    let set_counts = setlist_set_counts(&items);
    let active_key = active_set.get();
    let query_text = setlist_query.get().trim().to_string();
    let query_normalized = query_text.to_ascii_lowercase();
    let filtered_items = items
        .into_iter()
        .filter(|entry| {
            let set_key = normalized_set_key(entry.set_name.as_deref());
            let matches_set = active_key == "all" || set_key == active_key;
            matches_set && setlist_entry_matches_query(entry, &query_normalized)
        })
        .collect::<Vec<_>>();
    let filtered_count = filtered_items.len();
    let has_filters = active_key != "all" || !query_text.is_empty();
    let summary = if query_text.is_empty() {
        format!("Showing {filtered_count} of {total_count} setlist entries")
    } else {
        format!(
            "Showing {filtered_count} of {total_count} setlist entries matching \"{query_text}\""
        )
    };

    view! {
        <div class="detail-list-controls">
            <label class="visually-hidden" for="show-setlist-filter">"Filter setlist entries"</label>
            <input
                id="show-setlist-filter"
                class="search-input"
                type="search"
                placeholder="Filter by song, set name, slot, or notes"
                prop:value=move || setlist_query.get()
                on:input=move |ev| setlist_query.set(event_target_value(&ev))
            />
            {render_setlist_filter_buttons(total_count, set_counts, active_set.clone())}
        </div>
        <p class="list-summary" role="status" aria-live="polite">
            {summary}
        </p>
        {if filtered_items.is_empty() {
            render_setlist_empty_state(has_filters, active_set, setlist_query).into_any()
        } else {
            render_setlist_entries_list(filtered_items).into_any()
        }}
    }
    .into_any()
}
