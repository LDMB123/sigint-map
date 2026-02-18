use super::*;

pub fn home_page() -> impl IntoView {
    let stats = Resource::new(|| (), |_| async move { get_home_stats().await.ok() });
    let storage = RwSignal::new(None::<crate::data::StorageInfo>);

    #[cfg(feature = "hydrate")]
    {
        let storage_signal = storage.clone();
        spawn_local(async move {
            let info = crate::data::estimate_storage().await;
            storage_signal.set(info);
        });
    }

    view! {
        <section class="page">
            <h1>DMB Almanac (Rust)</h1>
            <p class="lead">"Rust-first, WASM-hydrated, offline-ready."</p>
            {move || {
                storage.get().and_then(|info| {
                    let usage = info.usage.unwrap_or(0.0);
                    let quota = info.quota.unwrap_or(0.0);
                    if quota <= 0.0 {
                        return None;
                    }
                    let ratio = usage / quota;
                    if ratio < crate::data::STORAGE_PRESSURE_THRESHOLD {
                        return None;
                    }
                    Some(view! {
                        <div class="card card-warn">
                            <h2>"Storage nearly full"</h2>
                            <p class="muted">
                                {format!("{}% used. Consider clearing AI cache in the PWA panel.", (ratio * 100.0).round())}
                            </p>
                        </div>
                    })
                })
            }}
            <Suspense fallback=move || loading_state("Loading stats", "Fetching homepage totals.")>
                {move || match stats.get() {
                    Some(Some(stats)) => view! {
                        <div class="stats-grid">
                            <div class="stat-card">
                                <span class="stat-label">"Shows"</span>
                                <span class="stat-value">{stats.shows}</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">"Songs"</span>
                                <span class="stat-value">{stats.songs}</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">"Venues"</span>
                                <span class="stat-value">{stats.venues}</span>
                            </div>
                        </div>
                    }.into_any(),
                    Some(None) => {
                        empty_state(
                            "Stats unavailable",
                            "Homepage metrics could not be loaded right now.",
                        )
                        .into_any()
                    }
                    None => view! { <div class="stats-grid"></div> }.into_any(),
                }}
            </Suspense>
            <div class="card-grid ai-links">
                <a class="card card-link" href="/ai-diagnostics">
                    <h2>"AI Diagnostics"</h2>
                    <p class="muted">"Inspect capabilities, indexes, and tuning."</p>
                </a>
                <a class="card card-link" href="/ai-benchmark">
                    <h2>"AI Benchmark"</h2>
                    <p class="muted">"Compare CPU vs GPU subset scoring."</p>
                </a>
                <a class="card card-link" href="/ai-warmup">
                    <h2>"AI Warmup"</h2>
                    <p class="muted">"Preload embeddings for faster search."</p>
                </a>
                <a class="card card-link" href="/ai-smoke">
                    <h2>"AI Smoke Test"</h2>
                    <p class="muted">"Run a quick semantic search sanity check."</p>
                </a>
            </div>
        </section>
    }
}

pub fn static_page(title: &'static str) -> impl IntoView {
    view! {
        <section class="page">
            <h1>{title}</h1>
            <p class="lead">"This route is active in the Rust app and is being finalized."</p>
            <p class="muted">
                "Use the core browse routes and support pages while this section receives final data polish."
            </p>
            <div class="card-grid">
                <a class="card card-link" href="/shows">
                    <h2>"Browse Shows"</h2>
                    <p class="muted">"Open the primary browse flow."</p>
                </a>
                <a class="card card-link" href="/search">
                    <h2>"Search"</h2>
                    <p class="muted">"Use global search across songs, venues, tours, and more."</p>
                </a>
            </div>
        </section>
    }
}

