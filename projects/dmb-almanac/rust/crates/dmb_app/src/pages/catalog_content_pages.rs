use super::*;

fn render_liberation_items(list: Vec<LiberationEntry>) -> impl IntoView {
    if list.is_empty() {
        return empty_state_with_link(
            "No liberation data available",
            "Gap calculations are currently unavailable.",
            "/songs",
            "Browse songs",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing top {count} longest song gaps")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .enumerate()
                    .map(|(idx, entry)| {
                        let label = entry
                            .song
                            .as_ref()
                            .map(|song| song.title.clone())
                            .unwrap_or_else(|| format!("Song #{}", entry.song_id));
                        let days = entry.days_since.unwrap_or(0);
                        let shows = entry.shows_since.unwrap_or(0);
                        let last_played = entry
                            .last_played_date
                            .clone()
                            .unwrap_or_else(|| "unknown".to_string());
                        view! {
                            <li class="result-card">
                                <span class="pill">{format!("#{}", idx + 1)}</span>
                                <div class="result-body">
                                    <span class="result-label">{label}</span>
                                    <span class="result-meta">{format!("{shows} shows since • last played {last_played}")}</span>
                                </div>
                                <span class="result-score">{format!("{days} days")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn render_discography_items(list: Vec<Release>) -> impl IntoView {
    if list.is_empty() {
        return empty_state_with_link(
            "No releases available",
            "Release catalog rows are currently unavailable.",
            "/releases",
            "Browse recent releases",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing {count} releases")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .map(|release| {
                        let href = format!("/releases/{}", release.slug);
                        let release_type = release
                            .release_type
                            .clone()
                            .unwrap_or_else(|| "Release".to_string());
                        let release_date = release
                            .release_date
                            .clone()
                            .unwrap_or_else(|| "-".to_string());
                        view! {
                            <li class="result-card">
                                <span class="pill">{release_type}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{release.title}</a>
                                </div>
                                <span class="result-score">{release_date}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn render_curated_list_cards(list: Vec<CuratedList>) -> impl IntoView {
    if list.is_empty() {
        return empty_state(
            "No curated lists available",
            "Featured list metadata is currently unavailable.",
        )
        .into_any();
    }
    let count = list.len();
    view! {
        <>
            <p class="list-summary">{format!("Showing {count} curated lists")}</p>
            <ul class="result-list">
                {list
                    .into_iter()
                    .map(|list| {
                        let href = format!("/lists/{}", list.id);
                        let item_count = list.item_count.unwrap_or(0);
                        view! {
                            <li class="result-card">
                                <span class="pill">{list.category.clone()}</span>
                                <div class="result-body">
                                    <a class="result-label" href=href>{list.title.clone()}</a>
                                    <span class="result-meta">{list.description.clone().unwrap_or_default()}</span>
                                </div>
                                <span class="result-score">{format!("{item_count} items")}</span>
                            </li>
                        }
                    })
                    .collect::<Vec<_>>()}
            </ul>
        </>
    }
    .into_any()
}

fn normalized_curated_item_type(raw: &str) -> String {
    normalize_key_or_default(Some(raw), "other")
}

fn curated_item_type_label(type_key: &str) -> String {
    match type_key {
        "show" => "Show".to_string(),
        "song" => "Song".to_string(),
        "venue" => "Venue".to_string(),
        "guest" => "Guest".to_string(),
        "release" => "Release".to_string(),
        "tour" => "Tour".to_string(),
        "other" => "Other".to_string(),
        custom => {
            let label = titleize_label(custom);
            if label == "Unknown" {
                "Other".to_string()
            } else {
                label
            }
        }
    }
}

fn curated_item_type_counts(items: &[CuratedListItem]) -> Vec<(String, usize)> {
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

fn curated_item_href(item: &CuratedListItem) -> Option<String> {
    if let Some(link) = item.item_link.as_ref() {
        let trimmed = link.trim();
        if trimmed.starts_with('/') && !trimmed.starts_with("//") {
            return Some(trimmed.to_string());
        }
        if let Some(path) = trimmed
            .strip_prefix("https://dmbalmanac.com")
            .or_else(|| trimmed.strip_prefix("http://dmbalmanac.com"))
        {
            if path.starts_with('/') {
                return Some(path.to_string());
            }
        }
    }

    match normalized_curated_item_type(&item.item_type).as_str() {
        "show" => item.show_id.map(|id| format!("/shows/{id}")),
        "venue" => item.venue_id.map(|id| format!("/venues/{id}")),
        _ => None,
    }
}

fn curated_item_context(item: &CuratedListItem) -> Option<String> {
    let mut pieces = Vec::new();
    push_context_piece(&mut pieces, "Show", item.show_id);
    push_context_piece(&mut pieces, "Song", item.song_id);
    push_context_piece(&mut pieces, "Venue", item.venue_id);
    push_context_piece(&mut pieces, "Guest", item.guest_id);
    push_context_piece(&mut pieces, "Release", item.release_id);

    if pieces.is_empty() {
        None
    } else {
        Some(pieces.join(" • "))
    }
}

fn curated_item_title(item: &CuratedListItem) -> String {
    trimmed_non_empty_owned(item.item_title.as_deref()).unwrap_or_else(|| {
        let type_label = curated_item_type_label(&normalized_curated_item_type(&item.item_type));
        format!("{type_label} #{id}", id = item.id)
    })
}

fn curated_item_matches_query(item: &CuratedListItem, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let in_title = contains_query_opt(item.item_title.as_deref(), query);
    let in_notes = contains_query_opt(item.notes.as_deref(), query);
    let in_type = contains_query_text(&item.item_type, query);
    in_title || in_notes || in_type
}

fn render_curated_list_detail_content(
    list: CuratedList,
    items: Vec<CuratedListItem>,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) -> impl IntoView {
    let description = trimmed_non_empty(list.description.as_deref())
        .unwrap_or("No description is available for this list.")
        .to_string();
    let total_count = items.len();
    let type_counts = curated_item_type_counts(&items);
    let active_key = active_filter.get();
    let (query_text, query_normalized) = normalize_query(&query.get());

    let filtered_items = items
        .into_iter()
        .filter(|item| {
            let item_type = normalized_curated_item_type(&item.item_type);
            let matches_type = active_key == "all" || item_type == active_key;
            matches_type && curated_item_matches_query(item, &query_normalized)
        })
        .collect::<Vec<_>>();

    let filtered_count = filtered_items.len();
    let has_filters = active_key != "all" || !query_text.is_empty();
    let active_label = if active_key == "all" {
        "items".to_string()
    } else {
        let base = curated_item_type_label(&active_key).to_ascii_lowercase();
        if filtered_count == 1 {
            base
        } else {
            format!("{base}s")
        }
    };
    let summary = filtered_summary(filtered_count, total_count, &active_label, &query_text);

    view! {
        <div class="detail-list-head">
            <div class="detail-list-head__copy">
                <h2>{list.title.clone()}</h2>
                <p class="muted">{description}</p>
            </div>
            <div class="pill-row detail-list-head__meta">
                <span class="pill">{list.category.clone()}</span>
                {list.is_featured.unwrap_or(false).then(|| view! { <span class="pill">"Featured"</span> })}
                <span class="pill pill--ghost">{format!("{total_count} items")}</span>
            </div>
        </div>

        <div class="detail-list-controls">
            <label class="visually-hidden" for="curated-list-search">"Filter list items"</label>
            <input
                id="curated-list-search"
                class="search-input"
                type="search"
                placeholder="Filter by title, item type, or notes"
                prop:value=move || query.get()
                on:input=move |ev| query.set(event_target_value(&ev))
            />
            <div
                class="result-filters"
                role="group"
                aria-label="Curated list item filters"
                aria-controls="curated-list-results"
            >
                {all_filter_button(total_count, active_filter)}
                {render_filter_options(
                    type_counts,
                    active_filter,
                    curated_item_type_label,
                )}
            </div>
        </div>

        <p class="list-summary" role="status" aria-live="polite">
            {summary}
        </p>

        {if filtered_items.is_empty() {
            empty_filtered_results(
                "No items match this view",
                "Try a different filter or clear the search query.",
                has_filters,
                move || {
                    active_filter.set("all".to_string());
                    query.set(String::new());
                },
            )
            .into_any()
        } else {
            view! {
                <ol
                    id="curated-list-results"
                    class="tracklist"
                    aria-label="Curated list items"
                >
                    {filtered_items
                        .into_iter()
                        .map(|item| {
                            let item_type = normalized_curated_item_type(&item.item_type);
                            let item_type_label = curated_item_type_label(&item_type);
                            let title = curated_item_title(&item);
                            let href = curated_item_href(&item);
                            let context = curated_item_context(&item);
                            let notes = trimmed_non_empty_owned(item.notes.as_deref());

                            let title_view = match href {
                                Some(href) => view! {
                                    <a class="tracklist-title result-label" href=href>{title.clone()}</a>
                                }
                                    .into_any(),
                                None => view! { <span class="tracklist-title">{title.clone()}</span> }.into_any(),
                            };

                            view! {
                                <li class="tracklist-item">
                                    <span class="tracklist-pos">{item.position}</span>
                                    <div class="tracklist-main">
                                        {title_view}
                                        {context.map(|context_line| view! {
                                            <span class="tracklist-context">{context_line}</span>
                                        })}
                                        {notes.map(|notes_line| view! {
                                            <span class="tracklist-note">{notes_line}</span>
                                        })}
                                    </div>
                                    <span class="setlist-slot">{item_type_label}</span>
                                </li>
                            }
                        })
                        .collect::<Vec<_>>()}
                </ol>
            }
                .into_any()
        }}
    }
}

pub fn liberation_page() -> impl IntoView {
    let items = Resource::new(|| (), |_| async move { load_liberation_list(50).await });

    view! {
        <section class="page">
            <h1>"Liberation List"</h1>
            <p class="lead">"Songs with the longest gaps since last play."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading liberation list",
                        "Computing gap durations and recent play context.",
                    )
                }
            >
                {move || render_liberation_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn discography_page() -> impl IntoView {
    let items = Resource::new(|| (), |_| async move { load_all_releases().await });

    view! {
        <section class="page">
            <h1>"Discography"</h1>
            <p class="lead">"Complete release catalog."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading discography",
                        "Fetching full release catalog.",
                    )
                }
            >
                {move || render_discography_items(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn curated_lists_page() -> impl IntoView {
    let items = Resource::new(|| (), |_| async move { load_curated_lists().await });

    view! {
        <section class="page">
            <h1>"Curated Lists"</h1>
            <p class="lead">"Featured playlists, fan picks, and themed collections."</p>
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading curated lists",
                        "Fetching featured and themed collections.",
                    )
                }
            >
                {move || render_curated_list_cards(items.get().unwrap_or_default())}
            </Suspense>
        </section>
    }
}

pub fn curated_list_detail_page() -> impl IntoView {
    let params = use_params_map();
    let list_id = move || params.with(|params| params.get("listId").unwrap_or_default());
    let seed_data_state = use_seed_data_state();
    let active_filter = RwSignal::new("all".to_string());
    let query = RwSignal::new(String::new());

    let list = Resource::new(list_id, |id: String| async move {
        let id = parse_positive_i32_param(&id, "listId").ok()?;
        let lists = load_curated_lists().await;
        lists.into_iter().find(|list| list.id == id)
    });

    let items = Resource::new(list_id, |id: String| async move {
        let Ok(id) = parse_positive_i32_param(&id, "listId") else {
            return Vec::new();
        };
        load_curated_list_items(id, 200).await
    });

    #[cfg(feature = "hydrate")]
    {
        let active_filter_signal = active_filter.clone();
        let query_signal = query.clone();
        Effect::new(move |_| {
            let _ = list_id();
            active_filter_signal.set("all".to_string());
            query_signal.set(String::new());
        });
    }

    view! {
        <section class="page">
            {detail_nav("/lists", "Back to curated lists")}
            <h1>"Curated List Details"</h1>
            <p class="lead">"Highlights, context, and quick filtering for every item in this collection."</p>
            {move || {
                parsed_subhead(parse_positive_i32_param(&list_id(), "listId"), "List ID")
            }}
            <Suspense
                fallback=move || {
                    loading_state(
                        "Loading curated list",
                        "Fetching list metadata and up to 200 ranked items.",
                    )
                }
            >
                {move || {
                    let list_meta = list.get().unwrap_or(None);
                    let list_items = items.get().unwrap_or_default();
                    if let Some(list_val) = list_meta {
                        render_curated_list_detail_content(list_val, list_items, active_filter, query)
                            .into_any()
                    } else if parse_positive_i32_param(&list_id(), "listId").is_err() {
                        view! {
                            <section class="status-card status-card--empty">
                                <p class="status-title">"Invalid list id"</p>
                                <p class="muted">
                                    "Use a positive integer list id in the URL to open list details."
                                </p>
                                <p><a class="result-label" href="/lists">"Browse curated lists"</a></p>
                            </section>
                        }
                            .into_any()
                    } else if seed_data_state.get() == crate::data::SeedDataState::Importing {
                        import_in_progress_state(
                            "Curated list details are still loading",
                            "/offline",
                            "Open offline help",
                        )
                            .into_any()
                    } else {
                        empty_state_with_link(
                            "List not found",
                            "This curated list id could not be resolved.",
                            "/lists",
                            "Browse curated lists",
                        )
                            .into_any()
                    }
                }}
            </Suspense>
        </section>
    }
}

pub fn visualizations_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Visualizations"</h1>
            <p class="lead">"Live data visual summaries are available through Rust-native routes."</p>
            <div class="card-grid">
                <a class="card card-link" href="/stats">
                    <h2>"Stats Dashboard"</h2>
                    <p class="muted">"Shows by year, top songs, venues, guests, and era splits."</p>
                </a>
                <a class="card card-link" href="/liberation">
                    <h2>"Liberation Trends"</h2>
                    <p class="muted">"Longest gaps, recent liberations, and rarity context."</p>
                </a>
                <a class="card card-link" href="/shows">
                    <h2>"Show Browser"</h2>
                    <p class="muted">"Use date and venue metadata as a timeline-style exploration flow."</p>
                </a>
            </div>
            <p class="muted">
                "Additional dedicated visualization modules are being migrated to this route without changing route contracts."
            </p>
        </section>
    }
}

pub fn open_file_page() -> impl IntoView {
    let file_info = RwSignal::new(None::<String>);
    #[cfg(feature = "hydrate")]
    let file_info_signal = file_info.clone();
    let on_select = move |_ev| {
        #[cfg(feature = "hydrate")]
        {
            let input: web_sys::HtmlInputElement = event_target(&_ev);
            if let Some(files) = input.files() {
                if let Some(file) = files.get(0) {
                    let info = format!("{} ({} bytes)", file.name(), file.size());
                    file_info_signal.set(Some(info));
                }
            }
        }
    };

    view! {
        <section class="page">
            <h1>"Open File"</h1>
            <p class="lead">"Import a JSON payload into your offline workspace."</p>
            <h2>"Import File"</h2>
            <p class="muted">"Choose a JSON export to inspect or load into local cache workflows."</p>
            <input type="file" accept=".json,.txt" on:change=on_select />
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    file_info.get().map(|info| view! { <p class="muted">{info}</p> })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    let _ = file_info.get();
                    None::<leptos::prelude::View<leptos::prelude::AnyView>>
                }
            }}
        </section>
    }
}

pub fn protocol_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    let protocol_value = {
        let value = RwSignal::new(None::<String>);
        let value_signal = value.clone();
        request_animation_frame(move || {
            value_signal.set(current_search_param("url"));
        });
        value
    };

    view! {
        <section class="page">
            <h1>"Protocol Handler"</h1>
            <p class="lead">"Incoming deep links will surface here."</p>
            <h2>"Incoming URL Payload"</h2>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    protocol_value
                        .get()
                        .map(|value| view! { <p class="muted">{value}</p> })
                        .unwrap_or_else(|| {
                            view! { <p class="muted">{"No protocol payload.".to_string()}</p> }
                        })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    view! { <p class="muted">"Protocol payload available after hydration."</p> }
                }
            }}
        </section>
    }
}

pub fn test_wasm_page() -> impl IntoView {
    #[cfg(feature = "hydrate")]
    let wasm_version = {
        let value = RwSignal::new(None::<String>);
        let value_signal = value.clone();
        request_animation_frame(move || {
            value_signal.set(Some(dmb_wasm::core_schema_version()));
        });
        value
    };

    view! {
        <section class="page">
            <h1>"WASM Diagnostics"</h1>
            <p class="lead">"WASM runtime checks and schema version."</p>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    wasm_version
                        .get()
                        .map(|value| view! { <p class="muted">{format!("Core schema: {}", value)}</p> })
                        .unwrap_or_else(|| view! { <p class="muted">{"Loading WASM...".to_string()}</p> })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    view! { <p class="muted">"WASM diagnostics available after hydration."</p> }
                }
            }}
        </section>
    }
}
