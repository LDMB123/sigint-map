use super::*;

#[cfg(feature = "hydrate")]
fn merge_search_results(
    mut prefix: Vec<dmb_core::SearchResult>,
    mut semantic: Vec<dmb_core::SearchResult>,
    limit: usize,
) -> Vec<dmb_core::SearchResult> {
    use std::collections::HashMap;
    let mut merged: HashMap<String, dmb_core::SearchResult> = HashMap::new();

    for item in prefix.iter_mut() {
        item.score = (item.score + 0.5).min(1.5);
    }

    for item in semantic.iter_mut() {
        item.score = item.score.min(1.0);
    }

    for item in prefix.into_iter().chain(semantic.into_iter()) {
        let key = format!(
            "{}:{}:{}",
            item.result_type,
            item.id,
            item.slug.as_deref().unwrap_or("")
        );
        match merged.get_mut(&key) {
            Some(existing) => {
                if item.score > existing.score {
                    *existing = item;
                }
            }
            None => {
                merged.insert(key, item);
            }
        }
    }

    let mut out: Vec<dmb_core::SearchResult> = merged.into_values().collect();
    out.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.result_type.cmp(&b.result_type))
            .then_with(|| a.label.cmp(&b.label))
    });
    out.truncate(limit);
    out
}

pub fn search_page() -> impl IntoView {
    let (query, set_query) = signal(String::new());
    let (active_filter, set_active_filter) = signal(String::from("all"));
    let results = RwSignal::new(Vec::<dmb_core::SearchResult>::new());
    #[cfg(feature = "hydrate")]
    let search_url_ready = RwSignal::new(false);

    #[cfg(feature = "hydrate")]
    {
        let set_query_signal = set_query.clone();
        let set_active_filter_signal = set_active_filter.clone();
        let search_url_ready_signal = search_url_ready.clone();
        Effect::new(move |_| {
            let route_query = current_search_param("q").unwrap_or_default();
            let route_filter =
                normalize_search_filter(&current_search_param("type").unwrap_or_default());
            set_query_signal.set(route_query);
            set_active_filter_signal.set(route_filter);
            search_url_ready_signal.set(true);
        });

        let query_signal_for_url = query.clone();
        let active_filter_signal_for_url = active_filter.clone();
        let search_url_ready_signal_for_url = search_url_ready.clone();
        Effect::new(move |_| {
            if !search_url_ready_signal_for_url.get() {
                return;
            }
            sync_search_query_params(
                &query_signal_for_url.get(),
                &active_filter_signal_for_url.get(),
            );
        });

        let embedding_index = RwSignal::new(None::<std::sync::Arc<crate::ai::EmbeddingIndex>>);
        let query_signal = query.clone();
        let results_signal = results.clone();
        let index_signal = embedding_index.clone();
        let search_run = RwSignal::new(0_u64);
        spawn_local(async move {
            index_signal.set(crate::ai::load_embedding_index().await);
        });
        Effect::new(move |_| {
            let current_query = query_signal.get();
            let results_signal = results_signal.clone();
            let index_signal = index_signal.get();
            let search_run_signal = search_run.clone();
            let run_id = search_run_signal.get_untracked().wrapping_add(1);
            search_run_signal.set(run_id);
            spawn_local(async move {
                // Debounce keystrokes to reduce repeated prefix/semantic lookups.
                wait_ms(120).await;
                if search_run_signal.get_untracked() != run_id {
                    return;
                }

                let trimmed = current_query.trim().to_string();
                let items = if trimmed.is_empty() {
                    Vec::new()
                } else {
                    let prefix = dmb_idb::search_global(&trimmed).await.unwrap_or_default();
                    let semantic = if trimmed.chars().count() >= 2 {
                        if let Some(index) = index_signal {
                            crate::ai::semantic_search(&trimmed, &index, 12).await
                        } else {
                            Vec::new()
                        }
                    } else {
                        Vec::new()
                    };
                    merge_search_results(prefix, semantic, 40)
                };

                // Drop stale async results from superseded queries.
                if search_run_signal.get_untracked() != run_id {
                    return;
                }
                results_signal.set(items);
            });
        });
    }

    view! {
        <section class="page">
            <h1>"Search"</h1>
            <p class="lead">"Hybrid prefix + semantic search (offline-first)."</p>
            <input
                class="search-input"
                type="search"
                placeholder="Search songs, shows, venues..."
                prop:value=move || query.get()
                on:input=move |ev| {
                    let next = event_target_value(&ev);
                    if next.trim().is_empty() {
                        set_active_filter.set("all".to_string());
                    }
                    set_query.set(next);
                }
            />
            {move || {
                let items = results.get();
                let current_query = query.get();
                if items.is_empty() && !current_query.is_empty() {
                    empty_state(
                        "No results",
                        "Try a different query or shorter phrase.",
                    )
                    .into_any()
                } else if items.is_empty() {
                    empty_state(
                        "Start typing",
                        "Search songs, shows, venues, guests, tours, and releases.",
                    )
                    .into_any()
                } else {
                    let all_count = items.len();
                    let song_count = items.iter().filter(|item| item.result_type == "song").count();
                    let venue_count = items.iter().filter(|item| item.result_type == "venue").count();
                    let tour_count = items.iter().filter(|item| item.result_type == "tour").count();
                    let guest_count = items.iter().filter(|item| item.result_type == "guest").count();
                    let release_count = items.iter().filter(|item| item.result_type == "release").count();
                    let show_count = items.iter().filter(|item| item.result_type == "show").count();

                    let selected_filter = normalize_search_filter(&active_filter.get());
                    let filtered_items: Vec<_> = items
                        .into_iter()
                        .filter(|item| {
                            selected_filter == "all" || item.result_type == selected_filter
                        })
                        .collect();
                    let filtered_count = filtered_items.len();
                    let summary_label = match selected_filter.as_str() {
                        "all" => "all results",
                        "song" => "songs",
                        "venue" => "venues",
                        "tour" => "tours",
                        "guest" => "guests",
                        "release" => "releases",
                        "show" => "shows",
                        _ => "results",
                    };

                    view! {
                        <>
                            <div
                                class="result-filters"
                                role="group"
                                aria-label="Search result filters"
                                aria-controls="search-results-list"
                            >
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "all"
                                    aria-pressed=move || active_filter.get() == "all"
                                    on:click=move |_| set_active_filter.set("all".to_string())
                                >
                                    {format!("All ({all_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "song"
                                    aria-pressed=move || active_filter.get() == "song"
                                    disabled=song_count == 0
                                    on:click=move |_| set_active_filter.set("song".to_string())
                                >
                                    {format!("Songs ({song_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "show"
                                    aria-pressed=move || active_filter.get() == "show"
                                    disabled=show_count == 0
                                    on:click=move |_| set_active_filter.set("show".to_string())
                                >
                                    {format!("Shows ({show_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "venue"
                                    aria-pressed=move || active_filter.get() == "venue"
                                    disabled=venue_count == 0
                                    on:click=move |_| set_active_filter.set("venue".to_string())
                                >
                                    {format!("Venues ({venue_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "tour"
                                    aria-pressed=move || active_filter.get() == "tour"
                                    disabled=tour_count == 0
                                    on:click=move |_| set_active_filter.set("tour".to_string())
                                >
                                    {format!("Tours ({tour_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "guest"
                                    aria-pressed=move || active_filter.get() == "guest"
                                    disabled=guest_count == 0
                                    on:click=move |_| set_active_filter.set("guest".to_string())
                                >
                                    {format!("Guests ({guest_count})")}
                                </button>
                                <button
                                    type="button"
                                    class="result-filter pill pill--ghost"
                                    class:result-filter--active=move || active_filter.get() == "release"
                                    aria-pressed=move || active_filter.get() == "release"
                                    disabled=release_count == 0
                                    on:click=move |_| set_active_filter.set("release".to_string())
                                >
                                    {format!("Releases ({release_count})")}
                                </button>
                            </div>
                            <p class="list-summary" role="status" aria-live="polite">
                                {format!(
                                    "Showing {filtered_count} {summary_label} for \"{current_query}\""
                                )}
                            </p>
                            {if filtered_items.is_empty() {
                                view! {
                                    <section class="status-card status-card--empty">
                                        <p class="status-title">"No results in this category"</p>
                                        <p class="muted">
                                            "Try another filter or switch back to All results."
                                        </p>
                                        <p>
                                            <button
                                                type="button"
                                                class="pill pill--ghost"
                                                on:click=move |_| set_active_filter.set("all".to_string())
                                            >
                                                "Show all results"
                                            </button>
                                        </p>
                                    </section>
                                }
                                .into_any()
                            } else {
                                view! {
                                    <ul id="search-results-list" class="result-list">
                                        {filtered_items
                                            .into_iter()
                                            .map(|item| {
                                                let label = item.label.clone();
                                                let kind = item.result_type.clone();
                                                let href = search_result_href(&item);
                                                view! {
                                                    <li class="result-card">
                                                        <span class="pill">{kind}</span>
                                                        <div class="result-body">
                                                            {move || match &href {
                                                                Some(link) => view! {
                                                                    <a class="result-label" href=link.clone()>{label.clone()}</a>
                                                                }
                                                                .into_any(),
                                                                None => view! { <span class="result-label">{label.clone()}</span> }.into_any(),
                                                            }}
                                                        </div>
                                                        <span class="result-score">{format!("{:.2}", item.score)}</span>
                                                    </li>
                                                }
                                            })
                                            .collect::<Vec<_>>()}
                                    </ul>
                                }
                                .into_any()
                            }}
                        </>
                    }
                    .into_any()
                }
            }}
        </section>
    }
}

// ---------------------------------------------------------------------------