pub fn about_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"About"</h1>
            <p class="lead">"DMB Almanac Rust is an offline-first, WASM-powered browse and analytics app."</p>
            <p>
                "The Rust build serves the same feature set as the legacy frontend with improved rendering stability, stronger parity checks, and deterministic data fallbacks."
            </p>
            <div class="card-grid">
                <a class="card card-link" href="/protocol">
                    <h2>"Protocol"</h2>
                    <p class="muted">"Review how deep links and shared links are handled."</p>
                </a>
                <a class="card card-link" href="/offline">
                    <h2>"Offline"</h2>
                    <p class="muted">"Understand offline usage and cache expectations."</p>
                </a>
            </div>
        </section>
    }
}

pub fn contact_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Contact"</h1>
            <p class="lead">"Questions, issues, and feedback are welcome."</p>
            <div class="card">
                <p>
                    "Use the repository issues or support channel for bug reports, "
                    <strong>"offline behavior questions"</strong>
                    ", and data parity concerns."
                </p>
            </div>
            <ul class="result-list">
                <li class="result-card">
                    <span class="result-label">"Expected response"</span>
                    <span class="result-meta">"Support requests are usually acknowledged during business days."</span>
                </li>
                <li class="result-card">
                    <span class="result-label">"Fastest path"</span>
                    <span class="result-meta">"Include route, browser, and whether SW is installed."</span>
                </li>
            </ul>
        </section>
    }
}

pub fn faq_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"FAQ"</h1>
            <p class="lead">"Common questions about app behavior, data, and PWA usage."</p>
            <div class="section-divider"></div>
            <h2>"How do I check if data loaded?"</h2>
            <p class="muted">"Open key browse routes such as /shows or /songs and watch for loading messages before data appears."</p>
            <div class="section-divider"></div>
            <h2>"What if AI routes are slow?"</h2>
            <p class="muted">"AI paths now show timeout and status states. Use warmup first on slower devices."</p>
            <div class="section-divider"></div>
            <h2>"Why is offline status stale?"</h2>
            <p class="muted">"SW update and cache maintenance can take a moment; use cache controls and refresh guidance in the status banner."</p>
        </section>
    }
}

pub fn offline_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Offline"</h1>
            <p class="lead">"You are in offline mode. Core pages still work from cached data."</p>
            <div class="card-grid">
                <div class="card">
                    <h2>"What still works"</h2>
                    <ul class="list">
                        <li>"Browse cached show, song, venue, and guest views."</li>
                        <li>"Use saved visualizations and local AI cache where available."</li>
                        <li>"Run AI smoke and warmup checks from already-cached state."</li>
                    </ul>
                </div>
                <div class="card">
                    <h2>"What requires network"</h2>
                    <ul class="list">
                        <li>"Initial data sync or fresh imports."</li>
                        <li>"Revalidation parity checks and update metadata refresh."</li>
                        <li>"Search index refresh from remote sources."</li>
                    </ul>
                </div>
            </div>
            <p>
                <a href="/">"Return to dashboard"</a>
                " for immediate local status and navigation."
            </p>
        </section>
    }
}

pub fn assistant_page() -> impl IntoView {
    let (query, set_query) = signal(String::new());
    let embedding_index = RwSignal::new(None::<std::sync::Arc<crate::ai::EmbeddingIndex>>);
    let results = RwSignal::new(Vec::<dmb_core::SearchResult>::new());

    #[cfg(feature = "hydrate")]
    {
        let index_signal = embedding_index.clone();
        spawn_local(async move {
            let loaded = crate::ai::load_embedding_index().await;
            index_signal.set(loaded);
        });

        let index_signal = embedding_index.clone();
        let results_signal = results.clone();
        Effect::new(move |_| {
            let current_query = query.get();
            let current_index = index_signal.get();
            let results_signal = results_signal.clone();
            spawn_local(async move {
                let trimmed = current_query.trim().to_string();
                let items = if trimmed.len() < 2 {
                    Vec::new()
                } else if let Some(index) = current_index {
                    crate::ai::semantic_search(&trimmed, &index, 8).await
                } else {
                    Vec::new()
                };
                results_signal.set(items);
            });
        });
    }

    view! {
        <section class="page">
            <h1>"AI Assistant"</h1>
            <p class="lead">"Offline-first semantic recommendations and answers."</p>
            {move || match embedding_index.get() {
                None => loading_state("Loading embedding index", "Preparing local vector search.").into_any(),
                Some(index) => view! {
                    <p class="list-summary">
                        "Embedding vectors loaded: "
                        {index.records.len()}
                        " (dim "
                        {index.dim}
                        ")"
                    </p>
                }
                .into_any(),
            }}

            <div class="assistant-search">
                <input
                    class="search-input"
                    type="search"
                    placeholder="Ask about a song, show, venue..."
                    prop:value=move || query.get()
                    on:input=move |ev| set_query.set(event_target_value(&ev))
                />
            </div>
            {move || {
                let items = results.get();
                let current_query = query.get();
                let trimmed = current_query.trim().to_string();
                if trimmed.len() < 2 {
                    empty_state(
                        "Ask a question",
                        "Type at least two characters to see semantic recommendations.",
                    )
                    .into_any()
                } else if items.is_empty() {
                    empty_state(
                        "No semantic matches yet",
                        "Try a broader phrase, song title, venue name, or year.",
                    )
                    .into_any()
                } else {
                    let count = items.len();
                    view! {
                        <>
                            <p class="list-summary">
                                {format!("Showing {count} semantic matches for \"{trimmed}\"")}
                            </p>
                            <ul class="result-list">
                                {items
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
                        </>
                    }
                    .into_any()
                }
            }}
        </section>
    }
}

pub fn not_found_page() -> impl IntoView {
    view! {
        <section class="page">
            <h1>"Not Found"</h1>
            <p>"That route does not exist in the Rust app."</p>
            <div class="card-grid">
                <a class="card card-link" href="/">
                    <h2>"Return Home"</h2>
                    <p class="muted">"Go back to the dashboard and continue browsing."</p>
                </a>
                <a class="card card-link" href="/shows">
                    <h2>"Explore Shows"</h2>
                    <p class="muted">"Jump to core browse pages."</p>
                </a>
                <a class="card card-link" href="/search">
                    <h2>"Search"</h2>
                    <p class="muted">"Find songs, venues, tours, and releases quickly."</p>
                </a>
            </div>
        </section>
    }
}

pub fn my_shows_page() -> impl IntoView {
    let items = RwSignal::new(Vec::<UserAttendedShow>::new());
    let input = RwSignal::new(String::new());
    let message = RwSignal::new(None::<(String, bool)>);
    #[cfg(feature = "hydrate")]
    let loading = RwSignal::new(true);

    #[cfg(feature = "hydrate")]
    {
        let items_signal = items.clone();
        let loading_signal = loading.clone();
        spawn_local(async move {
            items_signal.set(load_user_attended_shows().await);
            loading_signal.set(false);
        });

        let input_signal = input.clone();
        let message_signal = message.clone();
        Effect::new(move |_| {
            let raw_show_id = current_search_param("showId");
            let Some(raw_show_id) = raw_show_id else {
                return;
            };
            match parse_positive_i32_param(&raw_show_id, "showId") {
                Ok(show_id) => {
                    input_signal.set(show_id.to_string());
                    if message_signal.get_untracked().is_none() {
                        message_signal.set(Some((
                            format!(
                                "Show {show_id} prefilled from link. Click Add to save it locally."
                            ),
                            false,
                        )));
                    }
                }
                Err(_) => {
                    if message_signal.get_untracked().is_none() {
                        message_signal.set(Some((
                            "Invalid showId query parameter. Enter a positive show ID.".to_string(),
                            true,
                        )));
                    }
                }
            }
        });
    }

    #[cfg(feature = "hydrate")]
    let on_add = {
        let items = items.clone();
        let input = input.clone();
        let message = message.clone();
        let loading = loading.clone();
        move |_| {
            let value = input.get();
            let Ok(show_id) = value.trim().parse::<i32>() else {
                message.set(Some((
                    "Enter a positive numeric show ID.".to_string(),
                    true,
                )));
                return;
            };
            if show_id <= 0 {
                message.set(Some((
                    "Enter a positive numeric show ID.".to_string(),
                    true,
                )));
                return;
            }
            message.set(None);
            loading.set(true);
            spawn_local(async move {
                let show_date = load_show(show_id).await.map(|show| show.date);
                if add_user_attended_show(show_id, show_date).await {
                    items.set(load_user_attended_shows().await);
                    input.set(String::new());
                    message.set(Some((format!("Saved show {show_id} locally."), false)));
                } else {
                    message.set(Some((
                        "Unable to save this show. Please try again.".to_string(),
                        true,
                    )));
                }
                loading.set(false);
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_add = |_| {};

    #[cfg(feature = "hydrate")]
    let on_remove = {
        let items = items.clone();
        let message = message.clone();
        let loading = loading.clone();
        move |show_id: i32| {
            let items = items.clone();
            let message = message.clone();
            let loading = loading.clone();
            spawn_local(async move {
                loading.set(true);
                if remove_user_attended_show(show_id).await {
                    items.set(load_user_attended_shows().await);
                    message.set(Some((format!("Removed show {show_id}."), false)));
                } else {
                    message.set(Some((
                        "Unable to remove this show. Please try again.".to_string(),
                        true,
                    )));
                }
                loading.set(false);
            });
        }
    };

    #[cfg(not(feature = "hydrate"))]
    let on_remove = |_show_id: i32| {};

    #[cfg(not(feature = "hydrate"))]
    let _ = (&items, &message, &on_remove, &input);

    view! {
        <section class="page">
            <h1>"My Shows"</h1>
            <p class="lead">"Track shows you've attended, stored locally."</p>
            <div class="inline-form">
                <input
                    class="input"
                    type="number"
                    placeholder="Enter show id"
                    prop:value=move || input.get()
                    on:input=move |ev| input.set(event_target_value(&ev))
                />
                <button type="button" class="pill" on:click=on_add>"Add"</button>
            </div>
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    message.get().map(|(msg, is_error)| {
                        let class_name = if is_error {
                            "form-message form-message--error"
                        } else {
                            "form-message"
                        };
                        view! { <p class=class_name>{msg}</p> }
                    })
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    None::<leptos::prelude::View<leptos::prelude::AnyView>>
                }
            }}
            {move || {
                #[cfg(feature = "hydrate")]
                {
                    if loading.get() {
                        loading_state("Loading saved shows", "Reading your local show list.")
                            .into_any()
                    } else if items.get().is_empty() {
                        empty_state_with_link(
                            "No saved shows yet",
                            "Add a show ID to start tracking your attended history.",
                            "/shows",
                            "Browse shows",
                        )
                        .into_any()
                    } else {
                        let saved = items.get();
                        let count = saved.len();
                        view! {
                            <>
                                <p class="list-summary">{format!("Showing {count} saved shows")}</p>
                                <ul class="result-list">
                                    {saved
                                        .into_iter()
                                        .map(|item| {
                                            let href = format!("/shows/{}", item.show_id);
                                            let date = item
                                                .show_date
                                                .clone()
                                                .unwrap_or_else(|| "Unknown date".to_string());
                                            let show_id = item.show_id;
                                            view! {
                                                <li class="result-card">
                                                    <span class="pill">{format!("#{}", show_id)}</span>
                                                    <div class="result-body">
                                                        <a class="result-label" href=href>{date}</a>
                                                        <span class="result-meta">{format!("Show ID {show_id}")}</span>
                                                    </div>
                                                    <button type="button" class="pill pill--ghost" on:click=move |_| on_remove(show_id)>
                                                        "Remove"
                                                    </button>
                                                </li>
                                            }
                                        })
                                        .collect::<Vec<_>>()}
                                </ul>
                            </>
                        }
                        .into_any()
                    }
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    empty_state(
                        "Available after hydration",
                        "Local show tracking is enabled once the browser runtime is active.",
                    )
                    .into_any()
                }
            }}
        </section>
    }
}
